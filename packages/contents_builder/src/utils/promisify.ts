export type PromiseCallbacks<DataInterface, ErrorInterface extends Error> = {
    onSuccess?: (data: DataInterface) => void
    onError?: (err: ErrorInterface) => void
}

export type Stateful<DataInterface> =
    | {
          success: true
          data: DataInterface
      }
    | {
          success: false
          error: unknown
      }
export type Promisify<DataInterface> = Promise<Stateful<DataInterface>>
