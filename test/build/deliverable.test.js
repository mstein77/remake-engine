import WebApp from "../../src/build/deliverables/web-app.cjs"
import Pwa from "../../src/build/deliverables/pwa.cjs"
import MacApp from "../../src/build/deliverables/mac-app.cjs"
import { DistTarget } from "../../src/build/target.cjs"
import { toKeys, d, isArray } from "../../src/shared/helper.cjs"
import { ASSET_GENERATION, ASSET_TYPE, PLATFORMS } from "../../src/build/config.cjs";
import { fallbackModes } from "../../src/build/asset.cjs";
import Deliverable from "../../src/build/deliverable.cjs"

test('addCopyUserAssetsForScope', () => {

    const w = new WebApp({}, new DistTarget(), {}, {})
    const p = new Pwa({}, new DistTarget(), {}, {})

    expect(() => {
        w.addCopyUserAssetsForScope([], 'foo', {assetTypes: ASSET_TYPE.ICON, targetPlatforms: PLATFORMS.WINDOWS}, {userAssetsDirPath: '', userAssetFiles: [], sizeOf: null })
    }).toThrow('scope')

    const userAssetsDirPath = 'foo'
    const getParams = (assets, scope, files = {}, overwrites = {}) => {
        const sizeOf = (key => {
            const fileKey = key.substring(userAssetsDirPath.length + 1)
            let file = files[fileKey]
            if (!file) throw Error(`File ${fileKey} not found!`)

            if (!isArray(file)) {
                return { width: file, height: file }
            }
            if (file.length === 1) file = [file[0], file[0]]
            const [ width, height ] = file
            return { width, height }
        })
        const userAssetFiles = toKeys(files)
        return [
            assets,
            scope,
            {
                assetGeneration: ASSET_GENERATION.ALL,
                assetTypes: ASSET_TYPE.ICON,
                targetPlatforms: PLATFORMS.WINDOWS,
                ...overwrites
            },
            {
                sizeOf,
                userAssetsDirPath,
                userAssetFiles
            }
        ]
    }

    // ---------- only user files ------------
    const noGeneration = {assetGeneration: ASSET_GENERATION.NONE}

    // invalid square dimension
    expect(() => w.addCopyUserAssetsForScope(
        ...getParams([],'favIcon',{'favicon-100.png': 90}, noGeneration)
    )).toThrow('dimension')
    expect(() => w.addCopyUserAssetsForScope(
        ...getParams([], 'favIcon',{'favicon-100.png': [100, 90]}, noGeneration)
    )).toThrow('dimension')
    expect(() => w.addCopyUserAssetsForScope(
        ...getParams([],'favIcon',{'favicon-100.png': [90, 100]}, noGeneration)
    )).toThrow('dimension')

    {
        const assets = []
        // no auto-generation and no matching subtype
        const { hasFiles, jobs, ext2baseFiles } = w.addCopyUserAssetsForScope(
            ...getParams(assets, 'favIcon',{
                'favicon-100.png': 100
            }, { assetTypes: ASSET_TYPE.STORE, ...noGeneration })
        )
        // we have found a file and don't need a default
        expect(hasFiles).toBeFalse()
        // we should have a copy for the user file
        expect(assets.length).toBe(0)
        // the matching mode should not have to generate files
        expect(jobs.length).toBe(0)
        // no default icon for png extension
        expect(ext2baseFiles).toBeEmptyObject()
    }

    {
        const assets = []
        // no auto-generation and no matching platform
        const { hasFiles, jobs, ext2baseFiles } = w.addCopyUserAssetsForScope(
            ...getParams(assets, 'favIcon',{
                'favicon-100.png': 100
            }, { targetPlatforms: PLATFORMS.LINUX, ...noGeneration })
        )
        // we have found a file and don't need a default
        expect(hasFiles).toBeFalse()
        // we should have a copy for the user file
        expect(assets.length).toBe(0)
        // the matching mode should not have to generate files
        expect(jobs.length).toBe(0)
        // no default icon for png extension
        expect(ext2baseFiles).toBeEmptyObject()
    }

    {
        const assets = []
        // no auto-generation and no matching user file
        const { hasFiles, jobs, ext2baseFiles } = w.addCopyUserAssetsForScope(
            ...getParams(assets, 'favIcon',{
                'icon-100.png': 100,
                'favicon-100.gif': 100
            }, noGeneration)
        )
        // we have found a file and don't need a default
        expect(hasFiles).toBeFalse()
        // we should have a copy for the user file
        expect(assets.length).toBe(0)
        // the matching mode should not have to generate files
        expect(jobs.length).toBe(1)
        expect(jobs[0].mode2files.values()).toBeEmptyObject()
        // no default icon for png extension
        expect(ext2baseFiles).toBeEmptyObject()
    }

    {
        const assets = []
        // no auto-generation but one user file
        const { hasFiles, jobs, ext2baseFiles } = w.addCopyUserAssetsForScope(
            ...getParams(assets, 'appIcon',{
                'icon-100.jpg': 100
            }, {assetGeneration: ASSET_GENERATION.NONE, targetPlatforms: PLATFORMS.ANDROID})
        )
        expect(hasFiles).toBeTrue()

        expect(assets.length).toBe(1)
        expect(assets[0].action).toEqual("copy")
        expect(assets[0].from).toEqual('foo/icon-100.jpg')
        expect(assets[0].relPath).toEqual('assets/icon-100.jpg')
        expect(jobs.length).toBe(1)
        expect(jobs[0].mode2files.values()).toBeEmptyObject()
        // no default icon for png extension
        expect(ext2baseFiles).toBeEmptyObject()
    }

    {
        const assets = []
        // no auto-generation but one user file
        const { hasFiles, jobs, ext2baseFiles } = w.addCopyUserAssetsForScope(
            ...getParams(assets, 'appIcon',{
                'icon-100.jpg': 100
            }, {assetGeneration: ASSET_GENERATION.NONE, targetPlatforms: PLATFORMS.ANDROID})
        )
        expect(hasFiles).toBeTrue()

        expect(assets.length).toBe(1)
        expect(assets[0].action).toEqual("copy")
        expect(assets[0].from).toEqual('foo/icon-100.jpg')
        expect(assets[0].relPath).toEqual('assets/icon-100.jpg')
        expect(jobs.length).toBe(1)
        expect(jobs[0].mode2files.values()).toBeEmptyObject()
        // no default icon for png extension
        expect(ext2baseFiles).toBeEmptyObject()
    }

    // TODO .ico can have multiple icon sizes
    {
        const assets = []
        // no auto-generation but one user file
        const { hasFiles, jobs, ext2baseFiles } = w.addCopyUserAssetsForScope(
            ...getParams(assets, 'favIcon',{
                'favicon-100.png': 100
            }, noGeneration)
        )
        // we have found a file and don't need a default
        expect(hasFiles).toBeTrue()
        // we should have a copy for the user file
        expect(assets.length).toBe(1)
        expect(assets[0].action).toEqual("copy")
        expect(assets[0].from).toEqual('foo/favicon-100.png')
        expect(assets[0].relPath).toEqual('assets/favicon-100.png')
        // the matching mode should not have to generate files
        expect(jobs.length).toBe(1)
        expect(jobs[0].mode2files.values()).toBeEmptyObject()
        // no default icon for png extension
        expect(ext2baseFiles).toBeEmptyObject()
    }

    // -------------------- PWA ---------

    expect(() => p.addCopyUserAssetsForScope(
        ...getParams([], 'appIcon', {'Square150x150Logo.scale-100.png': 90}, noGeneration)
    )).toThrow('dimension')
    expect(() => p.addCopyUserAssetsForScope(
        ...getParams([],'appIcon', {'SplashScreen.scale-100.png': [600, 300]}, { assetTypes: ASSET_TYPE.SPLASH, ...noGeneration })
    )).toThrow('dimension')
    expect(() => p.addCopyUserAssetsForScope(
        ...getParams([], 'appIcon', {'SplashScreen.scale-100.png': [600, 320]}, { assetTypes: ASSET_TYPE.SPLASH, ...noGeneration })
    )).toThrow('dimension')
    expect(() => p.addCopyUserAssetsForScope(
        ...getParams([], 'appIcon', {'SplashScreen.scale-100.png': [620, 300]}, { assetTypes: ASSET_TYPE.SPLASH, ...noGeneration })
    )).not.toThrow('dimension')

    // minimal generation
    const minGeneration = {assetGeneration: ASSET_GENERATION.MINIMAL}

    {
        const assets = []
        // no auto-generation but one user file
        const { hasFiles, jobs, ext2baseFiles } = w.addCopyUserAssetsForScope(

            ...getParams(assets, 'favIcon', {
                'favicon-100.png': 100
            }, minGeneration)
        )
        // we have found a file and don't need a default
        expect(hasFiles).toBeTrue()
        // no assets yet because we need resizing
        expect(assets.length).toBe(0)

        // the matching mode should not have to generate files
        expect(jobs.length).toBe(1)
        expect(jobs[0].mode2files.values()).not.toBeEmpty()
        const mode = [ ...jobs[0].mode2files.keys() ][0]
        expect(mode.template).toEqual('favicon-[d]')

        const obj = [ ...jobs[0].mode2files.values() ][0][0]
        expect(obj).toEqual({
            filePath: 'foo/favicon-100.png',
            relPath: 'assets/favicon-100.png', // TODO check why we need this
            dim: {width: 100, height: 100},
            ext: 'png'
        })

        // no default icon for favIcon
        expect(ext2baseFiles).toBeEmptyObject()
    }

    {
        // no auto-generation but one user file
        const assets = []
        const { hasFiles, jobs, ext2baseFiles } = p.addCopyUserAssetsForScope(
            ...getParams(assets, 'appIcon',{
                'icon-100.png': 100
            }, {
                targetPlatforms: PLATFORMS.ANDROID + ',' + PLATFORMS.MACOS,
                assetGeneration: ASSET_GENERATION.NONE,
            })
        )
        // we have found a file and don't need a default
        expect(hasFiles).toBeTrue()
        // no assets yet because we need resizing
        expect(assets.length).toBe(1)
        expect(assets[0].links).toIncludeAllMembers(['pwa-manifest', 'android-manifest'])

        // the matching mode should not have to generate files
        expect(jobs.length).toBe(2)
        expect(jobs[0].mode2files.values()).not.toBeEmpty()

        const templates = []
        for (const { mode2files } of jobs) {
            templates.push(...[...mode2files.keys()].map(mode => mode.template))
        }
        expect(templates.includes('icon-[d]')).toBeTrue()

        const files = []
        for (const { detail, mode2files } of jobs) {
            for (const modeFiles of mode2files.values()) {
                if (!modeFiles.length) continue
                files.push(...modeFiles.map(item => [item, detail]))
            }
        }
    }

    {
        // no auto-generation but one user file
        const assets = []
        const { hasFiles, jobs, ext2baseFiles } = p.addCopyUserAssetsForScope(
            ...getParams(assets, 'appIcon',{
                'icon-100.png': 100
            }, minGeneration)
        )
        // we have found a file and don't need a default
        expect(hasFiles).toBeTrue()
        // no assets yet because we need resizing
        expect(assets.length).toBe(0)

        // the matching mode should not have to generate files
        expect(jobs.length).not.toBe(0)
        expect(jobs[0].mode2files.values()).not.toBeEmpty()

        const templates = []
        for (const { mode2files } of jobs) {
            templates.push(...[...mode2files.keys()].map(mode => mode.template))
        }
        expect(templates.includes('icon-[d]')).toBeTrue()

        const files = []
        for (const { detail, mode2files } of jobs) {
            for (const modeFiles of mode2files.values()) {
                if (!modeFiles.length) continue
                files.push(...modeFiles.map(item => [item, detail]))
            }
        }
    }
})

