const { d, isArray, sortPropAsc, stringList, union, toValues, toKeys, csv2values, toPairs, isVersionEqualOrHigher, without } = require('../shared/helper.cjs')
const { getReplaceMetaVars, getIconMimeType } = require('./helper.cjs')
const sizeOf = require("image-size")
const Jimp = require("jimp")
const { validateConfig, ASSET_GENERATION, buildDefaults, ASSET_TYPE} = require("./config.cjs")
const { fallbackModes, scope2assets } = require('./asset.cjs')
const { execSync, NoStackError, log, subSectionWarning} = require('../shared/console.cjs')

const vectorFormats = ['svg']
const generatorFormats = ['png', 'gif']
const relDir = 'assets/'

const getFileMatcher = mode => new RegExp('^' + mode.template.replaceAll('[d]', '([0-9]+)') + '\\.([a-z]{3})$', 'i')

const getMatchDetails = (sizeOf, fileMatcher, baseDir, file, detail) => {
    const { formats, square } = detail
    const matches = file.match(fileMatcher)
    if (matches === null) {
        return null
    }
    const ext = matches[matches.length - 1]
    if (!formats.includes(ext)) return null

    const filePath = baseDir + '/' + file
    const parsedWidth = parseInt(matches[1], 10)
    // last match is ext
    const parsedHeight = matches[3] === undefined ? parsedWidth : parseInt(matches[2], 10)

    if (square && parsedWidth !== parsedHeight) return null
    const dim = sizeOf(filePath)

    return {
        dim,
        ext,
        filePath,
        parsedWidth,
        parsedHeight
    }
}

const sortByHeightAsc = (a, b) => {
    const o1 = a[1][0]
    const o2 = b[1][0]
    if (o1 == o2) return 0

    return o1 < o2 ? -1 : 1
}

/**
 * A class used to build a deliverable of a certain type. Depending on the deliverable this could mean that for instance
 * a compilation step is required to build an executable for the target system. Such a step could require special
 * programs and might only run on certain platforms, that's why this class allows to specify such requirements besides
 * implementing the actual make and cleanup process
 */
class Deliverable {

    /**
     * Constructs a new deliverable
     */
    constructor(config = {}, distTarget, contents, fileDeps) {
        this.distTarget = distTarget
        this.contents = contents
        this.fileDeps = fileDeps
        this.config = this.getParsedConfig(config)
        this.setFlags()
    }

    /**
     * Sets the following flags on this:
     *  - hasMakeStep
     *  - isAllInOne
     *  - hasAppIcon
     *  - hasFavIcon
     */
    setFlags() {
        throw Error(`Implement me`)
    }

    getConfigKeys() {
        return {}
    }

    getParsedConfig(config) {
        const configKeys = this.getConfigKeys();
        const defaults = buildDefaults(configKeys)
        const result = {}
        for (const [ key, defaultValue ] of toPairs(defaults)) {
            const value = config[key]
            result[key] = value === undefined ? defaultValue : value
        }
        validateConfig(result, configKeys, 'deliverable config')
        return result
    }

    getAssetTypePlatforms(assetType, platforms) {
        return platforms
    }

    getAssetTypeSubTypes(type, subTypes) {
        if (type !== 'appIcon') return subTypes

        const idx = subTypes.indexOf(ASSET_TYPE.ICNS)
        if (idx === -1) return subTypes

        const allowedTypes = [ ...subTypes ]
        allowedTypes.splice(idx, 1)

        return allowedTypes
    }

