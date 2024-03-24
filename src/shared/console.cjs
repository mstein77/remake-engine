const util = require('node:util')
const { d, isString } = require('./helper.cjs')
const child_process = require("node:child_process")

// TODO we should check the terminal support for colors here, especially for windows
let noColor = false

const spinner = ['⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏', '⠋']

const FG = {
    BLACK: noColor ? '' : '\x1b[30m',
    RED: noColor ? '' : '\x1b[31m',
    L_RED: noColor ? '' : '\x1b[91m',
    GREEN: noColor ? '' : '\x1b[32m',
    L_GREEN: noColor ? '' : '\x1b[92m',
    YELLOW: noColor ? '' : '\x1b[33m',
    L_YELLOW: noColor ? '' : '\x1b[93m',
    BLUE: noColor ? '' : '\x1b[34m',
    L_BLUE: noColor ? '' : '\x1b[94m',
    MAGENTA: noColor ? '' : '\x1b[35m',
    L_MAGENTA: noColor ? '' : '\x1b[95m',
    CYAN: noColor ? '' : '\x1b[36m',
    L_CYAN: noColor ? '' : '\x1b[96m',
    GRAY: noColor ? '' : '\x1b[90m',
    L_GRAY: noColor ? '' : '\x1b[37m',
    WHITE: noColor ? '' : '\x1b[97m',
    RESET: noColor ? '' : '\x1b[0m',
}

const BG = {
    BLACK: noColor ? '' : '\x1b[40m',
    RED: noColor ? '' : '\x1b[41m',
    L_RED: noColor ? '' : '\x1b[101m',
    GREEN: noColor ? '' : '\x1b[42m',
    L_GREEN: noColor ? '' : '\x1b[102m',
    YELLOW: noColor ? '' : '\x1b[43m',
    L_YELLOW: noColor ? '' : '\x1b[103m',
    BLUE: noColor ? '' : '\x1b[44m',
    L_BLUE: noColor ? '' :  '\x1b[104m',
    MAGENTA: noColor ? '' : '\x1b[45m',
    L_MAGENTA: noColor ? '' : '\x1b[105m',
    CYAN: noColor ? '' : '\x1b[46m',
    L_CYAN: noColor ? '' : '\x1b[106m',
    GRAY: noColor ? '' : '\x1b[100m',
    L_GRAY:  noColor ? '' : '\x1b[47m',
    WHITE: noColor ? '' : '\x1b[107m',
    RESET: noColor ? '' :  '\x1b[49m'
}

let logger = console

let buildLogLevel = 'normal'

const buildLogLevels = ['none', 'minimal', 'normal', 'detailed', 'verbose']

const getBuildLogLevel = () => buildLogLevel

const setBuildLogLevel = value => buildLogLevel = value

/**
 * Sets the logger for log to the given value
 *
 * @param {object} value
 */
const setLogger = value => logger = value

const bold = msg => noColor ? msg : '\x1b[1m' + msg + '\x1b[0m'

/**
 * Returns the given string with FG.RESET enclosed
 */
const colorMsg = msg => FG.RESET + msg + FG.RESET

const NoStackError = (msg, output) => {
    const e = Error(msg)
    e.noStack = true
    if (output)
        e.output = output

    return e
}

/**
 * Passes the given parameters to console.log and encloses every string parameter with FG.RESET
 *
 * @param params
 */
const log = ( ...params ) => {
    const cParams = []
    for (const param of params) {
        cParams.push(isString(param) ? colorMsg(param) : param)
    }
    logger.log( ...cParams )
}

const dumpJson = (json, indentation = 0) => {
    let dump = util.inspect(json, false, 10, !noColor)
    if (indentation) {
        let prefix = ''
        while (indentation--) prefix += ' '
        dump = dump.split("\n").map(line => prefix + line).join('\n')
    }
    logger.log(dump)
}

const hasLogLevel = name => {
    if (name === buildLogLevel) return true

    for (const level of buildLogLevels) {
        if (level === name) {
            return true
        }
        if (level === buildLogLevel) return false
    }
    return false
}
const mainSection = (name, scope) => {
    if (!hasLogLevel('minimal')) return

    log(`\n${BG.GREEN + FG.BLACK} ${scope} ${BG.BLUE + FG.L_CYAN} ${name} `)
    log()
}

const newLine = () => { logger.log() }

const errorSection = (error, scope) => {
    if (stopSpinner()) {
        writeSpinner(FG.RED + '✕ ' + FG.RESET)
        newLine()
    }
    log(`\n${BG.L_RED + FG.BLACK} ${scope} ${BG.RED + FG.WHITE} Failed with the following error... `)
    log( FG.RED + ' ✕' + FG.RESET + ' ' + bold(error.message) + '\n')
    if (!error.noStack) {
        console.error(error.stack)
    } else if (error.output) {
        console.log(error.output)
    }
    process.exit(1)
}

const subSection = name => {
    if (!hasLogLevel('normal')) return

    log(` - ` + name + '...')
    startSpinner(`  `)
}

const subSectionOk = (msg = '') => {
    if (!hasLogLevel('normal')) return

    endSpinner()
    log(FG.GREEN + `   ${bold('✓')}` + FG.RESET + ` OK ` + msg)
}

