import { App, PluginSettingTab, Setting } from 'obsidian'
import ObsidianBlogger from './main'

export interface ObsidianBloggerSettings {
    obsidian_vault_root: string
    bridge_install_root: string
    blog_assets_root: string
    blog_contents_root: string
    node_bin: string
}

export class ObsidianBloggerSetting extends PluginSettingTab {
    constructor(
        app: App,
        public readonly plugin: ObsidianBlogger
    ) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this

        containerEl.empty()

        new Setting(containerEl).setHeading().setName('Obsidian Vault')

        new Setting(containerEl)
            .setName(`✔︎ vault_root <required>`)
            .setDesc('root path for the obsidian vault')
            .addText((text) =>
                text
                    .setPlaceholder('Obsidian vault root')
                    .setValue(this.plugin.settings.obsidian_vault_root)
                    .onChange(async (value) => {
                        this.plugin.settings.obsidian_vault_root = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl).setHeading().setName('Bridge')

        new Setting(containerEl)
            .setName('✔︎ bridge_root <required>')
            .setDesc(`root path for the bridge package`)
            .addText((text) =>
                text
                    .setPlaceholder('Bridge install root')
                    .setValue(this.plugin.settings.bridge_install_root)
                    .onChange(async (value) => {
                        this.plugin.settings.bridge_install_root = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl).setHeading().setName('Blog')

        new Setting(containerEl)
            .setName('✔︎ blog_assets_root <required>')
            .setDesc('root path for the blog assets')
            .addText((text) =>
                text
                    .setPlaceholder('Blog assets root')
                    .setValue(this.plugin.settings.blog_assets_root)
                    .onChange(async (value) => {
                        this.plugin.settings.blog_assets_root = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('✔︎ blog_contents_root <required>')
            .setDesc('root path for the blog contents')
            .addText((text) =>
                text
                    .setPlaceholder('Blog contents root')
                    .setValue(this.plugin.settings.blog_contents_root)
                    .onChange(async (value) => {
                        this.plugin.settings.blog_contents_root = value
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl).setHeading().setName('Node binary')

        new Setting(containerEl)
            .setName('✔︎ node_bin <required>')
            .setDesc('root path for the node')
            .addText((text) =>
                text
                    .setPlaceholder(
                        'Node bin path, type `which node` or `where node` e.g) /usr/local/bin'
                    )
                    .setValue(this.plugin.settings.node_bin)
                    .onChange(async (value) => {
                        this.plugin.settings.node_bin = value
                        await this.plugin.saveSettings()
                    })
            )
    }
}
