export interface QueryState {
  select?: string[]
  where?: Record<string, any>
  orderBy?: { column: string; direction: 'ASC' | 'DESC' }
  limit?: number
  offset?: number
}
