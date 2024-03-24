const absPath = require("../shared/absPath.cjs")
const { getPreviewConfigs } = require('../build/config.cjs')
const { getParsedArguments } = require("../shared/console.cjs")
const { d } = require('../shared/helper.cjs')
const express = require('express')
const cors = require('cors')
const syncFs = require('../shared/syncFs.cjs')
const open = require('open')

const args = getParsedArguments({
    flags: {},
    options: {
        preview: {}
    }
})
const isPreview = args.options.preview && 'RMK_GAME_DIR' in process.env
const [ target ] = args.arguments

let overwrites = {}
if (target) {
    absPath.setCurrDist(absPath.dists(target))
    const buildsJson = require(absPath.game('builds.cjs'))
    overwrites = buildsJson[target]
}

const { distConfig, devConfig } = getPreviewConfigs({ absPath, syncFs }, overwrites)

const { host } = devConfig
const { https, httpPort, httpsPort  } = distConfig

const app = express()

app.use(cors())

const pubPrefix = distConfig.server ? 'public/' : ''

app.use(express.static(absPath.dist(distConfig.server ? 'public' : '')))
app.options('*', cors())

app.get('/', (req, res) => {
    const indexHtmlPath = absPath.dist(pubPrefix + 'index.html')
    if (syncFs.fileExists(indexHtmlPath)) {
        res.sendFile(
            indexHtmlPath
        )
        return
    }
    const files = syncFs.readFiles(absPath.dist(pubPrefix))
    res.send(`<h1>Available files:</h1><ul>${files.map(file => `<li><a href="${file}">${file}</a></li>`).join('')}</ul>`)
})
const port = https ? httpsPort : httpPort
let server = app
if (https) {
    const httpsModule = require('node:https')
    const options = {
        key: syncFs.readFile(absPath.game('.ssl', 'key.pem')),
        cert: syncFs.readFile(absPath.game('.ssl', 'cert.pem'))
    }
    server = httpsModule.createServer(options, app)
}
server.listen(port)

if (isPreview) {
    const url = `${https ? 'https' : 'http'}://${host}:${port}/`

    console.log(`Listening on port ${port}. Preview is available in your browser under ${url}`)

    const openAsync = async () => {
        const options = {wait: true}
        if (distConfig.openBrowser !== 'default') {
            options.app = {
                name: distConfig.openBrowser
            }
        }
        await open(url, options)
    }
    openAsync()
}

