/* eslint-disable @typescript-eslint/ban-ts-comment */
import { tw } from '../tw'
import { TailwindComponent } from './tailwind.component'

const inputStyle = tw.style({
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
    //@ts-ignore
    boxShadow: '!shadow-none',
    //@ts-ignore
    backgroundColor: '!bg-stone-800',
    //@ts-ignore
    borderColor: '!border-stone-700',
    //@ts-ignore
    caretColor: '!caret-stone-300',
    //@ts-ignore
    accentColor: '!accent-stone-300',
    transition: 'transition-colors ease-in-out',
    transitionDuration: 'duration-200',
    $checked: {
        //@ts-ignore
        caretColor: 'checked:!accent-stone-300',
        //@ts-ignore
        accentColor: 'checked:!accent-stone-300',
        //@ts-ignore
        backgroundColor: 'checked:!bg-stone-800',
        $after: {
            //@ts-ignore
            backgroundColor: 'checked:after:!bg-stone-300',
        },
    },
    $hover: {
        //@ts-ignore
        backgroundColor: 'hover:!bg-stone-500/10',
        //@ts-ignore
        color: 'hover:!text-stone-300',
    },
})
export interface InputProps
    extends React.DetailedHTMLProps<
            React.InputHTMLAttributes<HTMLInputElement>,
            HTMLInputElement
        >,
        TailwindComponent {
    title: string
    description?: string | React.ReactNode
    placeholder?: string
    input: string
    setInput: (input: string) => void
}
export const Input = ({
    children,
    title,
    placeholder,
    description,
    input,
    setInput,
    onChange,
    tw: style,
    ...inputProps
}: React.PropsWithChildren<InputProps>) => {
    const isDescriptionString = typeof description === 'string'
    const className = style
        ? tw.mergeProps(inputStyle.style, style)
        : inputStyle.class

    return (
        <input
            className={className}
            onChange={(e) => {
                setInput(e.target.value)
                onChange?.(e)
            }}
            placeholder={
                placeholder ?? (isDescriptionString ? description : title)
            }
            value={input}
            name={title}
            {...inputProps}
        >
            {children}
        </input>
    )
}
