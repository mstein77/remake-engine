const util = require('node:util')
const { d, isRegExp, isFunction, isArray, isString, toKeys, toPairs, isVersionEqualOrHigher} = require('./helper.cjs')
const child_process = require("node:child_process")
const os = require('node:os')

/**
 * Process exit code which should be used if the error was already communicated to the user via the
 * errorSection
 *
 * @type {number}
 */
const EXIT_CODE_HANDLED = 27

/**
 * The minimum required version for the build process
 *
 * @type {string}
 */
const minNodeVersion = 'v16'

/**
 * An array holding the sequence of loading spinner frames
 *
 * @type {array}
 */
const spinner = ['⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏', '⠋']

/**
 * A boolean indicating of color in log messages is supported or not
 *
 * @type {boolean}
 */
let supportsColor = true

/**
 * Maps colors to their ANSI foreground color code
 *
 * @type {object}
 */
const color2code = {
    BLACK: 30,
    RED: 31,
    L_RED: 91,
    GREEN: 32,
    L_GREEN: 92,
    YELLOW: 33,
    L_YELLOW: 93,
    BLUE: 34,
    L_BLUE: 94,
    MAGENTA: 35,
    L_MAGENTA: 95,
    CYAN: 36,
    L_CYAN: 96,
    GRAY: 90,
    L_GRAY: 37,
    WHITE: 97,
    RESET: 0
}

/**
 * Maps foreground colors to their ANSI escape code sequence
 *
 * @type {object}
 */
const FG = {}

/**
 * Maps background colors to their ANSI escape code sequence
 *
 * @type {object}
 */
const BG = {}

/**
 * Enable or disables ANSI color support in build messages
 *
 * @param {boolean} value
 */
const setColorSupport = value => {
    for (const [key, code] of toPairs(color2code)) {
        FG[key] = value ? `\x1b[${code}m` : ''
        BG[key] = value ? `\x1b[${code === 0 ? 49 : code + 10}m` : ''
    }
    supportsColor = value
}

// trigger to generate ANSI color sequences
setColorSupport(supportsColor)

let allowExit = true

/**
 * Sets the allowExit flag to the given value. Only used in unit-tests for
 * deactivating exits
 *
 * @param value
 */
const setAllowExit = value => {
    allowExit = value
}

/**
 * Returns an error instance which will not dump the stack trace but can dump a cli output if given
 *
 * @param {string} msg
 * @param {string|undefined} output
 *
 * @returns {Error}
 */
const NoStackError = (msg, output) => {
    const e = Error(msg)
    e.noStack = true
    if (output)
        e.output = output

    return e
}

/**
 * Sets the environment variable which identifies the start script if it was not set before (or if force is true)
 *
 * @param {string} script
 * @param {bool} force
 */
const setCliScript = (script, force = false) => {
    if (process.env.RMK_SCRIPT && !force) return

    process.env.RMK_SCRIPT = script
}

/**
 * Returns a string describing the starting script or "unknown" if no cli script was set before
 *
 * @returns {string}
 */
const getCliScript = () => process.env.RMK_SCRIPT ? process.env.RMK_SCRIPT : 'unknown'

let buildLogLevel = 'normal'

/**
 * The available build log levels in ascending order
 *
 * @type {array}
 */
const buildLogLevels = ['none', 'minimal', 'normal', 'detailed', 'verbose']

/**
 * Returns the current build log level as string
 *
 * @returns {string}
 */
const getBuildLogLevel = () => buildLogLevel

/**
 * Sets the given build log level if it exists or throws an exception
 *
 * @param {string} value
 */
const setBuildLogLevel = value => {
    if (!buildLogLevels.includes(value))
        throw Error(`Invalid build log level "${value}" requested`)

    buildLogLevel = value
}

/**
 * Returns whether the given log level or a level above it is set
 *
 * @param {string} name
 *
 * @returns {boolean}
 */
const hasLogLevel = name => {
    if (name === buildLogLevel) return true

    for (const level of buildLogLevels) {
        if (level === name) {
            return true
        }
        if (level === buildLogLevel) break
    }
    return false
}

let logger = console

