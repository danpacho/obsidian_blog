#!/usr/bin/env node

import pkg from '../package.json'
import { CLI, GithubRepository } from './core'

export class BloggerCLI extends CLI {
    private readonly $repo: GithubRepository
    public constructor() {
        super({
            info: {
                name: pkg.name,
                version: pkg.version,
                description: pkg.description,
            },
        })

        this.$repo = new GithubRepository()

        this.addCommand({
            cmdFlag: '--repo',
            cmdDescription: 'Fetch information about a GitHub repository',
            optFlag: '<repo_path>',
            optDescription: 'The path to the repository',
            cmdAction: async (repoPath: string) => {
                const repo = new URL(repoPath)
                const repoInfo = await this.$repo.getRepoInfo(repo)
                if (!repoInfo) {
                    this.$logger.error('Repository not found')
                    return
                }
                this.$logger.info(
                    `Repository: ${repoInfo.username}/${repoInfo.name}`
                )
                this.$logger.info(`Branch: ${repoInfo.branch}`)
            },
        })
    }
}