    addCopyUserAssetsForScope(assets, scope, config, fileDeps) {

        const { userAssetsDirPath, userAssetFiles, sizeOf } = fileDeps
        const targetPlatforms = csv2values(config.targetPlatforms)

        const assetSubTypes = csv2values(config.assetTypes)

        const allowedSubTypes = this.getAssetTypeSubTypes(scope, assetSubTypes)
        const infos = scope2assets[scope]
        if (!infos)
            throw Error(`Invalid asset scope "${scope}" given`)

        const matchingDetails = infos.filter(detail => {
            if (!allowedSubTypes.includes(detail.type)) return false

            const allowedPlatforms = this.getAssetTypePlatforms(scope, targetPlatforms)
            for (const platform of allowedPlatforms) {
                if (!detail.platforms.some(name => name.startsWith(platform))) continue

                return true
            }
            return false
        })

        const jobs = []
        for (const detail of matchingDetails) {
            jobs.push({ detail, mode2files: new Map()})
        }
        const onlyUserFiles = config.assetGeneration === ASSET_GENERATION.NONE
        const targets = {}
        let hasFiles = false
        let ext2baseFiles = {}

        for (const { detail, mode2files } of jobs) {
            const { modes, links, scale100pixels } = detail

            const scaleDim = !scale100pixels || isArray(scale100pixels) ? scale100pixels : [scale100pixels, scale100pixels]

            for (const mode of modes) {
                const { base } = mode
                // überspringe aktuellen mode, wenn nicht relevant
                if (!onlyUserFiles && mode.only && !mode.only.includes(config.assetGeneration)) continue

                const fileMatcher = getFileMatcher(mode)
                const files = []

                const exts = []
                // kopiere alle userFiles, die nicht autogeneriert werden können, und merke alle userFiles die von Namen
                // her auf einen der aktuellen Mode-Templates passt (bzw. kopiere diese, wenn nur userFiles erlaubt)...
                for (const file of userAssetFiles) {

                    const matchDetails = getMatchDetails(sizeOf, fileMatcher, userAssetsDirPath, file, detail)
                    if (matchDetails === null) continue

                    const { ext, filePath, dim, parsedWidth, parsedHeight } = matchDetails
                    const relPath = relDir + file
                    const width = scale100pixels ? Math.round(scaleDim[0] * parsedWidth / 100) : parsedWidth
                    const height = scale100pixels ? Math.round(scaleDim[1] * parsedHeight / 100) : parsedHeight
                    if (dim.width !== width || dim.height !== height)
                        throw NoStackError(`Asset image ${filePath} must have dimension ${width}x${height} but got ${dim.width}x${dim.height}`)

                    hasFiles = true

                    if (onlyUserFiles) {
                        let target = targets[relPath]
                        if (!target) {
                            targets[relPath] = { scope, action: 'copy', from: filePath, relPath, ext, links, dim: [ width, height ] }
                        } else {
                            target.links = union(target.links, links)
                        }
                    }
                    if (!generatorFormats.includes(ext)) continue

                    files.push({ filePath, relPath, dim, ext })
                    if (!exts.includes(ext)) exts.push(ext)
                }
                if (base && files.length) {
                    for (const ext of exts) {
                        const extFiles = files.filter(file => file.ext === ext)
                        if (extFiles.length && !ext2baseFiles[ext]) ext2baseFiles[ext] = extFiles
                    }
                }
                mode2files.set(mode, files)
            }
        }
        assets.push( ...toValues(targets) )

        return { jobs, hasFiles, ext2baseFiles }
    }

    /**
     * Adds all example images of the given mode and its extensions to the base images object if its empty for the
     * extension
     *
     * @param {string} mode
     * @param {object} ext2baseFiles
     * @param {object} fileDeps
     */
    addFallbackModes(mode, ext2baseFiles, fileDeps) {
        const { sizeOf, exampleAssetsDirPath, exampleAssetFiles } = fileDeps
        const fileMatcher = getFileMatcher(mode)
        const exts = []
        for (const file of exampleAssetFiles) {
            const matchDetails = getMatchDetails(sizeOf, fileMatcher, exampleAssetsDirPath, file, {
                formats: generatorFormats, square: true
            })
            if (!matchDetails) continue

            const { ext, dim, filePath } = matchDetails
            if (!ext2baseFiles[ext]) {
                exts.push(ext)
                ext2baseFiles[ext] = []
            }
            if (exts.includes(ext)) ext2baseFiles[ext].push({
                ext, dim, filePath, relPath: relDir + file
            })
        }
    }

    /**
     * Adds an base image to every first mode of the given jobs which has no base files yet and also adds the base
     * files of the first mode to every empty follow-up mode
     *
     * @param {array} jobs
     * @param {object} ext2baseFiles
     */
    addBaseImages(jobs, ext2baseFiles) {
        // add base mode files to each empty first mode
        // add first mode files to all empty follow-up modes
        for (const [ ext, baseFiles ] of toPairs(ext2baseFiles)) {
            for (const { mode2files, detail } of jobs) {
                if (!detail.formats.includes(ext)) continue

                let firstFiles = null
                for (const files of mode2files.values()) {
                    if (firstFiles === null) {
                        firstFiles = files.length ? files : baseFiles
                    }
                    if (!files.length) files.push(...firstFiles)
                }
            }
        }
    }

    /**
     * Returns a map which maps modes to objects holding information required to generate and link all
     * mode assets. It's build using the given jobs array
     *
     * @param {array} jobs
     * @param {object} config
     *
     * @returns {Map}
     */
    getMode2filesAndLinks(jobs, config) {
        const mode2filesAndLinks = new Map()

        for (const { detail, mode2files } of jobs) {
            const { sizes, links, scale100pixels } = detail

            for (const [ mode, files ] of mode2files.entries()) {
                if (!mode2filesAndLinks.has(mode)) {
                    mode2filesAndLinks.set(mode, { ext2files: {}, size2links: {}, scale100pixels })
                }
                const { ext2files, size2links } = mode2filesAndLinks.get(mode)

                for (const { filePath, ext, dim } of files) {
                    if (!ext2files[ext]) ext2files[ext] = {}
                    ext2files[ext][filePath] = dim
                    const reqSizes = sizes[config.assetGeneration] ? sizes[config.assetGeneration] : []
                    for (const size of reqSizes) {
                        if (!size2links[size]) size2links[size] = []

                        size2links[size] = union(size2links[size], links)
                    }
                }
            }
        }
        return mode2filesAndLinks
    }

