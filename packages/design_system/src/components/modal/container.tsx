import { useEffect, useRef, useState } from 'react'
import type { GetVariants } from 'tailwindest'
import { createPortal } from 'react-dom'
import { type Tailwindest, tw } from '~/tools/tw.js'
import { TailwindComponent } from '../tailwind.component.js'

const modal = tw.variants({
    base: {
        zIndex: 'z-50',
        overflow: 'overflow-hidden',
        transitionProperty: 'transition-all',
        transform: 'transform-gpu',
    },
    variants: {
        bg: {
            black: {
                backgroundColor: 'bg-black',
            },
            white: {
                backgroundColor: 'bg-white',
            },
            transparent: {
                backgroundColor: 'bg-transparent',
            },
        },
        position: {
            fixed: {
                position: 'fixed',
                inset: 'inset-0',
            },
            abs: {
                position: 'absolute',
            },
            static: {
                position: 'static',
            },
            relative: {
                position: 'relative',
            },
        },
        size: {
            full: {
                width: 'size-full',
            },
            fit: {
                width: 'size-fit',
            },
        },
        open: {
            true: {
                pointerEvents: 'pointer-events-auto',
                opacity: 'opacity-100',
            },
            false: {
                pointerEvents: 'pointer-events-none',
                opacity: 'opacity-0',
            },
        },
        blur: {
            none: {
                backdropFilter: 'backdrop-blur-none',
            },
            sm: {
                backdropFilter: 'backdrop-blur-sm',
            },
            md: {
                backdropFilter: 'backdrop-blur-md',
            },
            lg: {
                backdropFilter: 'backdrop-blur-lg',
            },
            xl: {
                backdropFilter: 'backdrop-blur-xl',
            },
            '2xl': {
                backdropFilter: 'backdrop-blur-2xl',
            },
            '3xl': {
                backdropFilter: 'backdrop-blur-3xl',
            },
        },
        duration: {
            '200': {
                transitionDuration: 'duration-200',
            },
            '300': {
                transitionDuration: 'duration-300',
            },
            '500': {
                transitionDuration: 'duration-500',
            },
            '700': {
                transitionDuration: 'duration-700',
            },
            '1000': {
                transitionDuration: 'duration-1000',
            },
        },
    },
})

export interface ModalViewProps
    extends TailwindComponent,
        GetVariants<typeof modal> {
    show: boolean
    onOutsideClick?: () => void
    modalCloseStyle?: Tailwindest
    modalOpenStyle?: Tailwindest
    disableOuterElementInteraction?: boolean
    enableRootRender?: boolean
    as?: string
}

export const Modal = ({
    children,
    show: openState,
    modalCloseStyle,
    modalOpenStyle,
    onOutsideClick,
    disableOuterElementInteraction = true,
    enableRootRender = false,
    as: Component = 'div',
    ...styles
}: React.PropsWithChildren<ModalViewProps>) => {
    useEffect(() => {
        if (!disableOuterElementInteraction) return
        if (enableRootRender) return

        if (openState) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }

        return () => {
            if (!disableOuterElementInteraction) return
            if (enableRootRender) return

            document.body.style.overflow = 'auto'
        }
    }, [openState, disableOuterElementInteraction])

    const root = useRef<HTMLElement | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const elem = document.getElementById('modal-root')
        if (elem) {
            root.current = elem
            setMounted(true)
        }
    }, [])

    const handleOutsideClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
        const isModalContentClicked = e.target !== e.currentTarget
        if (isModalContentClicked) return
        onOutsideClick?.()
    }

    const Tag = Component as any

    if (!enableRootRender) {
        return (
            <>
                {openState && (
                    <div
                        className="fixed inset-0 z-50 overflow-hidden"
                        onClick={handleOutsideClick}
                    />
                )}

                <Tag
                    className={tw.mergeProps(
                        modal.style({
                            ...styles,
                            open: openState ? 'true' : 'false',
                        }),
                        styles.tw ?? {},
                        openState
                            ? (modalOpenStyle ?? {})
                            : (modalCloseStyle ?? {})
                    )}
                >
                    {children}
                </Tag>
            </>
        )
    }

    if (!mounted) return null

    return createPortal(
        <>
            {openState && (
                <div
                    className="fixed inset-0 z-50 overflow-hidden"
                    onClick={handleOutsideClick}
                />
            )}

            <Tag
                className={tw.mergeProps(
                    modal.style({
                        ...styles,
                        open: openState ? 'true' : 'false',
                    }),
                    styles.tw ?? {},
                    openState ? (modalOpenStyle ?? {}) : (modalCloseStyle ?? {})
                )}
            >
                {children}
            </Tag>
        </>,
        root.current!
    )
}
