import * as buildContentsPlugins from './build:contents/index.js'
import * as buildTreePlugins from './build:tree/index.js'
import * as walkTreePlugins from './walk:tree/index.js'

export default {
    buildContents: buildContentsPlugins,
    buildTree: buildTreePlugins,
    walkGeneratedTree: walkTreePlugins,
}