    /**
     * Adds an asset with a resize action to the given assets for each requested mode and size by using the best
     * matching image from the user or example files as base
     *
     * @param {array} assets
     * @param {string} scope
     * @param {Map} mode2filesAndLinks
     */
    addResizeAssets(assets, scope, mode2filesAndLinks) {
        for (const [ mode, filesAndLinks ] of mode2filesAndLinks.entries()) {

            const { size2links, ext2files, scale100pixels } = filesAndLinks
            const { template, padding, scale = 1 } = mode
            const sizes = toKeys(size2links).map(size => parseInt(size, 10))

            for (const [ ext, file2size ] of toPairs(ext2files)) {
                const filePairs = toPairs(file2size)
                filePairs.sort(sortByHeightAsc)

                for (let size of sizes) {
                    // try to find the best match
                    let idx = 0
                    while (idx < filePairs.length && filePairs[idx][1][1] < size) idx++
                    if (idx === filePairs.length) idx = filePairs.length - 1

                    const fileName = template.replace('[d]', size).replace('[d]', size) + '.' + ext
                    const relPath = relDir + fileName

                    const links = size2links[size]
                    let dim = [size * scale, size * scale]
                    if (scale100pixels) {
                        const scaleDim = isArray(scale100pixels) ? scale100pixels : [scale100pixels, scale100pixels]
                        const factor = size / 100
                        dim = [Math.round(scaleDim[0] * factor), Math.round(scaleDim[1] * factor)]
                    }
                    assets.push({ scope, action: 'resize', from: filePairs[idx][0], relPath, ext, dim, padding, links })
                }
            }
        }
    }

    prepareAppAssets() {
        const { config } = this.distTarget
        const { syncFs, absPath } = this.fileDeps

        const userAssetsDirPath = absPath.game('assets')
        const exampleAssetsDirPath = absPath.src('build', 'assets', 'icons')
        const userAssetFiles = syncFs.readFiles(userAssetsDirPath)
        const exampleAssetFiles =  syncFs.readFiles(exampleAssetsDirPath)

        const fileDeps = { sizeOf, userAssetsDirPath, userAssetFiles, exampleAssetsDirPath, exampleAssetFiles }

        const assetScopes = []
        if (this.hasAppIcon) assetScopes.push('appIcon')
        if (this.hasFavIcon) assetScopes.push('favIcon')

        const assets = []
        for (const scope of assetScopes) {

            // find assets which can be copied from the user assets and add the missing ones as job for the generator
            const { hasFiles, ext2baseFiles, jobs }
                = this.addCopyUserAssetsForScope(assets, scope, config, fileDeps)

            if (!hasFiles) {
                // no matching user assets found thus ext2baseFiles is empty
                // add example assets for fallback mode of current scope to ext2baseFiles
                this.addFallbackModes(fallbackModes[scope], ext2baseFiles, fileDeps)
            }
            // assign base images to all empty job modes, either the ones from the first mode of each job or the
            // base images from ext2baseFiles
            this.addBaseImages(jobs, ext2baseFiles)

            // merge all jobs to modes, files and links
            const mode2filesAndLinks = this.getMode2filesAndLinks(jobs, config)

            // generate assets with resizing and links
            this.addResizeAssets(assets, scope, mode2filesAndLinks)
        }
        this.distTarget.assets = d(assets)
    }

    async generateAssets() {
        const { absPath, queue } = this.fileDeps
        const { assets = [], publicDir, config } = this.distTarget

        queue.addClear(absPath.dist(publicDir, 'assets'), true)
        queue.process()
        const baseAssets = {}
        const bgColor = config.assetsBgColor ? config.assetsBgColor : undefined
        for (const asset  of assets) {
            const { action, from, relPath, dim, ext, padding } = asset
            const path = absPath.dist(publicDir, relPath)

            switch (action) {

                case 'copy':
                    queue.addCopy(from, path)
                    break

                case 'resize':
                    const key = ext + ' ' + dim.join('x')
                    if (!(key in baseAssets)) {
                        baseAssets[key] = await Jimp.read(from)
                    }

                    const assetsPadding = padding === null ? config.assetsPadding / 100 : padding
                    const paddingPixels = Math.floor(Math.min( ...dim ) * assetsPadding / 2)

                    const [ targetWidth, targetHeight ] = dim

                    const baseImage = baseAssets[key].clone()
                    await baseImage.contain(targetWidth - paddingPixels, targetHeight - paddingPixels, Jimp.RESIZE_BICUBIC)

                    const newImage =  new Jimp(
                        targetWidth,
                        targetHeight,
                        bgColor
                    )
                    await newImage.composite(baseImage, paddingPixels / 2, paddingPixels / 2);
                    await newImage.writeAsync(path)
                    break;
            }
        }
        queue.process()
    }

