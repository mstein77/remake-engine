import * as fs from 'node:fs';
import {dirname} from "path";
import {fileURLToPath} from "url";
import * as dotenv from "dotenv";

const __dirname = fs.realpathSync(dirname(fileURLToPath(import.meta.url)) + '/../');
dotenv.config({path: __dirname + '/.env'});

const pairs = Object.entries;

function fileExists(path) {
    try {
        const stat = fs.statSync(path);
        if (!stat.isFile()) return false;
        return true
    } catch (err) {
        return false
    }
}

function dirExists(path) {
    try {
        const stat = fs.statSync(path);
        if (!stat.isDirectory()) return false;
        return true
    } catch (err) {
        return false
    }
}

if (dirExists(__dirname + '../../2dfireengine') && fileExists(__dirname + '../../../config.js')) {
    console.log('FOUND!');
} else {
    console.log('NOT FOUND!');
}