test('addFallbackModes', () => {
    const w = new WebApp({}, new DistTarget(), {}, {})
    const getFileDeps = (files = {}) => {
        const exampleAssetsDirPath = 'bar'
        const sizeOf = (key => {
            const fileKey = key.substring(exampleAssetsDirPath.length + 1)
            let file = files[fileKey]
            if (!file) throw Error(`File ${fileKey} not found!`)

            if (!isArray(file)) {
                return { width: file, height: file }
            }
            if (file.length === 1) file = [file[0], file[0]]
            const [ width, height ] = file
            return { width, height }
        })
        const exampleAssetFiles = toKeys(files)
        return {
            sizeOf,
            exampleAssetsDirPath,
            exampleAssetFiles
        }
    }

    {
        const r = {}
        w.addFallbackModes(fallbackModes['favIcon'], r, getFileDeps({}))
        expect(r).toBeEmptyObject()
    }

    {
        const r = {}
        w.addFallbackModes(fallbackModes['favIcon'], r, getFileDeps({
            'icon-512.png': 512
        }))
        expect(r.png).toBeArray()
        expect(r.png).toHaveLength(1)
        expect(r.png[0]).toEqual({dim: {width: 512, height: 512}, ext: 'png', filePath: "bar/icon-512.png", relPath: "assets/icon-512.png"})
    }

    {
        const r = {}
        w.addFallbackModes(fallbackModes['favIcon'], r, getFileDeps({
            'icon-10-20.png': [10, 20],
            'icon-512.png': 512,
            'icon-1024.png': 1024
        }))
        expect(r.png).toBeArray()
        expect(r.png).toHaveLength(2)
        expect(r.png[0]).toEqual({dim: {width: 512, height: 512}, ext: 'png', filePath: "bar/icon-512.png", relPath: "assets/icon-512.png"})
        expect(r.png[1]).toEqual({dim: {width: 1024, height: 1024}, ext: 'png', filePath: "bar/icon-1024.png", relPath: "assets/icon-1024.png"})
    }

    {
        const png = {dim: {width: 20, height: 20}, ext: 'png'}
        const r = {png: [png]}
        w.addFallbackModes(fallbackModes['favIcon'], r, getFileDeps({
            'icon-512.png': 512
        }))
        expect(r.png).toBeArray()
        expect(r.png).toHaveLength(1)
        expect(r.png[0]).toEqual(png)
    }

})

