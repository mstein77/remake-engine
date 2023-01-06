const { Hosting } = require('../classes.cjs')

class ServerWithoutNodejsHosting extends Hosting {

    init(config) {
        this.supports.checkout = false
        this.supports.nodejs = false
    }

    get postBuildMessage() {
        return `Upload the content of ${this.publicDir} to a target directory on your webserver`
    }
}

module.exports = ServerWithoutNodejsHosting
