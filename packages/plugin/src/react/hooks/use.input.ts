import { useState } from 'react'

type Validator<InputType> = (input: InputType) =>
    | {
          isValid: true
      }
    | {
          isValid: false
          errors: Array<string>
      }
type ErrorHandler<InputType> = (props: {
    error: Array<string>
    input: InputType
}) => void

export type InputType = string | number | readonly string[]

export interface InputHandler<InputType = unknown> {
    validator?: Validator<InputType>
    onError?: ErrorHandler<InputType>
}

export const useInput = <InputType = string>(
    defaultValue: InputType,
    handler: {
        validator?: Validator<InputType>
        onError?: ErrorHandler<InputType>
    } = {}
) => {
    const [input, set] = useState<InputType>(defaultValue)
    const setInput = (value: InputType) => {
        if (!handler?.validator) {
            set(value)
            return
        }
        const result = handler.validator(value)
        set(value)
        if (!result.isValid) {
            handler.onError?.({ error: result.errors, input: value })
        }
    }
    return {
        input,
        setInput,
        defaultValue,
    }
}

export const useMultipleInput = <
    const InputRecord extends Record<string, unknown>,
>(
    inputRecord: InputRecord,
    handler?: {
        validators?: Partial<Record<keyof InputRecord, Validator<unknown>>>
        onErrors?: Partial<Record<keyof InputRecord, ErrorHandler<unknown>>>
    }
): readonly [
    Map<keyof InputRecord, InputRecord[keyof InputRecord]>,
    {
        setInput: (
            key: keyof InputRecord,
            value: InputRecord[keyof InputRecord]
        ) => void
        getInput: (key: keyof InputRecord) => InputRecord[keyof InputRecord]
    },
] => {
    const [inputs, setInputs] = useState<
        Map<keyof InputRecord, InputRecord[keyof InputRecord]>
    >(
        () =>
            new Map(
                Object.entries(inputRecord).map(([key, value]) => [
                    key as keyof InputRecord,
                    value as InputRecord[keyof InputRecord],
                ])
            )
    )

    const getInput = (key: keyof InputRecord): InputRecord[keyof InputRecord] =>
        inputs.get(key)!

    const setInput = (
        key: keyof InputRecord,
        value: InputRecord[keyof InputRecord]
    ) => {
        if (handler?.validators?.[key]) {
            const result = handler.validators[key]!(value)
            if (!result.isValid) {
                handler.onErrors?.[key]?.({
                    error: result.errors,
                    input: value,
                })
            }
        }

        setInputs((input) => {
            const newState = new Map(input)
            newState.set(key, value)
            return newState
        })
    }

    return [inputs, { setInput, getInput }] as const
}
