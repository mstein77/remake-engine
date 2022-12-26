const { absDir, syncFs, cleanTmpDir } = require('../src/build/classes.cjs')

const instructionsPath = absDir.tmp('instructions.txt')

if (syncFs.fileExists(instructionsPath)) {
    const instructions = syncFs.readFile(instructionsPath, {encoding: 'utf8', flag: 'r'})
    if (instructions) {
        console.log()
        console.log(`Build to dist folder was successful!  please follow these instructions:`)
        console.log()
        console.log(instructions)
    }
}

syncFs.clearDir(absDir.tmp())