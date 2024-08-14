import { useState } from 'react'

export const useInput = (defaultValue: string = '') => {
    const [input, setInput] = useState<string>(defaultValue)
    return {
        input,
        setInput,
        defaultValue,
    }
}
