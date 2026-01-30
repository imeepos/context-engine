export interface Agent {
  id: string
  pid: number
  startTime: number
  lastHeartbeat: number
  status: 'online' | 'offline'
}

export interface AgentRegistry {
  agents: Record<string, Agent>
  nextId: number
}