test('addBaseImages', () => {
    const w = new WebApp({}, new DistTarget(), {}, {})
    {
        const jobs = []
        w.addBaseImages(jobs, {})
        expect(jobs).toBeEmpty()
    }

    {
        const jobs = []
        w.addBaseImages(jobs, {png: ['foo.png', 'bar.png']})
        expect(jobs).toBeEmpty()
    }

    {
        const pngModeFiles = [{'foo2.png': [100, 100]}]
        const jobs = [{
            detail: {
                formats: ['png']
            },
            mode2files: new Map([
                [{}, pngModeFiles]
            ])
        }]
        w.addBaseImages(jobs, {png: ['foo.png', 'bar.png']})
        expect(pngModeFiles).toHaveLength(1)
    }

    {
        const pngModeFiles = [{'foo2.png': [100, 100]}]
        const followUpModeFiles = []
        const jobs = [{
            detail: {
                formats: ['png']
            },
            mode2files: new Map([
                [{name: 'mode1'}, pngModeFiles],
                [{name: 'mode2'}, followUpModeFiles]
            ])
        }]
        w.addBaseImages(jobs, {png: ['foo.png', 'bar.png']})
        expect(pngModeFiles).toHaveLength(1)
        expect(followUpModeFiles).toHaveLength(1)
        expect(followUpModeFiles[0]).toEqual({'foo2.png': [100, 100]})
    }

    {
        const pngModeFiles = []
        const followUpModeFiles = []
        const jobs = [{
            detail: {
                formats: ['png']
            },
            mode2files: new Map([
                [{name: 'mode1'}, pngModeFiles],
                [{name: 'mode2'}, followUpModeFiles]
            ])
        }]
        const basePngs = ['foo.png', 'bar.png']
        w.addBaseImages(jobs, {png: basePngs})
        expect(pngModeFiles).toHaveLength(2)
        expect(pngModeFiles).toEqual(basePngs)
        expect(followUpModeFiles).toHaveLength(2)
        expect(followUpModeFiles).toEqual(basePngs)
    }

    {
        const pngModeFiles = []
        const icoModeFiles = []
        const jobs = [{
            detail: {
                formats: ['png']
            },
            mode2files: new Map([
                [{name: 'mode1'}, pngModeFiles]
            ])
        }, {
            detail: {
                formats: ['ico']
            },
            mode2files: new Map([
                [{name: 'mode2'}, icoModeFiles]
            ])
        }]
        const basePngs = ['foo.png']
        const baseIcos = ['bar.ico']
        w.addBaseImages(jobs, {png: basePngs, ico: baseIcos})
        expect(pngModeFiles).toHaveLength(1)
        expect(pngModeFiles).toEqual(basePngs)
        expect(icoModeFiles).toHaveLength(1)
        expect(icoModeFiles).toEqual(baseIcos)
    }
})

