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
        builder: [
            new BlogBuilder({
                name: 'blog_builder',
                cwd: BLOG_ROOT,
            }),
        ],
        repository: [
            new GithubRepository({
                name: 'github_repository',
                cwd: BLOG_ROOT,
                gitPath: (await shell.exec$('which git')).stdout,
            }),
        ],
    })

    const uniqueID = new Date().toISOString().replace(/:/g, '_')

    // Assume that file is updated
    await io.writer.write({
        filePath: `${BLOG_ROOT}/ci_test/${new Date()
            .toISOString()
            .replace(/:/g, '_')}.txt`,
        data: `test generated @${uniqueID}`,
    })

    // Publish
    const publishResult = await publisher.publish<PublishConfig>({
        build: {
            buildScript: ['build'],
        },
        save: {
            branch: 'main',
            commitPrefix: 'feat',
            commitMessage: `published by publisher, automatically generated @${new Date()
                .toISOString()
                .replace(/:/g, '_')}`,
        },
        deploy: {
            deployScript: ['echo "deploy"'],
        },
    })

    // eslint-disable-next-line no-console
    console.log(publishResult)

    await io.writer.write({
        data: JSON.stringify(publishResult, null, 2),
        filePath: `${BLOG_ROOT}/ci_test/${uniqueID}_pub_result.json`,
    })
}

publish()
