// this index file is the entry point for the server when the game was not started via `npm run game`
const path = require('path')
const express = require('express')
const cors = require('cors')
const { csv2values, d } = require('../shared/helper.cjs')
const syncFs = require("../shared/syncFs.cjs")

const open = require("open")
const { mainSection, errorSection } = require("../shared/console.cjs")

const isPreview = process.argv.includes('--preview')

try {
    const setupAppMiddlewares = RESOURCES_API && require('./setupMiddlewares.cjs')
    const STATIC_DIR = path.resolve(__dirname, "public")
    const app = express()
    corsOptions = {}
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
            const files = syncFs.readFiles(path.resolve(STATIC_DIR))
            res.send(`<h1>Available files:</h1><ul>${files.map(file => `<li><a href="${file}">${file}</a></li>`).join('')}</ul>`)
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
        const options = d({
            key: getFileContent(isPreview ? absPath.game('.ssl', 'key.pem') : SSL_KEY),
            cert: getFileContent(isPreview ? absPath.game('.ssl', 'cert.pem') : SSL_CERT),
            ca: isPreview ? '' : SSL_CA,
            pfx: isPreview ? '' : SSL_PFX,
            passphrase: isPreview ? '' : SSL_PASSPHRASE
        })
        port
        server = https.createServer(options, app)
        port = HTTPS_PORT
    }
    server.listen(port)
    mainSection(`Listening on port ${port}...`, isPreview ? 'PREVIEW' : 'SERVER')

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
    errorSection(e, isPreview ? 'PREVIEW' : 'SERVER')
}
