// Skill 元数据（从 YAML frontmatter 解析）
export interface SkillMetadata {
  name: string
  description: string
  license?: string
}

// 完整的 Skill 数据
export interface Skill {
  id: string // skill 文件夹名称
  metadata: SkillMetadata // YAML frontmatter
  content: string // Markdown 内容（不含 frontmatter）
  path: string // 完整路径
  hasScripts: boolean // 是否有 scripts/ 目录
  hasReferences: boolean // 是否有 references/ 目录
  hasAssets: boolean // 是否有 assets/ 目录
}

// 列表项（仅元数据，用于列表页）
export interface SkillListItem {
  id: string
  name: string
  description: string
  path: string
}