test('getMode2filesAndLinks', () => {
    const w = new WebApp({}, new DistTarget(), {}, {})
    {
        const m = w.getMode2filesAndLinks([], {})
        expect(m.entries()).toBeEmpty()
    }

    {
        const pngFile = {filePath: 'foo', ext: 'png', dim: [100, 100]}
        const m = w.getMode2filesAndLinks([
            {
                detail: {
                    sizes: {foo: [10, 20]}, links: ['bar']
                },
                mode2files: new Map([
                    [{name: 'test'}, [pngFile]]
                ])
            }
        ], {assetGeneration: 'foo2'})
        const r = [ ...m.entries() ]
        expect(r).toHaveLength(1)
        expect(r[0][0]).toEqual({name: 'test'})
        const obj = r[0][1]
        expect(obj.scale100pixels).toBeUndefined()
        expect(obj.ext2files).toEqual({png: {[pngFile.filePath]: [100, 100]}})
        expect(obj.size2links).toBeEmptyObject()
    }

    {
        const pngFile = {filePath: 'foo', ext: 'png', dim: [100, 100]}
        const m = w.getMode2filesAndLinks([
            {
                detail: {
                    sizes: {foo: [10, 20]}, links: ['bar']
                },
                mode2files: new Map([
                    [{name: 'test'}, [pngFile]]
                ])
            }
        ], {assetGeneration: 'foo'})
        const r = [ ...m.entries() ]
        expect(r).toHaveLength(1)
        expect(r[0][0]).toEqual({name: 'test'})
        const obj = r[0][1]
        expect(obj.scale100pixels).toBeUndefined()
        expect(obj.ext2files).toEqual({png: {[pngFile.filePath]: [100, 100]}})
        expect(obj.size2links).toEqual({10: ['bar'], 20: ['bar']})
    }

    {
        const mode = {name: 'test'}
        const pngFile = {filePath: 'foo', ext: 'png', dim: [100, 100]}
        const pngFile2 = {filePath: 'foo2', ext: 'png', dim: [50, 50]}
        const m = w.getMode2filesAndLinks([
            {
                detail: {
                    sizes: {foo: [10, 20]}, links: ['bar']
                },
                mode2files: new Map([
                    [mode, [pngFile]]
                ])
            },
            {
                detail: {
                    sizes: {foo: [10]}, links: ['bar2']
                },
                mode2files: new Map([
                    [mode, [pngFile2]]
                ])
            }
        ], {assetGeneration: 'foo'})
        const r = [ ...m.entries() ]
        expect(r).toHaveLength(1)
        expect(r[0][0]).toEqual(mode)
        const obj = r[0][1]
        expect(obj.scale100pixels).toBeUndefined()
        expect(obj.ext2files).toEqual({png: {[pngFile2.filePath]: [50, 50], [pngFile.filePath]: [100, 100]}})
        expect(obj.size2links).toEqual({10: ['bar', 'bar2'], 20: ['bar']})
    }

})

