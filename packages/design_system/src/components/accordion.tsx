import React, { useEffect, useState } from 'react'

interface AccordionState {
    isActive: boolean
    height: {
        title: number
        content: number
    }
}
const useScrollHeight = (recorder: (height: number) => void) => {
    const ref = React.useRef<HTMLDivElement>(null)
    const [scrollHeight, setScrollHeight] = useState<number>(0)
    useEffect(() => {
        if (ref.current) {
            const height = ref.current.scrollHeight
            setScrollHeight(height)
            recorder(height)
        }
    }, [])

    return { ref, scrollHeight }
}
const AccordionStateContext = React.createContext<Map<
    string,
    AccordionState
> | null>(null)
const AccordionSetStateContext = React.createContext<React.Dispatch<
    React.SetStateAction<Map<string, AccordionState>>
> | null>(null)

const useAccordionState = () => {
    const context = React.useContext(AccordionStateContext)
    if (!context) {
        throw new Error('useAccordionState must be used within an Accordion')
    }
    return context
}
const useAccordionSetState = () => {
    const context = React.useContext(AccordionSetStateContext)
    if (!context) {
        throw new Error('useAccordionSetState must be used within an Accordion')
    }
    return context
}
const useAccordion = (): [
    Map<string, AccordionState>,
    React.Dispatch<React.SetStateAction<Map<string, AccordionState>>>,
] => [useAccordionState(), useAccordionSetState()]

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {}
const Container = ({
    children,
    ...containerProps
}: React.PropsWithChildren<ContainerProps>) => {
    const [openedMap, setOpenedMap] = useState<Map<string, AccordionState>>(
        new Map()
    )

    return (
        <AccordionSetStateContext.Provider value={setOpenedMap}>
            <AccordionStateContext.Provider value={openedMap}>
                <div {...containerProps}>{children}</div>
            </AccordionStateContext.Provider>
        </AccordionSetStateContext.Provider>
    )
}

interface TitleProps extends React.HTMLAttributes<HTMLDivElement> {
    accordionId?: string
    indicator?: (isActive: boolean) => React.ReactNode
}
const TitleActivator = ({
    children,
    accordionId,
    indicator,
    ...activatorProps
}: React.PropsWithChildren<TitleProps>) => {
    const [opened, setOpenedMap] = useAccordion()
    const { ref } = useScrollHeight((height) => {
        setOpenedMap((prev) => {
            const newState = new Map(prev)
            if (!accordionId) return newState
            const state = newState.get(accordionId)
            if (state) {
                newState.set(accordionId, {
                    ...state,
                    height: { ...state.height, title: height },
                })
            }
            return newState
        })
    })

    const isActive = opened.get(accordionId ?? '')?.isActive

    return (
        <div
            {...activatorProps}
            style={{
                ...activatorProps.style,
                cursor: 'pointer',
            }}
            ref={ref}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                activatorProps.onClick?.(e)
                setOpenedMap((prev) => {
                    const newState = new Map(prev)
                    if (!accordionId) return newState
                    const state = newState.get(accordionId)
                    if (!state) return newState
                    newState.set(accordionId, {
                        ...state,
                        isActive: !state.isActive,
                    })
                    return newState
                })
            }}
        >
            {indicator ? (
                indicator(isActive ?? false)
            ) : (
                <span
                    className={`self-center text-stone-600 ${isActive ? 'rotate-90' : 'rotate-0'} transition-transform duration-200 ease-in-out`}
                >
                    ›
                </span>
            )}

            {children}
        </div>
    )
}

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
    accordionId?: string
    disableAnimation?: boolean
}
const Content = ({
    children,
    accordionId,
    disableAnimation = false,
    ...contentProps
}: React.PropsWithChildren<ContentProps>) => {
    const [openedMap, setOpenedMap] = useAccordion()
    const { ref, scrollHeight } = useScrollHeight((height) => {
        setOpenedMap((prev) => {
            const newState = new Map(prev)
            if (!accordionId) return newState
            const state = newState.get(accordionId)
            if (state) {
                newState.set(accordionId, {
                    ...state,
                    height: { ...state.height, content: height },
                })
            }
            return newState
        })
    })

    const state = openedMap.get(accordionId ?? '')

    return (
        <div
            {...contentProps}
            ref={ref}
            style={
                disableAnimation
                    ? {}
                    : {
                          visibility: state?.isActive ? 'visible' : 'hidden',
                          height: state?.isActive ? 'auto' : 0,
                          minHeight: state?.isActive ? scrollHeight : 0,
                      }
            }
            className={`${state?.isActive ? `pointer-events-auto translate-y-0 opacity-100 ${disableAnimation && 'visible'}` : `pointer-events-none -translate-y-5 opacity-0 ${disableAnimation && 'hidden'}`} origin-top transform-gpu overflow-visible transition-all duration-100 ease-in-out ${contentProps.className}`}
        >
            {children}
        </div>
    )
}

const passAccordionId = (
    children: React.ReactNode,
    accordionId: string
): React.ReactNode => {
    return React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, {
                ...(child.props as Record<string, unknown>),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                accordionId,
            })
        }

        return child
    })
}
interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Unique identifier for the item
     */
    accordionId: string
    /**
     * Whether the item should be open by default
     * @default false
     * @optional
     */
    initialOpen?: boolean
}
const Item = ({
    children,
    accordionId,
    initialOpen,
    ...itemProps
}: React.PropsWithChildren<ItemProps>) => {
    const setOpenedMap = useAccordionSetState()
    useEffect(() => {
        setOpenedMap((prev) => {
            const newState = new Map(prev)
            if (!accordionId) return newState
            const state = newState.get(accordionId)
            if (!state) {
                newState.set(accordionId, {
                    isActive: initialOpen ?? false,
                    height: { title: 0, content: 0 },
                })
            }
            return newState
        })
    }, [])

    return <div {...itemProps}>{passAccordionId(children, accordionId)}</div>
}

Item.Title = TitleActivator
Item.Content = Content

export const Accordion = {
    useAccordion,
    Container,
    Item,
}
