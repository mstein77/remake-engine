const { Hosting } = require('../classes.cjs')

class ServerWithoutNodejsHosting extends Hosting {

    getSupport(config) {
        return {
            ...super.getSupport(),
            checkout: false,
            nodejs: false
        }
    }
    get postBuildMessage() {
        return `Upload the content of ${this.publicDir} to a target directory on your webserver`
    }
}

module.exports = ServerWithoutNodejsHosting
