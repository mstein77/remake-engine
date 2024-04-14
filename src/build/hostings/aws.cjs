const { Hosting } = require('../hosting.cjs')

/**
 * Represents a hosting on the cloud hoster aws
 */
class AwsHosting extends Hosting {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.supportsNodeJs = true
        this.supportsManualUpload = true
        this.supportsCheckout = true
    }
}

module.exports = AwsHosting