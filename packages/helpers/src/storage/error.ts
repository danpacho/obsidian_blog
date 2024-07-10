/**
 * Represents an error that occurs in the storage module.
 */
export class StorageError extends Error {
    /**
     * The location where the error occurred.
     */
    public readonly where: string

    /**
     * The reason for the error.
     */
    public readonly why: string

    /**
     * The expected behavior or outcome.
     */
    public readonly expected: string

    /**
     * Creates a new instance of the StorageError class.
     * @param where The location where the error occurred.
     * @param why The reason for the error.
     * @param expected The expected behavior or outcome.
     * @param message An optional error message.
     */
    constructor(
        where: string,
        why: string,
        expected: string,
        message?: string
    ) {
        super(message)
        this.name = 'StorageError'
        this.where = where
        this.why = why
        this.expected = expected
    }
}
