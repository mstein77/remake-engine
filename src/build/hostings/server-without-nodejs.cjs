const { Hosting } = require('../hosting.cjs')
const { TASK} = require("../target.cjs");

/**
 * Represents a hosting on a web or file server which does not support nodejs
 */
class ServerWithoutNodejsHosting extends Hosting {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.supportsNodeJs = false
        this.supportsManualUpload = true
        this.supportsCheckout = false
    }

    /**
     * @inheritDoc
     */
    addDeploymentInstructions() {
        super.addDeploymentInstructions()
        this.distTarget.addTaskMessage(
            TASK.SOURCE_TO_SERVER,
            `Upload the content of ${this.publicPath} to a target directory on your webserver`
        )
    }
}

module.exports = ServerWithoutNodejsHosting
