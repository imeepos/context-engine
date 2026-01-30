import { ToolArgMetadata } from '@sker/core'

/**
 * Build a map of tool arguments grouped by target class and property key
 * @param toolArgMetadatas Array of tool argument metadata
 * @returns Map with key format: "ClassName-propertyKey"
 */
export function buildToolArgsMap(toolArgMetadatas: ToolArgMetadata[]): Map<string, ToolArgMetadata[]> {
    const map = new Map<string, ToolArgMetadata[]>()
    for (const argMeta of toolArgMetadatas) {
        const key = `${argMeta.target.name}-${String(argMeta.propertyKey)}`
        if (!map.has(key)) {
            map.set(key, [])
        }
        map.get(key)!.push(argMeta)
    }
    return map
}
