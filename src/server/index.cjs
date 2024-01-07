// this index file is the entry point for the server when the game was not started via `npm run game`
const path = require('path')
const express = require('express')
const cors = require('cors')
const { csv2values } = require('../shared/helper.cjs')

const setupAppMiddlewares = RESOURCES_API && require('./setupMiddlewares.cjs')

const STATIC_DIR = path.resolve(__dirname, "public")

const app = express()

app.use(cors())

app.use('/js', express.static(STATIC_DIR + '/js'))
app.use('/css', express.static(STATIC_DIR + '/css'))

app.options('*', cors())

app.get('/', function(req, res) {
    res.sendFile(
        path.join(STATIC_DIR, "index.html")
    )
})
if (setupAppMiddlewares) {
    setupAppMiddlewares(app, {
        serverLogging: LOGGING,
        serverLoggingFormat: LOGGING_FORMAT,
        staticTypes: STATIC_TYPES,
        resourceLoading: 'api',
        IS_DIST: true,
        API_MAX_JSON_SIZE
    })
} else if (STATIC_TYPES !== '') {
    for (const type of csv2values(STATIC_TYPES)) {
        app.use('/' + type, express.static(STATIC_DIR + '/' + type))
    }
}

app.listen(PORT)