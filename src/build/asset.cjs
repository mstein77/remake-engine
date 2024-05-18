const { ASSET_TYPE, PLATFORMS } = require('./config.cjs')

const iconTransparent = {
    padding: null,
    template: 'icon-[d]',
    base: true
}
const icnsAppIcon = {
    padding: null,
    template: 'icon-[d]x[d]'
}
const icnsAppIconScale2 = {
    padding: null,
    template: 'icon-[d]x[d]@2x',
    only: ['all'],
    scale: 2
}
const icnsAppIconScale3 = {
    padding: null,
    template: 'icon-[d]x[d]@3x',
    only: ['all'],
    scale: 3
}
const faviconTransparent = {
    padding: 0,
    template: 'favicon-[d]'
}
const smallTile = {
    padding: 0.3,
    template: 'SmallTile.scale-[d]'
}
 const largeTile = {
    padding: 0.3,
    template: 'LargeTile.scale-[d]'
}
const splashScreen = {
    padding: 0.3,
    template: 'SplashScreen.scale-[d]'
}
const storeLogo = {
    padding: 0.3,
    template: 'StoreLogo.scale-[d]'
}
const square150logoScale = {
    padding: 0,
    template: 'Square150x150Logo.scale-[d]'
}
const square44logo = {
    padding: 0,
    template: 'Square44x44Logo.targetsize-[d]'
}
const square44logoUnplated = {
    padding: 0,
    template: 'Square44x44Logo.altform-unplated_targetsize-[d]'
}
const square44logoLightUnplated = {
    padding: 0,
    template: 'Square44x44Logo.altform-lightunplated_targetsize-[d]'
}
const square44logoScale = {
    padding: 0,
    template: 'Square44x44Logo.scale-[d]'
}
const wide310x150logoScale = {
    padding: 0.3,
    template: 'Wide310x150Logo.scale-[d]'
}

const windowsScaleSizes = {
    minimal: [ 400 ],
    recommended: [ 100, 125, 150, 200, 400 ],
    all: [ 100, 125, 150, 200, 400 ]
}

const winIconSizes = {
    minimal: [ 256 ],
    recommended: [ 16, 24, 32, 48, 256 ],
    all: [ 16, 20, 24, 30, 32, 36, 40, 44, 48, 60, 64, 72, 80, 96, 256 ]
}

const macPlatformAppSizes = [
    16, 32, 48, 128, 256, 512
]

const fallbackModes = {
    appIcon: iconTransparent,
    favIcon: iconTransparent
}

const scope2assets = {
    appIcon: [
        {
            platforms: [PLATFORMS.IOS],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png'],
            sizes: {
                minimal: [1024],
                recommended: [58, 76, 80, 120, 152, 167, 1024],
                all: [58, 76, 80, 87, 114, 120, 152, 167, 180, 1024]
            },
            links: ['pwa-manifest'],
            modes: [
                iconTransparent
            ]
        },
        {
            platforms: [PLATFORMS.MACOS],
            type: ASSET_TYPE.ICNS,
            square: true,
            formats: ['png'],
            sizes: {
                minimal: [512],
                recommended: macPlatformAppSizes,
                all: macPlatformAppSizes
            },
            links: ['packagerConfig.icon', 'maker-dmg'],
            modes: [
                icnsAppIcon,
                icnsAppIconScale2,
                icnsAppIconScale3
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS],
            type: ASSET_TYPE.ICNS,
            square: true,
            formats: ['png'],
            sizes: winIconSizes,
            links: ['packagerConfig.icon', 'maker-wix'],
            modes: [
                iconTransparent
            ]
        },
        {
            platforms: [PLATFORMS.LINUX],
            type: ASSET_TYPE.ICNS,
            square: true,
            formats: ['png'],
            sizes: {
                minimal: [512],
                recommended: [512],
                all: [512]
            },
            links: ['maker-deb'],
            modes: [
                iconTransparent
            ]
        },
        {
            platforms: [PLATFORMS.MACOS],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png'],
            sizes: {
                minimal: [1024],
                recommended: [16, 32, 128, 256, 512],
                all: [16, 32, 64, 128, 256, 512, 1024]
            },
            links: ['pwa-manifest'],
            modes: [
                iconTransparent
            ]
        },
        {
            platforms: [PLATFORMS.ANDROID],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png', 'webp', 'jpg', 'svg'],
            sizes: {
                minimal: [512],
                recommended: [72, 96, 144, 192, 512],
                all: [48, 72, 96, 144, 192, 512]
            },
            links: ['pwa-manifest', 'android-manifest'],
            modes: [
                iconTransparent
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.TILE,
            square: true,
            formats: ['png', 'ico'],
            scale100pixels: 71,
            sizes: windowsScaleSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                smallTile
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.TILE,
            square: true,
            formats: ['png', 'ico'],
            scale100pixels: 310,
            sizes: windowsScaleSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                largeTile
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.SPLASH,
            square: false,
            formats: ['png', 'ico'],
            scale100pixels: [620, 300],
            sizes: windowsScaleSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                splashScreen
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png', 'ico'],
            scale100pixels: 44,
            sizes: windowsScaleSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                square44logoScale
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png', 'ico'],
            scale100pixels: 150,
            sizes: windowsScaleSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                square150logoScale
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.TILE,
            square: false,
            formats: ['png', 'ico'],
            scale100pixels: [310, 150],
            sizes: windowsScaleSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                wide310x150logoScale
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png', 'ico'],
            scale100pixels: 50,
            sizes: windowsScaleSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                storeLogo
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png', 'ico'],
            sizes: winIconSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                square44logo,
                square44logoUnplated,
                square44logoLightUnplated
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_11],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png', 'ico'],
            sizes: winIconSizes,
            links: ['pwa-manifest', 'win-app-manifest'],
            modes: [
                iconTransparent
            ]
        },
        {
            platforms: [PLATFORMS.WINDOWS_10],
            type: ASSET_TYPE.ICON,
            square: false,
            formats: ['png', 'ico'],
            sizes: {
                minimal: [ 1024 ],
                recommended: [ 1024 ],
                all: [ 512, 400, 256, 102 ]
            },
            links: ['pwa-manifest'],
            modes: [
                iconTransparent
            ]
        }
    ],
    favIcon: [
        {
            platforms: [PLATFORMS.WINDOWS],
            type: ASSET_TYPE.ICON,
            square: true,
            formats: ['png', 'ico'],
            sizes: {
                minimal: [ 512 ],
                recommended: [ 16, 32, 512 ],
                all: [ 16, 32, 48, 64, 512 ],
            },
            links: ['meta'],
            modes: [
                faviconTransparent
            ]
        }
    ]
}

module.exports = {
    fallbackModes,
    scope2assets
}