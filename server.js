const path = require("path");
const cors = require('cors')
const express = require("express");
const fs = require('fs');
const {isValidResourceId, getRelevantResources, ResourceDependencies} = require('./src/app/helper/helper');

const DIST_DIR = path.join(__dirname, "dist");
const STATIC_DIR = path.join(__dirname, "src/public");
const PORT = 8080;
const app = express();

const getFilesFromDir = (dir) => fs.readdirSync(dir, {withFileTypes: true})
    .filter(item => !item.isDirectory())
    .map(item => item.name);


const removeEmptyResourceDirs = (type, id) => {
    if (id.indexOf('/') === -1) {
        return true;
    }
    const parts = id.split('/');
    parts.pop();
    const basePath = './resources/' + type + '/';
    try {
        while(parts.length > 0) {
            const path = basePath + parts.join('/');
            const files = getFilesFromDir(path);
            if (files.length !== 0) {
                break;
            }
            fs.rmdirSync(path);
            parts.pop();
        }
    } catch (e) {
        console.error(e);
        return false;
    }
    return true;
};

const getResourceFilePath = (type, id) => {
    let file;
    switch(type) {
        case 'json':
            file = `./resources/json/${id}.json`;
            break;

        case 'image':
            file = `./resources/image/${id}`;
            break;

        case 'audio':
            file = `./resources/audio/${id}`;
            break;
    }
    return file;
}

const deleteResource = (type, id) => {
    const file = getResourceFilePath(type, id);
    let success = false;
    try {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            success = !fs.existsSync(file);
            if (success) {
                removeEmptyResourceDirs(type, id);
            }
        } else {
            success = true;
        }
    } catch(err) {
        console.error(err)
    }
    return success;
};

const directFilePath = './resources/direct.json';
const indirectFilePath = './resources/indirect.json';

const dependencies = new ResourceDependencies(
    () => {
        if (!fs.existsSync(directFilePath)) {
            return {}
        }
        const direct = JSON.parse(
            fs.readFileSync(
                directFilePath,
                'utf8'
            )
        );
        return direct;
    },
    content => {
        fs.writeFileSync(directFilePath, JSON.stringify(content), 'utf8');
    },
    () => {
        if (!fs.existsSync(indirectFilePath)) {
            return {};
        }
        const indirect = JSON.parse(
            fs.readFileSync(
                indirectFilePath,
                'utf8'
            )
        );
        return indirect
    },
    content => {
        fs.writeFileSync(indirectFilePath, JSON.stringify(content), 'utf8');
    },
    deleteResource
);

app.use(cors());
app.use('/', express.static(STATIC_DIR)); //DIST_DIR));
app.use(express.json());

app.options('*', cors()); // include before other routes

app.post('/has', (req, res) => {
    const resources = req.body.resources ? req.body.resources : [];
    const found = [];
    const notFound = [];
    const invalid = [];
    for (let resource of resources) {
        const info = {id: resource.id, type: resource.type};
        if (!isValidResourceId(info.type, info.id)) {
            invalid.push(info);
            continue;
        }

        const file = getResourceFilePath(resource.type, resource.id);
        let success = false;
        try {
            success = fs.existsSync(file);
        } catch(err) {
            console.error(err)
        }
        if (success) {
            found.push(info);
        } else {
            notFound.push(info);
        }
    }
    res.json({found, notFound, invalid});
});

app.post('/delete', (req, res) => {
    const resources = req.body.resources ? req.body.resources : [];

    const deleted = [];
    const notDeleted = [];
    const invalid = [];

    for (let resource of resources) {
        const info = {id: resource.id, type: resource.type};
        if (!isValidResourceId(info.type, info.id)) {
            invalid.push(info);
            continue;
        }
        const success = deleteResource(resource.type, resource.id);
        if (success) {
            deleted.push(info);
        } else {
            notDeleted.push(info);
        }
    }
    res.json({deleted, notDeleted, invalid});
});

app.post('/store', (req, res) => {
    const resources = req.body.resources ? req.body.resources : [];
    const stored = [];
    const failed = [];
    const invalid = [];

    const createMissingDirsInResourceId = (type, id) => {
        const parts = id.split('/');
        if (parts <= 1) {
            return true;
        }
        parts.pop();

        const path = `./resources/${type}/` + parts.join('/');
        try {
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path, {recursive: true});
            }
        } catch (e) {
            return false;
        }
        return true;
    };

    for (let resource of resources) {
        const info = {id: resource.id, type: resource.type};
        if (!isValidResourceId(info.type, info.id)) {
            invalid.push(info);
            continue;
        }
        let success = false;
        let file;
        if (createMissingDirsInResourceId(resource.type, resource.id)) {
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
                        file = `./resources/image/${resource.id}`;
                        if (resource.data !== null) {
                            const parts = resource.data.split('base64,', 2);
                            if (parts.length === 2) {
                                fs.writeFileSync(file, parts[1], 'base64');
                                success = true;
                            }
                        }
                        break;

                    case 'audio':
                        file = `./resources/audio/${resource.id}`;
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
        }

        if (success) {
            stored.push(info);
        } else {
            failed.push(info);
        }
    }

    // store new direct and indirect entries
    if (req.body.direct && req.body.screen !== undefined) {
        dependencies.storeScreenResources(req.body.screen, req.body.direct);
    }
    if (req.body.indirect) {
        dependencies.storeResourceDependencies(req.body.indirect);
    }

    res.json({stored, failed, invalid});
});

app.post('/resources', (req, res) => {
    const found = [];
    const notFound = [];
    const invalid = [];

    const resources = req.body.resources ? req.body.resources : [];
    const relevant = dependencies.getRelevantScreenResources(req.body.screen, req.body.resolved, req.body.overwrites, req.body.remotes);
    for (let resId of relevant.found) {
        const [type, id] = resId.split(':');
        resources.push({id, type});
    }
    for (let resId of relevant.notFound) {
        const [type, id] = resId.split(':');
        notFound.push({id, type});
    }

    for (let resource of resources) {
        if (!isValidResourceId(resource.type, resource.id)) {
            invalid.push(resource);
            continue;
        }
        let data = null;
        const filePath = getResourceFilePath(resource.type, resource.id);
        if (fs.existsSync(filePath)) {
            switch (resource.type) {
                case 'image':
                    const imgContent = fs.readFileSync(filePath);
                    const imgType = path.extname(filePath);
                    const base64Image = Buffer.from(imgContent, 'binary').toString('base64');
                    data = `data:image/${imgType.split('.').pop()};base64,${base64Image}`;
                    break;

                case 'audio':
                    const content = fs.readFileSync(filePath);
                    const extensionName = path.extname(filePath);
                    const base64Audio = Buffer.from(content, 'binary').toString('base64');
                    data = `data:audio/${extensionName.split('.').pop()};base64,${base64Audio}`;
                    break;

                case 'json':
                    try {
                        data = JSON.parse(
                            fs.readFileSync(
                                filePath,
                                'utf8'
                            )
                        );
                    } catch (e) {
                        console.error(`Could not parse json resource "${resource.id}"`);
                    }
                    break;
            }
        }
        if (data !== null) {
            resource.data = data;
            found.push(resource);
        } else {
            notFound.push(resource);
        }
    }
    res.json({found, notFound, invalid});
});
/*
app.get("*", function(req, res) {
    res.sendFile(
        path.join(DIST_DIR, "index.html"))
});
*/
app.listen(process.env.PORT || PORT);