const path = require("path");
const fs = require("fs");

const syncFs = {

    readFilesRec: (dirPath, relative = '', files = []) => {
        const currPath = path.resolve(dirPath, relative)
        const items = syncFs.readdir(currPath, {withFileTypes: true})
        for (let item of items) {
            if (item.isDirectory()) {
                syncFs.readFilesRec(dirPath, relative + item.name + '/', files)
            } else {
                files.push(relative + item.name)
            }
        }
        return files
    },

    readdir: ( ...args ) => {
        return fs.readdirSync( ...args )
    },

    unlink: filePath => fs.unlinkSync(filePath),

    rmDir: ( ...args ) => fs.rmSync( ...args ),

    clearDir: dirPath => {
        if (!syncFs.dirExists(dirPath)) return
        const items = syncFs.readdir(dirPath, {withFileTypes: true})
        for (let item of items) {
            const currPath = path.resolve(dirPath, item.name)
            if (item.isDirectory()) {
                syncFs.rmDir(currPath, {recursive: true, force: true})
            } else {
                syncFs.unlink(currPath)
            }
        }

    },

    isEmptyDir: dirPath => {
        if (!syncFs.dirExists(dirPath)) return true
        const items = syncFs.readdir(dirPath, {withFileTypes: true})
        return items.length === 0
    },

    fileExists: filePath => {
        try {
            const stat = fs.statSync(filePath);
            if (!stat.isFile()) return false;
            return true
        } catch (err) {
            return false
        }
    },

    dirExists: dirPath => {
        try {
            const stat = fs.statSync(dirPath);
            if (!stat.isDirectory()) return false;
            return true
        } catch (err) {
            return false
        }
    },

    exists: checkPath => {
        return syncFs.fileExists(checkPath) || syncFs.dirExists(checkPath)
    },

    readJson: filePath => {
        if (!syncFs.fileExists(filePath)) throw Error(`File not found: ${filePath}`);
        const rawdata = fs.readFileSync(filePath);
        const json = JSON.parse(rawdata);
        return json
    },

    readFile: ( ...args ) => fs.readFileSync( ...args ),

    writeContent: (filePath, content) => {
        fs.writeFileSync(filePath, content)
    },

    writeJson: (filePath, json, space = true) => {
        const data = JSON.stringify(json, undefined, space ? 4 : undefined);
        fs.writeFileSync(filePath, data);
    }
}

module.exports = syncFs