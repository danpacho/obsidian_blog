import { type GetVariants, tw } from '../tools/tw.js'
import type { TailwindComponent } from './tailwind.component.js'

const loader = tw.variants({
    base: {
        animation: 'animate-spin',
        borderRadius: 'rounded-full',
        borderYColor: 'border-y-transparent',

        display: 'flex',
        alignItems: 'items-center',
        justifyContent: 'justify-center',
    },
    variants: {
        size: {
            sm: {
                size: 'size-2.5',
                borderWidth: 'border',
            },
            md: {
                size: 'size-4',
                borderWidth: 'border-[1.25px]',
            },
            lg: {
                size: 'size-6',
                borderWidth: 'border-[1.5px]',
            },
        },
        color: {
            blue: {
                borderColor: 'border-blue-400',
            },
            yellow: {
                borderColor: 'border-yellow-400',
            },
        },
    },
})

interface LoaderProps extends TailwindComponent, GetVariants<typeof loader> {}
export const Loader = ({
    tw: style,
    color = 'blue',
    size = 'md',
}: LoaderProps) => {
    const className = style
        ? tw.mergeProps(
              loader.style({
                  color,
                  size,
              }),
              style
          )
        : loader.class({
              color,
              size,
          })
    return (
        <div className={className}>
            <div
                className={`size-[2.5px] animate-ping rounded-full ${color === 'blue' ? 'bg-blue-400' : 'bg-yellow-400'}`}
            ></div>
        </div>
    )
}
