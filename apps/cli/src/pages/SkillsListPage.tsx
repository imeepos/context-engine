import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { SkillLoaderService } from '../services/skill-loader.service'
import { loadPageData } from './market-page-state'
import z from 'zod'

interface SkillsListPageProps {
  injector: Injector
}

export async function SkillsListPage({ injector }: SkillsListPageProps) {
  const skillLoader = injector.get(SkillLoaderService)
  const renderer = injector.get(UIRenderer)

  const loaded = await loadPageData(async () => await skillLoader.listSkills())

  if (!loaded.ok) {
    return (
      <Layout injector={injector}>
        <h1>技能管理</h1>
        <p>错误: {loaded.error}</p>
      </Layout>
    )
  }

  const skills = loaded.data

  // 构建技能列表描述
  const skillList = skills.map(s => `"${s.id}"(${s.name})`).join(', ')

  return (
    <Layout injector={injector}>
      <h1>技能管理</h1>
      <p>共 {skills.length} 个技能</p>

      {skills.length === 0 ? (
        <p>暂无技能</p>
      ) : (
        <>
          <h2>技能列表</h2>
          <ul>
            {skills.map((skill, index) => (
              <li key={skill.id}>
                <strong>{index + 1}. {skill.name}</strong> (ID: {skill.id})
                <br />
                <small>{skill.description}</small>
              </li>
            ))}
          </ul>

          <h2>技能操作工具</h2>

          <Tool
            name="view_skill_detail"
            description={`查看指定技能的详细信息。
- 功能：导航到技能详情页，显示完整内容、资源和使用说明
- 前置条件：skillId 必须存在
- 参数：skillId 为要查看的技能 ID
- 后置状态：页面跳转到技能详情页
- 可用技能：${skillList || '无'}`}
            params={{
              skillId: z.string().min(1).describe('要查看的技能 ID')
            }}
            execute={async (params: any) => {
              const skill = skills.find(s => s.id === params.skillId)
              if (!skill) {
                return `错误：未找到 ID 为 "${params.skillId}" 的技能`
              }
              return await renderer.navigate(`prompt:///skills/${params.skillId}`)
            }}
          >
            查看技能详情
          </Tool>
        </>
      )}
    </Layout>
  )
}
