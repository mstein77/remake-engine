import * as path from 'node:path';
import * as fs from  'node:fs';
import express from 'express';
import cors from 'cors';
import { isValidResourceId, ResourceDependencies } from '../engine/helper/helper.js';
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __dirname = fs.realpathSync(dirname(fileURLToPath(import.meta.url)) + '/../../');
dotenv.config({path: __dirname + '/.env'});

const DIST_DIR = path.join(__dirname, "dist");
const STATIC_DIR = path.join(__dirname, "src/public");
const RESOURCE_DIR = path.join(__dirname, 'resources');

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
    const basePath = DIST_DIR + '/' + type + '/';
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
            file = RESOURCE_DIR + `/json/${id}.json`;
            break;

        case 'image':
            file = RESOURCE_DIR + `/image/${id}`;
            break;

        case 'audio':
            file = RESOURCE_DIR + `/audio/${id}`;
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

const directFilePath = RESOURCE_DIR + '/direct.json';
const indirectFilePath = RESOURCE_DIR + '/indirect.json';

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
// app.use('/resources', express.static(STATIC_DIR)); // STATIC_DIR)); //DIST_DIR));
app.use('/js', express.static(DIST_DIR + '/js')); // STATIC_DIR)); //DIST_DIR));
app.use('/audio', express.static(STATIC_DIR + '/audio')); // STATIC_DIR)); //DIST_DIR));
app.use('/css', express.static(STATIC_DIR + '/css')); // STATIC_DIR)); //DIST_DIR));

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

        const path = RESOURCE_DIR + `/${type}/` + parts.join('/');
        try {
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path, {recursive: true});
            }
        } catch (e) {
            return false;
        }
        return true;
    };

    const isScreenResource = (req.body.direct && req.body.screen !== undefined);
    const oldResources = [];
    if (isScreenResource && req.body.direct.json) {
        for (let id of req.body.direct.json) {
            const deps = dependencies.getResourceWithDependencies('json:' + id);
            for (let id of deps) {
                if (!oldResources.includes(id)) {
                    oldResources.push(id);
                }
            }
        }
    }
    const newResources = [];

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
                        file = RESOURCE_DIR + `/json/${resource.id}.json`;
                        if (resource.data !== null) {
                            const content = JSON.stringify(resource.data);
                            fs.writeFileSync(file, content);
                            success = true;
                        }
                        break;

                    case 'image':
                        file = RESOURCE_DIR + `/image/${resource.id}`;
                        if (resource.data !== null) {
                            const parts = resource.data.split('base64,', 2);
                            if (parts.length === 2) {
                                fs.writeFileSync(file, parts[1], 'base64');
                                success = true;
                            }
                        }
                        break;

                    case 'audio':
                        file = RESOURCE_DIR + `/audio/${resource.id}`;
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
            newResources.push(info.type + ':' + info.id);
        } else {
            failed.push(info);
        }
    }

    // store new direct and indirect entries
    if (isScreenResource) {
        dependencies.storeScreenResources(req.body.screen, req.body.direct);
    }
    if (req.body.indirect) {
        dependencies.storeResourceDependencies(req.body.indirect);
    }

    // delete obsolete resources
    for (let resource of oldResources) {
        const deleteResources = [];
        if (!newResources.includes(resource)) {
            deleteResources.push(resource);
        }
        if (deleteResources.length) {
            for(let resource of deleteResources) {
                const [type, id] = resource.split(':');
                dependencies.safeDeleteScreenResource(type, id);
            }
        }
    }

    res.json({stored, failed, invalid});
});

app.post('/setExamples', (req, res) => {
    let success = false;
    if(req.body.code) {
        fs.writeFileSync('./src/app/generated/LayoutExamples.js', req.body.code, 'utf8');
    }
    res.json({'done': success});
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

app.get("/", function(req, res) {
    res.sendFile(
        path.join(DIST_DIR, "index.html"))
});

app.listen(process.env.PORT || PORT);
