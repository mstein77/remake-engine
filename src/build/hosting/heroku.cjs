const { Hosting, syncFs, absPath } = require('../classes.cjs')

class HerokuHosting extends Hosting {

    init(config) {
        this.supports.checkout = true
        this.supports.nodejs = true

    }

    generateRepoFiles() {
        const procFilePath = absPath.game('Procfile')
        if (this.isDist || syncFs.fileExists(procFilePath)) return

        syncFs.writeContent(procFilePath, "web: npm start")
    }
}

module.exports = HerokuHosting
