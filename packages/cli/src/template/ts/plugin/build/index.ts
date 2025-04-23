import * as buildContentsPlugins from './build_contents/index.js'
import * as buildTreePlugins from './build_tree/index.js'
import * as walkTreePlugins from './walk_tree/index.js'

export default {
    buildContents: buildContentsPlugins,
    buildTree: buildTreePlugins,
    walkGeneratedTree: walkTreePlugins,
}
