const syncFs = require('../../shared/syncFs.cjs')
const absPath = require('../../shared/absPath.cjs')

/**
 * A webpack plugin which purpose is to write the params object which is passed in the constructor to a
 * temporary json file. The params of this file are later deserialized by the post build processing
 */
class PostBuildPlugin {

    constructor(params) {
        this.params = params
    }

    apply(compiler) {
        compiler.hooks.done.tap(
            'PostBuildPlugin',
            () => {
                syncFs.writeJson(absPath.tmp('post-build-params.json'), this.params)
            }
        )
    }
}

module.exports = PostBuildPlugin