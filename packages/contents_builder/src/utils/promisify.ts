export type PromiseCallbacks<DataInterface, ErrorInterface extends Error> = {
    onSuccess?: (data: DataInterface) => void
    onError?: (err: ErrorInterface) => void
}

export type Stateful<DataInterface, ErrorInterface = unknown> =
    | {
          success: true
          data: DataInterface
      }
    | {
          success: false
          error: ErrorInterface
      }
export type Promisify<DataInterface, ErrorInterface = unknown> = Promise<
    Stateful<DataInterface, ErrorInterface>
>
