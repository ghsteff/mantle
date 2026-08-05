mod events;
mod state;

use events::{
    emit_driver_install_complete, emit_driver_install_output, emit_kanata_error, emit_kanata_log,
    set_kanata_status, KanataCrashEvent, KANATA_EVENT_CRASH, KANATA_EVENT_EXCLUSIVE_ACCESS_DENIED,
    KANATA_EVENT_PERMISSION_DENIED,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use state::{
    AppState, KanataProcessState, KarabinerInstallState, KANATA_STATUS_ERROR, KANATA_STATUS_IDLE,
    KANATA_STATUS_RUNNING, KANATA_STATUS_STARTING, KANATA_STATUS_STOPPING,
};
#[cfg(not(target_os = "macos"))]
use std::io::Read;
use std::io::{BufRead, BufReader};
#[cfg(not(target_os = "macos"))]
use std::process::Stdio;
#[cfg(target_os = "macos")]
use std::process::{ExitStatus, Stdio};
use std::{
    fs,
    path::PathBuf,
    process::Command,
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, State};
const DAEMON_LABEL: &str = "com.mantle.kanata";
const DAEMON_PLIST_PATH: &str = "/Library/LaunchDaemons/com.mantle.kanata.plist";
const VHID_DAEMON_LABEL: &str = "com.mantle.vhid-daemon";
const VHID_DAEMON_PLIST_PATH: &str = "/Library/LaunchDaemons/com.mantle.vhid-daemon.plist";
const DAEMON_LOG_DIR: &str = "/var/log/mantle";
const DAEMON_STDOUT_LOG: &str = "/var/log/mantle/kanata.log";
const DAEMON_STDERR_LOG: &str = "/var/log/mantle/kanata.error.log";
const VHID_DAEMON_STDOUT_LOG: &str = "/var/log/mantle/vhid-daemon.log";
const VHID_DAEMON_STDERR_LOG: &str = "/var/log/mantle/vhid-daemon.error.log";
const SUDOERS_PATH: &str = "/etc/sudoers.d/mantle";
const KARABINER_DRIVER_PATH: &str =
    "/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice";
const VHID_MANAGER_PATH: &str = "/Applications/.Karabiner-VirtualHIDDevice-Manager.app/Contents/MacOS/Karabiner-VirtualHIDDevice-Manager";
const VHID_DAEMON_PATH: &str = "/Library/Application Support/org.pqrs/Karabiner-DriverKit-VirtualHIDDevice/Applications/Karabiner-VirtualHIDDevice-Daemon.app/Contents/MacOS/Karabiner-VirtualHIDDevice-Daemon";
const DRIVERKIT_PKG_ID: &str = "org.pqrs.Karabiner-DriverKit-VirtualHIDDevice";
const HOMEBREW_ARM64_PATH: &str = "/opt/homebrew/bin/brew";
const HOMEBREW_X64_PATH: &str = "/usr/local/bin/brew";
const KARABINER_CASKROOM_ARM64: &str = "/opt/homebrew/Caskroom/karabiner-elements";
const KARABINER_CASKROOM_X64: &str = "/usr/local/Caskroom/karabiner-elements";
/// Must match the VirtualHIDDevice IPC that the bundled Kanata binary speaks.
const SUPPORTED_VHID_PACKAGE_VERSION: &str = "6.2.0";
const VHID_MANAGER_INFO_PLIST: &str =
    "/Applications/.Karabiner-VirtualHIDDevice-Manager.app/Contents/Info.plist";
const TRUSTED_VHID_PKG_SIGNER: &str = "Fumihiko Takayama";

#[cfg(target_os = "macos")]
fn vhid_pkg_download_url() -> String {
    format!(
        "https://github.com/pqrs-org/Karabiner-DriverKit-VirtualHIDDevice/releases/download/v{SUPPORTED_VHID_PACKAGE_VERSION}/Karabiner-DriverKit-VirtualHIDDevice-{SUPPORTED_VHID_PACKAGE_VERSION}.pkg"
    )
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfilesData {
    active_profile: String,
    profiles: Vec<ProfileInfo>,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProfileInfo {
    name: String,
    created_at: String,
    updated_at: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DriverStatusPayload {
    driver_installed: bool,
    driver_activated: bool,
    driver_pending_approval: bool,
    pkg_available: bool,
    homebrew_installed: bool,
    installed_version: Option<String>,
    supported_version: String,
    version_compatible: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportKbdResult {
    success: bool,
    path: Option<String>,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportKbdFileResult {
    success: bool,
    file_path: Option<String>,
    content: Option<String>,
    error: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfigPathsPayload {
    json: String,
    kbd: String,
    dir: String,
}

fn tauri_config_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    let app_data_dir = app.path().app_data_dir().ok()?;
    let config_dir = app_data_dir.join("kanata");
    if fs::create_dir_all(&config_dir).is_err() {
        return None;
    }

    Some(config_dir)
}

fn read_json(path: &PathBuf) -> Option<serde_json::Value> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn is_valid_profile_name(name: &str) -> bool {
    let name = name.trim();
    if name.is_empty() || name.len() > 64 {
        return false;
    }

    // Allowlist to keep names safe for use in file paths.
    // Note: this is security-oriented validation; UI can still present friendlier rules.
    name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn is_allowed_backup_path(app: &tauri::AppHandle, backup: &PathBuf) -> bool {
    let Some(config_dir) = tauri_config_dir(app) else {
        return false;
    };
    let Ok(config_dir) = fs::canonicalize(config_dir) else {
        return false;
    };
    let Ok(backup) = fs::canonicalize(backup) else {
        return false;
    };
    if !backup.starts_with(&config_dir) {
        return false;
    }

    let Some(file_name) = backup.file_name().and_then(|name| name.to_str()) else {
        return false;
    };
    file_name.starts_with("backup-") && file_name.ends_with(".json")
}

fn first_valid_profile_name(profiles: &[ProfileInfo]) -> Option<String> {
    profiles
        .iter()
        .find(|profile| is_valid_profile_name(&profile.name))
        .map(|profile| profile.name.clone())
}

fn read_profiles_data(path: &PathBuf) -> Option<ProfilesData> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn write_profiles_data(path: &PathBuf, data: &ProfilesData) -> bool {
    let Ok(content) = serde_json::to_string_pretty(data) else {
        return false;
    };

    write_file_atomic(path, content.as_bytes())
}

fn write_file_atomic(path: &PathBuf, bytes: &[u8]) -> bool {
    let temp_path = path.with_extension(format!(
        "{}.tmp",
        path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("file")
    ));

    if fs::write(&temp_path, bytes).is_err() {
        return false;
    }

    fs::rename(&temp_path, path).is_ok()
}

fn read_active_profile_name(path: &PathBuf) -> Option<String> {
    let profiles_data = read_profiles_data(path)?;
    if profiles_data.active_profile.is_empty() {
        return None;
    }

    if !is_valid_profile_name(&profiles_data.active_profile) {
        return None;
    }

    Some(profiles_data.active_profile)
}

fn default_export_kbd_name(config_dir: &PathBuf) -> String {
    let profiles_path = config_dir.join("profiles.json");
    let active_profile_name = read_active_profile_name(&profiles_path);

    active_profile_name
        .map(|name| format!("{name}.kbd"))
        .unwrap_or_else(|| "kanata.kbd".to_string())
}

fn current_timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(target_os = "macos")]
fn wait_for_kanata_pid_gone(timeout_ms: u64) -> bool {
    let iterations = (timeout_ms / 100).max(1);
    for _ in 0..iterations {
        if find_kanata_pid().is_none() {
            return true;
        }
        thread::sleep(Duration::from_millis(100));
    }

    false
}

#[cfg(target_os = "macos")]
fn spawn_daemon_exit_monitor(app: tauri::AppHandle, kanata_state: Arc<Mutex<KanataProcessState>>) {
    let should_spawn = {
        let Ok(mut state) = kanata_state.lock() else {
            return;
        };

        if state.daemon_monitor_running {
            false
        } else {
            state.daemon_monitor_running = true;
            true
        }
    };

    if !should_spawn {
        return;
    }

    thread::spawn(move || {
        loop {
            thread::sleep(Duration::from_secs(2));

            let (status, intentional_stop) = {
                let Ok(state) = kanata_state.lock() else {
                    break;
                };
                (state.status.clone(), state.intentional_stop)
            };

            if status == KANATA_STATUS_IDLE || status == KANATA_STATUS_ERROR {
                break;
            }

            if status == KANATA_STATUS_STARTING || status == KANATA_STATUS_STOPPING {
                continue;
            }

            if status != KANATA_STATUS_RUNNING {
                continue;
            }

            if find_kanata_pid().is_some() {
                continue;
            }

            if intentional_stop {
                break;
            }

            emit_kanata_error(&app, "Kanata exited unexpectedly");
            let _ = app.emit(
                KANATA_EVENT_CRASH,
                KanataCrashEvent {
                    code: None,
                    signal: None,
                },
            );
            set_kanata_status(&app, &kanata_state, KANATA_STATUS_ERROR);
            break;
        }

        if let Ok(mut state) = kanata_state.lock() {
            state.daemon_monitor_running = false;
        }
    });
}

fn resolve_kanata_binary_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    let binary_name = {
        if cfg!(target_arch = "aarch64") {
            "kanata_windows_gui_winIOv2_arm64.exe"
        } else {
            "kanata_windows_gui_winIOv2_x64.exe"
        }
    };

    #[cfg(target_os = "macos")]
    let binary_name = {
        if cfg!(target_arch = "aarch64") {
            "kanata_macos_arm64"
        } else {
            "kanata_macos_x64"
        }
    };

    #[cfg(target_os = "linux")]
    let binary_name = "kanata_linux_x64";

    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join(binary_name));
    }

    candidates.push(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("bin")
            .join(binary_name),
    );

    if let Ok(current_dir) = std::env::current_dir() {
        candidates.push(current_dir.join("bin").join(binary_name));
    }

    for candidate in candidates {
        if candidate.exists() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(metadata) = fs::metadata(&candidate) {
                    let mut permissions = metadata.permissions();
                    if permissions.mode() & 0o111 == 0 {
                        permissions.set_mode(0o755);
                        let _ = fs::set_permissions(&candidate, permissions);
                    }
                }
            }
            return Some(candidate);
        }
    }

    None
}

fn format_rows(items: &[String]) -> String {
    let row_lengths = [13usize, 14, 14, 13, 12, 7];
    let mut lines = Vec::new();
    let mut index = 0usize;

    for row_length in row_lengths {
        if index >= items.len() {
            break;
        }

        let row_end = (index + row_length).min(items.len());
        let row = items[index..row_end]
            .iter()
            .map(|item| format!("{item:<4}"))
            .collect::<Vec<String>>()
            .join(" ");
        lines.push(format!("  {row}"));
        index = row_end;
    }

    if index < items.len() {
        let row = items[index..]
            .iter()
            .map(|item| format!("{item:<4}"))
            .collect::<Vec<String>>()
            .join(" ");
        lines.push(format!("  {row}"));
    }

    lines.join("\n")
}

fn generate_kbd_config(config: &Value) -> Option<String> {
    let source_keys = config
        .get("sourceKeys")?
        .as_array()?
        .iter()
        .map(|value| value.as_str().map(ToString::to_string))
        .collect::<Option<Vec<String>>>()?;

    let layers = config.get("layers")?.as_array()?;

    let mut lines = vec![
        ";; Generated by Mantle".to_string(),
        ";; Do not edit manually - changes will be overwritten".to_string(),
        String::new(),
        "(defcfg\n  process-unmapped-keys yes\n)".to_string(),
        String::new(),
        format!("(defsrc\n{}\n)", format_rows(&source_keys)),
        String::new(),
    ];

    if let Some(aliases) = config.get("aliases").and_then(Value::as_object) {
        if !aliases.is_empty() {
            lines.push("(defalias".to_string());
            for (alias, action) in aliases {
                if let Some(action) = action.as_str() {
                    lines.push(format!("  {alias} {action}"));
                }
            }
            lines.push(")".to_string());
            lines.push(String::new());
        }
    }

    for layer in layers {
        let layer_name = layer.get("name")?.as_str()?;
        let layer_keys = layer.get("keys")?.as_object()?;
        let actions = source_keys
            .iter()
            .map(|key| {
                layer_keys
                    .get(key)
                    .and_then(Value::as_str)
                    .unwrap_or("_")
                    .to_string()
            })
            .collect::<Vec<String>>();

        lines.push(format!(
            "(deflayer {layer_name}\n{}\n)",
            format_rows(&actions)
        ));
        lines.push(String::new());
    }

    Some(lines.join("\n"))
}

fn write_kbd_file(config_dir: &PathBuf, config: &Value) -> bool {
    let Some(content) = generate_kbd_config(config) else {
        return false;
    };

    fs::write(config_dir.join("kanata.kbd"), content).is_ok()
}

fn parse_and_emit_kanata_stderr(app: &tauri::AppHandle, line: &str) {
    if line.contains("rootonly/vhidd_server") && line.contains("Permission denied") {
        emit_kanata_error(
            app,
            "Kanata requires elevated launch for DriverKit access. Retrying with LaunchDaemon privileges.",
        );
    }

    if line.contains("not permitted") && line.contains("IOHIDDeviceOpen") {
        let _ = app.emit(KANATA_EVENT_PERMISSION_DENIED, ());
    }

    if line.contains("exclusive access") || line.contains("device already open") {
        let _ = app.emit(KANATA_EVENT_EXCLUSIVE_ACCESS_DENIED, ());
    }
}

#[cfg(not(target_os = "macos"))]
fn spawn_output_reader<R: Read + Send + 'static>(
    app: tauri::AppHandle,
    reader: R,
    log_type: &'static str,
) {
    thread::spawn(move || {
        let buffered = BufReader::new(reader);
        for line in buffered.lines() {
            let Ok(line) = line else {
                continue;
            };

            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            if log_type == "stderr" {
                parse_and_emit_kanata_stderr(&app, trimmed);
            }

            emit_kanata_log(&app, log_type, trimmed.to_string());
        }
    });
}

