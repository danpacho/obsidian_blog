/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import type { InputType } from '../hooks/index.js'
import { tw } from '../tools/tw.js'
import type { TailwindComponent } from './tailwind.component.js'

const inputStyle = tw.style({
    width: '!w-full',
    fontFamily: '!font-mono',
    fontSize: 'text-sm',
    fontWeight: 'font-normal',
    color: '!text-stone-300',
    $placeholder: {
        color: 'placeholder:!text-stone-500',
    },
    boxShadow: '!shadow-none',
    backgroundColor: '!bg-stone-800',
    borderColor: '!border-stone-700',
    caretColor: '!caret-stone-300',
    accentColor: '!accent-stone-300',
    transition: 'transition-colors ease-in-out',
    transitionDuration: 'duration-200',
    $checked: {
        caretColor: 'checked:!accent-stone-300',
        accentColor: 'checked:!accent-stone-300',
        backgroundColor: 'checked:!bg-stone-800',
        $after: {
            backgroundColor: 'checked:after:!bg-stone-300',
        },
    },
    $hover: {
        backgroundColor: 'hover:!bg-stone-500/10',
        color: 'hover:!text-stone-300',
    },
})
export interface InputProps<InputT extends InputType = InputType>
    extends React.DetailedHTMLProps<
            React.InputHTMLAttributes<HTMLInputElement>,
            HTMLInputElement
        >,
        TailwindComponent {
    title: string
    description?: string | React.ReactNode
    placeholder?: string
    input?: InputT
    setInput: (
        input: InputT,
        e: React.ChangeEvent<HTMLInputElement>
    ) => void | Promise<void>
}
export const Input = <InputT extends InputType = InputType>({
    children,
    title,
    placeholder,
    description,
    input,
    setInput,
    onChange,
    tw: style,
    ...inputProps
}: React.PropsWithChildren<InputProps<InputT>>) => {
    const isDescriptionString = typeof description === 'string'
    const className = style
        ? tw.mergeProps(inputStyle.style, style)
        : inputStyle.class

    return (
        <input
            {...inputProps}
            className={className}
            onChange={async (e) => {
                await setInput(e.target.value as InputT, e)
                onChange?.(e)
            }}
            placeholder={
                placeholder ?? (isDescriptionString ? description : title)
            }
            value={input}
            name={title}
            checked={inputProps.checked ?? undefined}
        >
            {children}
        </input>
    )
}
