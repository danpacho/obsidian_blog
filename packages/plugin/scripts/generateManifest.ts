import { cwd } from 'process'
import { PluginManifest } from 'obsidian'
import { io, lg } from 'utils'

export const generateManifest = async (
    manifest: PluginManifest
): Promise<void> => {
    const json = JSON.stringify(manifest, null, 4)
    await io.writer.write({
        data: json,
        filePath: `${cwd()}/manifest.json`,
        handler: {
            onSuccess: () => {
                lg.success(`Manifest file created\n${json}`)
            },
            onError: (error) => {
                lg.error(
                    `Error creating manifest file\n${JSON.stringify(error, null, 4)}`
                )
            },
        },
    })
}
