import { IO, Logger } from '@obsidian_blogger/helpers'
import { Builder, type BuilderConstructor } from './builder'
import type { BuildSystemAdapter } from './builder/plugin'
import { FileTreeParser, type FileTreeParserConstructor } from './parser'

//TODO: refactor, divide constructor <-> config options
type ClassInstance = 'io' | 'logger' | 'parser'

export interface BuildSystemConstructor {
    /**
     * Tree parser required constructor options
     */
    parser: Omit<FileTreeParserConstructor, ClassInstance>
    /**
     * Builder required constructor options
     */
    builder: Omit<BuilderConstructor, ClassInstance>
}
export class BuildSystem {
    private readonly $parser: FileTreeParser
    private readonly $builder: Builder
    private readonly $logger: Logger
    private readonly $io: IO

    public constructor(options: BuildSystemConstructor) {
        this.$io = new IO()
        this.$logger = new Logger({
            name: 'build_system',
        })
        this.$parser = new FileTreeParser({
            io: this.$io,
            ...options.parser,
        })
        this.$builder = new Builder({
            io: this.$io,
            parser: this.$parser,
            logger: this.$logger,
            ...options.builder,
        })
    }

    /**
     * Build the project
     */
    public async build() {
        await this.$builder.build()
    }

    /**
     * Register build system plugins
     * @param plugins {@link BuildSystemAdapter}
     * @example
     * ```ts
     * const system = new BuildSystem(...)
     * system.use({
     *      "build:tree": [plugin0, plugin1],
     *      "walk:tree": plugin2,
     *      "build:contents": [plugin3, plugin4],
     * })
     * ```
     */
    public use(plugins: BuildSystemAdapter) {
        this.$builder.use(plugins)
    }
}
