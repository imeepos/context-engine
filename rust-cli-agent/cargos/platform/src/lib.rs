use std::result::Result as StdResult;

pub type Result<T> = StdResult<T, PlatformError>;

#[derive(Debug, thiserror::Error)]
pub enum PlatformError {
    #[error("Unsupported operation on this platform")]
    Unsupported,
    #[error("Platform error: {0}")]
    Other(String),
}

/// Platform information
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlatformInfo {
    pub os: OS,
    pub arch: Architecture,
    pub version: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OS {
    Linux,
    Windows,
    MacOS,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Architecture {
    X86_64,
    AArch64,
    Unknown,
}

/// Get platform information
pub fn get_platform_info() -> PlatformInfo {
    cfg_if::cfg_if! {
        if #[cfg(target_os = "linux")] {
            PlatformInfo {
                os: OS::Linux,
                arch: std::env::consts::ARCH.into(),
                version: get_linux_version().unwrap_or_default(),
            }
        } else if #[cfg(windows)] {
            PlatformInfo {
                os: OS::Windows,
                arch: std::env::consts::ARCH.into(),
                version: get_windows_version().unwrap_or_default(),
            }
        } else if #[cfg(target_os = "macos")] {
            PlatformInfo {
                os: OS::MacOS,
                arch: std::env::consts::ARCH.into(),
                version: get_macos_version().unwrap_or_default(),
            }
        } else {
            PlatformInfo {
                os: OS::Unknown,
                arch: Architecture::Unknown,
                version: String::new(),
            }
        }
    }
}

impl From<&str> for Architecture {
    fn from(arch: &str) -> Self {
        match arch {
            "x86_64" | "x86" | "amd64" => Architecture::X86_64,
            "aarch64" | "arm64" => Architecture::AArch64,
            _ => Architecture::Unknown,
        }
    }
}

impl Default for Architecture {
    fn default() -> Self {
        Architecture::Unknown
    }
}

impl Default for OS {
    fn default() -> Self {
        OS::Unknown
    }
}

impl Default for PlatformInfo {
    fn default() -> Self {
        Self {
            os: OS::Unknown,
            arch: Architecture::Unknown,
            version: String::new(),
        }
    }
}

#[cfg(target_os = "linux")]
fn get_linux_version() -> Option<String> {
    use std::fs::read_to_string;
    read_to_string("/etc/os-release")
        .ok()
        .and_then(|s| s.lines().find(|l| l.starts_with("PRETTY_NAME=")))
        .and_then(|l| l.split('=').nth(1)
            .map(|s| s.trim().trim_matches('"').to_string()))
}

#[cfg(windows)]
fn get_windows_version() -> Option<String> {
    use std::process::Command;
    Command::new("cmd")
        .args(["/c", "ver"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
}

#[cfg(target_os = "macos")]
fn get_macos_version() -> Option<String> {
    use std::process::Command;
    Command::new("sw_vers")
        .arg("-productVersion")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_platform_info_returns_valid_info() {
        let info = get_platform_info();

        // Architecture should not be Unknown (except on very exotic platforms)
        assert!(info.arch != Architecture::Unknown);

        // Version may be empty on some platforms, but should not panic
        let _ = &info.version;
    }

    #[test]
    fn test_architecture_from_str() {
        assert_eq!(Architecture::from("x86_64"), Architecture::X86_64);
        assert_eq!(Architecture::from("amd64"), Architecture::X86_64);
        assert_eq!(Architecture::from("aarch64"), Architecture::AArch64);
        assert_eq!(Architecture::from("arm64"), Architecture::AArch64);
        assert_eq!(Architecture::from("unknown"), Architecture::Unknown);
    }

    #[test]
    fn test_platform_info_default() {
        let info = PlatformInfo::default();
        assert_eq!(info.os, OS::Unknown);
        assert_eq!(info.arch, Architecture::Unknown);
        assert!(info.version.is_empty());
    }

    #[test]
    fn test_os_default() {
        assert_eq!(OS::default(), OS::Unknown);
    }

    #[test]
    fn test_architecture_default() {
        assert_eq!(Architecture::default(), Architecture::Unknown);
    }

    #[test]
    fn test_os_equality() {
        assert_eq!(OS::Linux, OS::Linux);
        assert_ne!(OS::Linux, OS::Windows);
    }

    #[test]
    fn test_architecture_equality() {
        assert_eq!(Architecture::X86_64, Architecture::X86_64);
        assert_ne!(Architecture::X86_64, Architecture::AArch64);
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_get_linux_version() {
        let version = get_linux_version();
        // Should read version info on Linux
        // If /etc/os-release doesn't exist, may return None
        if let Some(v) = version {
            assert!(!v.is_empty());
        }
    }

    #[cfg(windows)]
    #[test]
    fn test_get_windows_version() {
        let version = get_windows_version();
        // Should read version info on Windows
        if let Some(v) = version {
            assert!(!v.is_empty());
        }
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn test_get_macos_version() {
        let version = get_macos_version();
        // Should read version info on macOS
        // If sw_vers command unavailable, may return None
        if let Some(v) = version {
            assert!(!v.is_empty());
        }
    }
}
