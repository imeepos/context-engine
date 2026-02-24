use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WakeRequest {
    pub id: String,
    pub wake_time: DateTime<Utc>,
    pub method: WakeMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WakeMethod {
    #[serde(rename = "rtc")]
    RTC {
        alarm_id: Option<u32>,
    },
    #[serde(rename = "wol")]
    WakeOnLAN {
        mac_address: String,
        broadcast_address: String,
        port: u16,
    },
    #[serde(rename = "scheduled")]
    Scheduled {
        duration_secs: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerState {
    pub current: PowerStateType,
    pub supports_rtc_wake: bool,
    pub supports_wol: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PowerStateType {
    Working,
    Sleeping,
    Hibernating,
    SoftOff,
}
