import fs from "node:fs";
import { isValidResourceId, ResourceDependencies } from '../engine/helper/shared.js';
import { dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import path from "node:path";

const __dirname = fs.realpathSync(dirname(fileURLToPath(import.meta.url)) + '/../../');
dotenv.config({path: __dirname + '/.env'});

const DIST_DIR = path.join(__dirname, "dist");
const STATIC_DIR = path.join(__dirname, "src/public");
const RESOURCE_DIR = path.join(__dirname, 'resources');

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

const setupAppMiddlewares = app => {
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
}


export default setupAppMiddlewares;