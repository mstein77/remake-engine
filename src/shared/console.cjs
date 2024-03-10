const util = require('node:util')
const { d, isString } = require('./helper.cjs')

// TODO we should check the terminal support for colors here, especially for windows
let noColor = false

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

    log(`\n${BG.GREEN + FG.BLACK} BUILD ${BG.BLUE + FG.L_CYAN} ${name} `)
    log()
}

const newLine = () => { logger.log() }

const errorSection = error => {
    log(`\n${BG.L_RED + FG.BLACK} BUILD ${BG.RED + FG.WHITE} Failed with the following error... `)
    log( FG.RED + ' ✕' + FG.RESET + ' ' + bold(error.message) + '\n')
    if (!error.noStack)
        console.error(error.stack)

    process.exit(1)
}

const subSection = name => {
    if (!hasLogLevel('normal')) return

    log(` - ` + name + '...')
}

const subSectionOk = (msg = '') => {
    if (!hasLogLevel('normal')) return

    log(FG.GREEN + `   ✓` + FG.RESET + ` OK ` + msg)
}

const subSectionError = msg => {
    log( FG.RED + '   ✕' + FG.RESET + ' ' + bold(msg) + '\n')
}

const subSectionWarning = msg => {
    if (!hasLogLevel('normal')) return

    log(`   ${BG.YELLOW + FG.BLACK} WARNING ${FG.RESET} ${bold(msg)}\n`)
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
    subSectionWarning
}