import { IO as IOManager } from '@blogger/helpers'
import { Logger } from '@blogger/logger'
import { BuildSystem, type BuildSystemConstructor } from './builder'
import { FileTreeParser, type FileTreeParserConstructor } from './parser'
import { GitShell } from './publisher/git'
import {
    ShellScript,
    type ShellScriptConstructor,
} from './publisher/shell.script'

//TODO: refactor, divide constructor <-> config options
type ClassInstance = 'io' | 'logger' | 'parser'

interface SystemConstructor {
    parser: Omit<FileTreeParserConstructor, ClassInstance>
    builder: Omit<BuildSystemConstructor, ClassInstance>
    shell: Omit<ShellScriptConstructor, ClassInstance>
}
export class System {
    private readonly parser: FileTreeParser
    public readonly builder: BuildSystem
    private readonly logger: Logger
    private readonly io: IOManager
    public readonly script: {
        readonly shell: ShellScript
        readonly git: GitShell
    }

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
        this.script = {
            shell: new ShellScript({
                ...options.shell,
                logger: this.logger,
            }),
            git: new GitShell({
                ...options.shell,
                logger: this.logger,
            }),
        }
    }
}