/**
 * Sets the logger for log to the given value
 *
 * @param {object} value
 */
const setLogger = value => logger = value

/**
 * Passes the given parameters to console.log and encloses every string parameter with FG.RESET
 *
 * @param params
 */
const log = ( ...params ) => {
    const cParams = []
    for (const param of params) {
        cParams.push(isString(param) ? FG.RESET + param + FG.RESET : param)
    }
    logger.log( ...cParams )
}

/**
 * Returns the given string enclosed with ANSI escape sequences for making it bold (if color is supported)
 *
 * @param {string} msg
 *
 * @returns {string}
 */
const bold = msg => supportsColor ? '\x1b[1m' + msg + '\x1b[0m' : msg

/**
 * Dumps the given json to the console while using the given indentation
 *
 * @param {mixed} json
 * @param {number} indentation
 */
const dumpJson = (json, indentation = 0) => {
    let dump = util.inspect(json, false, 10, supportsColor)
    if (indentation) {
        let prefix = ''
        while (indentation--) prefix += ' '
        dump = dump.split("\n").map(line => prefix + line).join('\n')
    }
    logger.log(dump)
}

/**
 * Logs a new line
 */
const newLine = () => { logger.log() }

/**
 * Logs a main section with the given name if allowed
 *
 * @param {string} name
 */
const mainSection = name => {
    if (!hasLogLevel('minimal')) return

    log(`\n${BG.BLUE + FG.L_CYAN} ${getCliScript()} ${BG.CYAN + FG.BLACK} ${name} `)
    log()
}

/**
 * Logs an error section with the given error and exits with an error code
 *
 * @param {Error} error
 */
const errorSection = error => {
    const details = [
        `platform: ${process.platform} ${os.release}`,
        `node: ${process.version}`
    ]
    const rmkVersion = process.env.RMK_ENGINE_VERSION
    if (rmkVersion) details.push(`engine: ${rmkVersion}`)

    const detailsBox = FG.L_GRAY + `[${details.join('|')}] `
    log(`\n${BG.GRAY + FG.WHITE} ${getCliScript()} ${BG.RED + FG.WHITE} Failed with the following error... ${detailsBox} `)
    log( FG.RED + bold(' ✕ ') + FG.RESET + bold(error.message) + '\n')
    if (!error.noStack) {
        logger.error(error.stack)
    } else if (error.output) {
        log(error.output)
    }

   if (allowExit) process.exit(EXIT_CODE_HANDLED)
}

/**
 * Logs a subsection with the given name if allowed
 *
 * @param {string} name
 */
const subSection = name => {
    if (!hasLogLevel('normal')) return

    log(` - ` + name + '...')
}

/**
 * Logs an ok message under the current subsection if allowed
 *
 * @param {string} msg
 */
const subSectionOk = (msg = '') => {
    if (!hasLogLevel('normal')) return

    log(FG.GREEN + `   ${bold('✓')}` + FG.RESET + ` OK ` + msg)
}

/**
 * Logs an error message under the current subsection if allowed
 *
 * @param {string} msg
 */
const subSectionError = msg => {
    log( FG.RED + `   ${bold('✕')}` + FG.RESET + ' ' + bold(msg) + '\n')
}

/**
 * Logs a warning message under the current subsection if allowed
 *
 * @param {string} msg
 */
const subSectionWarning = msg => {
    if (!hasLogLevel('normal')) return

    log(`   ${BG.YELLOW + FG.BLACK} WARNING ${FG.RESET} ${bold(msg)}\n`)
}

/**
 * Logs a new subsection with the given name and shows loading spinner while the given
 * async function is processed. Instead of a function an array with 2 elements can be
 * given where the first item is the object and the second the key where the async
 * function which should be called exists.
 *
 * @param {string} name
 * @param {function|array} func
 * @param {mixed} params
 *
 * @returns {Promise}
 */
