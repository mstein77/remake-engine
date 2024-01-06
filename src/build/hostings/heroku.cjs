const { Hosting } = require('../hosting.cjs')

class HerokuHosting extends Hosting {

    getSupport(config) {
        return {
            ...super.getSupport(),
            checkout: true,
            nodejs: true
        }
    }

    generateRepoFiles(config, fileDeps, isDist) {
        const { syncFs, absPath, queue } = fileDeps

        const procFilePath = absPath.game('Procfile')
        if (isDist || syncFs.fileExists(procFilePath)) return

        queue.addWriteContent(procFilePath,"web: npm start", true)
    }
}

module.exports = HerokuHosting
