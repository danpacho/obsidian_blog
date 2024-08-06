export class ArgTypeError extends Error {
    public constructor(
        public readonly expected: string,
        public readonly received: unknown
    ) {
        super(
            `ArgTypeError: Expected ${expected}, received ${typeof received} › ${typeof received === 'object' ? JSON.stringify(received, null, 4) : received}`
        )
    }
}
