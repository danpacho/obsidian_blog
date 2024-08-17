import { GetVariants, tw } from '../tw'
import type { TailwindComponent } from './tailwind.component'

interface ButtonProps extends TailwindComponent, GetVariants<typeof button> {
    onClick?: () => void | Promise<void>
    ariaLabel?: string
    disabled?: boolean
}

const button = tw.variants({
    variants: {
        type: {
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
        },
        size: {
            sm: {
                paddingX: 'px-2',
                paddingY: 'py-1',
                fontSize: 'text-xs',
                borderRadius: 'rounded',
            },
            md: {
                paddingX: 'px-3',
                paddingY: 'py-1.5',
                fontSize: 'text-sm',
                borderRadius: 'rounded-md',
            },
            lg: {
                paddingX: 'px-4',
                paddingY: 'py-2',
                fontSize: 'text-base',
                borderRadius: 'rounded-lg',
            },
        },
    },
    base: {
        width: 'w-fit',
        fontWeight: 'font-light',

        display: 'flex',
        flexDirection: 'flex-row',
        gap: 'gap-2',
        alignItems: 'items-center',
        justifyContent: 'justify-center',

        color: 'text-white',
        borderWidth: 'border',

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
})

export const Button = ({
    children,
    type = 'normal',
    size = 'md',
    disabled,
    onClick,
    ariaLabel,
    tw: style,
}: React.PropsWithChildren<ButtonProps>) => {
    const className = style
        ? tw.mergeProps(
              button.style({
                  type,
                  size,
              }),
              style
          )
        : button.class({
              type,
              size,
          })

    return (
        <div
            className={className}
            onClick={async () => {
                if (disabled || type === 'disabled') return
                await onClick?.()
            }}
            aria-label={ariaLabel}
        >
            {children}
        </div>
    )
}
