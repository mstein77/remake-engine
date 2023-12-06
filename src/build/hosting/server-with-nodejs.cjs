const { Hosting } = require('../classes.cjs')

class ServerWithNodejsHosting extends Hosting {

    getSupport(config) {
        return {
            ...super.getSupport(),
            checkout: true,
            nodejs: true
        }
    }
}

module.exports = ServerWithNodejsHosting
