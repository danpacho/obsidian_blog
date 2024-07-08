import buildPlugins from './build/index.js'
import publishPlugins from './publish/index.js'

export default {
    /**
     * Build plugins
     */
    build: buildPlugins,
    /**
     * Publish plugins
     */
    publish: publishPlugins,
}
