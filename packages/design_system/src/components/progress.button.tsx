import { Promisify } from '@obsidian_blogger/helpers/promisify'
import React, { useRef, useState } from 'react'
import { useTimer } from '../hooks/index.js'
import { Button, ButtonProps } from './button.js'
export type ProgressStatus = 'progress' | 'success' | 'error' | 'idle'
export interface ProgressStatusInfo {
    status: ProgressStatus
    error: React.RefObject<Error | null>
}
export interface ProgressButtonProps extends ButtonProps {
    onStatusChange: (status: ProgressStatus) => React.ReactNode
    onError?: (e: unknown) => void
    controller: ReturnType<typeof useProgressStatus>
    startProgress: (
        e: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => Promisify<void>
    idleRecoverTime?: number
    afterStatusChange?: (status: ProgressStatus) => void
}

const STATUS_BUTTON_TYPE = {
    progress: 'disabled',
    success: 'success',
    error: 'error',
    idle: 'normal',
} as const satisfies Record<ProgressStatus, string>

export const useProgressStatus = (): [
    ProgressStatusInfo,
    React.Dispatch<React.SetStateAction<ProgressStatus>>,
] => {
    const [progressStatus, setProgressStatus] = useState<ProgressStatus>('idle')
    const errorMessageRef = useRef<Error | null>(null)

    return [
        { status: progressStatus, error: errorMessageRef },
        setProgressStatus,
    ]
}

export const ProgressButton = ({
    onStatusChange,
    onError,
    controller,
    startProgress,
    afterStatusChange,
    disabled,
    idleRecoverTime = 2500,
    ...buttonProps
}: ProgressButtonProps) => {
    const [{ status, error }, setProgressStatus] = controller
    const { startTimer } = useTimer(
        {
            start: () => {
                afterStatusChange?.(status)
                setProgressStatus('idle')
            },
            clear: () => {},
        },
        idleRecoverTime
    )

    return (
        <Button
            {...buttonProps}
            type={STATUS_BUTTON_TYPE[status]}
            disabled={status !== 'idle' || (disabled ?? false)}
            onClick={async (e) => {
                if (disabled) return

                if (error.current) {
                    error.current = null
                }

                setProgressStatus('progress')
                await buttonProps.onClick?.(e)
                const progressResponse = await startProgress(e)
                if (progressResponse.success) {
                    setProgressStatus('success')
                } else {
                    setProgressStatus('error')
                    if (progressResponse.error instanceof Error) {
                        error.current = progressResponse.error
                    } else {
                        error.current = new Error('progress error', {
                            cause: progressResponse.error,
                        })
                    }
                    onError?.(progressResponse.error)
                }
                startTimer()
            }}
        >
            {onStatusChange(status)}
        </Button>
    )
}
