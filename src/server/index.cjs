const path = require('path');
const express = require('express');
const cors = require('cors');
const setupAppMiddlewares = require('./setupMiddlewares.cjs');

const STATIC_DIR = path.resolve(__dirname, "../public");
const RESOURCE_DIR = path.join(__dirname, '../resources');

const app = express();

app.use(cors());
// app.use('/resources', express.static(STATIC_DIR)); // STATIC_DIR)); //DIST_DIR));
app.use('/js', express.static(STATIC_DIR + '/js')); // STATIC_DIR)); //DIST_DIR));
app.use('/audio', express.static(
STATIC_DIR +
    '/audio')); // STATIC_DIR)); //DIST_DIR));
app.use('/css', express.static(STATIC_DIR + '/css')); // STATIC_DIR)); //DIST_DIR));

app.options('*', cors()); // include before other routes

app.get("/", function(req, res) {
    res.sendFile(
        path.join(STATIC_DIR, "index.html"))
    }
);

setupAppMiddlewares(app, {serverLogging: LOGGING, serverLoggingFormat: LOGGING_FORMAT});
app.listen(PORT);