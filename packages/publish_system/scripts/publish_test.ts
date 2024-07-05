import { IO, ShellExecutor } from '@obsidian_blogger/helpers'
import {
    BlogBuilder,
    GithubRepository,
    PublishConfig,
    PublishSystem,
} from '../src/publish.system'

const publish = async () => {
    const io = new IO()
    const shell = new ShellExecutor()

    const BLOG_ROOT =
        '/Users/june/Documents/project/blogger_astro_blog' as const

    const publisher = new PublishSystem({
        name: 'pub_system',
        cwd: BLOG_ROOT,
        builder: new BlogBuilder({
            cwd: BLOG_ROOT,
        }),
        repository: new GithubRepository({
            cwd: BLOG_ROOT,
            gitPath: (await shell.exec$('which git')).stdout,
        }),
    })

    // Assume that file is updated
    await io.writer.write({
        filePath: `${BLOG_ROOT}/ci_test/${new Date()
            .toISOString()
            .replace(/:/g, '_')}.txt`,
        data: `test generated @${new Date().toLocaleDateString()}`,
    })

    // Publish
    await publisher.publish<PublishConfig>({
        build: {
            buildScript: ['build'],
        },
        save: {
            branch: 'main',
            commitPrefix: 'feat',
            commitMessage: `published by automatically @${new Date()
                .toISOString()
                .replace(/:/g, '_')}`,
        },
        deploy: {
            deployScript: ['echo "deploy"'],
        },
    })
}

publish()
