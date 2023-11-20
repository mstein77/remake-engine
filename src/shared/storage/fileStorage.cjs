const { makeDescriptor, RESOURCE } = require("../classes/resources.cjs")
const { FileCodec } = require("../classes/fileCodec.cjs")
const syncFs = require("../classes/syncFs.cjs")

const FileStorage = absDir => {

    let isFull = false
    const storage = new Map()
    const baseDir = absDir.resources()

    const handler = {

        get: (type, tid) => {
            const relPath = storage.get(tid)
            if (!relPath) return

            const filePath = absDir.resources(relPath)
            if (!syncFs.fileExists(filePath)) return

            const descriptor = makeDescriptor.fromTid(tid)
            if (!descriptor || descriptor.isValid())
                throw Error(`Could not instantiate valid descriptor for typed id "${tid}"`)

            if (descriptor.type !== type)
                throw Error(`The given typed resource id "${tid}" is not matching the requested type ${RESOURCE.TEXT[type]}`)

            return FileCodec.decode(descriptor)
        },

        has: tid => storage.has(tid),

        register: tid => {
            const descriptor = makeDescriptor.fromTid(tid)
            const relPath = descriptor.file
            if (!syncFs.fileExists(absDir.resources(relPath))) return
            storage.set(tid, relPath)
        },

        set: (type, id, value) => {
            try {
                const descriptor = makeDescriptor.fromTid(tid)
                const filePath = absDir.resources(descriptor.file)
                syncFs.createPathTo(filePath)
                FileCodec.encode(value, descriptor)
                storage.set(tid, filePath)
                return true
            } catch (e) {
                console.error(e)
                return false
            }
        },

        delete: tid => {
            const descriptor = makeDescriptor.fromTid(tid)
            if (!descriptor || descriptor.isValid())
                return false

            const filePath = absDir.resources(descriptor.file)
            storage.delete(tid)
            if (syncFs.fileExists(filePath)) {
                syncFs.unlink(filePath)
            }
            return true
        },

        clear: () => {
            storage.clear()
        },

        keys: () => storage.keys(),

        isAvailable: () => true,

        size: () => [ ...storage.keys() ].length,

        isFull: () => isFull,

        dump: () => console.log([ ...storage.entries() ]),
    }

    const files = syncFs.readFilesRec(baseDir)
    for (const file of files) {
        const descriptor = makeDescriptor.fromFile(file)
        if (!descriptor || !descriptor.isValid()) continue
        handler.register(descriptor.tid)
    }
    handler.dump()

    return handler
}

module.exports = {
    FileStorage
}