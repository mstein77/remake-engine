import { Config } from "core/config"
import { SpriteSheet } from "./classes"
import { d } from "helper/helper"

class SpriteSheetConfig extends Config {

    getDefaults() {
        return {
            image: undefined
        }
    }

    setImage(value) {
        this.image = this.validateImageResource(value)
    }

    applyTo(obj) {
        super.applyTo(obj);
        obj.image = this.image;
        return obj;
    }
}
SpriteSheet.Config = SpriteSheetConfig

class SpritePaneConfig extends Config {

    getDefaults() {
        return {
            spriteSheet: undefined
        }
    }

    setSpriteSheet(value) {
        this.spriteSheet = this.validateConfig(SpriteSheet, value)
    }

    applyTo(obj) {
        super.applyTo(obj)
        obj.spriteSheet = this.spriteSheet
        return obj
    }
}

export {
    SpriteSheetConfig,
    SpritePaneConfig
}