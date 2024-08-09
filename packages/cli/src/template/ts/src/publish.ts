#!/usr/bin/env node
import { CorePlugins, PublishSystem } from '@obsidian_blogger/publish_system'

const Publisher = new PublishSystem({
    bridgeRoot: '{{bridge_root}}',
})

const publish = async () => {
    Publisher.use({
        buildScript: [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.BlogBuilder(),
        ],
        repository: [
            // CorePlugins. you can remove it and modify the plugins
            new CorePlugins.GithubRepository(),
        ],
    })

    await Publisher.publish()
}

publish()
