import { Is } from './is'

/**
 * Merge two records deeply
 * @param base Merge base record
 * @param after Overwrite base record with after record
 * @returns Merged record based on base, overwritten by after
 */
export const MergeRecord = <
    T extends Record<string, unknown> = Record<string, unknown>,
>(
    base: T,
    after: T
): T => {
    const result: T = { ...base }

    for (const key in after) {
        if (Object.prototype.hasOwnProperty.call(after, key)) {
            const baseValue = base[key]
            const afterValue = after[key]

            if (Is.record(baseValue) && Is.record(afterValue)) {
                result[key] = MergeRecord(baseValue, afterValue)
            } else {
                result[key] = afterValue
            }
        }
    }

    return result
}
