import { useCallback, useEffect, useRef } from 'react'

/**
 * @param callback - The function to be called start and clear the timer
 * @param delay - The delay in milliseconds
 * @example
 * ```ts
 * const { startTimer, clearTimer } = useTimer({
 *      start: () => {
 *          console.log('Hello, world!')
 *      }
 *      clear: () => {
 *          console.log('Timer cleared')
 *      }
 * } , 1000);
 *
 * startTimer(); // Starts the timer
 * clearTimer(); // Clears the timer
 * ```
 */
export const useTimer = (
    callback: { start: () => void; clear?: () => void },
    delay: number
) => {
    const callbackRef = useRef(callback)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    const startTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }

        timerRef.current = setTimeout(() => {
            callbackRef.current.start()
        }, delay)
    }, [delay])

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
            callbackRef.current.clear?.()
        }
    }, [])

    useEffect(() => {
        return () => {
            clearTimer()
        }
    }, [clearTimer])

    return { startTimer, clearTimer, timerRef, callbackRef }
}
