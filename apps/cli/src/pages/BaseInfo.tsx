import React from 'react'
import { Injector } from "@sker/core";
import { Layout } from '../components/Layout'
import { UIRenderer, Tool } from '@sker/prompt-renderer'
import { cpus, homedir, platform, tmpdir, totalmem, freemem } from 'os'

export const BaseInfo = async ({ injector }: { injector: Injector }) => {
    const cwd = process.cwd()
    const cpu = cpus()[0]
    const totalMem = (totalmem() / 1024 / 1024 / 1024).toFixed(2)
    const freeMem = (freemem() / 1024 / 1024 / 1024).toFixed(2)
    const renderer = injector.get(UIRenderer)

    return (
        <Layout injector={injector}>
            <h1>系统基础信息</h1>

            <h2>环境信息</h2>
            <ul>
                <li><strong>当前工作目录：</strong>{cwd}</li>
                <li><strong>操作系统：</strong>{platform()}</li>
                <li><strong>用户主目录：</strong>{homedir()}</li>
                <li><strong>临时目录：</strong>{tmpdir()}</li>
                <li><strong>CPU：</strong>{cpu.model} ({cpus().length} 核)</li>
                <li><strong>内存：</strong>{freeMem}GB 可用 / {totalMem}GB 总计</li>
                <li><strong>Node 版本：</strong>{process.version}</li>
                <li><strong>进程 ID：</strong>{process.pid}</li>
            </ul>

            <h2>导航工具</h2>
            <Tool
                name="navigate_to_dashboard"
                description={`导航到仪表板页面。
- 功能：跳转到系统仪表板，查看任务和代理信息
- 后置状态：页面跳转到仪表板`}
                execute={async () => {
                    return await renderer.navigate('prompt:///')
                }}
            >
                返回仪表板
            </Tool>

            <Tool
                name="navigate_to_file_manager"
                description={`导航到文件管理器。
- 功能：打开文件管理器，浏览和管理文件
- 后置状态：页面跳转到文件管理器`}
                execute={async () => {
                    return await renderer.navigate('prompt:///files')
                }}
            >
                打开文件管理器
            </Tool>

            <Tool
                name="navigate_to_task_list"
                description={`导航到任务列表。
- 功能：打开任务管理页面，查看和管理任务
- 后置状态：页面跳转到任务列表`}
                execute={async () => {
                    return await renderer.navigate('prompt:///tasks')
                }}
            >
                查看任务列表
            </Tool>
        </Layout>
    )
}
