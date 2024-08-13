export interface InputProps {
    title: string
    description?: string | React.ReactNode
    placeholder?: string
    input: string
    setInput: (input: string) => void
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}
export const Input = ({
    children,
    title,
    placeholder,
    description,
    input,
    setInput,
    onChange,
}: React.PropsWithChildren<InputProps>) => {
    const isDescriptionString = typeof description === 'string'
    return (
        <div className="flex w-full flex-col items-start justify-between gap-y-1">
            <div className="flex flex-row items-center justify-between gap-x-1">
                <h1 className="ml-1 font-mono text-sm font-semibold text-stone-300">
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

            <input
                className="!w-full !font-mono text-sm font-normal !text-stone-300 placeholder:!text-stone-500"
                onChange={(e) => {
                    setInput(e.target.value)
                    onChange?.(e)
                }}
                placeholder={
                    placeholder ?? (isDescriptionString ? description : title)
                }
                value={input}
                type="text"
                aria-label={title}
                name={title}
            >
                {children}
            </input>
        </div>
    )
}
