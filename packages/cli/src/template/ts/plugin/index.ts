import * as buildContentsPlugins from './build:contents/index.js'
import * as buildOriginTreePlugins from './build:origin:tree/index.js'
import * as walkGeneratedTreePlugins from './walk:generated:tree/index.js'

export default {
    buildContents: buildContentsPlugins,
    buildOriginTree: buildOriginTreePlugins,
    walkGeneratedTree: walkGeneratedTreePlugins,
}
