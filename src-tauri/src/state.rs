use std::sync::{Arc, Mutex};

#[cfg(not(target_os = "macos"))]
use std::process::Child;

pub const KANATA_STATUS_IDLE: &str = "idle";
pub const KANATA_STATUS_STARTING: &str = "starting";
pub const KANATA_STATUS_RUNNING: &str = "running";
pub const KANATA_STATUS_STOPPING: &str = "stopping";
pub const KANATA_STATUS_ERROR: &str = "error";

#[derive(Clone)]
pub struct AppState {
    pub kanata: Arc<Mutex<KanataProcessState>>,
    pub karabiner: Arc<Mutex<KarabinerInstallState>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            kanata: Arc::new(Mutex::new(KanataProcessState::default())),
            karabiner: Arc::new(Mutex::new(KarabinerInstallState::default())),
        }
    }
}

pub struct KanataProcessState {
    pub status: String,
    pub intentional_stop: bool,
    #[cfg(not(target_os = "macos"))]
    pub child: Option<Child>,
    #[cfg(target_os = "macos")]
    pub daemon_monitor_running: bool,
}

impl Default for KanataProcessState {
    fn default() -> Self {
        Self {
            status: KANATA_STATUS_IDLE.to_string(),
            intentional_stop: false,
            #[cfg(not(target_os = "macos"))]
            child: None,
            #[cfg(target_os = "macos")]
            daemon_monitor_running: false,
        }
    }
}

pub struct KarabinerInstallState {
    pub installing: bool,
    pub cancel_requested: bool,
    pub current_pid: Option<u32>,
}

impl Default for KarabinerInstallState {
    fn default() -> Self {
        Self {
            installing: false,
            cancel_requested: false,
            current_pid: None,
        }
    }
}
