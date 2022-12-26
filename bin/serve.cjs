const { absDir, syncFs, cleanTmpDir } = require('../src/build/classes.cjs')
const child_process = require('child_process')

// TODO: solve call from dist-only (upload-root)

const args = ['run']

args.push(
    syncFs.fileExists(absDir.dist('server.cjs')) ? 'start-server' : 'start-static'
)

child_process.spawn('npm', args, {
    stdio: 'inherit',
    cwd: absDir.engine()
});