#[cfg(unix)]
#[cfg(not(target_os = "macos"))]
fn exit_signal(status: &std::process::ExitStatus) -> Option<String> {
    use std::os::unix::process::ExitStatusExt;
    status.signal().map(|signal| signal.to_string())
}

#[cfg(not(unix))]
#[cfg(not(target_os = "macos"))]
fn exit_signal(_status: &std::process::ExitStatus) -> Option<String> {
    None
}

#[cfg(not(target_os = "macos"))]
fn spawn_exit_monitor(app: tauri::AppHandle, kanata_state: Arc<Mutex<KanataProcessState>>) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(300));

        let mut exit_status = None;
        let mut was_intentional_stop = false;

        {
            let Ok(mut state) = kanata_state.lock() else {
                break;
            };

            if let Some(child) = state.child.as_mut() {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        exit_status = Some(status);
                        was_intentional_stop = state.intentional_stop;
                        state.child = None;
                    }
                    Ok(None) => {}
                    Err(_) => {
                        exit_status = None;
                    }
                }
            } else {
                break;
            }
        }

        if let Some(status) = exit_status {
            if was_intentional_stop {
                set_kanata_status(&app, &kanata_state, KANATA_STATUS_IDLE);
                emit_kanata_log(&app, "stdout", "Kanata stopped");
                break;
            }

            emit_kanata_error(
                &app,
                format!("Kanata exited unexpectedly with status: {status}"),
            );
            let _ = app.emit(
                KANATA_EVENT_CRASH,
                KanataCrashEvent {
                    code: status.code(),
                    signal: exit_signal(&status),
                },
            );
            set_kanata_status(&app, &kanata_state, "error");
            break;
        }
    });
}

#[cfg(target_os = "macos")]
fn escape_for_applescript(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

#[cfg(target_os = "macos")]
fn shell_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}

#[cfg(target_os = "macos")]
fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(target_os = "macos")]
fn run_admin_shell(command: &str) -> Result<String, String> {
    let script = format!(
        "do shell script \"{}\" with administrator privileges",
        escape_for_applescript(command)
    );
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|error| format!("Failed to launch osascript: {error}"))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err("Administrator command failed".to_string())
        } else {
            Err(stderr)
        }
    }
}

#[cfg(target_os = "macos")]
fn run_admin_command(program: &str, args: &[&str]) -> Result<String, String> {
    // osascript "do shell script" only accepts a string command; build it from
    // individually-escaped argv parts to avoid shell injection via interpolation.
    let mut parts = Vec::with_capacity(args.len() + 1);
    parts.push(shell_single_quote(program));
    parts.extend(args.iter().map(|arg| shell_single_quote(arg)));
    run_admin_shell(&parts.join(" "))
}

#[cfg(target_os = "macos")]
fn run_command(program: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|error| format!("Failed to run command '{program}': {error}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if stderr.is_empty() {
            Err("Command failed".to_string())
        } else {
            Err(stderr)
        }
    }
}

#[cfg(target_os = "macos")]
fn is_safe_unix_username(username: &str) -> bool {
    !username.is_empty()
        && username
            .chars()
            .all(|char| char.is_ascii_alphanumeric() || char == '_' || char == '-' || char == '.')
}

#[cfg(target_os = "macos")]
fn generate_sudoers_content(username: &str) -> String {
    format!(
        "# Mantle - Allow passwordless control of Kanata and VirtualHID daemons\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl bootstrap system/ {DAEMON_PLIST_PATH}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl bootout system/{DAEMON_LABEL}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl kickstart -k system/{DAEMON_LABEL}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl kickstart system/{DAEMON_LABEL}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl kill * system/{DAEMON_LABEL}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl bootstrap system/ {VHID_DAEMON_PLIST_PATH}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl bootout system/{VHID_DAEMON_LABEL}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl kickstart -k system/{VHID_DAEMON_LABEL}\n\
{username} ALL=(root) NOPASSWD: /bin/launchctl kickstart system/{VHID_DAEMON_LABEL}\n\
{username} ALL=(root) NOPASSWD: /usr/bin/truncate -s 0 {DAEMON_STDOUT_LOG} {DAEMON_STDERR_LOG}\n"
    )
}

