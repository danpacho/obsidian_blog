/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadPrism } from 'obsidian'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { tw } from '../tw'
import { Button } from './button'
import { Label } from './label'
import { Textarea } from './textarea'

const activatedStyle = tw.toggle({
    base: {
        minHeight: 'min-h-32',
        $hover: {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            backgroundColor: 'hover:!bg-stone-800',
        },
    },
    truthy: {
        opacity: 'opacity-100',
        pointerEvents: 'pointer-events-auto',
    },
    falsy: {
        opacity: 'opacity-0',
        pointerEvents: 'pointer-events-none',
    },
})

export interface CodeInputProps {
    title: string
    description?: string
    input: string
    setInput: (input: string) => void | Promise<void>
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
        <>
            {mode === 'writer' && (
                <div className="relative !size-full min-h-32">
                    <Textarea
                        tw={activatedStyle.style(mode === 'writer')}
                        setInput={setInput}
                        input={input}
                        onChange={async (e) => {
                            const input = e.target.value
                            await setInput(input)
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
                        spellCheck={true}
                        title={title}
                    />
                    <Button
                        type="normal"
                        size="sm"
                        tw={{
                            position: 'absolute',
                            right: 'right-2',
                            top: 'top-2',
                            zIndex: 'z-10',
                        }}
                        onClick={() => {
                            updateCode(input)
                            setMode('viewer')
                        }}
                    >
                        save
                    </Button>
                </div>
            )}
            {mode === 'viewer' && (
                <pre
                    onClick={() => {
                        setMode('writer')
                        textAreaRef.current?.focus()
                    }}
                    className={`${activatedStyle.class(
                        mode === 'viewer'
                    )} relative m-0 size-full min-h-32 overflow-auto whitespace-pre-wrap rounded border border-stone-400/10 bg-stone-900/90 px-2 py-1 font-mono text-sm font-normal !text-stone-300 !caret-stone-300 hover:cursor-pointer hover:bg-stone-500/10`}
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
                        <Label
                            color="gray"
                            size="sm"
                            tw={{
                                position: 'absolute',
                                top: 'top-1/2',
                                left: 'left-1/2',
                                transformTranslateX: '-translate-x-1/2',
                                transformTranslateY: '-translate-y-1/2',
                            }}
                        >
                            Write JS function
                        </Label>
                    )}
                </pre>
            )}
        </>
    )
}
