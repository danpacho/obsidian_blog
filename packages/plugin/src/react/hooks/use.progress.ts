import { type Job } from '@obsidian_blogger/helpers/job'
import { useCallback, useMemo, useState } from 'react'

/**
 * Task that executed by bridge package, and inquired from bridge store
 */
export interface Task extends Job<Array<Job>> {}
/**
 * @param initialTasks Initial tasks to be completed
 * @returns Progress state and task completion function
 */
export const useProgress = (initialTasks: Array<Task>) => {
    const [progressState, setProgressState] = useState(0)
    const [tasks, setSteps] = useState<Array<Task>>(initialTasks)

    const progress = useMemo(() => {
        return (progressState / (tasks.length - 1)) * 100
    }, [progressState, tasks.length])

    const finishTask = useCallback(
        (index: number) => {
            if (index < 0 || index >= tasks.length) return
            setProgressState(index)
            setSteps((prevSteps) =>
                prevSteps.map((step, i) => ({
                    ...step,
                    isActive: i <= index,
                }))
            )
        },
        [tasks.length]
    )

    return {
        tasks,
        progress,
        progressState,
        finishTask,
    }
}
