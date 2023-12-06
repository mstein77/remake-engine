const { Hosting, syncFs, absPath } = require('../classes.cjs')

class HerokuHosting extends Hosting {

    getSupport(config) {
        return {
            ...super.getSupport(),
            checkout: true,
            nodejs: true
        }
    }

    generateRepoFiles() {
        const procFilePath = absPath.game('Procfile')
        if (this.isDist || syncFs.fileExists(procFilePath)) return

        syncFs.writeContent(procFilePath, "web: npm start")
    }
}

module.exports = HerokuHosting
