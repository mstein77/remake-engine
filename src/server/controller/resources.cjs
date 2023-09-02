const { StorageManager, FileStorageHandler } = require('../classes/storage.cjs')
const path = require('path')

const RMK_GAME_DIR = process.env.RMK_GAME_DIR || '../../../../../'
const absDir = {
    root: ( ...relPath ) => path.resolve( __dirname, /* config.IS_DIST */ false ? '' : RMK_GAME_DIR, ...relPath ),
    resources: ( ...relPath ) => path.resolve(absDir.root('resources'), ...relPath )
}

const storageHandler = FileStorageHandler(absDir)
const SM = new StorageManager(storageHandler)

const controller = {

    resources: (req, res) => {
        const { scope = null, resources = [] } = req.body

        const found = {}
        const missing = []
        const add = []
        const invalid = []

        for (const tid of resources) {
            try {
                const value = SM.getResource(tid)
                if (value === undefined) {
                    missing.push(tid)
                    continue
                }
                found[tid] = value
            } catch(e) {
                console.error(e)
                invalid.push(tid)
            }
        }

        res.json({ found, missing, invalid, add })
    },

    has: (req, res) => {
        const { resources = [] } = req.body

        const found = []
        const missing = []
        for (const tid of resources) {
            const target = SM.hasResource(tid) ? found : missing
            target.push(tid)
        }
        res.json({ found, missing })
    }
}

module.exports = controller