#[cfg(target_os = "macos")]
fn generate_launchdaemon_plist(binary_path: &str, kbd_path: &str) -> String {
    let escaped_binary_path = xml_escape(binary_path);
    let escaped_kbd_path = xml_escape(kbd_path);
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n\
<plist version=\"1.0\">\n\
<dict>\n\
  <key>Label</key>\n\
  <string>{DAEMON_LABEL}</string>\n\
  <key>ProgramArguments</key>\n\
  <array>\n\
    <string>{escaped_binary_path}</string>\n\
    <string>-n</string>\n\
    <string>-c</string>\n\
    <string>{escaped_kbd_path}</string>\n\
  </array>\n\
  <key>RunAtLoad</key>\n\
  <false/>\n\
  <key>KeepAlive</key>\n\
  <false/>\n\
  <key>StandardOutPath</key>\n\
  <string>{DAEMON_STDOUT_LOG}</string>\n\
  <key>StandardErrorPath</key>\n\
  <string>{DAEMON_STDERR_LOG}</string>\n\
</dict>\n\
</plist>"
    )
}

#[cfg(target_os = "macos")]
fn generate_vhid_launchdaemon_plist() -> String {
    let escaped_binary_path = xml_escape(VHID_DAEMON_PATH);
    format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n\
<plist version=\"1.0\">\n\
<dict>\n\
  <key>Label</key>\n\
  <string>{VHID_DAEMON_LABEL}</string>\n\
  <key>ProgramArguments</key>\n\
  <array>\n\
    <string>{escaped_binary_path}</string>\n\
  </array>\n\
  <key>RunAtLoad</key>\n\
  <true/>\n\
  <key>KeepAlive</key>\n\
  <true/>\n\
  <key>StandardOutPath</key>\n\
  <string>{VHID_DAEMON_STDOUT_LOG}</string>\n\
  <key>StandardErrorPath</key>\n\
  <string>{VHID_DAEMON_STDERR_LOG}</string>\n\
</dict>\n\
</plist>"
    )
}

#[cfg(target_os = "macos")]
fn find_kanata_pid() -> Option<u32> {
    let output = run_command("pgrep", &["-f", "kanata_(macos|linux|windows)"]).ok()?;
    output.lines().next()?.trim().parse::<u32>().ok()
}

#[cfg(target_os = "macos")]
fn emit_recent_daemon_logs(app: &tauri::AppHandle) {
    for (path, log_type) in [(DAEMON_STDOUT_LOG, "stdout"), (DAEMON_STDERR_LOG, "stderr")] {
        let Ok(content) = fs::read_to_string(path) else {
            continue;
        };

        for line in content
            .lines()
            .rev()
            .take(50)
            .collect::<Vec<&str>>()
            .into_iter()
            .rev()
        {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            if log_type == "stderr" {
                parse_and_emit_kanata_stderr(app, trimmed);
            }

            emit_kanata_log(app, log_type, trimmed.to_string());
        }
    }
}

#[cfg(target_os = "macos")]
fn current_username() -> Result<String, String> {
    if let Ok(user) = std::env::var("USER") {
        let trimmed = user.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }

    let output = Command::new("id")
        .arg("-un")
        .output()
        .map_err(|error| format!("Failed to resolve current username: {error}"))?;

    if !output.status.success() {
        return Err("Failed to resolve current username".to_string());
    }

    let username = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if username.is_empty() {
        return Err("Resolved empty username".to_string());
    }

    if !is_safe_unix_username(&username) {
        return Err("Resolved unsafe username; cannot write sudoers entry".to_string());
    }

    Ok(username)
}

#[cfg(target_os = "macos")]
fn daemon_setup_needs_repair(app: &tauri::AppHandle, kbd_path: &PathBuf) -> Result<bool, String> {
    if !PathBuf::from(DAEMON_PLIST_PATH).exists()
        || !PathBuf::from(VHID_DAEMON_PLIST_PATH).exists()
        || !PathBuf::from(SUDOERS_PATH).exists()
    {
        return Ok(true);
    }

    let Some(binary_path) = resolve_kanata_binary_path(app) else {
        return Err("Kanata binary not found in app resources or local bin directory".to_string());
    };
    let expected_plist_binary = binary_path.display().to_string();
    let expected_plist_kbd = kbd_path.display().to_string();

    // `/etc/sudoers.d/mantle` is intentionally root-protected, so reading it as the app user
    // can fail even when setup is valid. Treat unreadable files as "assume valid" to avoid
    // repeated password prompts; we still self-heal if passwordless launchctl later fails.
    match fs::read_to_string(DAEMON_PLIST_PATH) {
        Ok(actual_plist) => Ok(!actual_plist.contains(&expected_plist_binary)
            || !actual_plist.contains(&expected_plist_kbd)),
        Err(_) => Ok(false),
    }
}

#[cfg(target_os = "macos")]
fn install_passwordless_launchdaemon(
    app: &tauri::AppHandle,
    kbd_path: &PathBuf,
) -> Result<(), String> {
    let Some(binary_path) = resolve_kanata_binary_path(app) else {
        return Err("Kanata binary not found in app resources or local bin directory".to_string());
    };

    let Some(config_dir) = tauri_config_dir(app) else {
        return Err("Failed to resolve config directory".to_string());
    };

    let username = current_username()?;
    let temp_plist_path = config_dir.join("com.mantle.kanata.plist");
    let temp_vhid_plist_path = config_dir.join("com.mantle.vhid-daemon.plist");
    let temp_sudoers_path = config_dir.join("mantle-sudoers");
    let plist_content = generate_launchdaemon_plist(
        &binary_path.display().to_string(),
        &kbd_path.display().to_string(),
    );
    fs::write(&temp_plist_path, plist_content)
        .map_err(|error| format!("Failed to write LaunchDaemon plist: {error}"))?;
    fs::write(&temp_vhid_plist_path, generate_vhid_launchdaemon_plist())
        .map_err(|error| format!("Failed to write VirtualHID LaunchDaemon plist: {error}"))?;

    let sudoers_content = generate_sudoers_content(&username);
    fs::write(&temp_sudoers_path, sudoers_content)
        .map_err(|error| format!("Failed to write temporary sudoers file: {error}"))?;

    let temp_plist = temp_plist_path.to_string_lossy().to_string();
    let temp_vhid_plist = temp_vhid_plist_path.to_string_lossy().to_string();
    let temp_sudoers = temp_sudoers_path.to_string_lossy().to_string();

    let vhid_target = format!("system/{VHID_DAEMON_LABEL}");
    let daemon_target = format!("system/{DAEMON_LABEL}");

    // Build a single shell script so the user only sees one admin password prompt.
    let q = shell_single_quote;
    let script = format!(
        "\
/bin/mkdir -p {log_dir} && \
/bin/cp {tmp_plist} {dst_plist} && \
/usr/sbin/chown root:wheel {dst_plist} && \
/bin/chmod 644 {dst_plist} && \
/bin/cp {tmp_vhid} {dst_vhid} && \
/usr/sbin/chown root:wheel {dst_vhid} && \
/bin/chmod 644 {dst_vhid} && \
/bin/cp {tmp_sudoers} {dst_sudoers} && \
/usr/sbin/chown root:wheel {dst_sudoers} && \
/bin/chmod 440 {dst_sudoers} && \
/bin/launchctl bootout {vhid_target} 2>/dev/null; \
/bin/launchctl bootstrap system/ {dst_vhid} && \
/bin/launchctl bootout {daemon_target} 2>/dev/null; \
/bin/launchctl bootstrap system/ {dst_plist}",
        log_dir = q(DAEMON_LOG_DIR),
        tmp_plist = q(&temp_plist),
        dst_plist = q(DAEMON_PLIST_PATH),
        tmp_vhid = q(&temp_vhid_plist),
        dst_vhid = q(VHID_DAEMON_PLIST_PATH),
        tmp_sudoers = q(&temp_sudoers),
        dst_sudoers = q(SUDOERS_PATH),
        vhid_target = q(&vhid_target),
        daemon_target = q(&daemon_target),
    );

    let result = run_admin_shell(&script).map(|_| ());

    let _ = fs::remove_file(temp_plist_path);
    let _ = fs::remove_file(temp_vhid_plist_path);
    let _ = fs::remove_file(temp_sudoers_path);

    result
}

#[cfg(target_os = "macos")]
fn ensure_passwordless_launchdaemon(
    app: &tauri::AppHandle,
    kbd_path: &PathBuf,
) -> Result<(), String> {
    match daemon_setup_needs_repair(app, kbd_path)? {
        false => Ok(()),
        true => {
            emit_kanata_log(
                app,
                "stdout",
                "One-time admin setup required to enable passwordless Kanata + VirtualHID control.",
            );
            install_passwordless_launchdaemon(app, kbd_path)
        }
    }
}

