import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { SkillLoaderService } from '../services/skill-loader.service'

interface SkillDetailPageProps {
  injector: Injector
  skillId: string
}

export async function SkillDetailPage({ injector, skillId }: SkillDetailPageProps) {
  const skillLoader = injector.get(SkillLoaderService)
  const renderer = injector.get(UIRenderer)

  const skill = await skillLoader.getSkill(skillId)

  if (!skill) {
    return (
      <Layout injector={injector}>
        <h1>Skill 不存在</h1>
        <p>Skill ID: {skillId} 未找到</p>
        <Tool
          name="back_to_skills"
          description="返回 Skills 列表"
          execute={async () => {
            return await renderer.navigate('prompt:///skills')
          }}
        >
          返回 Skills 列表
        </Tool>
      </Layout>
    )
  }

  return (
    <Layout injector={injector}>
      <h1>{skill.metadata.name}</h1>

      <h2>基本信息</h2>
      <ul>
        <li>
          <strong>ID:</strong> {skill.id}
        </li>
        <li>
          <strong>描述:</strong> {skill.metadata.description}
        </li>
        <li>
          <strong>路径:</strong> {skill.path}
        </li>
        {skill.metadata.license && (
          <li>
            <strong>许可证:</strong> {skill.metadata.license}
          </li>
        )}
      </ul>

      <h2>资源</h2>
      <ul>
        <li>Scripts: {skill.hasScripts ? '✓' : '✗'}</li>
        <li>References: {skill.hasReferences ? '✓' : '✗'}</li>
        <li>Assets: {skill.hasAssets ? '✓' : '✗'}</li>
      </ul>

      <h2>完整内容</h2>
      <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{skill.content}</pre>

      <Tool
        name="back_to_skills"
        description="返回 Skills 列表"
        execute={async () => {
          return await renderer.navigate('prompt:///skills')
        }}
      >
        返回 Skills 列表
      </Tool>
    </Layout>
  )
}
