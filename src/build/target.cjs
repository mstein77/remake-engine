const { d, toPairs, toValues } = require("../shared/helper.cjs")

const TASK = {
    PREPARE_SOURCE: 0,
    PREPARE_SERVER: 1,
    SOURCE_TO_SERVER: 2,
    TRIGGER_INSTALL: 3,
    TRIGGER_START: 4
}

/**
 * A dist target holds all information regarding a distribution target
 */
class DistTarget {

    /**
     * Constructs or restores a distribution target from the given Json properties
     *
     * @param {object} props
     */
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

    /**
     * A string holding the name which is used for this target in the builds.cjs
     *
     * @returns {string}
     */
    get target() {
        return this.props.target
    }

    /**
     * An object which holds the config overwrites of the target used in the builds.cjs
     *
     * @returns {object}
     */
    get overwrites() {
        return this.props.overwrites
    }

    /**
     * A string holding the root build folder where this target should be build
     *
     * @returns {string}
     */
    get root() {
        return this.props.root
    }

    /**
     * A string holding the path to the temporary build folder
     *
     * @returns {string}
     */
    get tmpDir() {
        return this.props.tmpDir
    }

    /**
     * A string holding the name of the public directory of the server (if a server is used)
     *
     * @returns {string}
     */
    get publicDir() {
        return this.props.publicDir
    }

    /**
     * Sets the name of the public directory of the server
     *
     * @param {string} value
     */
    set publicDir(value) {
        this.props.publicDir = value
    }

    /**
     * A string holding the name of build directory in the build root
     *
     * @returns {string}
     */
    get dir() {
        return this.props.dir
    }

    /**
     * The final config which was used to build the target
     *
     * @returns {object}
     */
    get config() {
        return this.props.config
    }

    /**
     * Sets the config for building the target
     *
     * @param {object} value
     */
    set config(value) {
        this.props.config = value
    }

    /**
     * A boolean indicating whether this dist target was skipped or not
     *
     * @returns {boolean}
     */
    get skip() {
        return this.props.skip
    }

    /**
     * Sets whether this dist build should be skipped or not
     *
     * @param {boolean} value
     */
    set skip(value) {
        this.props.skip = value
    }

    /**
     * An array which holds all asset objects which should be generated
     *
     * @returns {array}
     */
    get assets() {
        return this.props.assets
    }

    /**
     * Sets an array holding all assets objects which should be generated
     *
     * @param {array} value
     */
    set assets(value) {
        this.props.assets = value
    }

    /**
     * Returns a JSON object which can be used to restore the current distribution target
     *
     * @returns {object}
     */
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