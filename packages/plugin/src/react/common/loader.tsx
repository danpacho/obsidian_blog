import { type TailwindCustom, tw } from '../tw'

const loadingSpinner = tw.style({
    size: 'size-6',
    animation: 'animate-spin',
    borderRadius: 'rounded-full',
    borderWidth: 'border-[1.25px]',
    borderColor: 'border-blue-400',
    borderYColor: 'border-y-transparent',

    display: 'flex',
    alignItems: 'items-center',
    justifyContent: 'justify-center',
})

interface LoaderProps extends TailwindCustom {}
export const Loader = ({ ...twProps }: LoaderProps) => {
    return (
        <div className={tw.mergeProps(loadingSpinner.style, twProps)}>
            <div className="size-[2.5px] animate-ping rounded-full bg-blue-400"></div>
        </div>
    )
}
