const { Hosting } = require('../hosting.cjs')

class ServerWithoutNodejsHosting extends Hosting {

    prepare( ...args ) {
        super.prepare( ...args )
        this.addInstruction(`Upload the content of ${this.publicDir} to a target directory on your webserver`)
    }

    getSupport(config) {
        return {
            ...super.getSupport(),
            checkout: false,
            nodejs: false
        }
    }
}

module.exports = ServerWithoutNodejsHosting