#[cfg(target_os = "macos")]
fn kickstart_launchdaemon_passwordless() -> Result<(), String> {
    let _ = run_command(
        "sudo",
        &[
            "-n",
            "/usr/bin/truncate",
            "-s",
            "0",
            DAEMON_STDOUT_LOG,
            DAEMON_STDERR_LOG,
        ],
    );
    run_command(
        "sudo",
        &[
            "-n",
            "/bin/launchctl",
            "kickstart",
            "-k",
            &format!("system/{DAEMON_LABEL}"),
        ],
    )
    .map(|_| ())
}

#[cfg(target_os = "macos")]
fn kickstart_vhid_daemon_passwordless() -> Result<(), String> {
    let daemon_target = format!("system/{VHID_DAEMON_LABEL}");
    run_command(
        "sudo",
        &["-n", "/bin/launchctl", "kickstart", &daemon_target],
    )
    .map(|_| ())
}

#[cfg(target_os = "macos")]
fn stop_launchdaemon_passwordless() -> Result<(), String> {
    let daemon_target = format!("system/{DAEMON_LABEL}");
    let _ = run_command(
        "sudo",
        &["-n", "/bin/launchctl", "kill", "SIGTERM", &daemon_target],
    );
    thread::sleep(Duration::from_millis(300));
    let _ = run_command(
        "sudo",
        &["-n", "/bin/launchctl", "kill", "SIGKILL", &daemon_target],
    );
    Ok(())
}

