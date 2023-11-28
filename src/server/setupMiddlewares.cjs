const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')
const morgan = require('morgan')

const { isValidResourceId, ResourceDependencies } = require('../engine/helper/shared.cjs')
const express = require("express")

const { d } = require('../shared/classes/helper.cjs')
const { RESOURCE } = require('../build/classes/config.cjs')
const resourcesController = require('./controller/resources.cjs')


const setupAppMiddlewares = (app, config = null) => {

    const RMK_GAME_DIR = process.env.RMK_GAME_DIR || '../../../../'

    const absDir = {
        root: ( ...relPath ) => path.resolve( __dirname, config.IS_DIST ? '' : RMK_GAME_DIR, ...relPath ),
        public: ( ...relPath ) => path.resolve(absDir.root('public'), ...relPath ),
        static: ( ...relPath ) => path.resolve( config.IS_DIST ? absDir.public() : absDir.resources(), ...relPath ),
        resources: ( ...relPath ) => path.resolve(absDir.root('resources'), ...relPath )
    }

    resourcesController.init(config, absDir)

    const getFilesFromDir = dir => fs.readdirSync(dir, {withFileTypes: true})
        .filter(item => !item.isDirectory())
        .map(item => item.name)

    const removeEmptyResourceDirs = (type, id) => {
        if (id.indexOf('/') === -1) {
            return true
        }
        const parts = id.split('/')
        parts.pop()
        const basePath = absDir.resources(type) + '/'
        try {
            while(parts.length > 0) {
                const path = basePath + parts.join('/')
                const files = getFilesFromDir(path)
                if (files.length !== 0) {
                    break
                }
                fs.rmdirSync(path)
                parts.pop()
            }
        } catch (e) {
            console.error(e)
            return false
        }
        return true
    };

    const getResourceFilePath = (type, id) => {
        let file

        switch(type) {
            case 'json':
                file = absDir.resources(`json/${id}.json`)
                break

            case 'image':
                file = absDir.resources(`image/${id}`)
                break

            case 'audio':
                file = absDir.resources(`audio/${id}`)
                break
        }
        return file
    }

    const deleteResource = (type, id) => {
        const file = getResourceFilePath(type, id)
        let success = false
        try {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file)
                success = !fs.existsSync(file)
                if (success) {
                    removeEmptyResourceDirs(type, id)
                }
            } else {
                success = true
            }
        } catch(err) {
            console.error(err)
        }
        return success;
    };

    const directFilePath = absDir.resources('direct.json')
    const indirectFilePath = absDir.resources('indirect.json')

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
            )
            return direct
        },
        content => {
            fs.writeFileSync(directFilePath, JSON.stringify(content), 'utf8')
        },
        () => {
            if (!fs.existsSync(indirectFilePath)) {
                return {}
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
            fs.writeFileSync(indirectFilePath, JSON.stringify(content), 'utf8')
        },
        deleteResource
    );

    if (config.serverLogging !== 'none') {
        const options = {}
        let minCode = null
        if (config.serverLogging === 'error') {
            minCode = 500
        } else if (config.serverLogging === 'warning') {
            minCode = 400
        }
        if (minCode) {
            options.skip = (req, res) => res.statusCode < minCode
        }
        app.use(morgan(config.serverLoggingFormat, options))
    }
    app.use(bodyParser.json(config.IS_DIST ? {} : { limit: config.API_MAX_JSON_SIZE }))
    if (!config.IS_DIST) {
        app.use(bodyParser.urlencoded({ extended: true, limit: config.API_MAX_JSON_SIZE }));
    }

    const staticTypes = [];
    if (config.resourceLoading !== RESOURCE.LOADING.API_ALL && config.staticTypes !== '') {
        staticTypes.push( ...config.staticTypes.split(',') )
    }
    for (const type of staticTypes) {
        app.use('/' + type, express.static(absDir.static(type)))
    }
    app.post('/has', resourcesController.has)
    app.post('/resources', resourcesController.resources)
    app.post('/store', resourcesController.store)

    app.post('/has2', (req, res) => {
        const resources = req.body.resources ? req.body.resources : []
        const found = []
        const notFound = []
        const invalid = []
        for (let resource of resources) {
            const info = {id: resource.id, type: resource.type}
            if (!isValidResourceId(info.type, info.id)) {
                invalid.push(info)
                continue
            }

            const file = getResourceFilePath(resource.type, resource.id)
            let success = false
            try {
                success = fs.existsSync(file)
            } catch(err) {
                console.error(err)
            }
            if (success) {
                found.push(info)
            } else {
                notFound.push(info)
            }
        }
        res.json({found, notFound, invalid})
    });

    app.post('/resources2', (req, res) => {
        const found = []
        const notFound = []
        const invalid = []

        const resources = req.body.resources ? req.body.resources : []
        const relevant = dependencies.getRelevantScreenResources(req.body.screen, req.body.resolved, req.body.overwrites, req.body.remotes)
        for (let resId of relevant.found) {
            const [type, id] = resId.split(':')
            resources.push({id, type})
        }
        for (let resId of relevant.notFound) {
            const [type, id] = resId.split(':')
            notFound.push({id, type})
        }

        for (let resource of resources) {
            if (!isValidResourceId(resource.type, resource.id)) {
                invalid.push(resource)
                continue
            }
            let data = null
            const filePath = getResourceFilePath(resource.type, resource.id)
            if (fs.existsSync(filePath)) {
                switch (resource.type) {
                    case 'image':
                        const imgContent = fs.readFileSync(filePath)
                        const imgType = path.extname(filePath)
                        const base64Image = Buffer.from(imgContent, 'binary').toString('base64')
                        data = `data:image/${imgType.split('.').pop()};base64,${base64Image}`
                        break

                    case 'audio':
                        const content = fs.readFileSync(filePath)
                        const extensionName = path.extname(filePath)
                        const base64Audio = Buffer.from(content, 'binary').toString('base64')
                        data = `data:audio/${extensionName.split('.').pop()};base64,${base64Audio}`
                        break

                    case 'json':
                        try {
                            data = JSON.parse(
                                fs.readFileSync(
                                    filePath,
                                    'utf8'
                                )
                            );
                        } catch (e) {
                            console.error(`Could not parse json resource "${resource.id}"`)
                        }
                        break;
                }
            }
            if (data !== null) {
                resource.data = data
                found.push(resource)
            } else {
                notFound.push(resource)
            }
        }
        res.json({ found, notFound, invalid })
    })

    if (config.IS_DIST) return

    app.post('/delete', (req, res) => {
        const resources = req.body.resources ? req.body.resources : []

        const deleted = []
        const notDeleted = []
        const invalid = []

        for (let resource of resources) {
            const info = {id: resource.id, type: resource.type}
            if (!isValidResourceId(info.type, info.id)) {
                invalid.push(info)
                continue
            }
            const success = deleteResource(resource.type, resource.id)
            if (success) {
                deleted.push(info)
            } else {
                notDeleted.push(info)
            }
        }
        res.json({deleted, notDeleted, invalid})
    });

    app.post('/store2', (req, res) => {
        const resources = req.body.resources ? req.body.resources : []
        const stored = []
        const failed = []
        const invalid = []

        const createMissingDirsInResourceId = (type, id) => {
            const parts = id.split('/')
            if (parts <= 1) {
                return true
            }
            parts.pop()

            const path = absDir.resources(`${type}/` + parts.join('/'))
            try {
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path, {recursive: true})
                }
            } catch (e) {
                return false
            }
            return true
        }

        const isScreenResource = (req.body.direct && req.body.screen !== undefined)
        const oldResources = []
        if (isScreenResource && req.body.direct.json) {
            for (let id of req.body.direct.json) {
                const deps = dependencies.getResourceWithDependencies('json:' + id)
                for (let id of deps) {
                    if (!oldResources.includes(id)) {
                        oldResources.push(id)
                    }
                }
            }
        }
        const newResources = []

        for (let resource of resources) {
            const info = {id: resource.id, type: resource.type}
            if (!isValidResourceId(info.type, info.id)) {
                invalid.push(info)
                continue
            }
            let success = false
            let file
            if (createMissingDirsInResourceId(resource.type, resource.id)) {
                try {
                    switch(resource.type) {
                        case 'json':
                            file = absDir.resources(`json/${resource.id}.json`)
                            if (resource.data !== null) {
                                const content = JSON.stringify(resource.data)
                                fs.writeFileSync(file, content)
                                success = true
                            }
                            break

                        case 'image':
                            file = absDir.resources(`image/${resource.id}`)
                            if (resource.data !== null) {
                                const parts = resource.data.split('base64,', 2)
                                if (parts.length === 2) {
                                    fs.writeFileSync(file, parts[1], 'base64')
                                    success = true
                                }
                            }
                            break

                        case 'audio':
                            file = absDir.resources(`audio/${resource.id}`)
                            if (resource.data !== null) {
                                const parts = resource.data.split('base64,', 2)
                                if (parts.length === 2) {
                                    fs.writeFileSync(file, parts[1], 'base64')
                                    success = true
                                }
                            }
                            break
                    }
                } catch (e) {
                    console.error(`Failed to store ${resource.type} with id "${resource.id}"`)
                }
            }
            if (success) {
                stored.push(info);
                newResources.push(info.type + ':' + info.id)
            } else {
                failed.push(info)
            }
        }

        // store new direct and indirect entries
        if (isScreenResource) {
            dependencies.storeScreenResources(req.body.screen, req.body.direct)
        }
        if (req.body.indirect) {
            dependencies.storeResourceDependencies(req.body.indirect)
        }

        // delete obsolete resources
        for (let resource of oldResources) {
            const deleteResources = []
            if (!newResources.includes(resource)) {
                deleteResources.push(resource)
            }
            if (deleteResources.length) {
                for(let resource of deleteResources) {
                    const [type, id] = resource.split(':')
                    dependencies.safeDeleteScreenResource(type, id)
                }
            }
        }

        res.json({stored, failed, invalid})
    });

    app.post('/setExamples', (req, res) => {
        let success = false
        if(!config.IS_DIST && req.body.code) {
            fs.writeFileSync('./src/app/generated/LayoutExamples.js', req.body.code, 'utf8')
        }
        res.json({'done': success})
    });
}

module.exports = setupAppMiddlewares;