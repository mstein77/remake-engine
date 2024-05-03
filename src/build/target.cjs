const { d, toPairs, toValues } = require("../shared/helper.cjs")

const TASK = {
    PREPARE_SOURCE: 0,
    PREPARE_SERVER: 1,
    SOURCE_TO_SERVER: 2,
    TRIGGER_INSTALL: 3,
    TRIGGER_START: 4
}

/**
 * A tasks object allows to add messages to tasks of the deployment process
 */
class DistTarget {

    constructor(props = {}) {
        const defaultProps = { target: '', overwrites: {}, config: {}, skip: false }
        const { tasks = {}, ...rawProps } = props
        this.props = { ...defaultProps, ...rawProps }
        this.tasks2messages = {}
        for (const [ task, messages ] of toPairs(tasks)) {
            for (const { msg, priority } of messages) {
                this.addTaskMessage(parseInt(task, 10), msg, priority)
            }
        }
    }

    get target() {
        return this.props.target
    }

    get overwrites() {
        return this.props.overwrites
    }

    get root() {
        return this.props.root
    }

    get tmpDir() {
        return this.props.tmpDir
    }

    get publicDir() {
        return this.props.publicDir
    }

    set publicDir(value) {
        this.props.publicDir = value
    }

    get dir() {
        return this.props.dir
    }

    get config() {
        return this.props.config
    }

    set config(value) {
        this.props.config = value
    }

    get skip() {
        return this.props.skip
    }

    set skip(value) {
        this.props.skip = value
    }

    get assets() {
        return this.props.assets
    }

    set assets(value) {
        this.props.assets = value
    }

    toJson() {
        return {
            ...this.props,
            tasks: { ...this.tasks2messages }
        }
    }

    /**
     * Adds a message with the given priority to the given task. Returns the instance to allow chaining
     *
     * @param {number} task
     * @param {string} msg
     * @param {number|undefined} priority
     *
     * @returns {DistTarget}
     */
    addTaskMessage(task, msg, priority = 10) {
        if (!this.tasks2messages[task]) this.tasks2messages[task] = []
        const messages = this.tasks2messages[task]

        let i = 0
        const newMsg = { priority, msg }
        while (i < messages.length && messages[i].priority >= priority) {
            i++
        }
        if (i === messages.length) {
            messages.push(newMsg)
        } else {
            messages.splice(i, 0, newMsg)
        }
        return this
    }

    /**
     * Returns an array holding all messages ordered by tasks and priority
     *
     * @returns {array}
     */
    getFlatTaskMessages() {
        const result = []
        const tasks = toValues(TASK)
        for (const task of tasks) {
            const messages = this.tasks2messages[task]
            if (!messages) continue

            result.push( ...messages.map(obj => obj.msg) )
        }
        return result
    }
}

module.exports = {
    DistTarget,
    TASK
}