    getMeta() {
        const { config } = this.distTarget
        const { metaVars } = this.contents

        const replaceMetaVars = getReplaceMetaVars(metaVars)

        const meta = [{charset: "UTF-8"}]
        const optional = ['description', 'keywords', 'author']
        for (const name of optional) {
            const content = replaceMetaVars(config[name])
            if (content) meta.push({ name, content })
        }
        meta.push({ name: "viewport", content: "width=device-width, initial-scale=1, shrink-to-fit=no" })

        return meta
    }

    /**
     * Returns an object which maps rel-types to a relative url. For each returned rel type a link element is
     * generated in the header of the index.html of the game
     *
     * @returns {array}
     */
    getMetaLinks() {
        const metaLinks = []
        const { assets } = this.distTarget
        if (!this.hasFavIcon || !assets) return metaLinks

        for (const asset of assets) {
            const { scope, dim, relPath, ext, links } = asset

            if (scope !== 'favIcon' || !links.includes('meta')) continue

            metaLinks.push({ rel: 'icon', sizes: dim.join('x'), type: getIconMimeType(ext), href: relPath })
            metaLinks.push({ rel: 'shortcut icon', sizes: dim.join('x'), type: getIconMimeType(ext), href: relPath })
        }
        return metaLinks
    }

    getScriptTags() {
        return []
    }

    /**
     * Returns a string which holds an error if a required platform, program or its version is missing, otherwise
     * undefined is returned
     *
     * @returns {string|undefined}
     */
    getMissingRequirements() {
        const { absPath } = this.fileDeps
        const requiredPlatforms = this.getRequiredPlatforms()
        const platform = process.platform
        if (requiredPlatforms.length && !requiredPlatforms.includes(platform))
            return `Build was triggered on platform "${platform}" but requires ${stringList(requiredPlatforms)}`

        const which = platform === 'win32' ? 'where' : 'which'
        const requiredPrograms = this.getRequiredPrograms()
        const programsInstaller = this.getProgramsInstaller()
        for (const [ program, minVersion ] of toPairs(requiredPrograms)) {
            {
                let { failed } = execSync(`${which} ${program}`)
                if (failed) {
                    let install = programsInstaller[program]
                    if (install) {
                        install = install.replace('[[path]]', absPath.game())
                        subSectionWarning(`   Could not find ${program}, trying to install by executing "${install}"...`)
                        const installation = execSync(install)
                        if (installation.output) log(installation.output)
                        if (!installation.failed) {
                            const checkProgram = execSync(`${which} ${program}`)
                            failed = checkProgram.failed
                        }
                    }
                }
                if (failed)
                    return `Build requires "${program}" but could not be found`
            }
            if (minVersion === '*') continue
            {
                const { failed, output } = execSync(`${program} -version`)
                if (failed) continue

                const versionRegExp = /(?:version:|v|version)\s*([0-9]+\.[0-9]+\.[0-9]+)/i
                const match = output.match(versionRegExp)
                if (!match) continue

                const programVersion = match[1]
                if (!isVersionEqualOrHigher(programVersion, minVersion))
                    return `Build requires version ${minVersion} of ${program} but found ${programVersion}`
            }
        }
    }

    /**
     * Returns either an empty array if the deliverable can be built on all platforms or a list of required platforms
     *
     * @returns {array}
     */
    getRequiredPlatforms() {
        return []
    }

    /**
     * Returns an object mapping required programs to the required minimum version or to '*' allow every version
     *
     * @returns {object}
     */
    getRequiredPrograms() {
        return {}
    }

    getProgramsInstaller() {
        return {}
    }

    supportsAssetGeneration(value) {
        return true
    }

    /**
     * Returns either a boolean indicating whether the given resource loading is allowed or a string which should be
     * used as resource loading because the given one is not allowed
     *
     * @param {string} value
     *
     * @returns {string|boolean}
     */
    supportsResourceLoading(value) {
        return true
    }

    /**
     * Prepares the webpack build in the given distTarget for the compilation process
     */
    async prepareMake() {}

    /**
     * Compiles the prepared build files in the current distTarget
     */
    async make() {}


    async finishMake() {}

    async open() {}

    /**
     * Runs the post build processing which is executed after webpack build and compilation
     */
    processPostBuild() {}
}

module.exports = Deliverable