test('addResizeAssets', () => {
    const w = new WebApp({}, new DistTarget(), {}, {})
    {
        const assets = []
        w.addResizeAssets(assets, 'favIcon', new Map([
        ]))
        expect(assets).toBeEmpty()
    }

    {
        const assets = []
        w.addResizeAssets(assets, 'favIcon', new Map([
            [{template: 'test-[d]', padding: 0}, {
                size2links: {
                    10: ['bar'],
                    20: ['bar']
                },
                ext2files: {
                    png: {
                        'foo.png': [100, 100]
                    }
                }
            }]
        ]))
        expect(assets).toHaveLength(2)
        expect(assets[0]).toEqual({
            scope: 'favIcon', action: 'resize', from: 'foo.png', relPath: 'assets/test-10.png',
            ext: 'png', dim: [10, 10], padding: 0, links: ['bar']
        })
        expect(assets[1]).toEqual({
            scope: 'favIcon', action: 'resize', from: 'foo.png', relPath: 'assets/test-20.png',
            ext: 'png', dim: [20, 20], padding: 0, links: ['bar']
        })
    }

    {
        const assets = []
        w.addResizeAssets(assets, 'favIcon', new Map([
            [{template: 'test-[d]', padding: 0}, {
                size2links: {
                    30: ['bar'],
                    120: ['bar']
                },
                ext2files: {
                    png: {
                        'foo.png': [100, 100],
                        'foo2.png': [30, 30]
                    }
                }
            }]
        ]))
        expect(assets).toHaveLength(2)
        expect(assets[0]).toEqual({
            scope: 'favIcon', action: 'resize', from: 'foo2.png', relPath: 'assets/test-30.png',
            ext: 'png', dim: [30, 30], padding: 0, links: ['bar']
        })
        expect(assets[1]).toEqual({
            scope: 'favIcon', action: 'resize', from: 'foo.png', relPath: 'assets/test-120.png',
            ext: 'png', dim: [120, 120], padding: 0, links: ['bar']
        })
    }

    {
        const assets = []
        w.addResizeAssets(assets, 'favIcon', new Map([
            [{template: 'test-[d]', padding: 0.3}, {
                scale100pixels: 71,
                size2links: {
                    200: ['bar']
                },
                ext2files: {
                    png: {
                        'foo.png': [71, 71],
                    }
                }
            }]
        ]))
        expect(assets).toHaveLength(1)
        expect(assets[0]).toEqual({
            scope: 'favIcon', action: 'resize', from: 'foo.png', relPath: 'assets/test-200.png',
            ext: 'png', dim: [142, 142], padding: 0.3, links: ['bar']
        })
    }

    {
        const assets = []
        w.addResizeAssets(assets, 'favIcon', new Map([
            [{template: 'test-[d]', padding: 0.3}, {
                scale100pixels: [71, 50],
                size2links: {
                    200: ['bar']
                },
                ext2files: {
                    png: {
                        'foo.png': [71, 50],
                    }
                }
            }]
        ]))
        expect(assets).toHaveLength(1)
        expect(assets[0]).toEqual({
            scope: 'favIcon', action: 'resize', from: 'foo.png', relPath: 'assets/test-200.png',
            ext: 'png', dim: [142, 100], padding: 0.3, links: ['bar']
        })
    }

})

