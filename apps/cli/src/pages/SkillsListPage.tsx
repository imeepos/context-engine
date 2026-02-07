import React from 'react'
import { Injector } from '@sker/core'
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { SkillLoaderService } from '../services/skill-loader.service'
import { loadPageData } from './market-page-state'

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
        <h1>Skills 管理</h1>
        <p>错误: {loaded.error}</p>
      </Layout>
    )
  }

  const skills = loaded.data

  return (
    <Layout injector={injector}>
      <h1>Skills 管理</h1>
      <p>共 {skills.length} 个 Skills</p>

      {skills.length === 0 ? (
        <p>暂无 Skills</p>
      ) : (
        <div>
          {skills.map((skill, index) => (
            <div key={skill.id}>
              <h3>
                {index + 1}. {skill.name}
              </h3>
              <p>{skill.description}</p>
              <Tool
                name={`view_skill_${skill.id}`}
                description={`查看 Skill [${skill.id}] ${skill.name} 的完整内容和使用说明`}
                execute={async () => {
                  return await renderer.navigate(`prompt:///skills/${skill.id}`)
                }}
              >
                查看详情
              </Tool>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
