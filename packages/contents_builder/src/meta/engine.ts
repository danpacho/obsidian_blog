import Matter from 'gray-matter'
import type { IOManager } from '../io_manager'
import type { Promisify, Stateful } from '../utils/promisify'

export type PolymorphicMeta = Record<string, unknown>

export interface MetaEngineConstructor<MetaShape extends PolymorphicMeta> {
    parser: (meta: unknown) => MetaShape
    generator?: (meta: PolymorphicMeta) => MetaShape
    ioManager: IOManager
}

interface MetaData<MetaShape extends PolymorphicMeta> {
    meta: MetaShape
    content: string
}

export class MetaEngine<MetaShape extends PolymorphicMeta> {
    private get $io() {
        return this.engine.ioManager
    }
    private get parser() {
        return this.engine.parser
    }
    private get generator() {
        return this.engine?.generator
    }
    public static create<NewMetaShape extends PolymorphicMeta>(
        engineInjection: Omit<MetaEngineConstructor<NewMetaShape>, 'ioManager'>,
        ioManager: IOManager
    ): MetaEngine<NewMetaShape> {
        return new MetaEngine<NewMetaShape>({
            ...engineInjection,
            ioManager,
        })
    }

    public updateEngine<NewMetaShape extends PolymorphicMeta>(
        newEngineComponent: Omit<
            MetaEngineConstructor<NewMetaShape>,
            'ioManager'
        >
    ): MetaEngine<NewMetaShape> {
        return new MetaEngine<NewMetaShape>(
            newEngineComponent.generator
                ? {
                      generator: newEngineComponent.generator,
                      parser: newEngineComponent.parser,
                      ioManager: this.$io,
                  }
                : {
                      parser: newEngineComponent.parser,
                      ioManager: this.$io,
                  }
        )
    }

    private get isGeneratorDefined(): boolean {
        return Boolean(this.generator)
    }

    public constructor(
        private readonly engine: MetaEngineConstructor<MetaShape>
    ) {}

    public generate(frontMatter: PolymorphicMeta): MetaShape | undefined {
        return this.generator?.(frontMatter)
    }
    public parse(frontMatter: unknown): MetaShape {
        return this.parser(frontMatter)
    }
    public safeParse(frontMatter: PolymorphicMeta): MetaShape {
        if (!this.isGeneratorDefined) {
            throw new Error(
                'Generator is not defined, you should define generator to use safeParse'
            )
        }
        try {
            const parsed = this.parse(this.generate(frontMatter))
            return parsed
        } catch {
            return this.generate(frontMatter)!
        }
    }
    private $parse(frontMatter: PolymorphicMeta): MetaShape {
        return this.isGeneratorDefined
            ? this.safeParse(frontMatter)
            : this.parse(frontMatter)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private static MatterOptions: Matter.GrayMatterOption<Matter.Input, any> = {
        delimiters: '---',
        language: 'yaml',
    }

    public static read(pureString: string): MetaData<PolymorphicMeta> {
        const { data: meta, content } = Matter(
            pureString,
            MetaEngine.MatterOptions
        )
        return {
            meta,
            content,
        }
    }
    public static stringify(metaData: MetaData<PolymorphicMeta>): string {
        return Matter.stringify(
            metaData.content,
            metaData.meta,
            MetaEngine.MatterOptions
        )
    }
    public static test(pureString: string): boolean {
        return Matter.test(pureString)
    }

    private extractMetaData(pureString: string): MetaData<MetaShape> {
        const { meta, content } = MetaEngine.read(pureString)

        return {
            meta: this.$parse(meta),
            content,
        }
    }

    public extractFromMd(md: string): Stateful<MetaData<MetaShape>> {
        if (!MetaEngine.test(md)) {
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
        const validMeta: MetaShape = this.$parse(metaData.meta)
        const validMetaData: MetaData<MetaShape> = {
            meta: validMeta,
            content: metaData.content,
        }

        try {
            const injected = MetaEngine.stringify(validMetaData)
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
