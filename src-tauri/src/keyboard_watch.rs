use core_foundation::base::{CFType, CFTypeRef, TCFType};
use core_foundation::dictionary::CFDictionary;
use core_foundation::number::CFNumber;
use core_foundation::runloop::{kCFRunLoopDefaultMode, CFRunLoop, CFRunLoopSource};
use core_foundation::string::CFString;
use std::ffi::{c_char, c_void};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::thread;
use std::time::Duration;

type IoObject = u32;
type IoIterator = u32;
type IoNotificationPort = *mut c_void;

const IO_MAIN_PORT_DEFAULT: u32 = 0;
const IO_FIRST_MATCH_NOTIFICATION: &[u8] = b"IOServiceFirstMatch\0";
const HID_USAGE_PAGE_GENERIC_DESKTOP: i32 = 0x01;
const HID_USAGE_KEYBOARD: i32 = 0x06;
const KARABINER_VIRTUAL_KEYBOARD_PREFIX: &str = "Karabiner";
/// A single physical keyboard registers several HID interfaces in quick succession.
const CONNECT_SETTLE_TIME: Duration = Duration::from_millis(1500);

#[link(name = "IOKit", kind = "framework")]
extern "C" {
    fn IONotificationPortCreate(main_port: u32) -> IoNotificationPort;
    fn IONotificationPortGetRunLoopSource(
        port: IoNotificationPort,
    ) -> core_foundation::runloop::CFRunLoopSourceRef;
    fn IOServiceAddMatchingNotification(
        port: IoNotificationPort,
        notification_type: *const c_char,
        matching: CFTypeRef,
        callback: extern "C" fn(*mut c_void, IoIterator),
        ref_con: *mut c_void,
        notification: *mut IoIterator,
    ) -> i32;
    fn IOIteratorNext(iterator: IoIterator) -> IoObject;
    fn IOObjectRelease(object: IoObject) -> i32;
    fn IORegistryEntryCreateCFProperty(
        entry: IoObject,
        key: CFTypeRef,
        allocator: CFTypeRef,
        options: u32,
    ) -> CFTypeRef;
}

fn product_name(device: IoObject) -> Option<String> {
    let key = CFString::from_static_string("Product");
    let value =
        unsafe { IORegistryEntryCreateCFProperty(device, key.as_CFTypeRef(), std::ptr::null(), 0) };
    if value.is_null() {
        return None;
    }
    let value = unsafe { CFType::wrap_under_create_rule(value) };
    value.downcast::<CFString>().map(|name| name.to_string())
}

/// Returns whether any keyboard other than Kanata's own virtual keyboard was found.
fn drain_connected_keyboards(iterator: IoIterator) -> bool {
    let mut found_keyboard = false;
    loop {
        let device = unsafe { IOIteratorNext(iterator) };
        if device == 0 {
            break;
        }
        let is_virtual = product_name(device)
            .is_some_and(|name| name.starts_with(KARABINER_VIRTUAL_KEYBOARD_PREFIX));
        if !is_virtual {
            found_keyboard = true;
        }
        unsafe { IOObjectRelease(device) };
    }
    found_keyboard
}

extern "C" fn on_keyboards_matched(ref_con: *mut c_void, iterator: IoIterator) {
    let sender = unsafe { &*(ref_con as *const Sender<()>) };
    if drain_connected_keyboards(iterator) {
        let _ = sender.send(());
    }
}

fn keyboard_matching_dictionary() -> CFDictionary<CFString, CFType> {
    let usage_match = CFDictionary::from_CFType_pairs(&[
        (
            CFString::from_static_string("PrimaryUsagePage"),
            CFNumber::from(HID_USAGE_PAGE_GENERIC_DESKTOP).as_CFType(),
        ),
        (
            CFString::from_static_string("PrimaryUsage"),
            CFNumber::from(HID_USAGE_KEYBOARD).as_CFType(),
        ),
    ]);
    CFDictionary::from_CFType_pairs(&[
        (
            CFString::from_static_string("IOProviderClass"),
            CFString::from_static_string("IOHIDDevice").as_CFType(),
        ),
        (
            CFString::from_static_string("IOPropertyMatch"),
            usage_match.as_CFType(),
        ),
    ])
}

fn run_keyboard_notifications(sender: Sender<()>) {
    let port = unsafe { IONotificationPortCreate(IO_MAIN_PORT_DEFAULT) };
    if port.is_null() {
        log::warn!("Keyboard watch disabled: failed to create IOKit notification port");
        return;
    }

    let source =
        unsafe { CFRunLoopSource::wrap_under_get_rule(IONotificationPortGetRunLoopSource(port)) };
    let run_loop = CFRunLoop::get_current();
    run_loop.add_source(&source, unsafe { kCFRunLoopDefaultMode });

    // The callback reads this sender for as long as the run loop below runs, which is forever.
    let ref_con = Box::into_raw(Box::new(sender)) as *mut c_void;

    // IOServiceAddMatchingNotification consumes one reference to the matching dictionary.
    let matching = keyboard_matching_dictionary();
    let matching_ref = matching.as_CFTypeRef();
    std::mem::forget(matching);

    let mut iterator: IoIterator = 0;
    let result = unsafe {
        IOServiceAddMatchingNotification(
            port,
            IO_FIRST_MATCH_NOTIFICATION.as_ptr() as *const c_char,
            matching_ref,
            on_keyboards_matched,
            ref_con,
            &mut iterator,
        )
    };
    if result != 0 {
        log::warn!("Keyboard watch disabled: IOServiceAddMatchingNotification returned {result}");
        return;
    }

    // Draining the iterator arms the notification. These are keyboards that were already
    // connected, which Kanata picked up when it started.
    drain_connected_keyboards(iterator);

    CFRunLoop::run_current();
}

/// Calls `on_connect` once a newly connected keyboard has finished registering.
pub fn watch_keyboard_connections(on_connect: impl Fn() + Send + 'static) {
    let (sender, receiver) = mpsc::channel::<()>();

    thread::spawn(move || run_keyboard_notifications(sender));

    thread::spawn(move || {
        while receiver.recv().is_ok() {
            loop {
                match receiver.recv_timeout(CONNECT_SETTLE_TIME) {
                    Ok(()) => continue,
                    Err(RecvTimeoutError::Timeout) => break,
                    Err(RecvTimeoutError::Disconnected) => return,
                }
            }
            on_connect();
        }
    });
}
