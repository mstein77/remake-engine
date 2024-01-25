const syncFs = require("../shared/syncFs.cjs")
const { exec } = require("./helper.cjs")
const { d, toPairs } = require("../shared/helper.cjs")

const FILE_OP = {
    CLEAR: 'clear',
    COPY: 'copy',
    WRITE: 'write',
    EXEC: 'exec'
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
    addClear(path, createIfNotExists = false, except = []) {
        this.queue.push({ op: FILE_OP.CLEAR, path, createIfNotExists, except })
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
     * If the replace object is given then all keys which are found in the content of the source file will be
     * replaced by their values
     *
     * @param {string} from
     * @param {string} to
     * @param {object|undefined} replace
     */
    addCopy(from, to, replace) {
        this.queue.push({ op: FILE_OP.COPY, from, to, replace })
    }

    /**
     * Adds a execution operation for the given command
     *
     * @param {string} cmd
     */
    addExec(cmd) {
        this.queue.push({ op: FILE_OP.EXEC, cmd })
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
                    const { from, to, replace } = params
                    if (!syncFs.exists(from)) continue

                    if (syncFs.fileExists(from)) {
                        if (!replace) {
                            syncFs.copyFile(from, to)
                        } else {
                            let content = syncFs.readFile(from).toString()
                            for (const [ tag, value ] of toPairs(replace)) {
                                content = content.replaceAll(tag, value)
                            }
                            syncFs.writeContent(to, content)
                        }

                    }
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
                    const { path, createIfNotExists, except } = params
                    if (createIfNotExists) syncFs.createPathTo(path + '/')
                    syncFs.clearDir(path, except)
                    break
                }
                case FILE_OP.EXEC: {
                    const { cmd } = params
                    const { failed, output} = exec(cmd)
                    if (failed)
                        throw Error(`Failed executing "${cmd}": ${output}`)

                    break;
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