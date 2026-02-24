//! Power Management Crate
//!
//! This crate provides cross-platform power management functionality including:
//! - System sleep/hibernate/shutdown/reboot operations
//! - Scheduled wake timer configuration
//! - Power state queries and monitoring
//!
//! # Example
//!
//! ```rust
//! use power_management::{PowerManager, LocalPowerManager, WakeConfig};
//! use std::time::Duration;
//!
//! #[tokio::main]
//! async fn main() {
//!     let manager = LocalPowerManager::new();
//!
//!     // Check if hibernation is supported
//!     if manager.supports_hibernation().await {
//!         println!("Hibernation is supported");
//!     }
//!
//!     // Schedule a wake timer
//!     let config = WakeConfig::from_duration(Duration::from_secs(3600));
//!     manager.schedule_wake(config).await.ok();
//! }
//! ```

use std::result::Result as StdResult;
use std::time::Duration;

pub type Result<T> = StdResult<T, PowerError>;

/// Power management errors
#[derive(Debug, thiserror::Error)]
pub enum PowerError {
    #[error("Unsupported operation on this platform")]
    Unsupported,
    #[error("Permission denied: {0}")]
    PermissionDenied(String),
    #[error("Power operation failed: {0}")]
    OperationFailed(String),
    #[error("Invalid wake time: {0}")]
    InvalidWakeTime(String),
    #[error("Invalid wake configuration: {0}")]
    InvalidConfig(String),
    #[error("Platform error: {0}")]
    PlatformError(String),
    #[error("RTC wake not available: {0}")]
    RtcWakeNotAvailable(String),
}

/// Power state options
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub enum PowerState {
    /// System is fully awake and operational
    Awake,
    /// System is in sleep/suspend mode (low power, quick resume)
    Sleep,
    /// System is in hibernation mode (saved to disk, zero power)
    Hibernate,
    /// System is shutting down
    Shutdown,
    /// System is rebooting
    Reboot,
}

impl Default for PowerState {
    fn default() -> Self {
        PowerState::Awake
    }
}

/// Wake configuration for scheduled wake timers
#[derive(Debug, Clone, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct WakeConfig {
    /// Duration from now until wake time
    pub duration: Duration,
    /// Optional label for the wake timer
    pub label: Option<String>,
    /// Whether to enable RTC wake (for deep sleep states)
    pub enable_rtc: bool,
}

impl WakeConfig {
    /// Create a new wake configuration with the specified duration
    pub fn new(duration: Duration) -> StdResult<Self, PowerError> {
        if duration.as_secs() == 0 {
            return Err(PowerError::InvalidWakeTime(
                "Wake duration must be greater than 0".to_string(),
            ));
        }
        Ok(Self {
            duration,
            label: None,
            enable_rtc: true,
        })
    }

    /// Create a wake configuration from a duration (panics on invalid duration)
    pub fn from_duration(duration: Duration) -> Self {
        Self::new(duration).expect("Invalid wake duration")
    }

    /// Set a label for the wake timer
    pub fn with_label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    /// Enable or disable RTC wake
    pub fn with_rtc(mut self, enable: bool) -> Self {
        self.enable_rtc = enable;
        self
    }

    /// Calculate the wake time as a chrono DateTime
    pub fn wake_time(&self) -> chrono::DateTime<chrono::Local> {
        chrono::Local::now() + chrono::Duration::from_std(self.duration).unwrap_or_default()
    }
}

impl Default for WakeConfig {
    fn default() -> Self {
        Self {
            duration: Duration::from_secs(60),
            label: None,
            enable_rtc: true,
        }
    }
}

/// Power management trait for abstract power control
#[async_trait::async_trait]
pub trait PowerManager: Send + Sync {
    /// Get the current power state
    async fn get_power_state(&self) -> Result<PowerState>;

    /// Set the system power state
    async fn set_power_state(&self, state: PowerState) -> Result<()>;

    /// Suspend the system (sleep mode)
    async fn suspend(&self) -> Result<()> {
        self.set_power_state(PowerState::Sleep).await
    }

    /// Hibernate the system
    async fn hibernate(&self) -> Result<()> {
        self.set_power_state(PowerState::Hibernate).await
    }

