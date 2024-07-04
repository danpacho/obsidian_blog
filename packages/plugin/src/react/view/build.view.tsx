import { useState } from 'react'
import { Button } from '../common/button'

export const BuildView = () => {
    const [counter, setCounter] = useState(0)

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border border-stone-700 bg-stone-800 p-2 text-white">
                {counter}
            </div>
            <input type="text"></input>
            <button>aaa</button>

            <div className="flex w-full flex-row items-center justify-center gap-2">
                <Button
                    type="success"
                    fontSize="text-2xl"
                    onClick={() => setCounter((c) => c + 1)}
                >
                    Plus
                </Button>
                <Button type="warn" onClick={() => setCounter((c) => c - 1)}>
                    Minus
                </Button>
            </div>
        </div>
    )
}
