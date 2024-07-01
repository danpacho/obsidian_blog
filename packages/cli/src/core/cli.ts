import { IO } from '@obsidian_blogger/helpers/io'
import { Logger } from '@obsidian_blogger/helpers/logger'
import { Command } from 'commander'

/**
 * Represents a CLI command.
 */
interface CLICommand<
    ArgType = unknown,
    OptType extends Record<string, unknown> = Record<string, unknown>,
> {
    /**
     * Indicates if the command is a global command.
     */
    globalCmd?: boolean
    /**
     * The flag for the command.
     */
    cmdFlag: string
    /**
     * The description of the command.
     */
    cmdDescription: string
    /**
     * The action to be performed when the command is executed.
     * @param args The arguments for the command.
     * @param options The options for the command.
     */
    cmdAction: (args: ArgType, options: OptType) => void
    /**
     * The flag for the command argument.
     */
    argFlag?: string
    /**
     * The flag for the command option.
     */
    optFlag: string
    /**
     * The description of the command option.
     */
    optDescription: string
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
export class CLI {
    private readonly $program: Command
    private readonly $io: IO
    private readonly $logger: Logger

    /**
     * Gets the program options.
     */
    private get programOptions() {
        return this.$program.opts()
    }

    /**
     * Creates a new instance of the CLI class.
     * @param options The options for the CLI.
     */
    public constructor(public readonly options: CLIConstructor) {
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
     * // Global command
     * cli.addCommand({
     *    globalCmd: true,
     *    cmdFlag: '--debug',
     *    cmdDescription: 'Enable debugging',
     *    optFlag: '-d, --debug',
     *    optDescription: 'Enable debug mode',
     *    optDefaultValue: false,
     *    cmdAction: (_, options) => {
     *      console.log('Debugging enabled')
     *      console.log('Options:', options)
     *    },
     * })
     * // Local command
     * cli.addCommand<string, { template: string }>({
     *    cmdFlag: 'start <projectName>',
     *    cmdDescription: 'Start a new project',
     *    argFlag: '<projectName>',
     *    optFlag: '-t, --template <template>',
     *    optDescription: 'Specify a template',
     *    optDefaultValue: 'default',
     *    cmdAction: (projectName, options) => {
     *       console.log(`Starting project: ${projectName} with template: ${options.template}`)
     *    },
     * })
     * ```
     */
    public addCommand<
        ArgType = unknown,
        OptType extends Record<string, unknown> = Record<string, unknown>,
    >(command: CLICommand<ArgType, OptType>) {
        const cmd = command.globalCmd
            ? this.$program
            : this.$program.command(command.cmdFlag)

        if (command.argFlag) {
            cmd.argument(command.argFlag)
        }

        if (command.optArgParser) {
            cmd.option(
                command.optFlag,
                command.optDescription,
                command.optArgParser,
                command.optDefaultValue
            )
        } else {
            cmd.option(
                command.optFlag,
                command.optDescription,
                command.optDefaultValue
            )
        }

        cmd.description(command.cmdDescription)

        cmd.action((...args: unknown[]) => {
            const options = args.pop() as OptType
            const [arg] = args as [ArgType]
            command.cmdAction(arg, options)
        })

        if (!command.globalCmd) {
            this.$program.addCommand(cmd)
        }
    }

    /**
     * Parses the command line arguments.
     */
    public parse() {
        this.$program.parse(process.argv)
    }
}