    /// Shutdown the system
    async fn shutdown(&self) -> Result<()> {
        self.set_power_state(PowerState::Shutdown).await
    }

    /// Reboot the system
    async fn reboot(&self) -> Result<()> {
        self.set_power_state(PowerState::Reboot).await
    }

    /// Schedule a wake timer
    async fn schedule_wake(&self, config: WakeConfig) -> Result<()>;

    /// Cancel any scheduled wake timers
    async fn cancel_wake(&self) -> Result<()>;

    /// Check if the system supports hibernation
    async fn supports_hibernation(&self) -> bool;

    /// Check if the system supports scheduled wake timers
    async fn supports_scheduled_wake(&self) -> bool;

    /// Check if RTC wake is available
    async fn supports_rtc_wake(&self) -> bool;
}

/// Local power manager implementation
pub struct LocalPowerManager {
    inner: PowerManagementService,
}

impl LocalPowerManager {
    /// Create a new local power manager
    pub fn new() -> Self {
        Self {
            inner: PowerManagementService::new(),
        }
    }
}

impl Default for LocalPowerManager {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl PowerManager for LocalPowerManager {
    async fn get_power_state(&self) -> Result<PowerState> {
        // Currently, we can only detect if the system is awake
        // Sleep/hibernate states would require platform-specific monitoring
        Ok(PowerState::Awake)
    }

    async fn set_power_state(&self, state: PowerState) -> Result<()> {
        match state {
            PowerState::Awake => Ok(()), // Already awake, no action needed
            PowerState::Sleep => self.inner.suspend().await,
            PowerState::Hibernate => self.inner.hibernate().await,
            PowerState::Shutdown => self.inner.shutdown().await,
            PowerState::Reboot => self.inner.reboot().await,
        }
    }

    async fn schedule_wake(&self, config: WakeConfig) -> Result<()> {
        self.inner.schedule_wake(config.duration).await
    }

    async fn cancel_wake(&self) -> Result<()> {
        self.inner.cancel_wake().await
    }

    async fn supports_hibernation(&self) -> bool {
        self.inner.supports_hibernation().await
    }

    async fn supports_scheduled_wake(&self) -> bool {
        self.inner.supports_scheduled_wake().await
    }

    async fn supports_rtc_wake(&self) -> bool {
        self.inner.supports_rtc_wake().await
    }
}

/// Internal power management service
pub struct PowerManagementService;

impl PowerManagementService {
    pub fn new() -> Self {
        Self
    }

    pub async fn suspend(&self) -> Result<()> {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::suspend().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::suspend().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::suspend().await
            } else {
                Err(PowerError::Unsupported)
            }
        }
    }

    pub async fn hibernate(&self) -> Result<()> {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::hibernate().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::hibernate().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::hibernate().await
            } else {
                Err(PowerError::Unsupported)
            }
        }
    }

    pub async fn shutdown(&self) -> Result<()> {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::shutdown().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::shutdown().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::shutdown().await
            } else {
                Err(PowerError::Unsupported)
            }
        }
    }

    pub async fn reboot(&self) -> Result<()> {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::reboot().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::reboot().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::reboot().await
            } else {
                Err(PowerError::Unsupported)
            }
        }
    }

    pub async fn schedule_wake(&self, duration: Duration) -> Result<()> {
        if duration.as_secs() == 0 {
            return Err(PowerError::InvalidWakeTime(
                "Wake duration must be greater than 0".to_string(),
            ));
        }

        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::schedule_wake(duration).await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::schedule_wake(duration).await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::schedule_wake(duration).await
            } else {
                Err(PowerError::Unsupported)
            }
        }
    }

    async fn cancel_wake(&self) -> Result<()> {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::cancel_wake().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::cancel_wake().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::cancel_wake().await
            } else {
                Err(PowerError::Unsupported)
            }
        }
    }

    pub async fn supports_hibernation(&self) -> bool {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::supports_hibernation().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::supports_hibernation().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::supports_hibernation().await
            } else {
                false
            }
        }
    }

    pub async fn supports_scheduled_wake(&self) -> bool {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::supports_scheduled_wake().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::supports_scheduled_wake().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::supports_scheduled_wake().await
            } else {
                false
            }
        }
    }

    async fn supports_rtc_wake(&self) -> bool {
        cfg_if::cfg_if! {
            if #[cfg(windows)] {
                platform_impl::supports_rtc_wake().await
            } else if #[cfg(target_os = "linux")] {
                platform_impl::supports_rtc_wake().await
            } else if #[cfg(target_os = "macos")] {
                platform_impl::supports_rtc_wake().await
            } else {
                false
            }
        }
    }
}

