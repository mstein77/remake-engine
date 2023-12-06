const { isString } = require('../../shared/classes/helper.cjs')

// TODO we should check the terminal support for colors here, especially for windows
const noColor = false

const FG = {
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
    // TODO add bg colors
}

/**
 * Passes the given parameters to console.log and encloses every string parameter with FG.RESET
 *
 * @param params
 */
const colorLog = ( ...params ) => {
    const cParams = []
    for (const param of params) {
        cParams.push(isString(param) ? FG.RESET + param + FG.RESET : param)
    }
    console.log( ...cParams )
}

module.exports = {
    FG,
    BG,
    colorLog
}