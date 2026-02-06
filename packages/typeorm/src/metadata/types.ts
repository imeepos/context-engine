export interface ColumnMetadata {
  name: string
  type?: string
  primary?: boolean
}

export interface TableMetadata {
  name: string
  columns: ColumnMetadata[]
}
