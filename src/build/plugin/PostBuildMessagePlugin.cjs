const { syncFs, absDir } = require("../classes.cjs");

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
                syncFs.writeContent(absDir.tmp('instructions.txt'), msg)
            }
        )
    }
}

module.exports = PostBuildMessagePlugin