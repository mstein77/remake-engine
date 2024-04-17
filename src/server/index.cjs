const path = require('path')
const express = require('express')
const cors = require('cors')
const { csv2values, d } = require('../shared/helper.cjs')
const syncFs = require("../shared/syncFs.cjs")

const open = require("open")
const { mainSection, errorSection, setCliScript} = require("../shared/console.cjs")

try {
    const isPreview = process.argv.includes('--preview')
    setCliScript(isPreview ? 'PREVIEW' : 'SERVER')
    process.env.RMK_ENGINE_VERSION = VERSION_ENGINE

    const setupAppMiddlewares = RESOURCES_API && require('./setupMiddlewares.cjs')
    const STATIC_DIR = path.resolve(__dirname, "public")
    const app = express()
    corsOptions = {}

    let downloadsHtml = null
    const getDownloadsHtml = () => {
        if (downloadsHtml === null) {
            const pluginPath = path.resolve(__dirname, 'DownloadsPlugin.cjs')
            if (syncFs.fileExists(pluginPath)) {
                const plugin = eval('require("' + pluginPath.replaceAll('\\', '\\\\') + '")')
                const files = []
                const filesDir = path.resolve(STATIC_DIR)
                const names = syncFs.readFiles(filesDir)
                for (const name of names) {
                    const { size, mtime, ctime } = syncFs.stat(path.join(filesDir, name))
                    files.push({ name, size, mtime, ctime })
                }
                downloadsHtml = plugin(files)
            }
        }
        return downloadsHtml
    }
    if (RESTRICTED_CORS) {
        const baseUrl = new URL(isPreview ? PREVIEW_URL : BASE_URL)
        corsOptions.origin = baseUrl.protocol + '://' + baseUrl.hostname
    }
    app.use(cors(corsOptions))

    const httpAuthUsers = HTTP_AUTH_JSON
    if (httpAuthUsers) {
        const basicAuth = require('express-basic-auth')
        app.use(basicAuth({
            users: httpAuthUsers,
            challenge: true,
            realm: GAME_ID
        }))
    }
    if (!RESOURCES_API) {
        app.get('/', (req, res) => {
            const indexHtmlPath = path.resolve(STATIC_DIR, 'index.html')
            if (syncFs.fileExists(indexHtmlPath)) {
                res.sendFile(
                    indexHtmlPath
                )
                res.set('Cache-Control', 'no-cache')
                return res
            }
            res.set('Cache-Control', 'no-cache')
            res.send(getDownloadsHtml())
            return res
        })
        app.use(express.static(STATIC_DIR))
    }
    app.options('*', cors())

    if (setupAppMiddlewares) {
        setupAppMiddlewares(app, {
            serverLogging: LOGGING,
            serverLoggingFormat: LOGGING_FORMAT,
            staticTypes: STATIC_TYPES,
            resourceTypes: RESOURCE_TYPES,
            resourceLoading: 'api',
            IS_DIST: true,
            API_MAX_JSON_SIZE
        })
    } else if (STATIC_TYPES !== '') {
        for (const type of csv2values(STATIC_TYPES)) {
            app.use('/' + type, express.static(STATIC_DIR + '/' + type))
        }
    }

    const getFileContent = path => {
        if (!path) return ''

        if (!syncFs.fileExists(path))
            throw Error(`File "${path}" does not exist!`)

        return syncFs.readFile(path).toString()
    }

    let server = app
    let port = PORT
    if ((!isPreview && SSL) || (isPreview && HTTPS)) {
        const https = require('https')
        const absPath = require('../shared/absPath.cjs')
        const options = {
            key: getFileContent(isPreview ? absPath.game('.ssl', 'key.pem') : SSL_KEY),
            cert: getFileContent(isPreview ? absPath.game('.ssl', 'cert.pem') : SSL_CERT),
            ca: isPreview ? '' : SSL_CA,
            pfx: isPreview ? '' : SSL_PFX,
            passphrase: isPreview ? '' : SSL_PASSPHRASE
        }
        server = https.createServer(options, app)
        port = HTTPS_PORT
    }
    server.listen(port)
    mainSection(`Listening on port ${port}${isPreview ? `. Game is available in your browser under ` + PREVIEW_URL : '..'}`)

    const openAsync = async (url) => {
        const options = {wait: true}
        if (OPEN_BROWSER !== 'default') {
            options.app = {
                name: OPEN_BROWSER
            }
        }
        await open(url, options)
    }
    if (isPreview) openAsync(PREVIEW_URL)

} catch (e) {
    errorSection(e)
}
