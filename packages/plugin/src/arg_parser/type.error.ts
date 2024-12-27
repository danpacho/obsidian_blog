export class ArgTypeError extends Error {
    public constructor(
        public readonly expected: string,
        public readonly received: unknown
    ) {
        const isRecord = (value: unknown): value is Record<string, unknown> =>
            typeof value === 'object' && !Array.isArray(value)
        super(
            `ArgTypeError: Expected ${expected}, received ${typeof received} › ${isRecord(received) ? JSON.stringify(received, null, 4) : received}`
        )
    }
}
