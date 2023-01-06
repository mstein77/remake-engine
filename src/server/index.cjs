const path = require('path')
const express = require('express')
const cors = require('cors')

const setupAppMiddlewares = RESOURCES_API && require('./setupMiddlewares.cjs')

const STATIC_DIR = path.resolve(__dirname, "public")

const app = express()

app.use(cors())

app.use('/js', express.static(STATIC_DIR + '/js'))
app.use('/audio', express.static(STATIC_DIR + '/audio'))
app.use('/css', express.static(STATIC_DIR + '/css'))

if (LOAD_STATIC) {
    app.use('/json', express.static(STATIC_DIR + '/json'))
    app.use('/image', express.static(STATIC_DIR + '/image'))
}

app.options('*', cors())

app.get('/', function(req, res) {
    res.sendFile(
        path.join(STATIC_DIR, "index.html")
    )
})
if (setupAppMiddlewares) {
    setupAppMiddlewares(app, {serverLogging: LOGGING, serverLoggingFormat: LOGGING_FORMAT, IS_DIST: true, API_MAX_JSON_SIZE})
}

app.listen(PORT)