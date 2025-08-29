import type { IO } from '@obsidian_blogger/helpers'

export const createMockIO = (overrides?: Partial<IO>): IO => {
    const defaultPathResolver = {
        normalize: (p: string) => p,
    }
    const defaultReader = {
        readFile: async (_: string) => ({
            success: false,
            error: new Error('not implemented'),
        }),
    }
    const defaultWriter = {
        write: async (_: { filePath: string; data: string }) => ({
            success: false,
            error: new Error('not implemented'),
        }),
    }

    return {
        pathResolver: overrides?.pathResolver ?? defaultPathResolver,
        reader: overrides?.reader ?? defaultReader,
        writer: overrides?.writer ?? defaultWriter,
        // Spread anything else the real IO might have (keeps TS happy)
        ...(overrides ?? {}),
    } as unknown as IO
}
