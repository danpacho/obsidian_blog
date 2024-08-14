import { tw } from '../tw'
import { TailwindComponent } from './tailwind.component'

const loadingSpinner = tw.style({
    size: 'size-4',
    animation: 'animate-spin',
    borderRadius: 'rounded-full',
    borderWidth: 'border-[1.25px]',
    borderColor: 'border-blue-400',
    borderYColor: 'border-y-transparent',

    display: 'flex',
    alignItems: 'items-center',
    justifyContent: 'justify-center',
})

interface LoaderProps extends TailwindComponent {}
export const Loader = ({ tw: style }: LoaderProps) => {
    const className = style
        ? tw.mergeProps(loadingSpinner.style, style)
        : loadingSpinner.class
    return (
        <div className={className}>
            <div className="size-[2.5px] animate-ping rounded-full bg-blue-400"></div>
        </div>
    )
}
