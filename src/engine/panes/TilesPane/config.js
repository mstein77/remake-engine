import { Config } from "core/config"
import { TilesMap } from "../BufferedTilesPane/classes"
import { getRebuildJsonForModel } from "helper/helper"

class TilesPaneConfig extends Config {

    getDefaults() {
        return {
            tilesMap: null,
            endlessX: false,
            endlessY: false
        }
    }

    setTilesMap(value) {
        this.tilesMap = this.validateConfig(TilesMap, value)
    }

    setEndlessX(value) {
        this.endlessX = this.validateBool(value)
    }

    setEndlessY(value) {
        this.endlessY = this.validateBool(value)
    }

    getSubResources() {
        return [
            {id: this.tilesMap.id, type: 'json', data: this.tilesMap}
        ]
    }

    addRebuildProps(obj, deep, base) {
        obj.tilesMap = !deep ? base.tilesMap.id : getRebuildJsonForModel(TilesMap, base.tilesMap, true)
        obj.endlessX = base.endlessX
        obj.endlessY = base.endlessY

        return obj;
    }

    applyTo(obj) {
        super.applyTo(obj);
        obj.tilesMap = this.tilesMap;
        obj.endlessX = this.endlessX
        obj.endlessY = this.endlessY

        return obj;
    }
}
TilesPaneConfig.deps = {
    tilesMap: TilesMap.Config
}

export {
    TilesPaneConfig
}