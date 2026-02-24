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
        <h1>技能不存在</h1>
        <p>技能 ID: {skillId} 未找到</p>
        <Tool
          name="navigate_to_skill_list"
          description={`返回技能列表。
- 功能：跳转回技能管理页面
- 后置状态：页面跳转到技能列表`}
          execute={async () => {
            return await renderer.navigate('prompt:///skills')
          }}
        >
          返回技能列表
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
          <strong>ID：</strong> {skill.id}
        </li>
        <li>
          <strong>描述：</strong> {skill.metadata.description}
        </li>
        <li>
          <strong>路径：</strong> {skill.path}
        </li>
        {skill.metadata.license && (
          <li>
            <strong>许可证：</strong> {skill.metadata.license}
          </li>
        )}
      </ul>

      <h2>资源信息</h2>
      <ul>
        <li>脚本文件：{skill.hasScripts ? '有' : '无'}</li>
        <li>参考文档：{skill.hasReferences ? '有' : '无'}</li>
        <li>资源文件：{skill.hasAssets ? '有' : '无'}</li>
      </ul>

      <h2>完整内容</h2>
      <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', backgroundColor: '#f5f5f5', padding: '1em' }}>{skill.content}</pre>

      <Tool
        name="navigate_to_skill_list"
        description={`返回技能列表。
- 功能：跳转回技能管理页面
- 当前技能：${skill.metadata.name}
- 后置状态：页面跳转到技能列表`}
        execute={async () => {
          return await renderer.navigate('prompt:///skills')
        }}
      >
        返回技能列表
      </Tool>
    </Layout>
  )
}
