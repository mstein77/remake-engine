const { Hosting } = require('../hosting.cjs')

/**
 * Represents a hosting on a web server which support nodejs
 */
class ServerWithNodejsHosting extends Hosting {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.supportsNodeJs = true
        this.supportsManualUpload = true
        this.supportsCheckout = true
    }
}

module.exports = ServerWithNodejsHosting
