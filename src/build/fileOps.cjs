const syncFs = require("../shared/syncFs.cjs")
const { exec } = require("./helper.cjs")
const { d, stringList, toPairs } = require("../shared/helper.cjs")
const { hasLogLevel, bold, log } = require("../shared/console.cjs");

const FILE_OP = {
    CLEAR: 'clear',
    COPY: 'copy',
    WRITE: 'write',
    EXEC: 'exec',
    REDUCE: 'reduce',
    COND_START: 'cond_start',
    COND_END: 'cond_end'
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

    startConditional(cmd, check, cwd) {
        this.queue.push({ op: FILE_OP.COND_START, cmd, check, cwd })
        return this
    }

    endConditional() {
        this.queue.push({ op: FILE_OP.COND_END })
        return this
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

    /**
     * Adds a execution operation for the given command
     *
     * @param {string} cmd
     */
    addExec(cmd, cwd) {
        this.queue.push({ op: FILE_OP.EXEC, cmd, cwd })
        return this
    }

    addReduce(path, exts, target) {
        this.queue.push({ op: FILE_OP.REDUCE, path, exts, target })
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

        let condLevel = 0
        let skipLevel = -1
        while (this.queue.length) {
            const { op, ...params } = this.queue.shift()

            if (op === FILE_OP.COND_START) {
                condLevel++
            } else if (op === FILE_OP.COND_END) {
                condLevel--
            }
            if (skipLevel >= condLevel) continue

            switch (op) {

                case FILE_OP.COND_START: {
                    const { cmd, check, cwd } = params

                    const result = exec(cmd, cwd)
                    if (!check(result)) skipLevel = condLevel
                    break
                }
                case FILE_OP.COND_END: {
                    if (skipLevel > condLevel) skipLevel = -1
                    break
                }
                case FILE_OP.COPY: {
                    const { from, to, replace } = params

                    detail(` ${bold('COPY')} ${from} ${to}`)
                    if (!syncFs.exists(from)) {
                        detail(` ...skipped because source does not exist`)
                        continue
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
                case FILE_OP.WRITE: {
                    const { path, type, content, skipIfExists = false } = params
                    detail(` ${bold('WRITE')} ${path}`)

                    if (skipIfExists && syncFs.fileExists(path)) {
                        detail(` ...skipped because file already exists`)
                        continue
                    }
                    if (type === 'json') {
                        syncFs.writeJson(path, content, 4)
                        break
                    }
                    syncFs.writeContent(path, content)
                    break
                }
                case FILE_OP.CLEAR: {
                    const { path, createIfNotExists, except } = params
                    detail(` ${bold('CLEAR')} ${path}`)

                    if (createIfNotExists) syncFs.createPathTo(path + '/')
                    syncFs.clearDir(path, except)
                    break
                }
                case FILE_OP.EXEC: {
                    const { cmd, cwd } = params
                    detail(` ${bold('EXEC')} ${cmd}`)

                    const { failed, output} = exec(cmd, cwd)
                    if (failed)
                        throw Error(`Failed executing "${cmd}": ${output}`)

                    detail(output)
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

                    if (path !== target) syncFs.rmDir(path, {recursive: true, force: true})
                    break
                }
                default:
                    throw Error(`Unknown file operation "${op}" given`)
            }
        }
        if (condLevel > 0) throw Error(`Unclosed condition found!`)
        detail('')
    }
}

module.exports = {
    FileOpQueue,
    FILE_OP
}