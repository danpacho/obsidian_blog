#!/usr/bin/env node
import { CorePlugins, PublishSystem } from '@obsidian_blogger/publish_system'

const publish = async () => {
    const Publisher = new PublishSystem({
        name: 'pub_system',
        cwd: '{{blog_root}}',
    })

    const BlogBuilder = new CorePlugins.BlogBuilder({
        name: 'blog_builder',
        cwd: '{{blog_root}}',
    })

    const GithubRepository = new CorePlugins.GithubRepository({
        name: 'github_repository',
        cwd: '{{blog_root}}',
        gitPath: '{{git_path}}',
    })

    Publisher.use({
        buildScript: [BlogBuilder],
        repository: [GithubRepository],
    })

    // Publish
    const publishResult = await Publisher.publish<{
        buildScript: readonly [CorePlugins.BlogBuildConfig]
        repository: readonly [CorePlugins.GithubSaveConfig]
        deploy?: readonly [Record<string, unknown>]
    }>({
        buildScript: [
            {
                buildScript: ['{{build_script}}'],
            },
        ],
        repository: [
            {
                branch: '{{commit_branch}}',
                commitPrefix: '{{commit_prefix}}',
                commitMessage: '{{commit_message}}',
            },
        ],
    })

    return publishResult
}

publish()
