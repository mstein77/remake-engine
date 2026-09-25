import { Pane } from "panes/classes"
import { Config } from "core/config"
import { ModelFactory } from "core/model"
import { DivContainer } from "core/classes"
import { validated } from "helper/validate"
import { d } from "helper/helper"

class HtmlPaneConfig extends Config {

    setHtml(value) {
        this.html = validated.string(value)
    }

    getDefaults() {
        return {
            html: ''
        }
    }

    applyPropsTo(model) {
        this.applyDefaultKeysTo(model)
        return model
    }
}

class HtmlPaneImpl extends Pane {

    init(viewPortDimX, viewPortDimY) {
        this.viewPortDim = {
            x: viewPortDimX,
            y: viewPortDimY
        };
        this.paneDim = this.viewPortDim
        this.container = new DivContainer()
        return this.container
    }

    render() {
        this.container.setInnerHtml(this.html)
        this.dirty = false;
    }

    setHtml(value) {
        if (value === this.html) return
        this.html = value
        this.dirty = true
    }
}

const HtmlPane =
    ModelFactory(
        'HtmlPane',
        HtmlPaneConfig
    )
        .addImplementation(HtmlPaneImpl)

export default HtmlPane