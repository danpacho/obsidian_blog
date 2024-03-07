import Matter from 'gray-matter'
import type { IOManager } from '../io_manager'
import type { Promisify, Stateful } from '../utils/promisify'

type PolymorphicMeta = Record<string, unknown>

interface FrontmatterBuilderConstructor<Schema extends PolymorphicMeta> {
    parser: (frontMatter: unknown) => Schema
    generator: (frontMatter: PolymorphicMeta) => Schema
    ioManager: IOManager
}

interface MetaData<MetaShape extends PolymorphicMeta> {
    meta: MetaShape
    content: string
}

export class MetaManager<MetaShape extends PolymorphicMeta> {
    private get $io() {
        return this.options.ioManager
    }
    private get parser() {
        return this.options.parser
    }
    private get generator() {
        return this.options.generator
    }

    public constructor(
        private readonly options: FrontmatterBuilderConstructor<MetaShape>
    ) {}

    public generate(frontMatter: PolymorphicMeta): MetaShape {
        return this.generator(frontMatter)
    }
    public parse(frontMatter: unknown): MetaShape {
        return this.parser(frontMatter)
    }
    public safeParse(frontMatter: PolymorphicMeta): MetaShape {
        try {
            const parsed = this.parse(frontMatter)
            return parsed
        } catch {
            return this.generate(frontMatter)
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static MatterOptions: Matter.GrayMatterOption<Matter.Input, any> = {
        delimiters: '---',
        language: 'yaml',
    }

    public read(pureString: string): MetaData<PolymorphicMeta> {
        const { data: meta, content } = Matter(
            pureString,
            MetaManager.MatterOptions
        )
        return {
            meta,
            content,
        }
    }
    public stringify(metaData: MetaData<PolymorphicMeta>): string {
        return Matter.stringify(
            metaData.content,
            metaData.meta,
            MetaManager.MatterOptions
        )
    }
    public test(pureString: string): boolean {
        return Matter.test(pureString)
    }

    private extractMetaData(pureString: string): MetaData<MetaShape> {
        const { meta, content } = this.read(pureString)

        return {
            meta: this.safeParse(meta),
            content,
        }
    }

    public extractFromMd(md: string): Stateful<MetaData<MetaShape>> {
        if (!this.test(md)) {
            return {
                success: false,
                error: new Error('Not a valid markdown file'),
            }
        }

        const metaData = this.extractMetaData(md)
        return {
            success: true,
            data: metaData,
        }
    }

    public async extractFromFile(path: string): Promisify<MetaData<MetaShape>> {
        const file = await this.$io.reader.readFile(path)
        if (!file.success) {
            return {
                success: false,
                error: file.error,
            }
        }

        return this.extractFromMd(file.data)
    }

    public async inject(injectOption: {
        metaData: MetaData<PolymorphicMeta>
        injectPath: string
    }): Promisify<{
        metaData: MetaData<PolymorphicMeta>
        injectPath: string
        injected: string
    }> {
        const { injectPath, metaData } = injectOption
        const validMeta: MetaShape = this.safeParse(metaData.meta)
        const validMetaData: MetaData<MetaShape> = {
            meta: validMeta,
            content: metaData.content,
        }

        try {
            const injected = this.stringify(validMetaData)
            const writeResult = await this.$io.writer.write({
                data: injected,
                filePath: injectPath,
            })
            if (!writeResult.success) throw writeResult.error
            return {
                success: true,
                data: { ...injectOption, injected },
            }
        } catch (e) {
            return {
                success: false,
                error: e,
            }
        }
    }
}
