/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadPrism } from 'obsidian'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { tw } from '../tw'
import { Label } from './label'

const activatedStyle = tw.toggle({
    base: {},
    truthy: {
        zIndex: 'z-10',
        opacity: 'opacity-100',
        pointerEvents: 'pointer-events-auto',
    },
    falsy: {
        zIndex: 'z-0',
        opacity: 'opacity-0',
        pointerEvents: 'pointer-events-none',
    },
})

export interface CodeInputProps {
    title: string
    description?: string | React.ReactNode
    input: string
    setInput: (input: string) => void
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}
export const CodeInput = ({
    input,
    setInput,
    title,
    description,
    onChange,
}: CodeInputProps) => {
    const [prism, setPrism] = useState<any>(null)
    const [highlightedCode, setHighlightedCode] = useState<string>('')
    const [mode, setMode] = useState<'viewer' | 'writer'>('writer')
    const textAreaRef = useRef<HTMLTextAreaElement>(null)
    const isDescriptionString = typeof description === 'string'

    useEffect(() => {
        const initializePrism = async () => {
            const Prism = await loadPrism()
            setPrism(Prism)
        }
        initializePrism()
    }, [])

    const updateCode = useCallback(
        (value: string) => {
            if (!prism) return
            const highlighted = prism.highlight(
                value,
                prism.languages.javascript,
                'javascript'
            )
            setHighlightedCode(highlighted)
        },
        [prism]
    )

    return (
        <div className="flex h-auto w-full flex-col items-start justify-between gap-y-1">
            <div className="flex flex-row items-center justify-between gap-x-1">
                <h1 className="ml-1 text-sm font-light text-stone-300">
                    {title}
                </h1>
                {isDescriptionString && (
                    <p className="ml-1 text-xs font-light text-stone-400">
                        {description}
                    </p>
                )}
                {!isDescriptionString && description && (
                    <div className="ml-1">{description}</div>
                )}
            </div>

            <div className="relative w-full">
                <textarea
                    ref={textAreaRef}
                    className={`${activatedStyle.class(
                        mode === 'writer'
                    )} absolute inset-0 h-fit min-h-32 !w-full bg-transparent px-2 py-1 text-sm font-normal !text-stone-300 caret-stone-300 placeholder:text-stone-500`}
                    onChange={(e) => {
                        const input = e.target.value
                        setInput(input)

                        onChange?.(e)
                    }}
                    onFocus={() => {
                        setMode('writer')
                    }}
                    onBlur={() => {
                        updateCode(input)
                        setMode('viewer')
                    }}
                    onSubmit={() => {
                        updateCode(input)
                        setMode('viewer')
                    }}
                    placeholder={isDescriptionString ? description : title}
                    value={input}
                    aria-label={title}
                    name={title}
                    spellCheck={false}
                />
                <pre
                    onClick={() => {
                        setMode('writer')
                        textAreaRef.current?.focus()
                    }}
                    className={`${activatedStyle.class(
                        mode === 'viewer'
                    )} absolute inset-0 m-0 size-full min-h-32 overflow-auto whitespace-pre-wrap rounded border border-stone-400/10 bg-transparent px-2 py-1 font-mono text-sm font-normal text-stone-300 hover:cursor-pointer hover:bg-stone-500/10`}
                >
                    {highlightedCode && (
                        <code
                            // eslint-disable-next-line tailwindcss/no-custom-classname
                            className="language-javascript !p-0"
                            dangerouslySetInnerHTML={{
                                __html: highlightedCode,
                            }}
                        />
                    )}
                    {!highlightedCode && (
                        <div className="flex size-full items-center justify-center">
                            <Label color="yellow">Write JS function</Label>
                        </div>
                    )}
                </pre>
            </div>
        </div>
    )
}
