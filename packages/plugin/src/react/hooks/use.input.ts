import { useState } from 'react'

export const useInput = <InputType = string>(defaultValue: InputType) => {
    const [input, setInput] = useState<InputType>(defaultValue)
    return {
        input,
        setInput,
        defaultValue,
    }
}

export const useMultipleInput = <
    const InputRecord extends Record<string, unknown>,
>(
    inputRecord: InputRecord
): readonly [
    Map<keyof InputRecord, unknown>,
    {
        setInput: (key: string, value: unknown) => void
        getInput: (key: string) => unknown
    },
] => {
    const [inputs, setInputs] = useState<Map<string, unknown>>(
        () =>
            new Map(
                Object.entries(inputRecord).map(([key, value]) => [
                    key,
                    value ?? '',
                ])
            )
    )
    const getInput = (key: string): unknown => inputs.get(key) ?? 'NULL'
    const setInput = (key: string, value: unknown) => {
        setInputs((input) => {
            const newState = new Map(input)
            newState.set(key, value)
            return newState
        })
    }
    return [inputs, { setInput, getInput }]
}