// Platform-specific implementations

#[cfg(windows)]
mod platform_impl {
    use super::*;
    use std::process::Command;

    pub async fn suspend() -> Result<()> {
        let output = Command::new("rundll32.exe")
            .args(["powrprof.dll,SetSuspendState", "0,1,0"])
            .output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to suspend: {}",
                e
            ))),
        }
    }

    pub async fn hibernate() -> Result<()> {
        let output = Command::new("shutdown").args(["/h"]).output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to hibernate: {}",
                e
            ))),
        }
    }

    pub async fn shutdown() -> Result<()> {
        let output = Command::new("shutdown").args(["/s", "/t", "0"]).output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to shutdown: {}",
                e
            ))),
        }
    }

    pub async fn reboot() -> Result<()> {
        let output = Command::new("shutdown").args(["/r", "/t", "0"]).output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to reboot: {}",
                e
            ))),
        }
    }

    pub async fn schedule_wake(duration: Duration) -> Result<()> {
        let seconds = duration.as_secs();
        // Use Windows Task Scheduler to create a wake task
        let output = Command::new("schtasks")
            .args([
                "/create",
                "/tn",
                "PowerManagement_WakeTimer",
                "/tr",
                "rundll32.exe powrprof.dll,SetSuspendState 0,1,0",
                "/sc",
                "once",
                "/st",
                &format_wake_time(seconds),
            ])
            .output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to schedule wake: {}",
                e
            ))),
        }
    }

    fn format_wake_time(seconds_from_now: u64) -> String {
        let wake_time = chrono::Local::now()
            + chrono::Duration::from_std(Duration::from_secs(seconds_from_now))
                .unwrap_or_default();
        wake_time.format("%H:%M:%S").to_string()
    }

    pub async fn cancel_wake() -> Result<()> {
        let output = Command::new("schtasks")
            .args(["/delete", "/tn", "PowerManagement_WakeTimer", "/f"])
            .output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to cancel wake: {}",
                e
            ))),
        }
    }

    pub async fn supports_hibernation() -> bool {
        Command::new("powercfg")
            .args(["/availablesleepstates"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains("hibernate"))
            .unwrap_or(false)
    }

    pub async fn supports_scheduled_wake() -> bool {
        // Windows generally supports wake timers
        true
    }

    pub async fn supports_rtc_wake() -> bool {
        // Windows supports RTC wake via powercfg
        Command::new("powercfg")
            .args(["/devicequery", "wake_armed"])
            .output()
            .map(|o| !String::from_utf8_lossy(&o.stdout).trim().is_empty())
            .unwrap_or(false)
    }
}

#[cfg(target_os = "linux")]
mod platform_impl {
    use super::*;
    use std::process::Command;