async function asyncSubSection(name, func, ...params) {
    subSection(name)
    startSpinner(`  `)
    try {
        let response
        if (isArray(func)) {
            if (func.length !== 2)
                throw Error(`Expected array with 2 items in func-parameter of asyncSubSection`)

            response = await func[0][func[1]](...params)
        } else {
            response = await func( ...params )
        }
        endSpinner()
        if (!response) response = {}
        const { warnings = [], result } = response

        if (!warnings || !warnings.length) {
            subSectionOk()
            return result
        }
        for (const warning of warnings) {
            subSectionWarning(warning)
        }
        return result

    } catch (e) {
        if (stopSpinner()) {
            writeSpinner(FG.RED + '✕ Failed!' + FG.RESET)
            newLine()
        }
        endSpinner()
        throw e
    }
}

// holds the current loading spinner
let activeSpinner = null

/**
 * Deletes the current spinner (if active) and clears the last spinner message on the console
 */
const endSpinner = () => {
    if (!activeSpinner) return

    stopSpinner()
    let clearMsg = '';
    while (clearMsg.length < (activeSpinner.length + activeSpinner.prefix.length + 3)) clearMsg += ' '
    process.stdout.write(`\r${clearMsg}\r`)
    activeSpinner = null
}

/**
 * Clears the interval which updates the active spinner (if available) and returns whether a
 * spinner was active or not
 *
 * @returns {boolean}
 */
const stopSpinner = () => {
    if (!activeSpinner) return false

    clearInterval(activeSpinner.id)
    return true
}

/**
 * Overwrites the active spinner (if available) with the given spinner message
 *
 * @param {string} overwrite
 */
const writeSpinner = overwrite => {
    if (!activeSpinner) return

    const msg = `${activeSpinner.prefix} ${bold(overwrite ? overwrite : spinner[activeSpinner.index])} ${activeSpinner.postfix}`
    process.stdout.write(`\r${msg}`)
}

/**
 * Updates the current spinner by writing the new state and incrementing the frame
 */
const updateSpinner = () => {
    writeSpinner()
    activeSpinner.index++
    activeSpinner.index %= spinner.length
}

/**
 * Sets a new message on the active spinner (if available) and writes it to the console
 *
 * @param {string} msg
 */
const setSpinnerInfo = msg => {
    if (!activeSpinner) return

    if (msg.length > 70) msg = msg.substring(0, 50) + '...'
    while (msg.length < activeSpinner.length) msg += ' '
    activeSpinner.postfix = msg
    activeSpinner.length = msg.length
    writeSpinner()
}

/**
 * Starts a new spinner with the given prefix and postfix if allowed
 *
 * @param {string} prefix
 * @param {string} postfix
 */
const startSpinner = (prefix = '', postfix = '') => {
    if (hasLogLevel('detailed')) return

    endSpinner()
    activeSpinner = {
        prefix,
        postfix,
        index: 0,
        length: postfix.length,
        id: setInterval(updateSpinner, 100)
    }
    updateSpinner()
}

/**
 * Holds a prefix for all executed commands on the CLI
 * Required to solve encoding problems on the windows platform
 *
 * @type {string}
 */
const preCmd = process.platform === 'win32' ? 'cmd /c chcp 65001>nul && ' : ''

/**
 * Quotes the given argument for the CLI on the target platform
 *
 * @param {string} arg
 *
 * @returns {string}
 */
const quoteArg = arg => process.platform !== 'win32' ? `'${arg}'` : `"${arg}"`

/**
 * Executes the given command with the options asynchronously and resolves to an object
 * which hold the output string, the exit code and a failed flag which is set when the
 * execution failed with an error
 *
 * @param {string} cmd
 * @param {object} options
 *
 * @returns {Promise}
 */
async function exec(cmd, options = {}) {
    return new Promise(resolve => {
        const { cwd, print } = options
        let exitCode = 0
        let output = ''
        let failed = false
        const execOptions = { cwd, encoding: 'utf-8' }

        if (print || (hasLogLevel('detailed') && print !== false)) {
            log(cmd)
            if (!execOptions.stdio) {
                execOptions.stdio = 'inherit'
            }
        }
        child_process.exec(preCmd + cmd, execOptions, (error, stdout) => {
            if (error) {
                output = error.message + ': ' + stdout.toString()
                failed = true
                resolve({ output, exitCode: error.code || 1, failed })
            } else {
                output = stdout || ''
                resolve({ output, exitCode, failed });
            }
        });
    });
}

