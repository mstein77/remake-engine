const { Hosting } = require('../classes.cjs')

class ServerWithNodejsHosting extends Hosting {

    init(config) {
        this.supports.checkout = true
        this.supports.nodejs = true
    }
}

module.exports = ServerWithNodejsHosting
