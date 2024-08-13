import { GetVariants, tw } from '../tw'
import type { TailwindComponent } from './tailwind.component'

interface ButtonProps extends TailwindComponent {
    type?: GetVariants<typeof button>
    onClick?: () => void | Promise<void>
    ariaLabel?: string
    disabled?: boolean
}

const button = tw.rotary({
    base: {
        fontSize: 'text-sm',
        fontWeight: 'font-light',
        paddingX: 'px-3',
        paddingY: 'py-1.5',

        display: 'flex',
        flexDirection: 'flex-row',
        gap: 'gap-2',
        alignItems: 'items-center',
        justifyContent: 'justify-center',

        color: 'text-white',
        borderWidth: 'border',
        borderRadius: 'rounded-md',
        transition: 'transition-colors ease-out',
        cursor: 'cursor-pointer',

        $hover: {
            borderColor: 'hover:border-transparent',
        },
        $active: {
            opacity: 'active:opacity-75',
            transformTranslateY: 'active:translate-y-0.5',
        },
    },
    warn: {
        backgroundColor: 'bg-yellow-800',
        borderColor: 'border-yellow-600',
    },
    success: {
        backgroundColor: 'bg-green-700',
        borderColor: 'border-green-600',
    },
    normal: {
        backgroundColor: 'bg-black',
        borderColor: 'border-stone-700',
    },
    error: {
        backgroundColor: 'bg-red-800',
        borderColor: 'border-red-600',
    },
    disabled: {
        backgroundColor: 'bg-stone-700',
        borderColor: 'border-stone-700',
        opacity: 'opacity-75',
        cursor: 'cursor-not-allowed',
        $hover: {
            borderColor: 'hover:border-transparent',
        },
        $active: {
            opacity: 'active:opacity-75',
            transformTranslateY: 'active:translate-y-0',
        },
    },
})

export const Button = ({
    children,
    type = 'normal',
    disabled,
    onClick,
    ariaLabel,
    style,
}: React.PropsWithChildren<ButtonProps>) => {
    const className = style
        ? tw.mergeProps(button.style(type), style)
        : button.class(type)

    return (
        <div
            className={className}
            onClick={async () => {
                if (disabled) return
                await onClick?.()
            }}
            aria-label={ariaLabel}
        >
            {children}
        </div>
    )
}
