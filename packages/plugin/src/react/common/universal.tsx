import { type TailwindCustom, tw } from '../tw'

type UniversalProps<T extends React.ElementType> = {
    as?: T
    children?: React.ReactNode
    tw?: TailwindCustom
} & React.ComponentPropsWithoutRef<T>

export const Universal = <T extends React.ElementType = 'div'>({
    children,
    as,
    tw: style,
    ...props
}: UniversalProps<T>) => {
    const Element = as || 'div'
    return (
        <Element className={tw.style(style ?? {}).class} {...props}>
            {children}
        </Element>
    )
}
