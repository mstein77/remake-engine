const path = require("path")
const RMK_GAME_DIR = process.env.RMK_GAME_DIR

const deps = {
    dirname: __dirname,
    RMK_GAME_DIR
}

let currDist = null

const absPath = {
    engine: ( ...relPath ) => path.resolve( deps.dirname, '../../', ...relPath ),
    src: ( ...relPath ) => path.resolve(absPath.engine('src'), ...relPath ),
    game: ( ...relPath ) => path.resolve(absPath.engine(deps.RMK_GAME_DIR ? deps.RMK_GAME_DIR : '../../'), ...relPath ),
    resources: ( ...relPath ) => path.resolve(absPath.game( 'resources'), ...relPath ),
    dist: ( ...relPath ) => path.resolve(currDist ? currDist : absPath.game('dist'), ...relPath ),
    dists: ( ...relPath ) => path.resolve(absPath.game('dists'), ...relPath ),
    tmp: ( ...relPath ) => path.resolve(absPath.engine('tmp'), ...relPath ),
    setCurrDist: path => {
        currDist = path
    },
    make: path.resolve,
    setDeps: (dirname, gameDir) => {
        deps.dirname = dirname
        deps.RMK_GAME_DIR = gameDir
    }
}

module.exports = absPath