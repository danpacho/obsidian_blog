import {
    type PluginDynamicConfigPrimitiveType,
    type PluginDynamicConfigSchema,
} from '@obsidian_blogger/helpers/plugin'
import { Is } from '../../../../utils'

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
        case 'RegExp':
            return value
        case 'Function':
            return value
        case 'boolean':
            return Boolean(value)
        case 'number':
            return Number(value)
        case 'int':
            return Number(value)
        case 'string':
            return value as string
        default: {
            // union
            if (Is.array(schemaInfo.type)) return value

            // record
            if (Is.record(schemaInfo.type)) return value

            // literal
            if (schemaInfo.type.startsWith('Literal')) return value

            // array
            if (!value) return [] as Array<unknown>
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
