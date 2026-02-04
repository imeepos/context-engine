import React from 'react'
import { Injector } from "@sker/core";
import { Layout } from '../components/Layout'
import { cpus, homedir, platform, tmpdir, totalmem, freemem } from 'os'

export const BaseInfo: React.FC<{ injector: Injector }> = ({ injector }) => {
    const cwd = process.cwd()
    const cpu = cpus()[0]
    const totalMem = (totalmem() / 1024 / 1024 / 1024).toFixed(2)
    const freeMem = (freemem() / 1024 / 1024 / 1024).toFixed(2)
    return (
        <Layout injector={injector}>
            <h1>基础信息</h1>
            <ul>
                <li>当前目录：{cwd}</li>
                <li>操作系统：{platform()}</li>
                <li>主目录：{homedir()}</li>
                <li>临时目录：{tmpdir()}</li>
                <li>CPU：{cpu.model} ({cpus().length} 核)</li>
                <li>内存：{freeMem}GB / {totalMem}GB</li>
                <li>Node 版本：{process.version}</li>
                <li>Node 进程：{process.pid}</li>
            </ul>
        </Layout>
    )
}