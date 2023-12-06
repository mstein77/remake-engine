const path = require("path");
const fs = require("fs");

const syncFs = {

    /**
     * Returns an array holding all relative paths of files in the given directory or its
     * subdirectories
     *
     * @param dirPath
     * @param [relative]
     * @param [files]
     *
     * @returns {array}
     */
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

    mkdir: ( ...args ) => {
        return fs.mkdirSync( ...args )
    },

    createPathTo: filePath => {
        const index = filePath.lastIndexOf('/')
        const dirPath = filePath.substring(0, index)
        try {
            if (syncFs.dirExists(dirPath)) return true

            syncFs.mkdir(dirPath, {recursive: true})
        } catch (e) {
            console.error(e)
            return false
        }
        return true
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

    writeContent: ( ...args ) => {
        return fs.writeFileSync( ...args )
    },

    writeJson: (filePath, json, space = true) => {
        const data = JSON.stringify(json, undefined, space ? 4 : undefined);
        fs.writeFileSync(filePath, data);
    },

    realpath: ( ...args ) => {
        return fs.realpathSync( ...args )
    }
}

module.exports = syncFs