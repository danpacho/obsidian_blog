import * as buildContentsPlugins from './build:contents/index.js'
import * as buildOriginTreePlugins from './build:tree/index.js'
import * as walkGeneratedTreePlugins from './walk:tree/index.js'

export default {
    buildContents: buildContentsPlugins,
    buildOriginTree: buildOriginTreePlugins,
    walkGeneratedTree: walkGeneratedTreePlugins,
}
