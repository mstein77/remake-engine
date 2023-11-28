const syncFs = require("./syncFs.cjs")
let absPath = null

const FileCodec = {

    init: _absPath => {
        absPath = _absPath
    },
    // writes an api-encoded resource to the file given in the descriptor
    encode: (apiEncoded, descriptor) => {
        const path = absPath.resources(descriptor.file)
        if (descriptor.isJsonBased()) {
            syncFs.writeJson(path, apiEncoded, true)
            return
        }
        const content = Buffer.from(apiEncoded, 'base64')
        syncFs.writeContent(path, content, {encoding: 'binary'})
    },
    // returns the api-encoded resource
    decode: descriptor => {
        const path = absPath.resources(descriptor.file)
        if (descriptor.isJsonBased()) {
            return syncFs.readJson(path)
        }
        const buffer = syncFs.readFile(path)
        return 'data:' + descriptor.mimeType + ';base64,' + buffer.toString('base64')
    }
}

module.exports = { FileCodec }