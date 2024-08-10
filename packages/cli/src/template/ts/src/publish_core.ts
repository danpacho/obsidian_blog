#!/usr/bin/env node
import { CorePlugins, PublishSystem } from '@obsidian_blogger/publish_system'

export const Publisher = new PublishSystem({
    bridgeRoot: '{{obsidian_vault_root}}',
})
    //==============================================================================
    //                             Plugin Registration                            //
    //==============================================================================
    .use({
        buildScript: [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.BlogBuilder(),
        ],
        repository: [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.GithubRepository(),
        ],
    })
