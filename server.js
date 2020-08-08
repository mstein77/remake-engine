var path = require("path");
var cors = require('cors')
var express = require("express");
const fs = require('fs');

var DIST_DIR = path.join(__dirname, "dist");
var STATIC_DIR = path.join(__dirname, "src/public");
console.log(DIST_DIR);
var PORT = 8080;
var app = express();

app.use(cors());
app.use('/', express.static(STATIC_DIR)); //DIST_DIR));
app.use(express.json());

app.options('*', cors()); // include before other routes

app.post('/store', (req, res) => {
    const resources = req.body.resources ? req.body.resources : [];

    const stored = [];
    const failed = [];
    for (let resource of resources) {
        const info = {id: resource.id, type: resource.type};
        let success = false;
        let file;
        try {
            switch(resource.type) {
                case 'json':
                    file = `./resources/json/${resource.id}.json`;
                    if (resource.data !== null) {
                        const content = JSON.stringify(resource.data);
                        fs.writeFileSync(file, content);
                        success = true;
                    }
                    break;

                case 'image':
                    file = `./resources/image/${resource.id}.png`;
                    if (resource.data !== null) {
                        const parts = resource.data.split('base64,', 2);
                        if (parts.length === 2) {
                            fs.writeFileSync(file, parts[1], 'base64');
                            success = true;
                        }
                    }
                    break;

                case 'audio':
                    file = `./resources/audio/${resource.id}.mp3`;
                    if (resource.data !== null) {
                        const parts = resource.data.split('base64,', 2);
                        if (parts.length === 2) {
                            fs.writeFileSync(file, parts[1], 'base64');
                            success = true;
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error(`Failed to store ${resource.type} with id "${resource.id}"`);
        }
        if (success) {
            stored.push(info);
        } else {
            failed.push(info);
        }
    }
    res.json({stored, failed});
});

app.post('/resources', (req, res) => {
    const resources = req.body.resources ? req.body.resources : [];

    const images = fs.readdirSync('./resources/image', {withFileTypes: true})
        .filter(item => !item.isDirectory())
        .map(item => item.name);
    const jsons = fs.readdirSync('./resources/json', {withFileTypes: true})
        .filter(item => !item.isDirectory())
        .map(item => item.name);
    const audios = fs.readdirSync('./resources/audio', {withFileTypes: true})
        .filter(item => !item.isDirectory())
        .map(item => item.name);

    const found = [];
    const notFound = [];
    for (let resource of resources) {
        let data = null;
        switch (resource.type) {
            case 'image':
                if (images.indexOf(resource.id + '.png') !== -1) {
                    const filePath = `./resources/image/${resource.id}.png`;
                    const content = fs.readFileSync(filePath);
                    const extensionName = path.extname(filePath);
                    const base64Image = new Buffer(content, 'binary').toString('base64');
                    data = `data:image/${extensionName.split('.').pop()};base64,${base64Image}`;
                }
                break;

            case 'audio':
                if (audios.indexOf(resource.id + '.wav') !== -1) {
                    const filePath = `./resources/audio/${resource.id}.wav`;
                    const content = fs.readFileSync(filePath);
                    const extensionName = path.extname(filePath);
                    const base64Audio = new Buffer(content, 'binary').toString('base64');
                    data = `data:audio/${extensionName.split('.').pop()};base64,${base64Audio}`;
                }
                break;

            case 'json':
                if (jsons.indexOf(resource.id + '.json') !== -1) {
                    try {
                        data = JSON.parse(
                            fs.readFileSync(
                                './resources/json/' + resource.id + '.json',
                                'utf8'
                            )
                        );
                    } catch (e) {
                        console.error(`Could not parse json resource "${resource.id}"`);
                    }
                }
                break;
        }
        if (data !== null) {
            resource.data = data;
            found.push(resource);
        } else {
            notFound.push(resource);
        }
    }
    res.json({found, notFound});
});
/*
app.get("*", function(req, res) {
    res.sendFile(
        path.join(DIST_DIR, "index.html"))
});
*/
app.listen(process.env.PORT || PORT);