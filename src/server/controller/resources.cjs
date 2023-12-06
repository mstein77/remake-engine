const { d,toPairs } = require('../../shared/classes/helper.cjs')
const { StorageManager } = require('../../shared/classes/storage.cjs')
const { FileStorage } = require('../../shared/storage/fileStorage.cjs')
const { tids2extTids, map2extMap, typeText2tid, text2id, makeDescriptor} = require("../../shared/classes/resources.cjs")
const path = require('path')

const RMK_GAME_DIR = process.env.RMK_GAME_DIR || '../../../../../'
let SM = null

const controller = {

    init: (config, absDir) => {
        const staticTypes = []
        if (config.staticTypes !== '') {
            staticTypes.push( ...config.staticTypes.split(',') )
        }
        let storage = FileStorage(absDir, staticTypes)
        SM = new StorageManager(storage)
    },

    resources: (req, res) => {
        const { scope , ids, permIds, tempIds, storedDeps, storedIds } = req.body

        const scope2ids = SM.getCoreResource('scope2ids') || {}
        const scopeIds = tids2extTids(scope2ids[scope] || [])

        for (const id of scopeIds) {
            if (!ids.includes(id)) ids.push(id)
        }
        const id2children = SM.getCoreResource('id2children') || {}
        const deps = { ...map2extMap(id2children), ...map2extMap(storedDeps) }

        const processed = []
        const add = []
        const found = {}
        const invalid = []
        const missing = []
        const drop = []

        while (ids.length) {
            const id = ids.pop()
            if (!processed.includes(id)) {
                processed.push(id)

                const extTid = makeDescriptor.fromTid(id).extTid
                if (!permIds.includes(id) && !tempIds.includes(id)) {
                    if (storedIds.includes(id) || storedIds.includes(extTid)) {
                        add.push(id)
                    } else if (SM.hasResource(id)) {
                        found[id] = SM.getResource(id)
                    } else {
                        missing.push(id)
                    }
                }
                const idDeps = deps[extTid]
                if (idDeps && idDeps.length) {
                    ids.push( ...idDeps )
                }
            }
        }

        for (const id of tempIds) {
            if (!processed.includes(id)) drop.push(id)
        }
        res.json({ found, missing, invalid, add, drop })
    },

    store: (req, res) => {
        const { scope , resources, dependencies } = req.body

        const stored = []
        for (const { id, data, type } of resources) {
            if (SM.storeResourceById(text2id[type], id, data)) {
                stored.push(typeText2tid(type, id))
            }
        }

        const id2children = SM.getCoreResource('id2children') || {}
        SM.storeCoreResource('id2children', { ...id2children, ...dependencies })

        if (scope) {
            const scope2ids = SM.getCoreResource('scope2ids') || {}
            const scopeIds = scope2ids[scope] || []

            const lastResource = resources.at(-1)
            const tid = typeText2tid(lastResource.type, lastResource.id)

            if (!scopeIds.includes(tid)) {
                scopeIds.push(tid)
                scope2ids[scope] = scopeIds
                SM.storeCoreResource('scope2ids', scope2ids)
            }
        }
        res.json({ stored })
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