/* eslint-disable @typescript-eslint/ban-types */
import { IO } from '@obsidian_blogger/helpers/io'
import { Logger } from '@obsidian_blogger/helpers/logger'
import { Command } from 'commander'

type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

type ExtractArgType<
    T extends ReadonlyArray<string>,
    Result = {},
> = T extends readonly [infer First, ...infer Rest]
    ? First extends `<${infer U}>`
        ? Rest extends ReadonlyArray<string>
            ? ExtractArgType<Rest, Result & { [key in U]: string }>
            : never
        : First extends `[${infer U}]`
          ? Rest extends ReadonlyArray<string>
              ? ExtractArgType<Rest, Result & { [key in U]?: string }>
              : never
          : never
    : Result

/**
 * Represents a CLI command.
 */
interface CLICommand<
    ArgType extends ReadonlyArray<string> | unknown = unknown,
    OptType extends Record<string, unknown> = Record<string, unknown>,
> {
    /**
     * The flag for the command.
     */
    cmdFlag?: string
    /**
     * The description of the command.
     */
    cmdDescription?: string
    /**
     * The action to be performed when the command is executed.
     * @param args The arguments for the command.
     * @param options The options for the command.
     */
    cmdAction?: (
        args: ArgType extends ReadonlyArray<string>
            ? Prettify<ExtractArgType<ArgType>>
            : never,
        options: OptType
    ) => void
    /**
     * The flag for the command argument.
     */
    argFlag?: ArgType
    /**
     * The flag for the command option. Option is `global` configuration.
     */
    optFlag?: string
    /**
     * The description of the command option.
     */
    optDescription?: string
    /**
     * The parser function for the command option argument.
     */
    optArgParser?: (
        value: string,
        prev: string | boolean | Array<string> | undefined
    ) => string | boolean | Array<string> | undefined
    /**
     * The default value for the command option.
     */
    optDefaultValue?: string | boolean | Array<string> | undefined
}

/**
 * Represents information about the CLI.
 */
interface CLIInfo {
    /**
     * The version of the CLI.
     */
    version: string
    /**
     * The name of the CLI.
     */
    name: string
    /**
     * The description of the CLI.
     */
    description: string
}

interface CLIConstructor {
    /**
     * The information about the CLI.
     */
    readonly info: CLIInfo
}
export abstract class CLI<
    ProgramOption extends Record<string, unknown> = Record<string, unknown>,
> {
    /**
     * The `Commander` program instance.
     */
    protected readonly $program: Command
    /**
     * The logger instance.
     */
    protected readonly $logger: Logger
    /**
     * The IO instance.
     */
    protected readonly $io: IO

    /**
     * Gets the program options.
     */
    protected get programOptions(): ProgramOption {
        return this.$program.opts<ProgramOption>()
    }

    /**
     * Creates a new instance of the CLI class.
     * @param options The options for the CLI.
     */
    public constructor(options: CLIConstructor) {
        this.$program = new Command()
        this.$io = new IO()
        this.$logger = new Logger({ name: options.info.name })

        this.updateInfo(options.info)
    }

    /**
     * Updates the information about the CLI.
     * @param info The updated CLI information.
     * @example
     * ```ts
     * cli.updateInfo({
     *    version: '1.0.0',
     *    description: 'An example CLI for demonstration purposes',
     * })
     */
    public updateInfo(info: CLIInfo) {
        this.$program
            .version(info.version)
            .name(info.name)
            .description(info.description)
    }

    /**
     * Adds a new command to the CLI.
     * @param command The command to be added.
     * @example
     * ```ts
     * // command
     * cli.addCommand<string, { template: string }>({
     *    cmdFlag: 'start',
     *    cmdDescription: 'Start a new project',
     *    argFlag: '<projectName>',
     *
     *    optFlag: '-t, --template <template>',
     *    optDescription: 'Specify a template',
     *    optDefaultValue: 'default',
     *
     *    cmdAction: (projectName: string, options: { template: string }) => {
     *       console.log(`Starting project: ${projectName} with template: ${options.template}`)
     *    },
     * })
     * ```
     */
    public addCommand<
        const ArgType extends
            | readonly [`<${string}>` | `[${string}]`]
            | unknown = unknown,
    >(command: CLICommand<ArgType, ProgramOption>) {
        const commander =
            command.cmdFlag && command.cmdDescription
                ? this.$program
                      .command(command.cmdFlag)
                      .description(command.cmdDescription)
                : this.$program

        if (command.argFlag) {
            ;(command.argFlag as Array<string>).forEach((arg) => {
                commander.argument(arg as string)
            })
        }

        if (command.optFlag && command.optDescription) {
            if (command.optArgParser) {
                commander.option(
                    command.optFlag,
                    command.optDescription,
                    command.optArgParser,
                    command.optDefaultValue
                )
            } else {
                commander.option(
                    command.optFlag,
                    command.optDescription,
                    command.optDefaultValue
                )
            }
        }

        if (command.cmdAction) {
            commander.action((...args: string[]) => {
                const options = (args.pop() ?? {}) as ProgramOption
                const argEntry = command.argFlag
                    ? Object.fromEntries(
                          (command.argFlag as Array<string>).map(
                              (arg, index) => [
                                  arg.replace(/[<>[\]]/g, ''),
                                  args[index],
                              ]
                          )
                      )
                    : {}
                command.cmdAction?.(
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    //@ts-ignore
                    argEntry,
                    options
                )
            })
        }
    }

    /**
     * Parses the command line arguments.
     */
    public parse() {
        this.$program.parse(process.argv)
    }

    /**
     * Runs the CLI.
     */
    public abstract run(): void
}
