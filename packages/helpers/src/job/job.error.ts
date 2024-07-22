/**
 * Represents an error that occurred during job execution.
 */
export class JobError extends Error {
    /**
     * Creates a new instance of JobError.
     * @param message The error message.
     * @param job The job that caused the error.
     * @param error The cause of the error.
     */
    constructor(
        message: string,
        public readonly error: unknown
    ) {
        super(message)
        this.name = 'JobError'
    }

    /**
     * Returns a string representation of the JobError.
     * @returns The string representation of the JobError.
     */
    public override toString(): string {
        return `${this.name}: ${this.message}`
    }

    /**
     * Is the value an instance of JobError.
     */
    public static isJobError(value: unknown): value is JobError {
        return value instanceof JobError
    }
}
