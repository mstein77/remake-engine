const { d, isArray, sortPropAsc, stringList, union, toValues, toKeys, csv2values, toPairs, isVersionEqualOrHigher, without } = require('../shared/helper.cjs')
const { exec, getReplaceMetaVars, getIconMimeType } = require('./helper.cjs')
const sizeOf = require("image-size")
const Jimp = require("jimp")
const { validateConfig, ASSET_GENERATION, PLATFORMS, buildDefaults } = require("./config.cjs")
const scope2assets = require('./asset.cjs')
const { NoStackError, log, subSectionWarning} = require('../shared/console.cjs')

const generatorFormats = ['png', 'gif']

/**
 * A class used to build a deliverable of a certain type. Depending on the deliverable this could mean that for instance
 * a compilation step is required to build an executable for the target system. Such a step could require special
 * programs and might only run on certain platforms, that's why this class allows to specify such requirements besides
 * implementing the actual compile and cleanup process
 */
class Deliverable {

    /**
     * Constructs a new deliverable
     */
    constructor(config = {}) {
        this.config = this.getParsedConfig(config)
        this.supports = this.getSupport()
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

    /**
     * Returns an object mapping features to a value indicating whether it is supported or not
     *
     * @returns {object}
     */
    getSupport() {
        return {
            hasCompiler: false,
            isAllInOne: true,
            appIcon: false,
            favIcon: true
        }
    }

    /**
     * Returns whether this deliverable requires a webpack build which is only single html file with all resources,
     * styles and scripts inside or not
     *
     * @returns {boolean}
     */
    get isAllInOne() {
        return this.supports.isAllInOne
    }

    /**
     * Returns whether this deliverable requires a compilation or not
     *
     * @returns {boolean|*}
     */
    get hasCompiler() {
        return this.supports.hasCompiler
    }

    get hasAppIcon() {
        return this.supports.appIcon
    }

    get hasFavIcon() {
        return this.supports.favIcon
    }

    prepareAppAssets(distTarget, configs, fileDeps) {
        const { config } = distTarget
        const { syncFs, absPath } = fileDeps

        const userAssetsDirPath = absPath.game('assets')
        const exampleAssetsDirPath = absPath.src('build', 'assets', 'icons')

        const targetPlatforms = csv2values(config.targetPlatforms)
        const userAssetFiles = syncFs.readFiles(userAssetsDirPath)
        const exampleAssetFiles = syncFs.readFiles(exampleAssetsDirPath)

        const assetScopes = []
        if (this.hasAppIcon) assetScopes.push('appIcon')
        if (this.hasFavIcon) assetScopes.push('favIcon')

        const relDir = 'assets/'
        const assets = []
        const assetSubTypes = csv2values(config.assetTypes)

        for (const [ scope, infos ] of toPairs(scope2assets)) {
            if (!assetScopes.includes(scope)) continue

            // get relevant type details
            const matchingDetails = infos.filter(detail => {
                if (!assetSubTypes.includes(detail.type)) return false
                for (const targetPlatform of targetPlatforms) {
                    if (!detail.platforms.some(name => name.startsWith(targetPlatform))) continue
                    return true
                }
                return false
            })
            const jobs = []
            for (const detail of matchingDetails) {
                jobs.push({ detail, mode2files: new Map()})
            }

            const onlyUserFiles = config.assetGeneration === ASSET_GENERATION.NONE
            let hasFiles = false
            let ext2baseFiles = {}
            const targets = {}

            const addMatchingFiles = (baseDir, assetFiles) => {
                for (const { detail, mode2files } of jobs) {
                    const { modes, links, formats, square, scale100pixels } = detail

                    const scaleDim = !scale100pixels || !isArray(scale100pixels) ? scale100pixels : [scale100pixels, scale100pixels]

                    let no = -1
                    for (const mode of modes) {
                        no++
                        const { template, base } = mode

                        const fileMatcher =
                            new RegExp('^' + template.replaceAll('[d]', '([0-9]+)') + '\\.([a-z]{3})$', 'i')

                        const files = []
                        for (const file of assetFiles) {

                            const matches = file.match(fileMatcher)
                            if (matches === null) continue

                            const ext = matches[matches.length - 1]
                            if (!formats.includes(ext)) continue

                            const filePath = baseDir + '/' + file
                            const relPath = relDir + file

                            const parsedWidth = parseInt(matches[1], 10)
                            const parsedHeight = matches.length === 3 ? parsedWidth : parseInt(matches[2], 10)

                            if (square && parsedWidth !== parsedHeight) continue

                            const dim = sizeOf(filePath)
                            const width = scale100pixels ? Math.round(scaleDim[0] * width / 100) : parsedWidth
                            const height = scale100pixels ? Math.round(scaleDim[1] * height / 100) : parsedHeight
                            if (dim.width !== width || dim.height !== height)
                                throw NoStackError(`Asset image ${filePath} must have dimension ${width}x${height} but got ${dim.width}x${dim.height}`)

                            hasFiles = true

                            if (onlyUserFiles) {
                                let target = targets[relPath]
                                if (!target) {
                                    targets[relPath] = { scope, action: 'copy', from: filePath, relPath, ext, links, dim: [width, height] }
                                } else {
                                    target.links = union(target.links, links)
                                }
                            }
                            if (!generatorFormats.includes(ext)) continue

                            files.push({ filePath, relPath, dim, ext })

                            if (base && !ext2baseFiles[ext]) ext2baseFiles[ext] = files.filter(file => file.ext === ext)
                        }
                        mode2files.set(mode, files)
                    }
                }
                assets.push( ...toValues(targets) )
            }

            // now find matching files for each detail
            addMatchingFiles(userAssetsDirPath, userAssetFiles)
            if (!hasFiles) addMatchingFiles(exampleAssetsDirPath, exampleAssetFiles)

            // add base mode files to each empty first mode
            // add first mode files to all empty follow-up modes
            for (const baseFiles of toValues(ext2baseFiles)) {
                for (const { mode2files } of jobs) {
                    let firstFiles = null
                    for (const files of mode2files.values()) {
                        if (firstFiles === null) {
                            firstFiles = files.length ? files : baseFiles
                        }
                        if (!files.length) files.push( ...firstFiles )
                    }
                }
            }

            // now lets merge the same modes and map each size to links
            const mode2jobs = new Map()
            for (const { detail, mode2files } of jobs) {
                const { sizes, links, scale100pixels } = detail

                for (const [ mode, files ] of mode2files.entries()) {
                    if (!mode2jobs.has(mode)) {
                        mode2jobs.set(mode, { ext2files: {}, size2links: {}, scale100pixels })
                    }
                    const { ext2files, size2links } = mode2jobs.get(mode)

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

            for (const [ mode, resize ] of mode2jobs.entries()) {

                const { size2links, ext2files, scale100pixels } = resize
                const { template, padding } = mode

                const allSizes = toKeys(size2links).map(size => parseInt(size, 10))
                for (const [ ext, file2size ] of toPairs(ext2files)) {
                    const filePairs = toPairs(file2size)
                    filePairs.sort(sortPropAsc(1))

                    const sizes = without(allSizes, toValues(file2size))

                    for (let size of sizes) {
                        let idx = 0
                        while (idx < filePairs.length && filePairs[idx][1] <= size) idx++
                        if (idx === filePairs.length) idx = filePairs.length - 1

                        const fileName = template.replace('[d]', size).replace('[d]', size) + '.' + ext
                        const relPath = relDir + fileName
                        if (targets[relPath]) continue

                        const links = size2links[size]
                        let dim = [size, size]
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
        distTarget.assets = assets
    }

    async generateAssets(distTarget, configs, fileDeps) {
        const { absPath, queue } = fileDeps
        const { assets = [], publicDir, config } = distTarget

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

    getMeta(distTarget, configs, fileDeps) {
        const { metaVars, config } = configs

        const replaceMetaVars = getReplaceMetaVars(metaVars)

        const meta = [{charset: "UTF-8"}]
        const optional = ['description', 'keywords', 'author']
        for (const name of optional) {
            const content = replaceMetaVars(config[name])
            if (content) meta.push({ name, content })
        }
        meta.push({name: "viewport", content: "width=device-width, initial-scale=1, shrink-to-fit=no"})

        return meta
    }

    /**
     * Returns an object which maps rel-types to a relative url. For each returned rel type a link element is
     * generated in the header of the index.html of the game
     *
     * @returns {array}
     */
    getMetaLinks(distTarget, configs, fileDeps) {
        const metaLinks = []
        const { assets } = distTarget
        if (!this.hasFavIcon || !assets) return links

        for (const asset of assets) {
            const { scope, dim, relPath, ext, links } = asset

            if (scope !== 'favIcon' || !links.includes('meta')) continue

            metaLinks.push({ rel: 'icon', sizes: dim.join('x'), type: getIconMimeType(ext), href: relPath })
            metaLinks.push({ rel: 'shortcut icon', sizes: dim.join('x'), type: getIconMimeType(ext), href: relPath })
        }
        return metaLinks
    }

    getScriptTags(distTarget, configs, fileDeps) {
        return []
    }

    /**
     * Returns a string which holds an error if a required platform, program or its version is missing, otherwise
     * undefined is returned
     *
     * @returns {string|undefined}
     */
    getMissingRequirements(fileDeps) {
        const { absPath } = fileDeps
        const requiredPlatforms = this.getRequiredPlatforms()
        const platform = process.platform
        if (requiredPlatforms.length && !requiredPlatforms.includes(platform))
            return `Build was triggered on platform "${platform}" but requires ${stringList(requiredPlatforms)}`

        const which = platform === 'win32' ? 'where' : 'which'
        const requiredPrograms = this.getRequiredPrograms()
        const programsInstaller = this.getProgramsInstaller()
        for (const [ program, minVersion ] of toPairs(requiredPrograms)) {
            {
                let { failed } = exec(`${which} ${program}`)
                if (failed) {
                    let install = programsInstaller[program]
                    if (install) {
                        install = install.replace('[[path]]', absPath.game())
                        subSectionWarning(`   Could not find ${program}, trying to install by executing "${install}"...`)
                        const installation = exec(install)
                        if (installation.output) log(installation.output)
                        if (!installation.failed) {
                            const checkProgram = exec(`${which} ${program}`)
                            failed = checkProgram.failed
                        }
                    }
                }
                if (failed)
                    return `Build requires "${program}" but could not be found`
            }
            if (minVersion === '*') continue
            {
                const { failed, output } = exec(`${program} -version`)
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
     *
     * @param {object} distTarget
     * @param {object} configs
     * @param {object} fileDeps
     */
    async prepareCompile(distTarget, configs, fileDeps) {}

    /**
     * Compiles the prepared build files in the given distTarget
     *
     * @param {object} distTarget
     * @param {object} configs
     * @param {object} fileDeps
     */
    async compile(distTarget, configs, fileDeps) {}

    /**
     * Runs the post build processing which is executed after webpack build and compilation
     *
     * @param {object} distTarget
     * @param {object} configs
     * @param {object} fileDeps
     */
    processPostBuild(distTarget, configs, fileDeps) {}
}

module.exports = Deliverable