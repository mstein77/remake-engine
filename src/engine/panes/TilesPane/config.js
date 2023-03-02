import { Config } from "core/config"
import { TilesMap } from "../BufferedTilesPane/classes"
import { validated } from "helper/validate"

class TilesPaneConfig extends Config {

    getDefaults() {
        return {
            tilesMap: undefined,
            endlessX: false,
            endlessY: false
        }
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
    }

    setTilesMap(value) {
        this.tilesMap = validated.config(TilesMap, value)
    }

    setEndlessX(value) {
        this.endlessX = validated.bool(value)
    }

    setEndlessY(value) {
        this.endlessY = validated.bool(value)
    }
}

export {
    TilesPaneConfig
}