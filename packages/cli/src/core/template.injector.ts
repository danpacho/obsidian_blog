/**
 * Injects template into a string, replace `{{key}}` with corresponding value from the template object.
 * @param source Injection target source `string`
 * @param template Template replace information
 * @example
 * ```ts
 * const source = 'Hello, {{name}}! Your age is {{age}}.'
 * const template = {
 *    name: 'John',
 *    age: '30',
 * }
 * const result = templateInjector(source, template)
 * console.log(result.replaced) // Hello, John! Your age is 30.
 * ```
 */
export const templateInjector = <TemplateConfig extends Record<string, string>>(
    source: string,
    template: TemplateConfig
):
    | {
          success: true
          replaced: string
          matched: Array<string>
      }
    | {
          success: false
          replaced: string
          matched: Array<string>
          issues: Array<string>
      } => {
    const issues: Array<string> = []

    const keys = Object.keys(template)
    const regex = new RegExp(`{{(${keys.join('|')})}}`, 'g')
    const matched = source
        .match(regex)
        ?.map((match) => match.replace('{{', '').replace('}}', '').trim())

    const exactMatched = matched?.map((match) => match.trim()) ?? []
    const notEqual = exactMatched.join('') !== keys.join('')

    if (notEqual) {
        keys.forEach((key) => {
            if (!exactMatched.includes(key)) {
                issues.push(`Template key not found for ${key}`)
            }
        })
    }

    const replaced = source.replace(regex, (_, key) => {
        const target = template[key as keyof TemplateConfig]
        if (!target) {
            return ''
        }
        return target
    })

    if (notEqual) {
        return {
            success: false,
            replaced,
            matched: exactMatched,
            issues,
        }
    }
    return {
        success: true,
        replaced,
        matched: exactMatched,
    }
}
