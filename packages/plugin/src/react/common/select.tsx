/* eslint-disable @typescript-eslint/ban-ts-comment */
import { tw } from '../tw'
import { TailwindComponent } from './tailwind.component'

const selectStyle = tw.toggle({
    base: {
        //@ts-ignore
        width: '!w-full',
        //@ts-ignore
        fontFamily: '!font-mono',
        fontSize: 'text-sm',
        fontWeight: 'font-normal',
        //@ts-ignore
        color: '!text-stone-300',
        $placeholder: {
            //@ts-ignore
            color: 'placeholder:!text-stone-500',
        },
        paddingX: 'px-2',
        borderWidth: 'border',
        borderStyle: 'border-solid',
        cursor: 'cursor-pointer',
        //@ts-ignore
        boxShadow: '!shadow-none',
        //@ts-ignore
        accentColor: '!accent-stone-300',
        transition: 'transition-colors ease-in-out',
        transitionDuration: 'duration-200',
    },
    truthy: {
        //@ts-ignore
        backgroundColor: '!bg-stone-700',
        //@ts-ignore
        borderColor: '!border-stone-700',
        //@ts-ignore
        color: '!text-stone-300',
        $hover: {
            //@ts-ignore
            backgroundColor: 'hover:!bg-stone-700',
            //@ts-ignore
            color: 'hover:!text-stone-300',
        },
    },
    falsy: {
        //@ts-ignore
        backgroundColor: '!bg-stone-800',
        //@ts-ignore
        borderColor: '!border-stone-700',
        //@ts-ignore
        color: '!text-stone-300',
        $hover: {
            //@ts-ignore
            backgroundColor: 'hover:!bg-stone-500/10',
            //@ts-ignore
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
    defaultValue?: string
}
export const Select = ({
    title,
    options,
    input,
    setInput,
    tw: style,
}: SelectProps) => {
    const isActive = input !== ''
    const className = style
        ? tw.mergeProps(selectStyle.style(isActive), style)
        : selectStyle.class(isActive)

    return (
        <select
            className={className}
            title={title}
            value={input}
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
