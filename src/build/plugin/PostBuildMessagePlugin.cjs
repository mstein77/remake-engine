const syncFs = require('../../shared/classes/syncFs.cjs')
const absPath = require('../../shared/classes/absPath.cjs')

class PostBuildMessagePlugin {

    constructor(hosting) {
        this.hosting = hosting
    }

    apply(compiler) {
        compiler.hooks.done.tap(
            'PostBuildMessagePlugin',
            () => {
                const msg = this.hosting.postBuildMessage
                if (!msg) return
                syncFs.writeContent(absPath.tmp('instructions.txt'), msg)
            }
        )
    }
}

module.exports = PostBuildMessagePlugin