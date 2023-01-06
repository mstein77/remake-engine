const absPath = require('../src/build/classes/absPath.cjs')
const syncFs = require('../src/build/classes/syncFs.cjs')

const instructionsPath = absPath.tmp('instructions.txt')

if (syncFs.fileExists(instructionsPath)) {
    const instructions = syncFs.readFile(instructionsPath, {encoding: 'utf8', flag: 'r'})
    if (instructions) {
        console.log()
        console.log(`Build to dist folder was successful!  please follow these instructions:`)
        console.log()
        console.log(instructions)
    }
}

syncFs.clearDir(absPath.tmp())