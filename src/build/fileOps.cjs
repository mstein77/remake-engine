const syncFs = require("../shared/syncFs.cjs")

const FILE_OP = {
    CLEAR: 'clear',
    COPY: 'copy',
    WRITE: 'write'
}

/**
 * A queue implementation over file operations which can be added as objects and processed later
 * The queue also allows to extract all file operations of a certain type from the queue
 */
class FileOpQueue {

    /**
     * Constructs a new empty queue. If the simulate flag is set then file operation will not be executed on the
     * file system
     *
     * @param {boolean} simulate
     */
    constructor(simulate = false) {
        this.simulate = simulate
        this.clear()
    }

    /**
     * Resets the queue without processing the file operations
     */
    clear() {
        this.queue = []
    }

    /**
     * Adds a clear directory operation for the given directory to the queue
     *
     * @param {string} path
     */
    addClear(path, createIfNotExists = false) {
        this.queue.push({ op: FILE_OP.CLEAR, path, createIfNotExists })
    }

    /**
     * Adds a write file operation to the queue, which writes the given content to a path or skips it if the
     * skipIfExists flag is set and the file already exists
     *
     * @param {string} path
     * @param {string} content
     * @param {boolean} skipIfExists
     */
    addWriteContent(path, content, skipIfExists = false) {
        this.queue.push({ op: FILE_OP.WRITE, path, content, skipIfExists })
    }

    /**
     * Adds a write json file operation to the queue which writes the given content json to a path or skips it if the
     * skipIfExists flag is set and the file already exists
     *
     * @param {string} path
     * @param {string} content
     * @param {boolean} skipIfExists
     */
    addWriteJson(path, content, skipIfExists = false) {
        this.queue.push({ op: FILE_OP.WRITE, path, content, skipIfExists, type: 'json' })
    }

    /**
     * Adds a copy operation for the given file resources under the given path to the destination path
     *
     * @param {string} from
     * @param {string} to
     */
    addCopy(from, to) {
        this.queue.push({ op: FILE_OP.COPY, from, to })
    }

    /**
     * Removes all operation with the given file op type from the queue and returns them in an array
     *
     * @param {object} op
     *
     * @returns {array}
     */
    extract(op) {
        const extracted = []
        const newQueue = []
        for (const item of this.queue) {
            if (item.op === op) {
                extracted.push(item)
            } else {
                newQueue.push(item)
            }
        }
        this.queue = newQueue

        return extracted
    }

    /**
     * Pops all file operations from the queue and processes them (in simulation mode they are not executed on the
     * file system)
     */
    process() {
        if (this.simulate) {
            this.clear()
            return
        }
        while (this.queue.length) {
            const { op, ...params } = this.queue.shift()
            switch (op) {

                case FILE_OP.COPY: {
                    const { from, to } = params
                    if (!syncFs.exists(from)) continue
                    break
                }
                case FILE_OP.WRITE: {
                    const { path, type, content, skipIfExists = false } = params
                    if (skipIfExists && syncFs.fileExists(path)) continue

                    if (type === 'json') {
                        syncFs.writeJson(path, content, 4)
                        break
                    }
                    syncFs.writeContent(path, content)
                    break
                }
                case FILE_OP.CLEAR: {
                    const { path, createIfNotExists } = params
                    if (createIfNotExists) syncFs.createPathTo(path + '/')
                    syncFs.clearDir(path)
                    break
                }
                default:
                    throw Error(`Unknown file operation "${op}" given`)
            }
        }
    }
}

module.exports = {
    FileOpQueue,
    FILE_OP
}