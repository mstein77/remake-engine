const path = require("path")
const RMK_GAME_DIR = process.env.RMK_GAME_DIR

const deps = {
    dirname: __dirname,
    RMK_GAME_DIR
}

const absPath = {
    engine: ( ...relPath ) => path.resolve( deps.dirname, '../../../', ...relPath ),
    src: ( ...relPath ) => path.resolve(absPath.engine('src'), ...relPath ),
    game: ( ...relPath ) => path.resolve(absPath.engine(deps.RMK_GAME_DIR ? deps.RMK_GAME_DIR : '../../../'), ...relPath ),
    resources: ( ...relPath ) => path.resolve(absPath.game( 'resources'), ...relPath ),
    dist: ( ...relPath ) => path.resolve(absPath.game('dist'), ...relPath ),
    tmp: ( ...relPath ) => path.resolve(absPath.engine('tmp'), ...relPath ),
    setDeps: (dirname, gameDir) => {
        deps.dirname = dirname
        deps.RMK_GAME_DIR = gameDir
    }
}

module.exports = absPath