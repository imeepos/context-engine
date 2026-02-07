import { Injectable } from '@sker/core'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { Skill, SkillListItem, SkillMetadata } from '../types/skill'

@Injectable({ providedIn: 'auto' })
export class SkillLoaderService {
  private readonly SKILLS_DIR = path.join(process.cwd(), '.claude', 'skills')

  // 解析 YAML frontmatter 和 Markdown 内容
  private parseFrontmatter(content: string): { metadata: SkillMetadata; body: string } {
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (!match) {
      throw new Error('Invalid SKILL.md format: missing frontmatter')
    }

    const [, yamlContent, body] = match

    // 使用 js-yaml 解析 YAML
    const parsed = yaml.load(yamlContent) as Record<string, unknown>

    const metadata: SkillMetadata = {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      description: typeof parsed.description === 'string' ? parsed.description : '',
    }

    if (typeof parsed.license === 'string') {
      metadata.license = parsed.license
    }

    return { metadata, body: body.trim() }
  }

  // 检查目录是否存在
  private async dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath)
      return stat.isDirectory()
    } catch {
      return false
    }
  }

  // 获取所有 skills 列表（仅元数据）
  async listSkills(): Promise<SkillListItem[]> {
    const entries = await fs.readdir(this.SKILLS_DIR, { withFileTypes: true })
    const skills: SkillListItem[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillPath = path.join(this.SKILLS_DIR, entry.name)
      const skillFilePath = path.join(skillPath, 'SKILL.md')

      try {
        const content = await fs.readFile(skillFilePath, 'utf-8')
        const { metadata } = this.parseFrontmatter(content)

        skills.push({
          id: entry.name,
          name: metadata.name || entry.name,
          description: metadata.description || '',
          path: skillPath,
        })
      } catch (error) {
        // 跳过无效的 skill
        console.warn(`Skipping invalid skill: ${entry.name}`, error)
      }
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name))
  }

  // 获取单个 skill 的完整信息
  async getSkill(skillId: string): Promise<Skill | null> {
    const skillPath = path.join(this.SKILLS_DIR, skillId)
    const skillFilePath = path.join(skillPath, 'SKILL.md')

    try {
      const content = await fs.readFile(skillFilePath, 'utf-8')
      const { metadata, body } = this.parseFrontmatter(content)

      const hasScripts = await this.dirExists(path.join(skillPath, 'scripts'))
      const hasReferences = await this.dirExists(path.join(skillPath, 'references'))
      const hasAssets = await this.dirExists(path.join(skillPath, 'assets'))

      return {
        id: skillId,
        metadata,
        content: body,
        path: skillPath,
        hasScripts,
        hasReferences,
        hasAssets,
      }
    } catch {
      return null
    }
  }
}
