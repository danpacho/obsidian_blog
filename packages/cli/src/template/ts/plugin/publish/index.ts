import * as publishBuildPlugins from './build/index.js'
import * as publishDeployPlugins from './deploy/index.js'
import * as publishRepositoryPlugins from './repository/index.js'

export default {
    build: publishBuildPlugins,
    repository: publishRepositoryPlugins,
    deploy: publishDeployPlugins,
}
