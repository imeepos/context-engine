import { Injectable, Tool, ToolArg } from '@sker/core'
import { z } from 'zod'
import { readFileSync } from 'fs'
import { join } from 'path'

@Injectable()
export class ReadFile {
    @Tool({
        name: 'readFile',
        description: 'Read a file from the filesystem'
    })
    readFile(
        @ToolArg({ zod: z.string().describe('The path to the file'), paramName: 'path' }) path: string
    ): string {
        try {
            const fullPath = join(process.cwd(), path)
            return readFileSync(fullPath, 'utf-8')
        } catch (error) {
            return `Error reading file: ${error instanceof Error ? error.message : String(error)}`
        }
    }
}