/**
 * Executes the given command and returns an object holding the output, the exit code and failed flag which is set
 * when the execution failed. In this case the output will be the error message.
 *
 * @param {string} cmd
 * @param {object} options
 *
 * @returns {object}
 */
const execSync = (cmd, options = {}) => {
    const { cwd, print } = options
    let exitCode = 0
    let output = ''
    let failed = false
    const execOptions = { cwd, encoding: 'utf-8' }
    if (print || (hasLogLevel('detailed') && print !== false)) {
        log(cmd)
        if (!execOptions.stdio) {
            execOptions.stdio = 'inherit'
        }
    }
    try {
        output = child_process.execSync(preCmd + cmd, execOptions)
        if (output !== null)
            output = output.toString()
    } catch (error) {
        output = error.message
        exitCode = error.status
        failed = true
    }
    return { output, exitCode, failed }
}

/**
 * Spawns the given command synchronously with its arguments and options and returns a buffer with the output.
 * This method should work on all platforms automatically
 *
 * @param {string} cmd
 * @param {array} args
 * @param {object} options
 *
 * @returns {Buffer}
 */
function spawnSync(cmd, args, options) {
    if (process.platform !== 'win32') {
        return child_process.spawnSync(cmd, args, options)
    }
    return child_process.spawnSync(process.env.comspec || 'cmd.exe', [ '/c', cmd, ...args ], options)
}

/**
 * Returns an object holding the arguments and options of the current script call which are specified in
 * the given CLI info structure. If the help option was requested, a help based on the info structure is
 * is printed out followed by an exit. The help describing the usage, a description and an overview over
 * the supported flags and options.
 *
 * @param {object} info
 * @param {string} usage
 * @param {description} description
 *
 * @returns {object}
 */
const extractOptionsAndArguments = (info, usage = '', description = '') => {
    const isNpmRun = usage.startsWith('npm run')

    if (isNpmRun && !process.env.RMK_GAME_DIR)
        throw NoStackError(`Command "${usage}" must be called from the game directory`)

    if (!isVersionEqualOrHigher(process.version, minNodeVersion))
        throw NoStackError(`Your node version is ${process.version} but ${minNodeVersion} or above is required `)

    const { RMK_SCRIPT_ARGS } = process.env
    const hasEnvArgs = RMK_SCRIPT_ARGS !== undefined
    const rawArgs =  hasEnvArgs ? RMK_SCRIPT_ARGS.split('\t') : process.argv.slice(2)

    if (!hasEnvArgs)
        process.env.RMK_SCRIPT_ARGS = process.argv.slice(2).join('\t')

    const { options, args } = getParsedArguments(info, rawArgs)
    if (!options.help) return { options, args }

    const name2option = []
    let maxLenName = 0
    let hasOptions = false
    for (const [ name, props ] of toPairs(info.options)) {
        if (props.hidden) continue

        hasOptions = true
        name2option[name] = { desc: props.desc }
        maxLenName = Math.max(maxLenName, name.length)
    }
    for (const [ flag, name ] of toPairs(info.flags)) {
        const optionElem = name2option[name]
        if (!optionElem) {
            const infoOption = info.options[name]
            if (infoOption && infoOption.hidden) continue

            throw Error(`Option "${name}" for flag "${flag}" does not exist`)
        }
        optionElem.flag = flag
    }
    log()
    log(`USAGE:`);
    log()
    log(bold(`  ${usage}` + (hasOptions ? ` ${isNpmRun ? '[--] ' : ''}[options]` : '')))
    log()
    const lines = isArray(description) ? description : [description]
    for (const line of lines) {
        log(`  ${line}`)
    }
    log()
    if (hasOptions) {
        log('OPTIONS:')
        log()
        for (const [ name, option ] of toPairs(name2option)) {
            const { flag, desc } = option
            const versions = []
            if (flag) versions.push('-' + flag)
            versions.push('--' + name)
            const line = '  ' + (versions.length === 1 ? '    ' : '') + versions.join(', ')
            log(line.padEnd(11 + maxLenName, ' ') + desc)
        }
        if (isNpmRun) {
            log()
            log('  A block of double or single dash options must be prefixed by -- due to npm run:')
            log(`    ${usage} -- -h`)
            log()
            log(`  You can also use + instead of dashes if you don't want to use the -- prefix:`)
            log(`    ${usage} +h`)
            log()
        }
    }
    if (allowExit) process.exit(0)
}

