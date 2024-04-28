const util = require('node:util')
const { d, isRegExp, isFunction, isArray, isString, toKeys, toPairs, isVersionEqualOrHigher} = require('./helper.cjs')
const child_process = require("node:child_process")
const os = require('node:os')

const EXIT_CODE_HANDLED = 27
const minNodeVersion = 'v16'

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

let cliScript = null
const setCliScript = (script, force = false) => {
    if (process.env.RMK_SCRIPT && !force) return

    process.env.RMK_SCRIPT = script
}

const getCliScript = () => {
    if (!cliScript) cliScript = process.env.RMK_SCRIPT

    return cliScript
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
const mainSection = name => {
    if (!hasLogLevel('minimal')) return

    log(`\n${BG.BLUE + FG.L_CYAN} ${getCliScript()} ${BG.CYAN + FG.BLACK} ${name} `)
    log()
}

const newLine = () => { logger.log() }

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
        console.error(error.stack)
    } else if (error.output) {
        console.log(error.output)
    }
    process.exit(EXIT_CODE_HANDLED)
}

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


const subSection = name => {
    if (!hasLogLevel('normal')) return

    log(` - ` + name + '...')
}

const subSectionOk = (msg = '') => {
    if (!hasLogLevel('normal')) return

    log(FG.GREEN + `   ${bold('✓')}` + FG.RESET + ` OK ` + msg)
}

const subSectionError = msg => {
    log( FG.RED + `   ${bold('✕')}` + FG.RESET + ' ' + bold(msg) + '\n')
}

const subSectionWarning = msg => {
    if (!hasLogLevel('normal')) return

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
    for (const [ name, props ] of toPairs(info.options)) {
        if (props.hidden) continue

        name2option[name] = { desc: props.desc }
        maxLenName = Math.max(maxLenName, name.length)
    }
    for (const [ flag, name ] of toPairs(info.flags)) {
        const optionElem = name2option[name]
        if (!optionElem)
            throw Error(`Option "${name}" for flag "${flag}" does not exist`)

        optionElem.flag = flag
    }
    const hasOptions = toKeys(name2option).length > 0
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
    process.exit(0)
}

const getParsedArguments = (info, rawArgs) => {
    const { matchers = [] } = info
    const options = {}
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
                options[optionArg].push(arg)
                argNo++
                if (argNo === expectedOptionArgs) {
                    optionArg = null
                    expectedOptionArgs = 0
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
        if (!part.startsWith(dash + dash)) {
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
            long = part.substring(2)
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
        args
    }
}

module.exports = {
    EXIT_CODE_HANDLED,
    FG,
    BG,
    newLine,
    bold,
    log,
    colorMsg,
    setLogger,
    setCliScript,
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
    exec,
    execSync
}