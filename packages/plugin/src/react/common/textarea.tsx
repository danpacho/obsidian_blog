/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { InputType } from '../hooks'
import { tw } from '../tw'
import type { TailwindComponent } from './tailwind.component'

const textareaStyle = tw.style({
    //@ts-ignore
    width: '!w-full',
    //@ts-ignore
    fontFamily: '!font-mono',
    //@ts-ignore
    fontSize: '!text-sm',
    paddingX: 'px-2',
    paddingY: 'py-1.5',
    fontWeight: 'font-normal',
    //@ts-ignore
    color: '!text-stone-300',
    $placeholder: {
        //@ts-ignore
        color: 'placeholder:!text-stone-500',
        //@ts-ignore
        fontSize: 'placeholder:!text-sm',
    },
    //@ts-ignore
    resize: '!resize-y',
    minHeight: 'min-h-20',
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
        ? tw.mergeProps(textareaStyle.style, style)
        : textareaStyle.class

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
