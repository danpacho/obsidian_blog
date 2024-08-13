import { GetVariants, tw } from '../tw'

const label = tw.variants({
    base: {
        fontWeight: 'font-light',
    },
    variants: {
        color: {
            blue: {
                backgroundColor: 'bg-blue-400/10',
                color: 'text-blue-400',
                $hover: {
                    backgroundColor: 'hover:bg-blue-400/20',
                },
            },
            red: {
                backgroundColor: 'bg-red-400/10',
                color: 'text-red-400',
                $hover: {
                    backgroundColor: 'hover:bg-red-400/20',
                },
            },
            green: {
                backgroundColor: 'bg-green-400/10',
                color: 'text-green-400',
                $hover: {
                    backgroundColor: 'hover:bg-green-400/20',
                },
            },
            yellow: {
                backgroundColor: 'bg-yellow-400/10',
                color: 'text-yellow-400',
                $hover: {
                    backgroundColor: 'hover:bg-yellow-400/20',
                },
            },
            purple: {
                backgroundColor: 'bg-purple-400/10',
                color: 'text-purple-400',
                $hover: {
                    backgroundColor: 'hover:bg-purple-400/20',
                },
            },
        },
        size: {
            sm: {
                fontSize: 'text-xs',
                paddingX: 'px-0.5',
                paddingY: 'py-[0.5px]',
                borderRadius: 'rounded-sm',
            },
            md: {
                fontSize: 'text-sm',
                paddingX: 'px-1',
                paddingY: 'py-0.5',
                borderRadius: 'rounded',
            },
            lg: {
                fontSize: 'text-lg',
                paddingX: 'px-1.5',
                paddingY: 'py-1',
                borderRadius: 'rounded-lg',
            },
        },
    },
})

export interface LabelProps extends GetVariants<typeof label> {
    children: string
}
export const Label = ({
    children,
    color = 'blue',
    size = 'md',
}: LabelProps) => {
    return <span className={label.class({ color, size })}>{children}</span>
}
