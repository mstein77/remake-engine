const path = require("path")

const RMK_GAME_DIR = process.env.RMK_GAME_DIR
const absPath = {
    engine: ( ...relPath ) => path.resolve( __dirname, '../../../', ...relPath ),
    src: ( ...relPath ) => path.resolve(absPath.engine('src'), ...relPath ),
    game: ( ...relPath ) => path.resolve(absPath.engine(RMK_GAME_DIR ? RMK_GAME_DIR : '../../../'), ...relPath ),
    resources: ( ...relPath ) => path.resolve(absPath.game( 'resources'), ...relPath ),
    dist: ( ...relPath ) => path.resolve(absPath.game('dist'), ...relPath ),
    tmp: ( ...relPath ) => path.resolve(absPath.engine('tmp'), ...relPath )
}

module.exports = absPath