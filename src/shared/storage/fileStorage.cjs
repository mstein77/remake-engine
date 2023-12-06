const { d } = require("../classes/helper.cjs")
const { makeDescriptor, RESOURCE } = require("../classes/resources.cjs")
const { FileCodec } = require("../classes/fileCodec.cjs")
const syncFs = require("../classes/syncFs.cjs")

const FileStorage = (absDir, staticTypes) => {

    let isFull = false
    const storage = new Map()
    const baseDir = absDir.resources()
    FileCodec.init(absDir)

    const handler = {

        get: (type, tid) => {
            const relPath = storage.get(tid)
            if (relPath === null) return null

            if (!relPath) return

            const filePath = absDir.resources(relPath)
            if (!syncFs.fileExists(filePath)) return

            const descriptor = makeDescriptor.fromTid(tid)
            if (!descriptor || !descriptor.isValid())
                throw Error(`Could not instantiate valid descriptor for typed id "${tid}"`)

            if (descriptor.type !== type)
                throw Error(`The given typed resource id "${tid}" is not matching the requested type ${RESOURCE.TEXT[type]}`)

            return FileCodec.decode(descriptor)
        },

        has: tid => storage.has(tid),

        register: (tid, isStatic = false) => {
            const descriptor = makeDescriptor.fromTid(tid)
            if (isStatic) {
                storage.set(descriptor.extTid, null)
                return
            }
            const relPath = descriptor.file
            if (!syncFs.fileExists(absDir.resources(relPath))) return
            storage.set(tid, relPath)
        },

        set: (type, tid, value) => {
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

        dump: () => d([ ...storage.entries() ]),
    }
    {
        const files = syncFs.readFilesRec(baseDir)
        for (const file of files) {
            const descriptor = makeDescriptor.fromFile(file)
            if (!descriptor || !descriptor.isValid() || staticTypes.includes(descriptor.key)) continue
            handler.register(descriptor.extTid)
        }
    }
    for (const type of staticTypes) {
        const dir = absDir.static(type)
        if (!syncFs.dirExists(dir)) continue

        const files = syncFs.readFilesRec(dir)
        for (const file of files) {
            const descriptor = makeDescriptor.fromFile(type + '/' + file)
            if (!descriptor || !descriptor.isValid() || descriptor.isCoreJson()) continue
            handler.register(descriptor.extTid, true)
        }
    }
    handler.dump()

    return handler
}

module.exports = {
    FileStorage
}