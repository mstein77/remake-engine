const syncFs = require('../../build/classes/syncFs.cjs')
const { RESOURCE, tid2type, tid2id, type2tid, text2id, id2tid } = require('./resources.cjs')

const FileStorageHandler = absDir => {

    let isFull = false
    const storage = new Map()

    const tid2relPath = tid => {
        const type = tid2type(tid)
        const ext = type === RESOURCE.TYPE.JSON ? '.json' : ''
        return RESOURCE.KEY[type] + '/' + tid2id(tid) + ext
    }

    return {
        baseDir: () => absDir.resources(),

        register: tid => {
            const relPath = tid2relPath(tid)
            if (!syncFs.fileExists(absDir.resources(relPath))) return
            storage.set(tid, relPath)
        },

        set: (tid, value) => {
            const filePath = tid2relPath(tid)
            // TODO store value in file
            storage.set(tid, filePath)

        },

        get: tid => {
            const relPath = storage.get(tid)
            if (!relPath) return

            const filePath = absDir.resources(relPath)
            if (!syncFs.fileExists(filePath)) {
                return
            }
            const type = tid2type(tid)
            return type === RESOURCE.TYPE.JSON ? syncFs.readFile(filePath, 'utf8') : syncFs.readFile(filePath)
        },

        has: tid => storage.has(tid),

        delete: id => {
            storage.delete(id)
        },

        clear: () => {
            storage.clear()
        },

        keys: () => storage.keys(),

        isAvailable: () => true,

        isFull: () => isFull,

        dump: () => console.log([ ...storage.entries() ]),

        encode: (type, value) => {
            if (type !== RESOURCE.TYPE.JSON) {
                const parts = value.split('base64,', 2)
                return (parts.length === 2) ? parts[1] : undefined
            }
            return JSON.stringify(value, null, 4)
        },

        decode: (type, value) => {
            if (type === RESOURCE.TYPE.AUDIO) {
                const extensionName = 'mp3' // TODO this should be passed as subtype or extracted from tid
                const base64Audio = Buffer.from(value, 'binary').toString('base64')
                return `data:audio/${extensionName};base64,${base64Audio}`
            }

            if (type === RESOURCE.TYPE.IMAGE) {
                const imgType = 'png' // TODO: this should be passed as subtype or extracted from tid
                const base64Image = Buffer.from(value, 'binary').toString('base64')
                return `data:image/${imgType};base64,${base64Image}`
            }

            return JSON.parse(value)
        }
    }
}

const fileName2tidName = (type, name) => {
    if (type !== RESOURCE.TYPE.JSON) return name

    const parts = name.split('.')
    if (parts.length <= 1) return

    const ext = parts.pop()
    if (ext !== 'json') return

    return parts.join('.')
}

const relPath2typeAndId = relPath => {
    const parts = relPath.split('/')
    if (parts.length <= 1) return

    const dir = parts.shift()
    const type = text2id[dir]
    if (!type) return

    const tidName = fileName2tidName(type, parts.pop())
    if (!tidName) return

    parts.push(tidName)
    return [ type, parts.join('/')]
}

const relPath2tid = relPath => {
    const typeAndId = relPath2typeAndId(relPath)
    if (!typeAndId) return

    const [ type, id ] = typeAndId
    return RESOURCE.PREFIX[type] + id
}

class StorageManager {

    constructor(storageHandler) {
        this.storage = storageHandler
        this.init()
    }

    init() {
        const files = syncFs.readFilesRec(this.storage.baseDir())
        for (const file of files) {
            const tid = relPath2tid(file)
            if (!tid) continue
            this.storage.register(tid)
        }
        this.storage.dump()
    }

    hasResource(tid) {
        return this.storage.has(tid2type(tid), tid2id(tid))
    }

    hasResourceById(type, id) {
        const tid = id2tid(type, id)
        return this.storage.has(tid)
    }

    hasJsonResource(id) {
        return this.hasResourceById(RESOURCE.TYPE.JSON, id)
    }

    /**
     * Returns the data of resource matching the given typed resource id or undefined if no resource was found
     *
     * @param {string} tid
     *
     * @returns {mixed}
     */
    getResource(tid) {
        return this.getResourceById(tid2type(tid), tid2id(tid))
    }

    /**
     * Returns the data of resource matching the given type and id or undefined if no resource was found
     *
     * @param {number} type
     * @param {string} id
     *
     * @returns {mixed}
     */
    getResourceById(type, id) {
        const tid = id2tid(type, id)
        const rawValue = this.storage.get(tid)
        if (!rawValue) return

        return this.storage.decode(type, rawValue)
    }

    /**
     * Returns the json resource matching the given id or undefined if no resource was found
     *
     * @param {string} id
     *
     * @returns {mixed}
     */
    getJson(id) {
        return this.getResourceById(RESOURCE.TYPE.JSON, id)
    }
}

module.exports = {
    FileStorageHandler,
    StorageManager
}