/**
 * Returns an object holding all arguments and options of the given rawArgs which are supporting according
 * to the info structure
 *
 * @param {object} info
 * @param {array} rawArgs
 *
 * @returns {object}
 */
const getParsedArguments = (info, rawArgs) => {
    const { matchers = [], options = {}, flags = {} } = info
    const reqOptions = {}
    const args = []

    let optionArg = null
    let expectedOptionArgs = 0
    let argNo = 0
    for (const arg of rawArgs) {
        if (arg === '') continue

        const dash = ['-', '+'].includes(arg[0]) ? arg[0] : ''
        const hasDash = dash !== ''
        if (!hasDash) {
            if (expectedOptionArgs) {
                if (expectedOptionArgs === 1) {
                    reqOptions[optionArg] = arg
                } else {
                    reqOptions[optionArg].push(arg)
                }
                argNo++
                if (argNo === expectedOptionArgs) {
                    optionArg = null
                    expectedOptionArgs = 0
                    argNo = 0
                }
            } else {
                const matcher = matchers[args.length]
                if (matcher) {
                    if (
                        (isRegExp(matcher) && !arg.match(matcher)) ||
                        (isFunction(matcher) && !matcher(arg))
                    )
                        throw NoStackError(`Invalid argument "${arg}" given`)
                }
                args.push(arg)
            }
            continue
        }
        if (expectedOptionArgs !== argNo) break

        const [ part, value ] = arg.split('=')
        const hasAssignment = arg.indexOf('=') > -1
        let long = null
        let expectsParams = false
        if (!part.startsWith(dash + dash)) {
            const reqFlags = part.substring(1)
            const singleFlag = reqFlags.length === 1
            if (!singleFlag && hasAssignment)
                throw NoStackError(`Flags argument ${arg} is not allowed to have an assignment`)

            for (const flag of reqFlags) {
                long = flags[flag]
                if (!long)
                    throw NoStackError(`Unknown argument flag ${flag} given`)

                reqOptions[long] = true
                if (singleFlag) {
                    expectsParams = (options[long].argc && options[long].argc > 0)
                }
            }
            if (!singleFlag || !(hasAssignment || expectsParams)) continue
        } else {
            long = part.substring(2)
        }
        const option = options[long]
        if (!option)
            throw NoStackError(`Unknown argument "${long}" given.`)

        if (!option.argc) {
            if (value)
                throw NoStackError(`Argument ${long} cannot have a value, but you assigned "${value}"`)

            reqOptions[long] = true
            continue
        }
        if (value && option.argc === 1) {
            reqOptions[long] = value
            continue
        }
        reqOptions[long] = value ? [value] : []
        expectedOptionArgs = option.argc
        argNo = value ? 1 : 0
        optionArg = long
    }
    if (expectedOptionArgs > argNo)
        throw NoStackError(`Argument "${optionArg}" is expected to have ${expectedOptionArgs} values but got only ${argNo}`)

    return {
        options: reqOptions,
        args
    }
}

module.exports = {
    EXIT_CODE_HANDLED,
    FG,
    BG,
    newLine,
    setColorSupport,
    setAllowExit,
    bold,
    log,
    setLogger,
    setCliScript,
    getCliScript,
    getBuildLogLevel,
    setBuildLogLevel,
    buildLogLevels,
    hasLogLevel,
    dumpJson,
    mainSection,
    errorSection,
    asyncSubSection,
    subSection,
    subSectionOk,
    subSectionError,
    subSectionWarning,
    NoStackError,
    spawnSync,
    quoteArg,
    startSpinner,
    endSpinner,
    setSpinnerInfo,
    extractOptionsAndArguments,
    getParsedArguments,
    exec,
    execSync
}