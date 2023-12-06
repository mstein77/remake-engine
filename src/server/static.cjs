const { absDir, getConfigForCtx } = require('../build/classes.cjs')

const config = getConfigForCtx({config: ['webpack.build-dist.cjs']})

const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())

const pubPrefix = config.server ? 'public/' : ''

app.use('/js', express.static(absDir.dist(pubPrefix + 'js')))
app.use('/css', express.static(absDir.dist(pubPrefix + 'css')))

app.use('/json', express.static(absDir.dist(pubPrefix + 'json')))
app.use('/image', express.static(absDir.dist(pubPrefix + 'image')))
app.use('/audio', express.static(absDir.dist(pubPrefix + 'audio')))

app.options('*', cors())

app.get('/', function(req, res) {
    res.sendFile(
        absDir.dist(pubPrefix + 'index.html')
    )
})
app.listen(config.port)