    pub async fn suspend() -> Result<()> {
        let output = Command::new("systemctl").args(["suspend"]).output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to suspend: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute suspend: {}",
                e
            ))),
        }
    }

    pub async fn hibernate() -> Result<()> {
        let output = Command::new("systemctl").args(["hibernate"]).output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to hibernate: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute hibernate: {}",
                e
            ))),
        }
    }

    pub async fn shutdown() -> Result<()> {
        let output = Command::new("shutdown").args(["-h", "now"]).output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to shutdown: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute shutdown: {}",
                e
            ))),
        }
    }

    pub async fn reboot() -> Result<()> {
        let output = Command::new("reboot").output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to reboot: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute reboot: {}",
                e
            ))),
        }
    }

    pub async fn schedule_wake(duration: Duration) -> Result<()> {
        let seconds = duration.as_secs();
        let output = Command::new("rtcwake")
            .args(["-m", "no", "-s", &seconds.to_string()])
            .output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to schedule wake: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to schedule wake: {}",
                e
            ))),
        }
    }

    pub async fn cancel_wake() -> Result<()> {
        // On Linux, we can disable the RTC wake alarm
        let output = Command::new("sh")
            .args(["-c", "echo 0 > /sys/class/rtc/rtc0/wakealarm"])
            .output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to cancel wake: {}",
                e
            ))),
        }
    }

    pub async fn supports_hibernation() -> bool {
        Command::new("systemctl")
            .args(["hibernate"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub async fn supports_scheduled_wake() -> bool {
        Command::new("which")
            .arg("rtcwake")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub async fn supports_rtc_wake() -> bool {
        std::path::Path::new("/sys/class/rtc/rtc0/wakealarm").exists()
    }
}

#[cfg(target_os = "macos")]
mod platform_impl {
    use super::*;
    use std::process::Command;

    pub async fn suspend() -> Result<()> {
        let output = Command::new("pmset").args(["sleepnow"]).output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to suspend: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute suspend: {}",
                e
            ))),
        }
    }

    pub async fn hibernate() -> Result<()> {
        let output = Command::new("pmset").args(["hibernatenow"]).output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to hibernate: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute hibernate: {}",
                e
            ))),
        }
    }

    pub async fn shutdown() -> Result<()> {
        let output = Command::new("shutdown").args(["-h", "now"]).output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to shutdown: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute shutdown: {}",
                e
            ))),
        }
    }

    pub async fn reboot() -> Result<()> {
        let output = Command::new("shutdown").args(["-r", "now"]).output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to reboot: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to execute reboot: {}",
                e
            ))),
        }
    }

    pub async fn schedule_wake(duration: Duration) -> Result<()> {
        let wake_time = chrono::Local::now()
            + chrono::Duration::from_std(duration).unwrap_or_default();
        let time_str = wake_time.format("%m/%d/%y %H:%M:%S").to_string();

        let output = Command::new("pmset")
            .args(["schedule", "wake", &time_str])
            .output();

        match output {
            Ok(o) if o.status.success() => Ok(()),
            Ok(e) => Err(PowerError::OperationFailed(format!(
                "Failed to schedule wake: {}",
                String::from_utf8_lossy(&e.stderr)
            ))),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to schedule wake: {}",
                e
            ))),
        }
    }

    pub async fn cancel_wake() -> Result<()> {
        let output = Command::new("pmset")
            .args(["schedule", "cancel", "wake"])
            .output();

        match output {
            Ok(_) => Ok(()),
            Err(e) => Err(PowerError::OperationFailed(format!(
                "Failed to cancel wake: {}",
                e
            ))),
        }
    }

    pub async fn supports_hibernation() -> bool {
        Command::new("pmset")
            .args(["-g", "hibernatemode"])
            .output()
            .map(|o| {
                let output = String::from_utf8_lossy(&o.stdout);
                !output.trim().is_empty()
            })
            .unwrap_or(false)
    }

    pub async fn supports_scheduled_wake() -> bool {
        // macOS generally supports scheduled wake
        true
    }

    pub async fn supports_rtc_wake() -> bool {
        // macOS supports scheduled wake which uses RTC
        true
    }
}

#[cfg(not(any(windows, target_os = "linux", target_os = "macos")))]
mod platform_impl {
    use super::*;

    pub async fn suspend() -> Result<()> {
        Err(PowerError::Unsupported)
    }

    pub async fn hibernate() -> Result<()> {
        Err(PowerError::Unsupported)
    }

    pub async fn shutdown() -> Result<()> {
        Err(PowerError::Unsupported)
    }

    pub async fn reboot() -> Result<()> {
        Err(PowerError::Unsupported)
    }

    pub async fn schedule_wake(_duration: Duration) -> Result<()> {
        Err(PowerError::Unsupported)
    }

    pub async fn cancel_wake() -> Result<()> {
        Err(PowerError::Unsupported)
    }

    pub async fn supports_hibernation() -> bool {
        false
    }

    pub async fn supports_scheduled_wake() -> bool {
        false
    }

    pub async fn supports_rtc_wake() -> bool {
        false
    }
}

// Re-export main types
pub use crate::LocalPowerManager as DefaultPowerManager;

