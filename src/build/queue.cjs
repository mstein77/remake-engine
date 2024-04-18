const syncFs = require("../shared/syncFs.cjs")
const { d, stringList, toPairs } = require("../shared/helper.cjs")
const { exec, execSync, NoStackError, hasLogLevel, bold, log, setSpinnerInfo} = require("../shared/console.cjs");

const FILE_OP = {
    CLEAR: 'clear',
    COPY: 'copy',
    WRITE: 'write',
    EXEC: 'exec',
    REDUCE: 'reduce',
    REPLACE: 'replace',
    DELETE: 'delete',
    MOVE: 'move',
    PATH: 'path'
}

const detail = msg => hasLogLevel('detailed') && log(msg)

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
     * @param {boolean|undefined} createIfNotExists
     * @param {array|undefined} except
     */
    addClear(path, createIfNotExists = false, except = []) {
        this.queue.push({ op: FILE_OP.CLEAR, path, createIfNotExists, except })
        return this
    }

    addDelete(path) {
        this.queue.push({ op: FILE_OP.DELETE, path })
        return this
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
        return this
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
        return this
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
        return this
    }

    addMove(from, to) {
        this.queue.push({ op: FILE_OP.MOVE, from, to })
        return this
    }

    /**
     * Adds a execution operation for the given command
     *
     * @param {string} cmd
     * @param {object} options
     */
    addExec(cmd, options) {
        this.queue.push({ op: FILE_OP.EXEC, cmd, options })
        return this
    }

    addReduce(path, exts, target) {
        this.queue.push({ op: FILE_OP.REDUCE, path, exts, target })
        return this
    }

    addReplace(from, to) {
        this.queue.push({ op: FILE_OP.REPLACE, from, to })
        return this
    }

    addPath(path, clearIfExists = false) {
        this.queue.push({ op: FILE_OP.PATH, path, clearIfExists })
        return this
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

    async processTask(obj, async = false) {
        const { op, ...params } = obj

        switch (op) {

            case FILE_OP.COPY: {
                const { from, to, replace } = params

                detail(` ${bold('COPY')} ${from} ${to}`)
                if (!syncFs.exists(from)) {
                    detail(` ...skipped because source does not exist`)
                    return Promise.resolve()
                }

                if (syncFs.fileExists(from)) {
                    if (!replace) {
                        syncFs.copyFile(from, to)
                    } else {
                        let content = syncFs.readFile(from).toString()
                        for (const [ tag, value ] of toPairs(replace)) {
                            detail(` ...replacing string "${tag}" in target`)
                            content = content.replaceAll(tag, value)
                        }
                        syncFs.writeContent(to, content)
                    }

                }
                break
            }
            case FILE_OP.MOVE: {
                const { from, to } = params
                detail(` ${bold('MOVE')} ${from} ${to}`)
                if (!syncFs.exists(from)) {
                    detail(` ...skipped because source does not exist`)
                    return Promise.resolve()
                }
                if (syncFs.exists(to)) {
                    detail(` ...skipped because target does exist`)
                    return Promise.resolve()
                }
                syncFs.rename(from, to)
                break
            }
            case FILE_OP.WRITE: {
                const { path, type, content, skipIfExists = false } = params
                detail(` ${bold('WRITE')} ${path}`)

                if (skipIfExists && syncFs.fileExists(path)) {
                    detail(` ...skipped because file already exists`)
                    return Promise.resolve()
                }
                if (type === 'json') {
                    syncFs.writeJson(path, content, 4)
                    break
                }
                syncFs.writeContent(path, content)
                break
            }
            case FILE_OP.DELETE: {
                const { path } = params
                detail(` ${bold('DELETE')} ${path}`)

                if (!syncFs.exists(path)) break

                syncFs.dirExists(path) ? syncFs.rmdir(path) : syncFs.unlink(path)
                break
            }
            case FILE_OP.CLEAR: {
                const { path, createIfNotExists, except } = params
                detail(` ${bold('CLEAR')} ${path}`)

                if (createIfNotExists) syncFs.createPathTo(path + '/')
                syncFs.clearDir(path, except)
                break
            }
            case FILE_OP.PATH: {
                const { path, clearIfExists } = params
                detail(` ${bold('PATH')} ${path}`)

                syncFs.createPathTo(path + '/')
                if (clearIfExists) syncFs.clearDir(path)
                break
            }
            case FILE_OP.EXEC: {
                const { cmd, options = {} } = params
                detail(` ${bold('EXEC')} ${cmd}`)

                setSpinnerInfo(cmd)
                const { failed, output, exitCode } = async ? await exec(cmd, options) : execSync(cmd, options)
                if (failed)
                    throw NoStackError(
                        `Failed executing "${cmd}"${options.cwd ? ` in ${options.cwd}`: ''} (ExitCode: ${exitCode})`,
                        output
                    )
                if (output !== null) {
                    detail(output)
                }
                break
            }
            case FILE_OP.REDUCE: {
                let { path, exts, target } = params
                detail(` ${bold('REDUCE')} ${path} to ${stringList(exts)}`)

                if (!syncFs.dirExists(target)) {
                    syncFs.mkdir(target)
                }
                const files = syncFs.readFilesRec(path).filter(name => {
                    for (const ext of exts) {
                        if (name.endsWith('.' + ext)) return true
                    }
                    return false
                })

                for (const file of files) {
                    const from = syncFs.absPath(path, file)
                    const to = syncFs.absPath(target, syncFs.basename(file))
                    syncFs.copyFile(from, to)
                }
                break
            }
            case FILE_OP.REPLACE: {
                let { from, to } = params
                detail(` ${bold('REPLACE')} ${from} to ${to}`)

                if (!syncFs.exists(from)) break

                if (syncFs.exists(to)) {
                    if (syncFs.dirExists(to)) {
                        syncFs.rmdir(to)
                    } else {
                        syncFs.unlink(to)
                    }
                }
                syncFs.rename(from, to)
                break
            }
            default:
                throw Error(`Unknown file operation "${op}" given`)
        }

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
        detail(`\n Processing file op queue...`)

        while (this.queue.length) {
            this.processTask(this.queue.shift())
        }
        detail('')
    }

    async processAsync() {
        if (this.simulate) {
            this.clear()
            return
        }
        detail(`\n Processing file op queue...`)

        while (this.queue.length) {
            await this.processTask(this.queue.shift(), true)
        }
        detail('')
    }
}

module.exports = {
    FileOpQueue,
    FILE_OP
}