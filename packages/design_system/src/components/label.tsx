import React from 'react'

import { type GetVariants, tw } from '../tools/tw.js'

import type { TailwindComponent } from './tailwind.component.js'

const label = tw.variants({
    base: {
        fontWeight: 'font-light',
    },
    variants: {
        color: {
            blue: {
                backgroundColor: 'bg-blue-400/10',
                color: 'text-blue-400',
                borderColor: 'border-blue-400/50',
                $hover: {
                    backgroundColor: 'hover:bg-blue-400/20',
                    borderColor: 'hover:border-blue-400',
                },
            },
            red: {
                backgroundColor: 'bg-red-400/10',
                color: 'text-red-400',
                borderColor: 'border-red-400/50',
                $hover: {
                    backgroundColor: 'hover:bg-red-400/20',
                    borderColor: 'hover:border-red-400',
                },
            },
            green: {
                backgroundColor: 'bg-green-400/10',
                color: 'text-green-400',
                borderColor: 'border-green-400/50',
                $hover: {
                    backgroundColor: 'hover:bg-green-400/20',
                    borderColor: 'hover:border-green-400',
                },
            },
            yellow: {
                backgroundColor: 'bg-yellow-400/10',
                color: 'text-yellow-400',
                borderColor: 'border-yellow-400/50',
                $hover: {
                    backgroundColor: 'hover:bg-yellow-400/20',
                    borderColor: 'hover:border-yellow-400',
                },
            },
            purple: {
                backgroundColor: 'bg-purple-400/10',
                color: 'text-purple-400',
                borderColor: 'border-purple-400/50',
                $hover: {
                    backgroundColor: 'hover:bg-purple-400/20',
                    borderColor: 'hover:border-purple-400',
                },
            },
            gray: {
                backgroundColor: 'bg-stone-400/10',
                color: 'text-stone-400',
                borderColor: 'border-stone-400/50',
                $hover: {
                    backgroundColor: 'hover:bg-stone-400/20',
                    borderColor: 'hover:border-stone-400',
                },
            },
        },
        size: {
            sm: {
                fontSize: 'text-xs',
                padding: ['px-1', 'py-[0.5px]'],
                borderRadius: 'rounded-sm',
            },
            md: {
                fontSize: 'text-sm',
                padding: ['px-1.5', 'py-0.5'],
                borderRadius: 'rounded',
            },
            lg: {
                fontSize: 'text-lg',
                padding: ['px-2', 'py-1'],
                borderRadius: 'rounded-lg',
            },
        },
        style: {
            vanilla: {
                borderColor: 'border-transparent',
                borderWidth: 'border-0',
            },
            border: {
                borderWidth: 'border',
            },
        },
    },
})

export interface LabelProps
    //@ts-ignore
    extends GetVariants<typeof label>,
        TailwindComponent {
    children: React.ReactNode
}
export const Label = ({
    children,
    color = 'blue',
    size = 'md',
    style: border = 'vanilla',
    tw: style,
}: LabelProps) => {
    const className = style
        ? tw.mergeProps(label.style({ color, size, style: border }), style)
        : label.class({ color, size, style: border })

    return <span className={className}>{children}</span>
}
