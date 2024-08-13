import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTimer } from '../hooks'
import { tw } from '../tw'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
    content: string
    position?: TooltipPosition
    children: React.ReactNode
    delay?: number
}

const tooltip = tw.style({
    position: 'absolute',
    zIndex: 'z-10',
    paddingY: 'py-2',
    paddingX: 'px-2.5',
    color: 'text-white',
    backgroundColor: 'bg-black',
    fontSize: 'text-sm/5',
    borderRadius: 'rounded-lg',
    boxShadow: 'shadow-2xl',
    transition: 'transition-opacity ease-out',
    transitionDuration: 'duration-300',
})

const visibility = tw.toggle({
    truthy: {
        pointerEvents: 'pointer-events-auto',
        opacity: 'opacity-100',
    },
    falsy: {
        pointerEvents: 'pointer-events-none',
        opacity: 'opacity-0',
    },
})

const arrowStyles = tw.rotary({
    base: {
        backgroundColor: 'bg-black',
        boxShadow: 'shadow-2xl',
        width: 'w-2',
        height: 'h-2',
        transformOrigin: 'origin-center',
        transformRotate: 'rotate-45',
        transition: 'transition-opacity ease-out',
        transitionDuration: 'duration-300',
    },
    top: {
        left: 'left-1/2',
        bottom: 'bottom-0',
        transformTranslateX: '-translate-x-1/2',
        transformTranslateY: 'translate-y-1/2',
    },
    bottom: {
        left: 'left-1/2',
        top: 'top-0',
        transformTranslateX: '-translate-x-1/2',
        transformTranslateY: '-translate-y-1/2',
    },
    left: {
        top: 'top-1/2',
        right: 'right-0',
        transformTranslateX: 'translate-x-1/2',
        transformTranslateY: '-translate-y-1/2',
    },
    right: {
        top: 'top-1/2',
        left: 'left-0',
        transformTranslateX: '-translate-x-1/2',
        transformTranslateY: '-translate-y-1/2',
    },
})

/**
 * Tooltip component that displays additional information when hovering over an element.
 * Now with smooth transition effects when appearing and disappearing, and an arrow indicating direction.
 *
 * @param {string} content - The content to display inside the tooltip.
 * @param {'top' | 'bottom' | 'left' | 'right'} [position='top'] - The position of the tooltip relative to the child element.
 * @param {React.ReactNode} children - The element that will trigger the tooltip on hover.
 *
 * @example
 * ```tsx
 * <Tooltip content="This is a tooltip" position="top">
 *   <button>Hover me</button>
 * </Tooltip>
 * ```
 */
export const Tooltip = ({
    content,
    children,
    position = 'top',
    delay = 750,
}: TooltipProps) => {
    const [active, setActive] = useState(false)
    const [visible, setVisible] = useState(false)
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
        opacity: 0,
    })

    const tooltipRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLDivElement>(null)

    const { startTimer, clearTimer } = useTimer(
        {
            start: () => {
                if (active) setVisible(true)
                else setVisible(false)
            },
            clear: () => {
                if (!active) return
                setActive(false)
                setVisible(false)
            },
        },
        delay
    )

    const calculatePosition = useCallback(() => {
        if (!tooltipRef.current || !triggerRef.current) return

        const triggerRect = triggerRef.current.getBoundingClientRect()
        const tooltipRect = tooltipRef.current.getBoundingClientRect()

        const PADDING = 12 as const
        let style: React.CSSProperties = {}
        switch (position) {
            case 'top':
                style = {
                    left: triggerRect.width / 2,
                    top: -PADDING - tooltipRect.height,
                    transform: 'translate(-50%, 0)',
                }
                break
            case 'bottom':
                style = {
                    left: triggerRect.width / 2,
                    top: triggerRect.height + PADDING,
                    transform: 'translate(-50%, 0)',
                }
                break
            case 'left':
                style = {
                    left: -PADDING - tooltipRect.width,
                    top: triggerRect.height / 2,
                    transform: 'translate(0, -50%)',
                }
                break
            case 'right':
                style = {
                    left: triggerRect.width + PADDING,
                    top: triggerRect.height / 2,
                    transform: 'translate(0, -50%)',
                }
                break
        }

        setTooltipStyle(style)
    }, [position])

    useEffect(() => {
        if (active) calculatePosition()
    }, [active])

    return (
        <div
            className="relative inline-block h-auto w-full"
            ref={triggerRef}
            onPointerEnter={() => {
                setActive(true)
                startTimer()
            }}
            onPointerLeave={() => {
                setActive(false)
                clearTimer()
            }}
        >
            {children}

            <div
                ref={tooltipRef}
                className={`${tooltip.class} ${visibility.class(visible)}`}
                style={tooltipStyle}
            >
                <span
                    className={`absolute ${visibility.class(visible)} ${arrowStyles.class(position)}`}
                />
                <span className="min-w-24 text-pretty text-center">
                    {content}
                </span>
            </div>
        </div>
    )
}
