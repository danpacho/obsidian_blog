import { tw } from '../tools/tw.js'

import type { TailwindComponent } from './tailwind.component.js'
import type { GetVariants } from '../tools/tw.js'

export interface ButtonProps
    extends TailwindComponent,
        GetVariants<typeof button> {
    onClick?: (
        e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => void | Promise<void>
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
                    translate: 'active:translate-y-0',
                },
            },
        },
        size: {
            sm: {
                padding: ['px-2', 'py-1'],
                fontSize: 'text-xs',
                borderRadius: 'rounded',
            },
            md: {
                padding: ['px-3', 'py-1.5'],
                fontSize: 'text-sm',
                borderRadius: 'rounded-md',
            },
            lg: {
                padding: ['px-4', 'py-2'],
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

        transitionProperty: 'transition-colors',
        transitionTimingFunction: 'ease-out',
        cursor: 'cursor-pointer',

        $hover: {
            borderColor: 'hover:border-transparent',
        },
        $active: {
            opacity: 'active:opacity-75',
            translate: 'active:translate-y-0.1',
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
              style ?? {}
          )
        : button.class({
              type,
              size,
          })

    return (
        <div
            className={className}
            onClick={async (e) => {
                if (disabled || type === 'disabled') return
                await onClick?.(e)
            }}
            aria-label={ariaLabel}
        >
            {children}
        </div>
    )
}