const subSectionError = msg => {
    endSpinner()
    log( FG.RED + `   ${bold('✕')}` + FG.RESET + ' ' + bold(msg) + '\n')
}

const subSectionWarning = msg => {
    if (!hasLogLevel('normal')) return

    endSpinner()
    log(`   ${BG.YELLOW + FG.BLACK} WARNING ${FG.RESET} ${bold(msg)}\n`)
}

let activeSpinner = null
const endSpinner = () => {
    if (!activeSpinner) return

    stopSpinner()
    let clearMsg = '';
    while (clearMsg.length < (activeSpinner.length + activeSpinner.prefix.length + 3)) clearMsg += ' '
    process.stdout.write(`\r${clearMsg}\r`)
    activeSpinner = null
}

const stopSpinner = () => {
    if (!activeSpinner) return false

    clearInterval(activeSpinner.id)
    return true
}

const writeSpinner = overwrite => {
    if (!activeSpinner) return

    const msg = `${activeSpinner.prefix} ${bold(overwrite ? overwrite : spinner[activeSpinner.index])} ${activeSpinner.postfix}`
    process.stdout.write(`\r${msg}`)
}

const updateSpinner = () => {
    writeSpinner()
    activeSpinner.index++
    activeSpinner.index %= spinner.length
}

const setSpinnerInfo = msg => {
    if (!activeSpinner) return

    if (msg.length > 70) msg = msg.substring(0, 50) + '...'
    while (msg.length < activeSpinner.length) msg += ' '
    activeSpinner.postfix = msg
    activeSpinner.length = msg.length
    writeSpinner()
}

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

const preCmd = process.platform === 'win32' ? 'cmd /c chcp 65001>nul && ' : ''

async function exec(cmd, options = {}) {
    return new Promise(resolve => {
        const { cwd, print } = options
        let exitCode = 0
        let output = ''
        let failed = false
        const execOptions = { cwd, encoding: 'utf-8' }

        if (print || (hasLogLevel('detailed') && print !== false)) {
            console.log(cmd)
            execOptions.stdio = 'inherit'
        }
        child_process.exec(preCmd + cmd, execOptions, (error, stdout) => {
            if (error) {
                output = error.message + ': ' + stdout.toString() // || error.message
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
        console.log(cmd)
        execOptions.stdio = 'inherit'
    }
    try {
        output = child_process.execSync(preCmd + cmd, execOptions)
        if (output !== null)
            output = output.toString()
    } catch (error) {
        output = error.message
        failed = true
    }
    return { output, exitCode, failed }
}

function spawnSync(cmd, args, options) {
    if (process.platform !== 'win32') {
        return child_process.spawnSync(cmd, args, options)
    }
    return child_process.spawnSync(process.env.comspec || 'cmd.exe', [ '/c', cmd, ...args ], options)
}

const quoteArg = arg => process.platform !== 'win32' ? `'${arg}'` : `"${arg}"`

const getParsedArguments = info => {
    const options = {}
    const arguments = []

    const args = process.argv.slice(2)
    let optionArg = null
    let expectedOptionArgs = 0
    let argNo = 0
    for (const arg of args) {
        const hasAssignment = arg.indexOf('=') !== -1
        const hasDash = arg.startsWith('-')
        const hasPlus = arg.startsWith('+')
        if (!hasDash && !hasAssignment && !hasPlus) {
            if (expectedOptionArgs) {
                options[optionArg].push(arg)
                argNo++
                if (argNo === expectedOptionArgs) {
                    optionArg = null
                    expectedOptionArgs = 0
                }
            } else {
                arguments.push(arg)
            }
            continue
        }
        if (expectedOptionArgs !== argNo) break

        const [ part, value ] = arg.split('=')
        let long = null
        if (hasPlus || (!hasPlus && (hasDash && !part.startsWith('--')))) {
            const flags = part.substring(1)
            const singleFlag = flags.length === 1
            if (!singleFlag && hasAssignment)
                throw NoStackError(`Flags argument ${arg} is not allowed to have an assignment`)

            for (const flag of flags) {
                long = info.flags[flag]
                if (!long)
                    throw NoStackError(`Unknown argument flag ${flag} given`)

                options[long] = true
            }
            if (!singleFlag || !hasAssignment) continue
        } else {
            long = part.substring(part.startsWith('-') ? 1 : 0)
        }
        const option = info.options[long]
        if (!option)
            throw NoStackError(`Unknown argument "${long}" given.`)

        if (!option.argc) {
            if (value)
                throw NoStackError(`Argument ${long} cannot have a value, but you assigned "${value}"`)

            options[long] = true
            continue
        }
        if (value && option.argc === 1) {
            options[long] = value
            continue
        }
        options[long] = value ? [value] : []
        expectedOptionArgs = option.argc
        argNo = value ? 1 : 0
        optionArg = long
    }
    if (expectedOptionArgs > argNo)
        throw NoStackError(`Argument "${optionArg}" is expected to have ${expectedOptionArgs} values but got only ${argNo}`)

    return {
        options,
        arguments
    }
}

module.exports = {
    FG,
    BG,
    newLine,
    bold,
    log,
    colorMsg,
    setLogger,
    getBuildLogLevel,
    setBuildLogLevel,
    buildLogLevels,
    hasLogLevel,
    dumpJson,
    mainSection,
    errorSection,
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
    getParsedArguments,
    exec,
    execSync
}