const serialize = (obj: unknown): string => {
    const replacer = (_: string, value: unknown): unknown => {
        if (typeof value === 'function') {
            return `__FUNCTION__:${value.toString()}`
        }
        if (value instanceof RegExp) {
            return `__REGEXP__:${value.toString()}`
        }
        return value
    }
    return JSON.stringify(obj, replacer, 4)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deserialize = <T = any>(json: string): T => {
    const reviver = (_: string, value: unknown): unknown => {
        if (typeof value === 'string' && value.startsWith('__FUNCTION__:')) {
            const functionBody = value.slice(13)
            return eval(`(${functionBody})`)
        }
        if (typeof value === 'string' && value.startsWith('__REGEXP__:')) {
            const regexpBody = value.slice(11)
            return new RegExp(regexpBody)
        }
        return value
    }
    return JSON.parse(json, reviver)
}

export const json = {
    /**
     * Serialize an object to a JSON string
     *
     * _`Functions`_ are serialized as literal strings
     * @param obj Object to serialize
     */
    serialize,
    /**
     * Deserialize a JSON string to an object
     *
     * _`Functions`_ are deserialized from literal strings
     * @param json JSON string, serialized with `json.serialize`
     * @returns Parsed json
     */
    deserialize,
}
