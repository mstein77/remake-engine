import WebApp from "../../src/build/deliverables/web-app.cjs"
import Pwa from "../../src/build/deliverables/pwa.cjs"
import { DistTarget } from "../../src/build/target.cjs"
import { toKeys, d, isArray } from "../../src/shared/helper.cjs"
import { ASSET_GENERATION, ASSET_TYPE, PLATFORMS } from "../../src/build/config.cjs";

test('WebApp getAssetsForScope', () => {

    const w = new WebApp({}, new DistTarget(), {}, {})
    const p = new Pwa({}, new DistTarget(), {}, {})

    const userAssetsDirPath = 'foo'
    const getParams = (files = {}, overwrites = {}) => {
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

    expect(() => w.getAssetsForScope('foo', ...getParams())).toThrow('Invalid')

    // ---------- only user files ------------

    const noGeneration = {assetGeneration: ASSET_GENERATION.NONE}

    // invalid square dimension
    expect(() => w.getAssetsForScope(
        'favIcon', ...getParams({'favicon-100.png': 90}, noGeneration)
    )).toThrow('dimension')
    expect(() => w.getAssetsForScope(
        'favIcon', ...getParams({'favicon-100.png': [100, 90]}, noGeneration)
    )).toThrow('dimension')
    expect(() => w.getAssetsForScope(
        'favIcon', ...getParams({'favicon-100.png': [90, 100]}, noGeneration)
    )).toThrow('dimension')

    {
        // no auto-generation and no matching subtype
        const { hasFiles, jobs, assets, ext2baseFiles } = w.getAssetsForScope(
            'favIcon',
            ...getParams({
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
        // no auto-generation and no matching platform
        const { hasFiles, jobs, assets, ext2baseFiles } = w.getAssetsForScope(
            'favIcon',
            ...getParams({
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
        // no auto-generation and no matching scope
        const { hasFiles, jobs, assets, ext2baseFiles } = w.getAssetsForScope(
            'appIcon',
            ...getParams({
                'icon-100.png': 100
            }, noGeneration)
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
        // no auto-generation and no matching user file
        const { hasFiles, jobs, assets, ext2baseFiles } = w.getAssetsForScope(
            'favIcon',
            ...getParams({
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
        // no auto-generation but one user file
        const { hasFiles, jobs, assets, ext2baseFiles } = w.getAssetsForScope(
            'favIcon',
            ...getParams({
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

    // TODO .ico can have multiple icon sizes


    // -------------------- PWA ---------

    expect(() => p.getAssetsForScope(
        'appIcon', ...getParams({'Square150x150Logo.scale-100.png': 90}, noGeneration)
    )).toThrow('dimension')
    expect(() => p.getAssetsForScope(
        'appIcon', ...getParams({'SplashScreen.scale-100.png': [600, 300]}, { assetTypes: ASSET_TYPE.SPLASH, ...noGeneration })
    )).toThrow('dimension')
    expect(() => p.getAssetsForScope(
        'appIcon', ...getParams({'SplashScreen.scale-100.png': [600, 320]}, { assetTypes: ASSET_TYPE.SPLASH, ...noGeneration })
    )).toThrow('dimension')
    expect(() => p.getAssetsForScope(
        'appIcon', ...getParams({'SplashScreen.scale-100.png': [620, 300]}, { assetTypes: ASSET_TYPE.SPLASH, ...noGeneration })
    )).not.toThrow('dimension')

    // minimal generation
    const minGeneration = {assetGeneration: ASSET_GENERATION.MINIMAL}

    {
        // no auto-generation but one user file
        const { hasFiles, jobs, assets, ext2baseFiles } = w.getAssetsForScope(
            'favIcon',
            ...getParams({
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
        const { hasFiles, jobs, assets, ext2baseFiles } = p.getAssetsForScope(
            'appIcon',
            ...getParams({
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
        /*
        const obj = [ ...jobs[0].mode2files.values() ][0][0]
        expect(obj).toEqual({
            filePath: 'foo/icon-100.png',
            relPath: 'assets/icon-100.png', // TODO check why we need this
            dim: {width: 100, height: 100},
            ext: 'png'
        })

        // no default icon for favIcon
        expect(ext2baseFiles).toBeEmptyObject()
        
         */
    }


})