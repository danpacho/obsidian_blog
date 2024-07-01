import { IO as IOManager, Logger } from '@obsidian_blogger/helpers'
import {
    BuildSystem,
    type BuildSystemConstructor,
    PluginAdapter,
} from './builder'
import { FileTreeParser, type FileTreeParserConstructor } from './parser'

//TODO: refactor, divide constructor <-> config options
type ClassInstance = 'io' | 'logger' | 'parser'

interface SystemConstructor {
    parser: Omit<FileTreeParserConstructor, ClassInstance>
    builder: Omit<BuildSystemConstructor, ClassInstance>
}
export class System {
    private readonly parser: FileTreeParser
    private readonly builder: BuildSystem
    private readonly logger: Logger
    private readonly io: IOManager

    public constructor(options: SystemConstructor) {
        this.io = new IOManager()
        this.logger = new Logger({
            name: 'build_system',
        })
        this.parser = new FileTreeParser({
            io: this.io,
            ...options.parser,
        })
        this.builder = new BuildSystem({
            io: this.io,
            parser: this.parser,
            logger: this.logger,
            ...options.builder,
        })
    }

    /**
     * @description Build the project
     */
    public async build() {
        await this.builder.build()
    }

    /**
     * @description Use a plugin
     * @param plugins
     * @example
     * ```ts
     * const system = new BuildSystem(...)
     * system.use({
     *      "walk:generate:tree": [plugin0],
     *      "build:origin:tree": [plugin1, plugin2],
     *      "build:contents": [plugin3, plugin4],
     * })
     * ```
     */
    public use(plugins: PluginAdapter) {
        this.builder.use(plugins)
    }
}
