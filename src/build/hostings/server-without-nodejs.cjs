const { Hosting } = require('../hosting.cjs')
const { TASK} = require("../tasks.cjs");

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
    addDeploymentInstructions(config, fileDeps, tasks) {
        super.addDeploymentInstructions(config, fileDeps, tasks)
        tasks.add(
            TASK.SOURCE_TO_SERVER,
            `Upload the content of ${this.publicPath} to a target directory on your webserver`
        )
    }
}

module.exports = ServerWithoutNodejsHosting