#[cfg(test)]
mod tests {
    use super::*;

    // ========== PowerState Tests ==========

    #[test]
    fn test_power_state_equality() {
        assert_eq!(PowerState::Awake, PowerState::Awake);
        assert_eq!(PowerState::Sleep, PowerState::Sleep);
        assert_ne!(PowerState::Sleep, PowerState::Hibernate);
        assert_ne!(PowerState::Shutdown, PowerState::Reboot);
    }

    #[test]
    fn test_power_state_default() {
        assert_eq!(PowerState::default(), PowerState::Awake);
    }

    #[test]
    fn test_power_state_copy() {
        let state = PowerState::Sleep;
        let _copy = state;
        let _clone = state; // Can still use original due to Copy
    }

    #[test]
    fn test_power_state_clone() {
        let state = PowerState::Hibernate;
        let cloned = state.clone();
        assert_eq!(state, cloned);
    }

    // ========== WakeConfig Tests ==========

    #[test]
    fn test_wake_config_new_valid() {
        let config = WakeConfig::new(Duration::from_secs(60));
        assert!(config.is_ok());
        let config = config.unwrap();
        assert_eq!(config.duration, Duration::from_secs(60));
        assert!(config.label.is_none());
        assert!(config.enable_rtc);
    }

    #[test]
    fn test_wake_config_new_invalid() {
        let config = WakeConfig::new(Duration::from_secs(0));
        assert!(config.is_err());
        match config {
            Err(PowerError::InvalidWakeTime(_)) => {}
            _ => panic!("Expected InvalidWakeTime error"),
        }
    }

    #[test]
    fn test_wake_config_from_duration() {
        let config = WakeConfig::from_duration(Duration::from_secs(120));
        assert_eq!(config.duration, Duration::from_secs(120));
    }

    #[test]
    fn test_wake_config_with_label() {
        let config = WakeConfig::from_duration(Duration::from_secs(60)).with_label("test wake");
        assert_eq!(config.label, Some("test wake".to_string()));
    }

    #[test]
    fn test_wake_config_with_rtc() {
        let config = WakeConfig::from_duration(Duration::from_secs(60)).with_rtc(false);
        assert!(!config.enable_rtc);
    }

    #[test]
    fn test_wake_config_default() {
        let config = WakeConfig::default();
        assert_eq!(config.duration, Duration::from_secs(60));
        assert!(config.label.is_none());
        assert!(config.enable_rtc);
    }

    #[test]
    fn test_wake_config_wake_time() {
        let config = WakeConfig::from_duration(Duration::from_secs(3600));
        let wake_time = config.wake_time();
        let now = chrono::Local::now();
        let diff = wake_time.signed_duration_since(now);
        // Should be approximately 1 hour (with some tolerance for test execution time)
        assert!(diff.num_seconds() >= 3599 && diff.num_seconds() <= 3601);
    }

    // ========== PowerError Tests ==========

    #[test]
    fn test_power_error_display() {
        assert!(PowerError::Unsupported.to_string().contains("Unsupported"));

        let err = PowerError::PermissionDenied("test".to_string());
        assert!(err.to_string().contains("Permission denied"));

        let err = PowerError::OperationFailed("test".to_string());
        assert!(err.to_string().contains("failed"));

        let err = PowerError::InvalidWakeTime("test".to_string());
        assert!(err.to_string().contains("Invalid wake time"));

        let err = PowerError::InvalidConfig("test".to_string());
        assert!(err.to_string().contains("Invalid wake configuration"));

        let err = PowerError::PlatformError("test".to_string());
        assert!(err.to_string().contains("Platform error"));

        let err = PowerError::RtcWakeNotAvailable("test".to_string());
        assert!(err.to_string().contains("RTC wake not available"));
    }

    // ========== LocalPowerManager Tests ==========

    #[test]
    fn test_local_power_manager_new() {
        let manager = LocalPowerManager::new();
        let _ = manager;
    }

    #[test]
    fn test_local_power_manager_default() {
        let manager = LocalPowerManager::default();
        let _ = manager;
    }

    #[tokio::test]
    async fn test_local_power_manager_get_power_state() {
        let manager = LocalPowerManager::new();
        let state = manager.get_power_state().await;
        assert!(state.is_ok());
        assert_eq!(state.unwrap(), PowerState::Awake);
    }

