const { Hosting } = require('../hosting.cjs')
const { TASK } = require("../tasks.cjs");

/**
 * Represents a hosting on the cloud hoster heroku
 */
class HerokuHosting extends Hosting {

    /**
     * @inheritDoc
     */
    setFlags() {
        this.supportsNodeJs = true
        this.supportsManualUpload = true
        this.supportsCheckout = true
    }

    /**
     * @inheritDoc
     */
    generateRepoFiles(tasks) {
        const { absPath, queue } = this.fileDeps
        const procFilePath = absPath.game('Procfile')
        queue.addWriteContent(procFilePath,"web: npm start", true)
        tasks.add(TASK.PREPARE_SOURCE, `Make sure that the file "Procfile" is committed`)
    }
}

module.exports = HerokuHosting