import { tw } from '../tools/tw.js'

import type { TailwindComponent } from './tailwind.component.js'

const selectStyle = tw.toggle({
    base: {
        width: '!w-full',

        fontFamily: '!font-mono',
        fontSize: 'text-sm',
        fontWeight: 'font-normal',

        color: '!text-stone-300',
        $placeholder: {
            color: 'placeholder:!text-stone-500',
        },
        padding: ['px-2'],
        borderWidth: 'border',
        borderStyle: 'border-solid',

        boxShadow: '!shadow-none',

        accentColor: '!accent-stone-300',
        transitionProperty: 'transition-colors',
        transitionTimingFunction: 'ease-in-out',
        transitionDuration: 'duration-200',
    },
    truthy: {
        backgroundColor: '!bg-stone-700',

        borderColor: '!border-stone-700',

        color: '!text-stone-300',
        $hover: {
            backgroundColor: 'hover:!bg-stone-700',

            color: 'hover:!text-stone-300',
        },
    },
    falsy: {
        backgroundColor: '!bg-stone-800',

        borderColor: '!border-stone-700',

        color: '!text-stone-300',
        $hover: {
            backgroundColor: 'hover:!bg-stone-500/10',

            color: 'hover:!text-stone-300',
        },
    },
})

interface Options {
    label?: string
    value: string
}
interface SelectProps extends TailwindComponent {
    title: string
    options: Array<Options>
    input: string
    setInput: (input: string) => void
    defaultValue?: string | undefined
}
export const Select = ({
    title,
    options,
    input,
    setInput,
    defaultValue,
    tw: style,
}: SelectProps) => {
    const isActive = input !== ''
    const className = style
        ? tw.mergeProps(selectStyle.style(isActive), style)
        : selectStyle.class(isActive)

    const selectedValue = input || defaultValue
    return (
        <select
            className={className}
            title={title}
            value={selectedValue}
            onChange={(e) => {
                setInput(e.target.value)
            }}
        >
            <option value="" disabled>
                {`Select ${title}`}
            </option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label ?? option.value}
                </option>
            ))}
        </select>
    )
}
