const absPath = require('../src/shared/absPath.cjs')
const syncFs = require('../src/shared/syncFs.cjs')
const { mainSection } = require('../src/shared/console.cjs')

const instructionsPath = absPath.tmp('instructions.txt')

if (syncFs.fileExists(instructionsPath)) {
    mainSection('3. Build successfully finished...')
    const instructions = syncFs.readFile(instructionsPath, {encoding: 'utf8', flag: 'r'})
    if (instructions) {
        console.log(`Please follow these instructions:`)
        console.log()
        console.log(instructions)
    }
}
syncFs.clearDir(absPath.tmp())