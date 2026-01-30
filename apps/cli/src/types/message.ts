export interface InterAgentMessage {
  id: string
  from: string
  to: string
  content: string
  timestamp: number
  read: boolean
}

export interface MessageQueue {
  messages: InterAgentMessage[]
}
