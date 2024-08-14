import { tw } from '../tw'
import { TailwindComponent } from './tailwind.component'

type UniversalProps<T extends React.ElementType> = {
    as?: T
    children?: React.ReactNode
} & React.ComponentPropsWithoutRef<T> &
    TailwindComponent

export const Universal = <T extends React.ElementType = 'div'>({
    children,
    as,
    tw: style,
    ...props
}: UniversalProps<T>) => {
    const Element = as || 'div'
    const className = style ? tw.style(style).class : undefined
    return (
        <Element className={className} {...props}>
            {children}
        </Element>
    )
}
