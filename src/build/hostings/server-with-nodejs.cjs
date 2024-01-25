const { Hosting } = require('../hosting.cjs')

/**
 * Represents a hosting on a web server which support nodejs
 */
class ServerWithNodejsHosting extends Hosting {

    /**
     * @inheritDoc
     */
    getSupport() {
        return {
            ...super.getSupport(),
            checkout: true,
            nodejs: true
        }
    }
}

module.exports = ServerWithNodejsHosting
