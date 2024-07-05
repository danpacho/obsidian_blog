import { GetVariants, TailwindCustom, tw } from '../tw'

interface ButtonProps extends TailwindCustom {
    type?: GetVariants<typeof button>
    onClick?: () => void
    ariaLabel?: string
}

const button = tw.rotary({
    base: {
        fontSize: 'text-sm',
        fontWeight: 'font-light',
        paddingX: 'px-3',
        paddingY: 'py-2',

        display: 'flex',
        flexDirection: 'flex-row',
        gap: 'gap-2',
        alignItems: 'items-center',
        justifyContent: 'justify-center',

        borderRadius: 'rounded-lg',
        borderWidth: 'border',
        color: 'text-white',

        $hover: {
            borderColor: 'hover:border-transparent',
        },
        $active: {
            opacity: 'active:opacity-75',
            transformTranslateY: 'active:translate-y-0.5',
        },
    },
    warn: {
        backgroundColor: 'bg-red-800',
        borderColor: 'border-red-600',
    },
    success: {
        backgroundColor: 'bg-green-700',
        borderColor: 'border-green-600',
    },
    normal: {
        backgroundColor: 'bg-black',
        borderColor: 'border-stone-700',
    },
})

export const Button = ({
    children,
    type = 'normal',
    onClick,
    ariaLabel,
    ...twProps
}: React.PropsWithChildren<ButtonProps>) => {
    return (
        <div
            className={tw.mergeProps(button.style(type), twProps)}
            onClick={onClick}
            aria-label={ariaLabel}
        >
            {children}
        </div>
    )
}
