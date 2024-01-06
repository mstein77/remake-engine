const syncFs = require('../../shared/classes/syncFs.cjs')
const absPath = require('../../shared/classes/absPath.cjs')

class PostBuildMessagePlugin {

    constructor(messages) {
        this.messages = messages
    }

    apply(compiler) {
        compiler.hooks.done.tap(
            'PostBuildMessagePlugin',
            () => {
                const msg = this.messages.join("\n")
                syncFs.writeContent(absPath.tmp('instructions.txt'), msg)
            }
        )
    }
}

module.exports = PostBuildMessagePlugin