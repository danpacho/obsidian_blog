import React from 'react'

export interface TextAreaProps {
    title: string
    description?: string | React.ReactNode
    input: string
    setInput: (input: string) => void
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export const TextArea = ({
    input,
    setInput,
    title,
    description,
    onChange,
}: TextAreaProps) => {
    const isDescriptionString = typeof description === 'string'
    return (
        <div className="flex w-full flex-col items-start justify-between gap-y-1">
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

            <textarea
                className="!w-full px-2 py-1 text-sm font-normal !text-stone-300 placeholder:text-stone-500"
                onChange={(e) => {
                    setInput(e.target.value)
                    onChange?.(e)
                }}
                placeholder={isDescriptionString ? description : title}
                value={input}
                aria-label={title}
                name={title}
            />
        </div>
    )
}
