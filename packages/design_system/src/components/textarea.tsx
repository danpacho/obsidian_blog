import { tw } from '../tools/tw.js'

import type { TailwindComponent } from './tailwind.component.js'
import type { InputType } from '../hooks/index.js'

const textareaStyle = tw.style({
    width: '!w-full',

    fontFamily: '!font-mono',

    fontSize: '!text-sm',
    padding: ['px-2', 'py-1.5'],
    fontWeight: 'font-normal',

    color: '!text-stone-300',
    $placeholder: {
        color: 'placeholder:!text-stone-500',

        fontSize: 'placeholder:!text-sm',
    },

    resize: '!resize-y',
    minHeight: 'min-h-20',

    boxShadow: '!shadow-none',

    backgroundColor: '!bg-stone-800',

    borderColor: '!border-stone-700',

    caretColor: '!caret-stone-300',

    accentColor: '!accent-stone-300',
    transitionProperty: 'transition-colors',
    transitionTimingFunction: 'ease-in-out',
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
export interface TextareaProps<TextareaType extends InputType = InputType>
    extends React.DetailedHTMLProps<
            React.TextareaHTMLAttributes<HTMLTextAreaElement>,
            HTMLTextAreaElement
        >,
        TailwindComponent {
    title: string
    description?: string | React.ReactNode
    placeholder?: string
    input?: TextareaType
    setInput: (
        input: TextareaType,
        e: React.ChangeEvent<HTMLTextAreaElement>
    ) => void | Promise<void>
}
export const Textarea = <TextareaType extends InputType = InputType>({
    children,
    title,
    placeholder,
    description,
    input,
    setInput,
    onChange,
    tw: style,
    ...textareaProps
}: React.PropsWithChildren<TextareaProps<TextareaType>>) => {
    const isDescriptionString = typeof description === 'string'
    const className = style
        ? tw.mergeProps(textareaStyle.style(), style)
        : textareaStyle.class()

    return (
        <textarea
            {...textareaProps}
            className={className}
            onChange={async (e) => {
                await setInput(e.target.value as TextareaType, e)
                onChange?.(e)
            }}
            placeholder={
                placeholder ?? (isDescriptionString ? description : title)
            }
            value={input}
            name={title}
        >
            {children}
        </textarea>
    )
}
