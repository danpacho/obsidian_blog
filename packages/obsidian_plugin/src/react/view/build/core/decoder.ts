import {
    type PluginDynamicConfigPrimitiveType,
    type PluginDynamicConfigSchema,
} from '@obsidian_blogger/plugin_api'
import { Is } from '../../../../utils'

export type DecoderAdapter = (
    value: PluginDynamicConfigPrimitiveType
) => PluginDynamicConfigPrimitiveType

// const isRegExpString = (value: string): boolean => {
//     try {
//         const matches = value.match(/^\/(.*)\/([gimsuy]*)$/)
//         return matches !== null
//     } catch {
//         return false
//     }
// }

const parseRegExpString = (
    value: PluginDynamicConfigPrimitiveType
): RegExp | null => {
    if (!Is.string(value) || value === '') return null

    // g, i, m, s, u, y = global, ignoreCase, multiline, dotAll, unicode, sticky
    const matches = value.match(/^\/(.*)\/([gimsuy]*)$/)

    if (!matches) return null

    const pattern = matches[1]
    const flags = matches[2]

    if (!pattern) return null

    return new RegExp(pattern, flags)
}

/**
 * Decode input value into the correct type
 * @param schemaInfo Schema information
 * @param value Input value
 * @returns Decoded value
 */
export const Decoder = (
    schemaInfo: PluginDynamicConfigSchema[0],
    value: PluginDynamicConfigPrimitiveType
) => {
    switch (schemaInfo.type) {
        case 'RegExp': {
            return parseRegExpString(value)
        }
        case 'NULL':
            return null
        case 'Function': {
            if (Is.string(value) && value === '') return null
            return value
        }
        case 'boolean':
            return Boolean(value)
        case 'number':
            return Number(value)
        case 'int':
            return Number(value)
        case 'string':
            if (!Is.string(value)) return null
            if (value.trim() === '') return null
            return value
        default: {
            // union
            if (Is.array(schemaInfo.type)) return value

            // record
            if (Is.record(schemaInfo.type)) return value

            // literal
            if (schemaInfo.type.startsWith('Literal')) return value

            // array
            if (!value || !Is.string(value)) return []
            if (value === '') return []

            const purifiedValue = value
                .toString()
                .replace(/'/g, '"')
                .replace(/[\n\t]/g, '')

            try {
                const parsedArray: Array<unknown> = JSON.parse(purifiedValue)
                return parsedArray
            } catch {
                return purifiedValue
            }
        }
    }
}
