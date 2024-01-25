const { Hosting } = require('../hosting.cjs')

/**
 * Represents a hosting on the cloud hoster heroku
 */
class HerokuHosting extends Hosting {

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

    /**
     * @inheritDoc
     */
    generateRepoFiles(config, fileDeps) {
        const { absPath, queue } = fileDeps
        const procFilePath = absPath.game('Procfile')
        queue.addWriteContent(procFilePath,"web: npm start", true)
    }
}

module.exports = HerokuHosting
