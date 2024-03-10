const { absDir, getConfigForCtx } = require('../build/classes.cjs')

const config = getConfigForCtx({config: ['webpack.build-dist.cjs']})

const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())

const pubPrefix = config.server ? 'public/' : ''

app.use(express.static('public'))
app.options('*', cors())

app.get('/', function(req, res) {
    res.sendFile(
        absDir.dist(pubPrefix + 'index.html')
    )
})
app.listen(config.port)