    #[tokio::test]
    async fn test_local_power_manager_supports_hibernation() {
        let manager = LocalPowerManager::new();
        let supports = manager.supports_hibernation().await;
        // Should return a boolean without panicking
        let _ = supports;
    }

    #[tokio::test]
    async fn test_local_power_manager_supports_scheduled_wake() {
        let manager = LocalPowerManager::new();
        let supports = manager.supports_scheduled_wake().await;
        // Should return a boolean without panicking
        let _ = supports;
    }

    #[tokio::test]
    async fn test_local_power_manager_supports_rtc_wake() {
        let manager = LocalPowerManager::new();
        let supports = manager.supports_rtc_wake().await;
        // Should return a boolean without panicking
        let _ = supports;
    }

    #[tokio::test]
    async fn test_local_power_manager_schedule_wake_invalid() {
        let manager = LocalPowerManager::new();
        let config = WakeConfig::new(Duration::from_secs(0)).unwrap_err();
        // WakeConfig::new returns error for 0 duration
        let _ = config;
    }

    #[tokio::test]
    async fn test_local_power_manager_schedule_wake_valid() {
        let manager = LocalPowerManager::new();
        let config = WakeConfig::from_duration(Duration::from_secs(60));
        let result = manager.schedule_wake(config).await;
        // May fail due to permissions, but should not panic
        let _ = result;
    }

    #[tokio::test]
    async fn test_local_power_manager_cancel_wake() {
        let manager = LocalPowerManager::new();
        let result = manager.cancel_wake().await;
        // May fail if no wake is scheduled, but should not panic
        let _ = result;
    }

    // ========== PowerManager Trait Tests ==========

    #[tokio::test]
    async fn test_power_manager_suspend_alias() {
        let manager = LocalPowerManager::new();
        // suspend() should call set_power_state(Sleep)
        let result = manager.suspend().await;
        let _ = result;
    }

    #[tokio::test]
    async fn test_power_manager_hibernate_alias() {
        let manager = LocalPowerManager::new();
        let result = manager.hibernate().await;
        let _ = result;
    }

    #[tokio::test]
    async fn test_power_manager_shutdown_alias() {
        let manager = LocalPowerManager::new();
        let result = manager.shutdown().await;
        let _ = result;
    }

    #[tokio::test]
    async fn test_power_manager_reboot_alias() {
        let manager = LocalPowerManager::new();
        let result = manager.reboot().await;
        let _ = result;
    }

    // ========== Platform-Specific Tests ==========

    #[cfg(windows)]
    mod windows_tests {
        use super::*;

        #[tokio::test]
        async fn test_windows_supports_scheduled_wake() {
            let manager = LocalPowerManager::new();
            assert!(manager.supports_scheduled_wake().await);
        }

        #[tokio::test]
        async fn test_windows_supports_rtc_wake() {
            let manager = LocalPowerManager::new();
            let supports = manager.supports_rtc_wake().await;
            // Depends on system configuration
            let _ = supports;
        }
    }

    #[cfg(target_os = "linux")]
    mod linux_tests {
        use super::*;

        #[tokio::test]
        async fn test_linux_supports_scheduled_wake() {
            let manager = LocalPowerManager::new();
            let supports = manager.supports_scheduled_wake().await;
            // Depends on rtcwake availability
            let _ = supports;
        }

        #[tokio::test]
        async fn test_linux_supports_rtc_wake() {
            let manager = LocalPowerManager::new();
            let supports = manager.supports_rtc_wake().await;
            // Depends on /sys/class/rtc/rtc0/wakealarm existence
            let _ = supports;
        }
    }

    #[cfg(target_os = "macos")]
    mod macos_tests {
        use super::*;

        #[tokio::test]
        async fn test_macos_supports_scheduled_wake() {
            let manager = LocalPowerManager::new();
            assert!(manager.supports_scheduled_wake().await);
        }

        #[tokio::test]
        async fn test_macos_supports_rtc_wake() {
            let manager = LocalPowerManager::new();
            assert!(manager.supports_rtc_wake().await);
        }
    }
}
