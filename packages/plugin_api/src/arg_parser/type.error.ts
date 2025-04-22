export class ArgTypeError extends Error {
    public constructor(
        public readonly expected: string,
        public readonly received: unknown,
        public readonly additionalError?: Array<Error>
    ) {
        const isRecord = (value: unknown): value is Record<string, unknown> =>
            typeof value === 'object' && !Array.isArray(value)

        const argErrorMessage = `ArgTypeError: Expected ${expected}, received ${typeof received} › ${isRecord(received) ? JSON.stringify(received, null, 4) : received}`
        const additionalErrorMessages = additionalError
            ?.map((error) => error.message)
            .join('\n')

        const totalMessage = `${argErrorMessage}${additionalErrorMessages ? `\nAdditionalError: ${additionalErrorMessages}` : ''}`
        super(totalMessage)
    }
}
