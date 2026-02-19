use crate::state::KanataProcessState;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;

pub const KANATA_EVENT_LOG: &str = "kanata-log";
pub const KANATA_EVENT_STATUS_CHANGE: &str = "kanata-status-change";
pub const KANATA_EVENT_CRASH: &str = "kanata-crash";
pub const KANATA_EVENT_ERROR: &str = "kanata-error";
pub const KANATA_EVENT_PERMISSION_DENIED: &str = "kanata-permission-denied";
pub const KANATA_EVENT_EXCLUSIVE_ACCESS_DENIED: &str = "kanata-exclusive-access-denied";
pub const KARABINER_EVENT_INSTALL_OUTPUT: &str = "karabiner-install-output";
pub const KARABINER_EVENT_INSTALL_COMPLETE: &str = "karabiner-install-complete";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KanataLogEvent {
    pub r#type: String,
    pub message: String,
    pub timestamp: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KanataCrashEvent {
    pub code: Option<i32>,
    pub signal: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriverInstallCompletePayload {
    pub success: bool,
    pub error: Option<String>,
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

pub fn emit_kanata_log(app: &tauri::AppHandle, log_type: &str, message: impl Into<String>) {
    let _ = app.emit(
        KANATA_EVENT_LOG,
        KanataLogEvent {
            r#type: log_type.to_string(),
            message: message.into(),
            timestamp: current_timestamp_ms(),
        },
    );
}

pub fn emit_kanata_error(app: &tauri::AppHandle, message: impl Into<String>) {
    let message = message.into();
    let _ = app.emit(KANATA_EVENT_ERROR, message.clone());
    emit_kanata_log(app, "stderr", message);
}

pub fn set_kanata_status(
    app: &tauri::AppHandle,
    kanata_state: &Arc<Mutex<KanataProcessState>>,
    status: &str,
) {
    let mut should_emit = false;
    {
        let Ok(mut state) = kanata_state.lock() else {
            return;
        };

        if state.status != status {
            state.status = status.to_string();
            should_emit = true;
        }
    }

    if should_emit {
        let _ = app.emit(KANATA_EVENT_STATUS_CHANGE, status.to_string());
    }
}

pub fn emit_driver_install_output(app: &tauri::AppHandle, message: impl Into<String>) {
    let _ = app.emit(KARABINER_EVENT_INSTALL_OUTPUT, message.into());
}

pub fn emit_driver_install_complete(
    app: &tauri::AppHandle,
    success: bool,
    error: Option<String>,
) {
    let _ = app.emit(
        KARABINER_EVENT_INSTALL_COMPLETE,
        DriverInstallCompletePayload { success, error },
    );
}