#[cfg(target_os = "macos")]
fn start_kanata_via_launchdaemon(
    app: &tauri::AppHandle,
    kanata_state: &Arc<Mutex<KanataProcessState>>,
) -> bool {
    if let Ok(mut state) = kanata_state.lock() {
        if state.status == KANATA_STATUS_STOPPING {
            emit_kanata_log(
                app,
                "stdout",
                "Kanata stop is still in progress. Retry start in a moment.",
            );
            return false;
        }
        state.intentional_stop = false;
    }

    set_kanata_status(app, kanata_state, KANATA_STATUS_STARTING);

    let Some(config_dir) = tauri_config_dir(app) else {
        emit_kanata_error(app, "Failed to resolve config directory");
        set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
        return false;
    };

    let kbd_path = config_dir.join("kanata.kbd");
    if !kbd_path.exists() {
        emit_kanata_error(
            app,
            format!(
                "Kanata config file not found at {}. Save configuration once before starting.",
                kbd_path.display()
            ),
        );
        set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
        return false;
    }

    if let Err(error) = ensure_passwordless_launchdaemon(app, &kbd_path) {
        emit_kanata_error(app, format!("Failed to install LaunchDaemon: {error}"));
        set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
        return false;
    }

    // Request extension activation only when not already active.
    let ext_status = check_system_extension_status();
    if !ext_status.activated && PathBuf::from(VHID_MANAGER_PATH).exists() {
        let _ = activate_driver();
        thread::sleep(Duration::from_millis(500));
    }

    if let Err(error) = kickstart_vhid_daemon_passwordless() {
        emit_kanata_log(
            app,
            "stdout",
            format!("VirtualHID daemon launch failed, retrying setup: {error}"),
        );
        if let Err(install_error) = install_passwordless_launchdaemon(app, &kbd_path) {
            emit_kanata_error(
                app,
                format!("Failed to reinstall VirtualHID daemon permissions: {install_error}"),
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        }

        if let Err(retry_error) = kickstart_vhid_daemon_passwordless() {
            emit_kanata_error(
                app,
                format!("Failed to start VirtualHID daemon: {retry_error}"),
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        }
    }

    // Give the daemon a short moment to bind its socket before Kanata connects.
    thread::sleep(Duration::from_millis(300));

    if let Err(error) = kickstart_launchdaemon_passwordless() {
        emit_kanata_log(
            app,
            "stdout",
            format!("Passwordless launch failed, retrying setup: {error}"),
        );
        if let Err(install_error) = install_passwordless_launchdaemon(app, &kbd_path) {
            emit_kanata_error(
                app,
                format!("Failed to reinstall LaunchDaemon permissions: {install_error}"),
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        }

        if let Err(retry_error) = kickstart_launchdaemon_passwordless() {
            emit_kanata_error(
                app,
                format!("Failed to start LaunchDaemon after reinstall: {retry_error}"),
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        }
    }

    for _ in 0..10 {
        if let Some(pid) = find_kanata_pid() {
            emit_kanata_log(app, "stdout", format!("Kanata started (PID: {pid})"));
            set_kanata_status(app, kanata_state, KANATA_STATUS_RUNNING);
            spawn_daemon_exit_monitor(app.clone(), kanata_state.clone());

            thread::sleep(Duration::from_millis(500));
            emit_recent_daemon_logs(app);

            if let Ok(log) = fs::read_to_string(DAEMON_STDOUT_LOG) {
                if log.contains("connect_failed") {
                    stop_kanata_via_launchdaemon(app, kanata_state);
                    emit_kanata_error(app, connect_failed_error_message());
                    set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
                    return false;
                }
            }

            return true;
        }
        thread::sleep(Duration::from_millis(300));
    }

    emit_recent_daemon_logs(app);
    emit_kanata_error(app, "Kanata failed to start via LaunchDaemon");
    set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
    false
}

#[cfg(target_os = "macos")]
fn stop_kanata_via_launchdaemon(
    app: &tauri::AppHandle,
    kanata_state: &Arc<Mutex<KanataProcessState>>,
) -> bool {
    if find_kanata_pid().is_none() {
        set_kanata_status(app, kanata_state, KANATA_STATUS_IDLE);
        emit_kanata_log(app, "stdout", "Kanata is already stopped");
        return true;
    }

    if let Ok(mut state) = kanata_state.lock() {
        state.intentional_stop = true;
    }

    set_kanata_status(app, kanata_state, KANATA_STATUS_STOPPING);

    let Some(config_dir) = tauri_config_dir(app) else {
        emit_kanata_error(app, "Failed to resolve config directory");
        set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
        return false;
    };

    let kbd_path = config_dir.join("kanata.kbd");
    if let Err(error) = ensure_passwordless_launchdaemon(app, &kbd_path) {
        emit_kanata_error(
            app,
            format!("Failed to prepare passwordless LaunchDaemon stop: {error}"),
        );
        set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
        return false;
    }

    if let Err(error) = stop_launchdaemon_passwordless() {
        emit_kanata_log(
            app,
            "stdout",
            format!("Passwordless stop failed, retrying setup: {error}"),
        );
        if let Err(install_error) = install_passwordless_launchdaemon(app, &kbd_path) {
            emit_kanata_error(
                app,
                format!("Failed to reinstall LaunchDaemon permissions: {install_error}"),
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        }
        if let Err(retry_error) = stop_launchdaemon_passwordless() {
            emit_kanata_error(
                app,
                format!("Failed to stop LaunchDaemon after reinstall: {retry_error}"),
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        }
    }

    if !wait_for_kanata_pid_gone(2_500) {
        emit_recent_daemon_logs(app);
        emit_kanata_error(app, "Timed out waiting for Kanata to stop");
        set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
        return false;
    }

    set_kanata_status(app, kanata_state, KANATA_STATUS_IDLE);
    emit_kanata_log(app, "stdout", "Kanata stopped");
    true
}

fn stop_kanata_process(
    app: &tauri::AppHandle,
    kanata_state: &Arc<Mutex<KanataProcessState>>,
) -> bool {
    #[cfg(target_os = "macos")]
    {
        return stop_kanata_via_launchdaemon(app, kanata_state);
    }

    #[cfg(not(target_os = "macos"))]
    {
        set_kanata_status(app, kanata_state, KANATA_STATUS_STOPPING);

        let mut child = {
            let Ok(mut state) = kanata_state.lock() else {
                emit_kanata_error(app, "Failed to stop Kanata: state lock poisoned");
                return false;
            };

            state.intentional_stop = true;
            state.child.take()
        };

        if let Some(process) = child.as_mut() {
            emit_kanata_log(app, "stdout", "Stopping Kanata...");
            let _ = process.kill();
            let _ = process.wait();
        }

        set_kanata_status(app, kanata_state, KANATA_STATUS_IDLE);
        true
    }
}

fn start_kanata_process(
    app: &tauri::AppHandle,
    kanata_state: &Arc<Mutex<KanataProcessState>>,
) -> bool {
    #[cfg(target_os = "macos")]
    {
        return start_kanata_via_launchdaemon(app, kanata_state);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut already_running = false;
        {
            let Ok(mut state) = kanata_state.lock() else {
                emit_kanata_error(app, "Failed to start Kanata: state lock poisoned");
                return false;
            };

            if state.status == KANATA_STATUS_STOPPING {
                emit_kanata_log(
                    app,
                    "stdout",
                    "Kanata stop is still in progress. Retry start in a moment.",
                );
                return false;
            }

            if let Some(child) = state.child.as_mut() {
                match child.try_wait() {
                    Ok(None) => {
                        already_running = true;
                    }
                    Ok(Some(_)) | Err(_) => {
                        state.child = None;
                    }
                }
            }

            state.intentional_stop = false;
        }

        if already_running {
            set_kanata_status(app, kanata_state, KANATA_STATUS_RUNNING);
            emit_kanata_log(app, "stdout", "Kanata is already running");
            return true;
        }

        set_kanata_status(app, kanata_state, KANATA_STATUS_STARTING);

        let Some(binary_path) = resolve_kanata_binary_path(app) else {
            emit_kanata_error(
                app,
                "Kanata binary not found in app resources or local bin directory",
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        };

        let Some(config_dir) = tauri_config_dir(app) else {
            emit_kanata_error(app, "Failed to resolve config directory");
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        };

        let kbd_path = config_dir.join("kanata.kbd");
        if !kbd_path.exists() {
            emit_kanata_error(
                app,
                format!(
                    "Kanata config file not found at {}. Save configuration once before starting.",
                    kbd_path.display()
                ),
            );
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        }

        let mut command = Command::new(binary_path);
        command.arg("-n").arg("-c").arg(kbd_path);
        command.stdout(Stdio::piped());
        command.stderr(Stdio::piped());

        let Ok(mut child) = command.spawn() else {
            emit_kanata_error(app, "Failed to spawn Kanata process");
            set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
            return false;
        };

        let pid = child.id();

        if let Some(stdout) = child.stdout.take() {
            spawn_output_reader(app.clone(), stdout, "stdout");
        }

        if let Some(stderr) = child.stderr.take() {
            spawn_output_reader(app.clone(), stderr, "stderr");
        }

        {
            let Ok(mut state) = kanata_state.lock() else {
                emit_kanata_error(app, "Failed to finalize Kanata startup");
                let _ = child.kill();
                let _ = child.wait();
                set_kanata_status(app, kanata_state, KANATA_STATUS_ERROR);
                return false;
            };
            state.child = Some(child);
        }

        emit_kanata_log(app, "stdout", format!("Kanata started (PID: {pid})"));
        set_kanata_status(app, kanata_state, KANATA_STATUS_RUNNING);
        spawn_exit_monitor(app.clone(), kanata_state.clone());
        true
    }
}

#[cfg(target_os = "macos")]
fn is_cancelled(karabiner_state: &Arc<Mutex<KarabinerInstallState>>) -> bool {
    karabiner_state
        .lock()
        .map(|state| state.cancel_requested)
        .unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn set_karabiner_install_state(
    karabiner_state: &Arc<Mutex<KarabinerInstallState>>,
    installing: bool,
    cancel_requested: bool,
    current_pid: Option<u32>,
) {
    if let Ok(mut state) = karabiner_state.lock() {
        state.installing = installing;
        state.cancel_requested = cancel_requested;
        state.current_pid = current_pid;
    }
}

#[cfg(target_os = "macos")]
fn homebrew_path() -> Option<&'static str> {
    if PathBuf::from(HOMEBREW_ARM64_PATH).exists() {
        return Some(HOMEBREW_ARM64_PATH);
    }
    if PathBuf::from(HOMEBREW_X64_PATH).exists() {
        return Some(HOMEBREW_X64_PATH);
    }
    None
}

#[cfg(target_os = "macos")]
fn find_pkg_in_dir(path: &PathBuf) -> Option<String> {
    if !path.exists() {
        return None;
    }

    let entries = fs::read_dir(path).ok()?;
    for entry in entries.flatten() {
        let entry_path = entry.path();
        if entry_path.is_file() {
            if let Some(ext) = entry_path.extension() {
                if ext == "pkg" {
                    return Some(entry_path.display().to_string());
                }
            }
            continue;
        }

        if entry_path.is_dir() {
            if let Some(found) = find_pkg_in_dir(&entry_path) {
                return Some(found);
            }
        }
    }

    None
}

#[cfg(target_os = "macos")]
fn karabiner_pkg_path() -> Option<String> {
    // First check the Caskroom (populated by `brew install --cask`)
    for base in [KARABINER_CASKROOM_ARM64, KARABINER_CASKROOM_X64] {
        let path = PathBuf::from(base);
        if let Some(found) = find_pkg_in_dir(&path) {
            return Some(found);
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn read_process_lines<R: std::io::Read>(
    app: tauri::AppHandle,
    reader: R,
    karabiner_state: Arc<Mutex<KarabinerInstallState>>,
) {
    let buffered = BufReader::new(reader);
    for line in buffered.lines() {
        let Ok(line) = line else {
            continue;
        };
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if is_cancelled(&karabiner_state) {
            break;
        }
        emit_driver_install_output(&app, trimmed.to_string());
    }
}

/// Spawn a command with piped stdout/stderr, stream lines to the install UI, and wait.
#[cfg(target_os = "macos")]
fn run_streamed(
    mut command: Command,
    app: &tauri::AppHandle,
    karabiner_state: &Arc<Mutex<KarabinerInstallState>>,
) -> Result<ExitStatus, String> {
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to start process: {e}"))?;

    set_karabiner_install_state(karabiner_state, true, false, Some(child.id()));

    let stdout_handle = child.stdout.take().map(|stdout| {
        let app_handle = app.clone();
        let state = karabiner_state.clone();
        thread::spawn(move || read_process_lines(app_handle, stdout, state))
    });
    let stderr_handle = child.stderr.take().map(|stderr| {
        let app_handle = app.clone();
        let state = karabiner_state.clone();
        thread::spawn(move || read_process_lines(app_handle, stderr, state))
    });

    let status = child
        .wait()
        .map_err(|e| format!("Failed to wait for process: {e}"))?;

    if let Some(handle) = stdout_handle {
        let _ = handle.join();
    }
    if let Some(handle) = stderr_handle {
        let _ = handle.join();
    }

    Ok(status)
}

#[cfg(target_os = "macos")]
struct SystemExtensionStatus {
    activated: bool,
    pending_approval: bool,
}

#[cfg(target_os = "macos")]
fn check_system_extension_status() -> SystemExtensionStatus {
    let output = Command::new("systemextensionsctl").arg("list").output();

    let Ok(result) = output else {
        return SystemExtensionStatus {
            activated: false,
            pending_approval: false,
        };
    };

    let stdout = String::from_utf8_lossy(&result.stdout);
    let stderr = String::from_utf8_lossy(&result.stderr);

    // Parse per-line: multiple versions can coexist (e.g. old = enabled, new = waiting).
    // If ANY line for our extension is waiting for user approval, report not-yet-activated.
    let mut has_enabled = false;
    let mut has_waiting = false;

    for line in stdout.lines().chain(stderr.lines()) {
        if !line.contains(DRIVERKIT_PKG_ID) {
            continue;
        }
        if line.contains("[activated enabled]") {
            has_enabled = true;
        }
        if line.contains("[activated waiting for user]") {
            has_waiting = true;
        }
    }

    SystemExtensionStatus {
        activated: has_enabled && !has_waiting,
        pending_approval: has_waiting,
    }
}

#[cfg(target_os = "macos")]
fn read_pkgutil_driver_version() -> Option<String> {
    let output = Command::new("pkgutil")
        .args(["--pkg-info", DRIVERKIT_PKG_ID])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .find_map(|line| {
            line.strip_prefix("version:")
                .map(|v| v.trim().to_string())
                .filter(|v| !v.is_empty())
        })
}

#[cfg(target_os = "macos")]
fn read_manager_plist_version() -> Option<String> {
    let output = Command::new("plutil")
        .args([
            "-extract",
            "CFBundleShortVersionString",
            "raw",
            VHID_MANAGER_INFO_PLIST,
        ])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if version.is_empty() {
        None
    } else {
        Some(version)
    }
}

#[cfg(target_os = "macos")]
fn read_installed_driver_version() -> Option<String> {
    // Prefer receipt version (package_version), then Manager app bundle version.
    read_pkgutil_driver_version().or_else(read_manager_plist_version)
}

#[cfg(target_os = "macos")]
fn is_driver_version_compatible(installed_version: Option<&str>) -> bool {
    installed_version == Some(SUPPORTED_VHID_PACKAGE_VERSION)
}

#[cfg(target_os = "macos")]
fn driver_files_present() -> bool {
    PathBuf::from(KARABINER_DRIVER_PATH).exists() && PathBuf::from(VHID_MANAGER_PATH).exists()
}

#[cfg(target_os = "macos")]
fn pinned_driver_pkg_path() -> PathBuf {
    std::env::temp_dir().join(format!(
        "mantle-Karabiner-DriverKit-VirtualHIDDevice-{SUPPORTED_VHID_PACKAGE_VERSION}.pkg"
    ))
}

#[cfg(target_os = "macos")]
fn connect_failed_error_message() -> String {
    let ext = check_system_extension_status();
    if !ext.activated {
        return "Virtual keyboard driver service is not running. Enable Driver Extensions in System Settings, then reboot macOS once if it still fails.".to_string();
    }

    match read_installed_driver_version() {
        Some(version) if version != SUPPORTED_VHID_PACKAGE_VERSION => {
            format!(
                "Installed virtual keyboard driver is v{version}; Mantle requires v{SUPPORTED_VHID_PACKAGE_VERSION}. Reinstall the driver from Mantle settings. If Karabiner-Elements is also installed, it may upgrade the driver again."
            )
        }
        Some(_) => {
            "Virtual keyboard daemon IPC failed (driver appears enabled). Try restarting Mantle, or reinstall the driver.".to_string()
        }
        None => {
            format!(
                "Could not verify virtual keyboard driver version. Mantle requires v{SUPPORTED_VHID_PACKAGE_VERSION}. Reinstall the driver from Mantle settings."
            )
        }
    }
}

#[cfg(target_os = "macos")]
fn verify_driver_pkg_signature(pkg_path: &PathBuf) -> Result<(), String> {
    let output = Command::new("pkgutil")
        .args(["--check-signature", &pkg_path.display().to_string()])
        .output()
        .map_err(|e| format!("Failed to verify package signature: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout}\n{stderr}");

    if !output.status.success() {
        return Err(format!("Package signature check failed: {combined}"));
    }

    if !combined.contains(TRUSTED_VHID_PKG_SIGNER) {
        return Err(format!(
            "Package is not signed by the expected developer ({TRUSTED_VHID_PKG_SIGNER})"
        ));
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn download_pinned_driver_pkg(
    app: &tauri::AppHandle,
    karabiner_state: &Arc<Mutex<KarabinerInstallState>>,
    dest: &PathBuf,
) -> Result<(), String> {
    let _ = fs::remove_file(dest);

    emit_driver_install_output(
        app,
        format!(
            "Downloading Karabiner-DriverKit-VirtualHIDDevice v{SUPPORTED_VHID_PACKAGE_VERSION}..."
        ),
    );

    let mut command = Command::new("curl");
    command.args([
        "-fL",
        "--progress-bar",
        "-o",
        &dest.display().to_string(),
        &vhid_pkg_download_url(),
    ]);

    let status = run_streamed(command, app, karabiner_state)?;

    if is_cancelled(karabiner_state) {
        let _ = fs::remove_file(dest);
        return Err("Installation cancelled".to_string());
    }

    if !status.success() {
        let _ = fs::remove_file(dest);
        return Err(format!(
            "Download failed with exit code {}",
            status.code().unwrap_or(-1)
        ));
    }

    if !dest.exists() {
        return Err("Download completed but package file is missing".to_string());
    }

    Ok(())
}

#[cfg(target_os = "macos")]
fn install_pkg_elevated(pkg_path: &str) -> Result<(), String> {
    match run_admin_command("/usr/sbin/installer", &["-pkg", pkg_path, "-target", "/"]) {
        Ok(_) => Ok(()),
        Err(error) => {
            if error.contains("User canceled") || error.contains("(-128)") {
                Err("User cancelled the installation".to_string())
            } else {
                Err(format!("Installer failed: {error}"))
            }
        }
    }
}

#[cfg(target_os = "macos")]
fn activate_driver() -> Result<(), String> {
    let manager = PathBuf::from(VHID_MANAGER_PATH);
    if !manager.exists() {
        return Err(
            "VirtualHIDDevice Manager not found. Driver may not be installed correctly."
                .to_string(),
        );
    }

    let result = Command::new(VHID_MANAGER_PATH)
        .arg("activate")
        .output()
        .map_err(|e| format!("Failed to run driver activation: {e}"))?;

    if result.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr);
        Err(format!("Driver activation failed: {stderr}"))
    }
}

#[cfg(target_os = "macos")]
fn run_driver_install_flow(
    app: tauri::AppHandle,
    karabiner_state: Arc<Mutex<KarabinerInstallState>>,
) {
    if is_cancelled(&karabiner_state) {
        emit_driver_install_complete(&app, false, Some("Installation cancelled".to_string()));
        set_karabiner_install_state(&karabiner_state, false, false, None);
        return;
    }

    let installed_version = read_installed_driver_version();
    let version_compatible = is_driver_version_compatible(installed_version.as_deref());

    // Compatible install only needs activation.
    if driver_files_present() && version_compatible {
        emit_driver_install_output(
            &app,
            format!("Driver v{SUPPORTED_VHID_PACKAGE_VERSION} already installed. Activating..."),
        );
        match activate_driver() {
            Ok(()) => {
                emit_driver_install_output(
                    &app,
                    "Driver activation requested. Approve in System Settings if prompted.",
                );
                emit_driver_install_complete(&app, true, None);
            }
            Err(e) => {
                emit_driver_install_output(&app, format!("Activation issue: {e}"));
                emit_driver_install_complete(&app, true, None);
            }
        }
        set_karabiner_install_state(&karabiner_state, false, false, None);
        return;
    }

    if driver_files_present() && !version_compatible {
        let current = installed_version
            .as_deref()
            .unwrap_or("unknown");
        emit_driver_install_output(
            &app,
            format!(
                "Incompatible driver detected (v{current}). Installing v{SUPPORTED_VHID_PACKAGE_VERSION}..."
            ),
        );
    }

    let pkg_path = pinned_driver_pkg_path();
    if let Err(error) = download_pinned_driver_pkg(&app, &karabiner_state, &pkg_path) {
        emit_driver_install_complete(&app, false, Some(error));
        set_karabiner_install_state(&karabiner_state, false, false, None);
        return;
    }

    if is_cancelled(&karabiner_state) {
        let _ = fs::remove_file(&pkg_path);
        emit_driver_install_complete(&app, false, Some("Installation cancelled".to_string()));
        set_karabiner_install_state(&karabiner_state, false, false, None);
        return;
    }

    emit_driver_install_output(&app, "Verifying package signature...");
    if let Err(error) = verify_driver_pkg_signature(&pkg_path) {
        let _ = fs::remove_file(&pkg_path);
        emit_driver_install_complete(&app, false, Some(error));
        set_karabiner_install_state(&karabiner_state, false, false, None);
        return;
    }

    emit_driver_install_output(
        &app,
        format!("Installing driver package v{SUPPORTED_VHID_PACKAGE_VERSION}..."),
    );

    match install_pkg_elevated(&pkg_path.display().to_string()) {
        Ok(()) => {
            emit_driver_install_output(&app, "Driver installed successfully.");
        }
        Err(e) => {
            let _ = fs::remove_file(&pkg_path);
            emit_driver_install_complete(&app, false, Some(e));
            set_karabiner_install_state(&karabiner_state, false, false, None);
            return;
        }
    }

    let _ = fs::remove_file(&pkg_path);

    // Mark install as done before activation so the frontend can transition to the approve step.
    // activate_driver() may block while macOS shows the "allow extension" dialog.
    emit_driver_install_output(
        &app,
        "Driver installed. Requesting system extension activation...",
    );
    emit_driver_install_complete(&app, true, None);
    set_karabiner_install_state(&karabiner_state, false, false, None);

    let _ = activate_driver();

    // Bring the window back to front after activation (macOS may steal focus
    // for the system extension approval dialog).
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn driver_check() -> DriverStatusPayload {
    let ext = check_system_extension_status();
    let files_present = PathBuf::from(KARABINER_DRIVER_PATH).exists();
    let installed_version = match read_installed_driver_version() {
        Some(version) => Some(version),
        None if files_present => Some("unknown".to_string()),
        None => None,
    };
    let version_compatible = is_driver_version_compatible(installed_version.as_deref());

    DriverStatusPayload {
        // Treat an incompatible install as not ready so onboarding offers repair.
        driver_installed: files_present && version_compatible,
        driver_activated: ext.activated && version_compatible,
        driver_pending_approval: ext.pending_approval && version_compatible,
        pkg_available: pinned_driver_pkg_path().exists() || karabiner_pkg_path().is_some(),
        homebrew_installed: homebrew_path().is_some(),
        installed_version,
        supported_version: SUPPORTED_VHID_PACKAGE_VERSION.to_string(),
        version_compatible,
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn driver_check() -> DriverStatusPayload {
    DriverStatusPayload {
        driver_installed: true,
        driver_activated: true,
        driver_pending_approval: false,
        pkg_available: false,
        homebrew_installed: true,
        installed_version: Some(SUPPORTED_VHID_PACKAGE_VERSION.to_string()),
        supported_version: SUPPORTED_VHID_PACKAGE_VERSION.to_string(),
        version_compatible: true,
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn driver_install(app: tauri::AppHandle, state: State<AppState>) -> bool {
    let can_start = {
        let Ok(mut install_state) = state.karabiner.lock() else {
            return false;
        };
        if install_state.installing {
            false
        } else {
            install_state.installing = true;
            install_state.cancel_requested = false;
            install_state.current_pid = None;
            true
        }
    };

    if !can_start {
        return false;
    }

    let app_handle = app.clone();
    let karabiner_state = state.karabiner.clone();
    thread::spawn(move || run_driver_install_flow(app_handle, karabiner_state));
    true
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn driver_install(_app: tauri::AppHandle, _state: State<AppState>) -> bool {
    false
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn driver_cancel_install(state: State<AppState>) {
    let pid = {
        let Ok(mut install_state) = state.karabiner.lock() else {
            return;
        };
        install_state.cancel_requested = true;
        install_state.current_pid
    };

    if let Some(pid) = pid {
        let _ = Command::new("kill")
            .arg("-TERM")
            .arg(pid.to_string())
            .status();
    }
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn driver_cancel_install(_state: State<AppState>) {}

#[cfg(target_os = "macos")]
#[tauri::command]
fn driver_activate_cmd() -> bool {
    activate_driver().is_ok()
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn driver_activate_cmd() -> bool {
    true
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn driver_open_pkg() -> bool {
    let Some(pkg_path) = karabiner_pkg_path() else {
        return false;
    };

    Command::new("open")
        .arg(pkg_path)
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn driver_open_pkg() -> bool {
    false
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn driver_launch_app() -> bool {
    Command::new("open")
        .arg("-a")
        .arg("Karabiner-Elements")
        .status()
        .map(|status| status.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn driver_launch_app() -> bool {
    false
}

#[cfg(target_os = "macos")]
#[tauri::command]
fn open_extension_settings() {
    let _ = Command::new("open")
        .arg("x-apple.systempreferences:com.apple.LoginItems-Settings.extension")
        .status();
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
fn open_extension_settings() {}

#[tauri::command]
fn health_check() -> &'static str {
    "mantle-tauri-ready"
}

#[tauri::command]
fn kanata_get_status(state: State<AppState>) -> String {
    state
        .kanata
        .lock()
        .map(|process_state| process_state.status.clone())
        .unwrap_or_else(|_| "error".to_string())
}

#[tauri::command]
fn kanata_start(app: tauri::AppHandle, state: State<AppState>) -> bool {
    let app_handle = app.clone();
    let kanata_state = state.kanata.clone();
    thread::spawn(move || {
        start_kanata_process(&app_handle, &kanata_state);
    });
    true
}

#[tauri::command]
fn kanata_stop(app: tauri::AppHandle, state: State<AppState>) -> bool {
    let app_handle = app.clone();
    let kanata_state = state.kanata.clone();
    thread::spawn(move || {
        stop_kanata_process(&app_handle, &kanata_state);
    });
    true
}

#[tauri::command]
fn kanata_restart(app: tauri::AppHandle, state: State<AppState>) -> bool {
    // Run restart in the background to avoid blocking the UI thread on waits/sleeps.
    // The frontend already listens to status/log events for actual progress.
    let app_handle = app.clone();
    let kanata_state = state.kanata.clone();
    thread::spawn(move || {
        if stop_kanata_process(&app_handle, &kanata_state) {
            start_kanata_process(&app_handle, &kanata_state);
        }
    });
    true
}

#[tauri::command]
fn open_input_monitoring_settings(app: tauri::AppHandle) -> bool {
    #[cfg(target_os = "macos")]
    {
        let opened_settings = Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent")
            .status()
            .map(|status| status.success())
            .unwrap_or(false);

        if let Some(binary_path) = resolve_kanata_binary_path(&app) {
            let _ = Command::new("open").arg("-R").arg(binary_path).status();
        }

        return opened_settings;
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[tauri::command]
fn config_load(app: tauri::AppHandle) -> Option<serde_json::Value> {
    let config_dir = tauri_config_dir(&app)?;

    let profiles_path = config_dir.join("profiles.json");
    if profiles_path.exists() {
        if let Some(active_profile_name) = read_active_profile_name(&profiles_path) {
            let profile_config_path = config_dir.join(format!("config-{active_profile_name}.json"));
            if profile_config_path.exists() {
                if let Some(profile_config) = read_json(&profile_config_path) {
                    return Some(profile_config);
                }
            }
        }
    }

    let legacy_config_path = config_dir.join("config.json");
    if legacy_config_path.exists() {
        return read_json(&legacy_config_path);
    }

    None
}

#[tauri::command]
fn config_get_paths(app: tauri::AppHandle) -> Option<ConfigPathsPayload> {
    let config_dir = tauri_config_dir(&app)?;
    let profiles_path = config_dir.join("profiles.json");
    let active_profile_name = read_active_profile_name(&profiles_path);
    let json_path = active_profile_name
        .map(|name| config_dir.join(format!("config-{name}.json")))
        .unwrap_or_else(|| config_dir.join("config.json"));

    Some(ConfigPathsPayload {
        json: json_path.display().to_string(),
        kbd: config_dir.join("kanata.kbd").display().to_string(),
        dir: config_dir.display().to_string(),
    })
}

#[tauri::command]
fn config_backup(app: tauri::AppHandle) -> Option<String> {
    let config_dir = tauri_config_dir(&app)?;
    let profiles_path = config_dir.join("profiles.json");
    let active_profile_name = read_active_profile_name(&profiles_path);
    let source_path = active_profile_name
        .as_ref()
        .map(|name| config_dir.join(format!("config-{name}.json")))
        .unwrap_or_else(|| config_dir.join("config.json"));
    if !source_path.exists() {
        return None;
    }

    let profile_name = active_profile_name.unwrap_or_else(|| "legacy".to_string());
    let backup_name = format!("backup-{profile_name}-{}.json", current_timestamp_ms());
    let backup_path = config_dir.join(backup_name);
    if fs::copy(source_path, &backup_path).is_err() {
        return None;
    }

    Some(backup_path.display().to_string())
}

#[tauri::command]
fn config_list_backups(app: tauri::AppHandle) -> Vec<String> {
    let Some(config_dir) = tauri_config_dir(&app) else {
        return Vec::new();
    };

    let mut backups = fs::read_dir(config_dir)
        .ok()
        .into_iter()
        .flat_map(|entries| entries.flatten())
        .filter_map(|entry| {
            let file_name = entry.file_name().to_string_lossy().to_string();
            if file_name.starts_with("backup-") && file_name.ends_with(".json") {
                if !entry
                    .file_type()
                    .ok()
                    .map(|kind| kind.is_file())
                    .unwrap_or(false)
                {
                    return None;
                }
                return Some(entry.path().display().to_string());
            }
            None
        })
        .collect::<Vec<String>>();

    backups.sort_by(|a, b| b.cmp(a));
    backups
}

#[tauri::command]
fn config_restore_backup(app: tauri::AppHandle, backup_path: String) -> bool {
    let backup = PathBuf::from(backup_path);
    if !backup.exists() {
        return false;
    }
    if !is_allowed_backup_path(&app, &backup) {
        return false;
    }

    let Ok(content) = fs::read_to_string(&backup) else {
        return false;
    };
    let Ok(config) = serde_json::from_str::<Value>(&content) else {
        return false;
    };
    if !config.get("sourceKeys").and_then(Value::as_array).is_some()
        || !config.get("layers").and_then(Value::as_array).is_some()
    {
        return false;
    }

    config_save(app, config)
}

#[tauri::command]
fn config_save(app: tauri::AppHandle, config: serde_json::Value) -> bool {
    let Some(config_dir) = tauri_config_dir(&app) else {
        return false;
    };

    let profiles_path = config_dir.join("profiles.json");
    if let Some(active_profile_name) = read_active_profile_name(&profiles_path) {
        let profile_config_path = config_dir.join(format!("config-{active_profile_name}.json"));
        let config_content = match serde_json::to_string_pretty(&config) {
            Ok(content) => content,
            Err(_) => return false,
        };
        let saved = write_file_atomic(&profile_config_path, config_content.as_bytes());

        if !saved {
            return false;
        }

        return write_kbd_file(&config_dir, &config);
    }

    let legacy_config_path = config_dir.join("config.json");
    let config_content = match serde_json::to_string_pretty(&config) {
        Ok(content) => content,
        Err(_) => return false,
    };
    let saved = write_file_atomic(&legacy_config_path, config_content.as_bytes());

    if !saved {
        return false;
    }

    write_kbd_file(&config_dir, &config)
}

#[tauri::command]
fn config_export_kbd(app: tauri::AppHandle) -> ExportKbdResult {
    let Some(config_dir) = tauri_config_dir(&app) else {
        return ExportKbdResult {
            success: false,
            path: None,
            error: Some("Failed to resolve app config directory".to_string()),
        };
    };

    let kbd_path = config_dir.join("kanata.kbd");
    if !kbd_path.exists() {
        return ExportKbdResult {
            success: false,
            path: None,
            error: Some("Failed to export file".to_string()),
        };
    }

    let picked_path = rfd::FileDialog::new()
        .set_title("Export .kbd Configuration")
        .set_file_name(&default_export_kbd_name(&config_dir))
        .add_filter("Kanata Config", &["kbd"])
        .save_file();

    let Some(target_path) = picked_path else {
        return ExportKbdResult {
            success: false,
            path: None,
            error: Some("Export cancelled".to_string()),
        };
    };

    if fs::copy(&kbd_path, &target_path).is_ok() {
        return ExportKbdResult {
            success: true,
            path: Some(target_path.display().to_string()),
            error: None,
        };
    }

    ExportKbdResult {
        success: false,
        path: None,
        error: Some("Failed to export file".to_string()),
    }
}

#[tauri::command]
fn config_import_kbd() -> ImportKbdFileResult {
    let picked_path = rfd::FileDialog::new()
        .set_title("Import .kbd Configuration")
        .add_filter("Kanata Config", &["kbd"])
        .pick_file();

    let Some(file_path) = picked_path else {
        return ImportKbdFileResult {
            success: false,
            file_path: None,
            content: None,
            error: Some("Import cancelled".to_string()),
        };
    };

    match fs::read_to_string(&file_path) {
        Ok(content) => ImportKbdFileResult {
            success: true,
            file_path: Some(file_path.display().to_string()),
            content: Some(content),
            error: None,
        },
        Err(_) => ImportKbdFileResult {
            success: false,
            file_path: None,
            content: None,
            error: Some("Failed to read import file".to_string()),
        },
    }
}

#[tauri::command]
fn profiles_list(app: tauri::AppHandle) -> Vec<ProfileInfo> {
    let Some(config_dir) = tauri_config_dir(&app) else {
        return Vec::new();
    };

    let profiles_path = config_dir.join("profiles.json");
    if !profiles_path.exists() {
        return Vec::new();
    }

    read_profiles_data(&profiles_path)
        .map(|data| data.profiles)
        .unwrap_or_default()
}

#[tauri::command]
fn profiles_get_active(app: tauri::AppHandle) -> Option<String> {
    let config_dir = tauri_config_dir(&app)?;
    let profiles_path = config_dir.join("profiles.json");
    if !profiles_path.exists() {
        return None;
    }

    read_active_profile_name(&profiles_path)
}

#[tauri::command]
fn profiles_has_any(app: tauri::AppHandle) -> bool {
    let Some(config_dir) = tauri_config_dir(&app) else {
        return false;
    };
    let profiles_path = config_dir.join("profiles.json");
    let Some(data) = read_profiles_data(&profiles_path) else {
        return false;
    };

    !data.profiles.is_empty()
}

#[tauri::command]
fn profiles_create(
    app: tauri::AppHandle,
    name: String,
    config: serde_json::Value,
    created_at: String,
    updated_at: String,
) -> bool {
    if !is_valid_profile_name(&name) {
        return false;
    }
    let Some(config_dir) = tauri_config_dir(&app) else {
        return false;
    };

    let profiles_path = config_dir.join("profiles.json");
    let mut profiles_data = read_profiles_data(&profiles_path).unwrap_or(ProfilesData {
        active_profile: String::new(),
        profiles: Vec::new(),
    });

    if profiles_data
        .profiles
        .iter()
        .any(|profile| profile.name == name)
    {
        return false;
    }

    profiles_data.profiles.push(ProfileInfo {
        name: name.clone(),
        created_at,
        updated_at,
    });

    if profiles_data.active_profile.is_empty() {
        profiles_data.active_profile = name.clone();
    }

    if !write_profiles_data(&profiles_path, &profiles_data) {
        return false;
    }

    let config_path = config_dir.join(format!("config-{name}.json"));
    let Ok(config_content) = serde_json::to_string_pretty(&config) else {
        return false;
    };

    if !write_file_atomic(&config_path, config_content.as_bytes()) {
        return false;
    }

    if profiles_data.active_profile == name {
        return write_kbd_file(&config_dir, &config);
    }

    true
}

#[tauri::command]
fn profiles_switch(app: tauri::AppHandle, name: String) -> Option<serde_json::Value> {
    if !is_valid_profile_name(&name) {
        return None;
    }
    let config_dir = tauri_config_dir(&app)?;
    let profiles_path = config_dir.join("profiles.json");
    let mut profiles_data = read_profiles_data(&profiles_path)?;

    if !profiles_data
        .profiles
        .iter()
        .any(|profile| profile.name == name)
    {
        return None;
    }

    let config_path = config_dir.join(format!("config-{name}.json"));
    let config = read_json(&config_path)?;

    profiles_data.active_profile = name;
    if !write_profiles_data(&profiles_path, &profiles_data) {
        return None;
    }

    if !write_kbd_file(&config_dir, &config) {
        return None;
    }

    Some(config)
}

#[tauri::command]
fn profiles_delete(app: tauri::AppHandle, name: String) -> bool {
    if !is_valid_profile_name(&name) {
        return false;
    }
    let Some(config_dir) = tauri_config_dir(&app) else {
        return false;
    };

    let profiles_path = config_dir.join("profiles.json");
    let mut profiles_data = match read_profiles_data(&profiles_path) {
        Some(data) => data,
        None => return false,
    };

    if profiles_data.profiles.len() <= 1 {
        return false;
    }

    let Some(profile_index) = profiles_data
        .profiles
        .iter()
        .position(|profile| profile.name == name)
    else {
        return false;
    };

    let deleting_active = profiles_data.active_profile == name;
    profiles_data.profiles.remove(profile_index);
    if deleting_active {
        let Some(next_profile_name) = first_valid_profile_name(&profiles_data.profiles) else {
            return false;
        };
        profiles_data.active_profile = next_profile_name;
    }

    if !write_profiles_data(&profiles_path, &profiles_data) {
        return false;
    }

    let config_path = config_dir.join(format!("config-{name}.json"));
    if config_path.exists() {
        if !fs::remove_file(config_path).is_ok() {
            return false;
        }
    }

    if deleting_active {
        if !is_valid_profile_name(&profiles_data.active_profile) {
            return false;
        }
        let next_config_path = config_dir.join(format!("config-{}.json", profiles_data.active_profile));
        let Some(next_config) = read_json(&next_config_path) else {
            return false;
        };
        return write_kbd_file(&config_dir, &next_config);
    }

    true
}

#[tauri::command]
fn profiles_rename(
    app: tauri::AppHandle,
    old_name: String,
    new_name: String,
    updated_at: String,
) -> bool {
    if !is_valid_profile_name(&old_name) || !is_valid_profile_name(&new_name) {
        return false;
    }
    let Some(config_dir) = tauri_config_dir(&app) else {
        return false;
    };

    let profiles_path = config_dir.join("profiles.json");
    let mut profiles_data = match read_profiles_data(&profiles_path) {
        Some(data) => data,
        None => return false,
    };

    if profiles_data
        .profiles
        .iter()
        .any(|profile| profile.name == new_name)
    {
        return false;
    }

    let Some(profile) = profiles_data
        .profiles
        .iter_mut()
        .find(|profile| profile.name == old_name)
    else {
        return false;
    };
    profile.name = new_name.clone();
    profile.updated_at = updated_at;

    if profiles_data.active_profile == old_name {
        profiles_data.active_profile = new_name.clone();
    }

    if !write_profiles_data(&profiles_path, &profiles_data) {
        return false;
    }

    let old_config_path = config_dir.join(format!("config-{old_name}.json"));
    let new_config_path = config_dir.join(format!("config-{new_name}.json"));
    if old_config_path.exists() {
        fs::rename(old_config_path, new_config_path).is_ok()
    } else {
        true
    }
}

fn open_main_window(app_handle: &tauri::AppHandle) {
    let Some(window) = app_handle.get_webview_window("main") else {
        return;
    };

    #[cfg(target_os = "macos")]
    let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Regular);

    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, "open_mantle", "Open Mantle", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit_mantle", "Quit Mantle", true, None::<&str>)?;
    let tray_menu = Menu::with_items(app, &[&open_item, &quit_item])?;

    let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray-icon@2x.png"))?;

    TrayIconBuilder::with_id("mantle-tray")
        .icon(tray_icon)
        .icon_as_template(true)
        .menu(&tray_menu)
        .on_menu_event(|app: &tauri::AppHandle, event: tauri::menu::MenuEvent| {
            match event.id().as_ref() {
                "open_mantle" => open_main_window(app),
                "quit_mantle" => app.exit(0),
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            health_check,
            kanata_get_status,
            kanata_start,
            kanata_stop,
            kanata_restart,
            driver_check,
            driver_install,
            driver_cancel_install,
            driver_activate_cmd,
            driver_open_pkg,
            driver_launch_app,
            open_extension_settings,
            open_input_monitoring_settings,
            config_load,
            config_save,
            config_get_paths,
            config_backup,
            config_list_backups,
            config_restore_backup,
            config_export_kbd,
            config_import_kbd,
            profiles_list,
            profiles_get_active,
            profiles_has_any,
            profiles_create,
            profiles_switch,
            profiles_delete,
            profiles_rename
        ])
        .setup(|app| {
            build_tray(app)?;

            open_main_window(app.handle());

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::WindowEvent { label, event, .. } => {
            if label != "main" {
                return;
            }

            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.hide();
                }
                #[cfg(target_os = "macos")]
                let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
        }
        tauri::RunEvent::Exit => {
            let state = app_handle.state::<AppState>();
            let _ = stop_kanata_process(app_handle, &state.kanata);
        }
        _ => {}
    });
}