test('getMetaLinks', () => {
    {
        const m = new MacApp({}, new DistTarget(), {}, {})
        expect(m.getMetaLinks()).toBeEmpty()
    }

    {
        const m = new MacApp({}, new DistTarget({assets: [
            {scope: 'favIcon', dim: [100, 100], relPath: 'foo', ext: 'png', links: ['meta'] },
            {scope: 'favIcon', dim: [120, 120], relPath: 'foo', ext: 'png', links: [] }
        ]}), {}, {})
        expect(m.getMetaLinks()).toHaveLength(2)
    }
})

test('getMissingRequirements', () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(m.getMissingRequirements()).toBeUndefined()
    }
})

test('getRequiredPlatforms', () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(m.getRequiredPlatforms()).toBeEmpty()
    }

    {
        const m = new MacApp({}, new DistTarget(), {}, {})
        expect(m.getRequiredPlatforms()).toEqual(['darwin'])
    }
})

test('getRequiredPrograms', () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(m.getRequiredPrograms()).toBeEmpty()
    }
})

test('getProgramsInstaller', () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(m.getProgramsInstaller()).toBeEmptyObject()
    }
})

test('prepareMake', async () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(await m.prepareMake()).toBeUndefined()
    }
})

test('make', async () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(await m.make()).toBeUndefined()
    }
})

test('finishMake', async () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(await m.finishMake()).toBeUndefined()
    }
})

test('open', async () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(await m.open()).toBeUndefined()
    }
})

test('processPostBuild', async () => {
    {
        const m = new WebApp({}, new DistTarget(), {}, {})
        expect(await m.processPostBuild()).toBeUndefined()
    }
})

test('constructor', () => {
    expect(() => new Deliverable({}, new DistTarget(), {}, {})).toThrow('Implement')
})
