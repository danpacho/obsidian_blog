import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { x } from 'tar'

export interface RepoInfo {
    username: string
    name: string
    branch: string
    filePath: string
}

/**
 * Represents a GitHub repository.
 */
export class GithubRepository {
    private baseUrl: string = 'https://api.github.com'

    /**
     * Checks if a given URL is valid by sending a HEAD request.
     * @param url - The URL to check.
     * @returns A promise that resolves to a boolean indicating if the URL is valid.
     */
    private async isValidUrl(url: string): Promise<boolean> {
        try {
            const res = await fetch(url, { method: 'HEAD' })
            return res.status === 200
        } catch {
            return false
        }
    }

    /**
     * Fetches information about a repository.
     * @param username - The username of the repository owner.
     * @param name - The name of the repository.
     * @returns A promise that resolves to the repository information, or undefined if the repository does not exist.
     */
    private async fetchRepoInfo(
        username: string,
        name: string
    ): Promise<RepoInfo | undefined> {
        try {
            const infoResponse = await fetch(
                `${this.baseUrl}/repos/${username}/${name}`,
                {
                    method: 'GET',
                }
            )
            if (infoResponse.status !== 200) {
                return
            }

            const info = await infoResponse.json()
            return {
                username,
                name,
                branch: info['default_branch'],
                filePath: '',
            }
        } catch {
            return undefined
        }
    }

    /**
     * Gets information about a repository based on the provided URL.
     * @param url - The URL of the repository.
     * @param examplePath - An optional example path to use for constructing the file path.
     * @returns A promise that resolves to the repository information, or undefined if the repository does not exist.
     */
    public async getRepoInfo(
        url: URL,
        examplePath?: string
    ): Promise<RepoInfo | undefined> {
        const [, repoUsername, repoName, repoPath, repoBranch, ...file] =
            url.pathname.split('/')

        const filePath = examplePath
            ? examplePath.replace(/^\//, '')
            : file.join('/')

        const isDirectRepoIndication =
            repoPath === undefined ||
            (repoPath === '' && repoBranch === undefined)

        if (isDirectRepoIndication && repoUsername && repoName) {
            return this.fetchRepoInfo(repoUsername, repoName)
        }

        const branch = examplePath
            ? `${repoBranch}/${file.join('/')}`.replace(
                  new RegExp(`/${filePath}|/$`),
                  ''
              )
            : repoBranch

        if (repoUsername && repoName && branch && repoPath === 'tree') {
            return { username: repoUsername, name: repoName, branch, filePath }
        }
    }

    /**
     * Checks if a repository exists.
     * @param repoInfo - The repository information.
     * @returns A promise that resolves to a boolean indicating if the repository exists.
     */
    public async hasRepo({
        username,
        name,
        branch,
        filePath,
    }: RepoInfo): Promise<boolean> {
        const contentsUrl = `${this.baseUrl}/repos/${username}/${name}/contents`
        const packagePath = `${filePath ? `/${filePath}` : ''}/package.json`

        return this.isValidUrl(
            `${contentsUrl}${packagePath}${`?ref=${branch}`}`
        )
    }

    /**
     * Downloads a tar stream from the specified URL.
     * @param url - The URL to download from.
     * @returns A readable stream containing the downloaded data.
     * @throws An error if the download fails.
     */
    private async downloadTarStream(url: string) {
        const res = await fetch(url)

        if (!res.body) {
            throw new Error(`Failed to download: ${url}`)
        }

        return Readable.fromWeb(res.body as import('stream/web').ReadableStream)
    }

    /**
     * Downloads and extracts a repository to the specified root directory.
     * @param root - The root directory to extract the repository to.
     * @param repoInfo - The repository information.
     */
    public async downloadAndExtractRepo(
        root: string,
        { username, name, branch, filePath }: RepoInfo
    ) {
        await pipeline(
            await this.downloadTarStream(
                `https://codeload.github.com/${username}/${name}/tar.gz/${branch}`
            ),
            x({
                cwd: root,
                strip: filePath ? filePath.split('/').length + 1 : 1,
                filter: (p) =>
                    p.startsWith(
                        `${name}-${branch.replace(/\//g, '-')}${filePath ? `/${filePath}/` : '/'}`
                    ),
            })
        )
    }
}
