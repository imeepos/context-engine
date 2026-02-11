export interface JoinState {
  type: 'INNER' | 'LEFT' | 'RIGHT'
  table: string
  alias: string
  on: string
}

export interface QueryState {
  select?: string[]
  where?: Record<string, any>
  orderBy?: { column: string; direction: 'ASC' | 'DESC' }
  limit?: number
  offset?: number
  joins?: JoinState[]
  groupBy?: string[]
  having?: Record<string, any>
}
