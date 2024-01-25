const { Hosting } = require('../hosting.cjs')

/**
 * Represents a hosting on a web or file server which does not support nodejs
 */
class ServerWithoutNodejsHosting extends Hosting {

    /**
     * @inheritDoc
     */
    getSupport() {
        return {
            ...super.getSupport(),
            checkout: false,
            nodejs: false
        }
    }

    /**
     * @inheritDoc
     */
    addDeploymentInstructions( ...args ) {
        super.addDeploymentInstructions( ...args )
        this.addInstruction(`Upload the content of ${this.publicPath} to a target directory on your webserver`)
    }
}

module.exports = ServerWithoutNodejsHosting
