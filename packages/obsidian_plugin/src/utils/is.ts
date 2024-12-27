export const Is = {
    record: (type: unknown): type is Record<string, unknown> =>
        typeof type === 'object' && type !== null && !Array.isArray(type),
    array: (type: unknown): type is unknown[] => Array.isArray(type),
    string: (type: unknown): type is string => typeof type === 'string',
    number: (type: unknown): type is number => typeof type === 'number',
}
