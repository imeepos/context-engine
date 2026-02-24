use tokio::sync::broadcast;

pub type EventResult<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub struct EventBus {
    tx: broadcast::Sender<String>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (tx, _) = broadcast::channel(capacity);
        Self { tx }
    }

    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.tx.subscribe()
    }

    pub async fn publish(&self, event: String) -> EventResult<()> {
        let _ = self.tx.send(event);
        Ok(())
    }
}

#[derive(Debug, Clone)]
pub enum SystemEvent {
    CommandStarted { id: String, command: String },
    CommandCompleted { id: String, exit_code: i32 },
    FileChanged { path: String, event: FileEventType },
    TaskScheduled { id: String, next_run: String },
    TaskExecuted { id: String, result: String },
}

#[derive(Debug, Clone, PartialEq)]
pub enum FileEventType {
    Created,
    Modified,
    Deleted,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_event_bus_new() {
        let _bus = EventBus::new(16);
    }

    #[tokio::test]
    async fn test_event_bus_publish_subscribe() {
        let bus = EventBus::new(16);
        let mut rx = bus.subscribe();
        bus.publish("test".to_string()).await.unwrap();
        let received = rx.recv().await.unwrap();
        assert_eq!(received, "test");
    }

    #[tokio::test]
    async fn test_system_event() {
        let event = SystemEvent::CommandStarted {
            id: "test-id".to_string(),
            command: "echo hello".to_string(),
        };
        match event {
            SystemEvent::CommandStarted { id, command } => {
                assert_eq!(id, "test-id");
                assert_eq!(command, "echo hello");
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_file_event_type_equality() {
        assert_eq!(FileEventType::Created, FileEventType::Created);
        assert_ne!(FileEventType::Created, FileEventType::Modified);
    }
}
