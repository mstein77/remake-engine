import { RenderPlugin } from "./RenderPlugin.js";
import "../editor/css/layout.css"
import "../editor/css/base.css"
import { d } from "helper/helper.js"

const IS_DIST = false // TODO replace by env var

class DefaultRenderPlugin extends RenderPlugin {

    constructor(props) {
        super(props)
    }

    handleError(error) {
        super.handleError(error)
        return {id: 'popup', nodes: this.getSectionError({message: error.message, error}), nextFrame: () => this.game.openPopup('popup')}
    }

    getCssConstantsValues() {
        return {
            boxBorderWidthPx: 1,
            maxWidthPx: 1200,
            maxHeightPx: 1200,
            boxBorderRgb: "#2b7386",
            lessPerc: 59,
            morePerc: 170,
            disabledPerc: 45,

            overlayBgRgba: "#000000a3",

            inputBgRgb: "#b0aec1",
            inputRgb: "#29292e",
            inputBorderRgb: "#a8a8a8",
            inputBstyle: "solid",
            inputBorderWidthPx: 1,
            inputPaddingPx: 5,
            inputMinPaddingPx: 1,
            inputBorderRadiusPx: 4,

            fontSizeSmallPx: 11,
            fontSizeMediumPx: 12,
            fontSizeBigPx: 16,

            monoFont: 'monospace',

            checkBoxType: 1,
            hoverChangeType: 1,
            hoverIntensityFloat: 0.25,
            defaultPaddingPx: 7,

            buttonBgRgb: "#3d4bba",
            buttonRgb: "#b0d5e8",
            buttonBorderRgb: "#347f66",
            buttonBstyle: "solid",
            buttonBorderWidthPx: 1,
            buttonMinPaddingPx: 3,
            buttonPaddingPx: 5,
            buttonBorderRadiusPx: 4
        }
    }

    notify(action, props) {
        const expr = super.notify(action, props)
        if (expr) return expr

        switch(action) {
            case 'state:' + this.game.states.INIT:
                return {id: 'body', nodes: this.getBootSection()}

            case 'state:' + this.game.states.CONNECT:
                return {id: 'status', nodes: this.getSectionLoading()}

            case 'state:' + this.game.states.PREBOOT_ERROR:
                return {id: 'status', nodes: this.getSectionPreBootError(props)}

            case 'main':
                return {id: 'body', nodes: this.getMainSection(props)}
        }
    }

    getBootSection() {
        const { div } = this
        return (
            div(
                {id: 'status', class: 'section full-v full-h'}
            )
        )
    }

    getSectionLoading() {
        const { div } = this

        return div(
            {class: 'center-v'},
            div(
                {class: 'stack-v center-child-h inner-space-v'},
                div(
                    {class: 'loading padding'}
                ),
                div(
                    {class: 'padded', style: 'font-family: Monospace; color: #FFFFFF'},
                    'L O A D I N G ...'
                )
            )
        )
    }

    getErrorDiv({ message, error, click, buttonText }) {
        const { div, button, pre } = this;

        let stack = !IS_DIST && error.stack;
        if (stack) {
            stack = JSON.stringify(stack).replaceAll('\\n', '\n').substring(1);
            stack = stack.substring(0, stack.length - 1)
        }
        return (
            div(
                {class: 'center-v'},
                div({class: 'full-h padded', style: 'background-color: #9f2828;'},
                    div(
                        {class: 'stack-v center-child-h inner-space-v'},
                        div(
                            {style: 'font-family: Monospace; color: #FFFFFF; font-weight: bold'},
                            'An error occured:'
                        ),
                        div(
                            {class: 'padded', style: 'font-family: Monospace; color: #FFFFFF'},
                            message
                        ),
                        stack && div(
                            {class: 'min-content-h center-h', style: 'max-height: 150px; overflow-x: hidden; overflow-y: auto'},
                            pre(
                                {class: 'min-content-h boxed padded', style: 'background-color: #fafff5'},
                                stack
                            )
                        ),
                        buttonText && div(
                            {class: 'center-h padded'},
                            button(
                                {style: 'width: 150px', onClick: click},
                                buttonText
                            )
                        )
                    )
                )
            )
        )
    }

    getSectionPreBootError(props) {
        const click = () => this.game.reset()
        return this.getErrorDiv({ ...props, click, buttonText: 'Retry' })
    }

    getSectionError(props) {
        const click = () => {
            this.game.closePopup('popup')
            this.game.running = true
        }
        return this.getErrorDiv({ ...props, click, buttonText: 'Continue' })
    }

    filterOnOff(value) {
        return value ? 'off' : 'up'
    }

    filterIsMinZoom(value) {
        return value === this.game.minZoom
    }

    filterIsMaxZoom(value) {
        return value === this.game.maxZoom
    }

    filterIsMinVolume(value) {
        return value === 0
    }

    filterIsMaxVolume(value) {
        return value === 100
    }

    filterMutedOrMinVolume(muted, volume) {
        return muted || volume === 0
    }

    filterMutedOrMaxVolume(muted, volume) {
        return muted || volume === 100
    }

    filterPausePlay(value) {
        return value ? 'stop' : 'play_arrow'
    }

    filterToZoomMode(value) {
        return value ? 'Step Zoom' : 'Cont Zoom'
    }

    getMainSection() {
        const { div, button, input, icon } = this;

        const goFullScreen = () => console.log('GO FULL-SCREEN!');
        const game = this.game;
        const toggleAutoZoom = e => {
            game.autoZoom = e.currentTarget.checked
        }
        const buttons = [
            {name: 'Fullscreen', sideIcon: 'fullscreen', click: () => {game.openFullScreenMode()}}
        ]
        buttons.push(
            {name: 'Reset', sideIcon: 'restart_alt', click: () => game.reset()}
        )
        const slider = input(
            {disabled: '<game.muted>', min: 0, max: 100, type: 'range', onInput: e => game.masterVolume = parseInt(e.target.value, 10), value: game.masterVolume}
        )
        const toggleZoomMode = e => {
            game.stepZoom = !game.stepZoom
        }
        const buttonElems = []
        if (game.hasEditor()) {
            buttonElems.push(
                button(
                    {onClick: () => game.openEditorMode()},
                    div(
                        {class: 'stack-h inner-space-h'},
                        div(
                            {class: 'min-content-h'},
                            icon('build')
                        ),
                        div(
                            {class: 'min-content-h'},
                            'Editor'
                        )
                    )
                ),
            )
        }
        buttonElems.push(
            div(
                {class: 'stack-h min-content-h padded-h'},
                button(
                    {class: 'padded-h mono nowrap', onClick: toggleZoomMode},
                    '<game.stepZoom|toZoomMode>: '
                ),
                button(
                    {disabled: '<game.zoom|isMinZoom>', onClick: () => game.zoom = game.zoom - 1},
                    '-'
                ),
                input(
                    {readonly: true, size: 1, type: 'text', value: '<game.zoom>'}
                ),
                button(
                    {disabled: '<game.zoom|isMaxZoom>', onClick: () => game.zoom = game.zoom + 1},
                    '+'
                ),
                div(
                    {class: 'stack-h padded-h'},
                    div('Auto'),
                    input(
                        {type: 'checkbox', checked: game.autoZoom, onChange: toggleAutoZoom}
                    )
                )
            ),
            button(
                {onClick: () => game.muted = !game.muted},
                icon(
                    'volume_<game.muted|onOff>'
                )
            ),
            div(
                {class: 'stack-h min-content-h padded-h'},
                slider
            ),
            button(
                {onClick: () => game.running = !game.running},
                icon(
                    '<game.running|pausePlay>'
                )
            )
        );
        for (let { name, click, sideIcon } of buttons) {
            let inner = name;
            if (sideIcon) {
                inner = div(
                    {class: 'stack-h inner-space-h'},
                    div(
                        {class: 'min-content-h'},
                        icon(sideIcon)
                    ),
                    div(
                        {class: 'min-content-h'},
                        name
                    )
                )
            }
            buttonElems.push(
                div(
                    {class: 'min-content-h'},
                    button(
                        {onClick: click},
                        inner
                    )
                )
            )
        }
        return (
            div(
                {class: 'full-v stack-v'},
                div(
                    {class: 'block padded full-h flex'},
                    div(
                        {class: 'block min-content-h center-h', style: 'border: 1px solid #ffffff'},
                        div(
                            {id: "screen-div", style: "flex-shrink: 0; margin: 0 0 0 0; padding: 0; width: " + (game.width * game.zoom) + 'px; height: ' + (game.height * game.zoom) + 'px'},
                            div({id: "overlay", style: "position: relative; padding: 0px; margin: 0; width: " + game.width + 'px; height: ' + game.height + 'px'})
                        )
                    )
                ),
                div(
                    {id: 'warnings', watch: ['game.warnings'], style: 'background-color: #D0D0D0'},
                    warnings => {
                        if (!warnings.length) return div()

                        const elems = []
                        for (let warning of warnings) {
                            elems.push(div(warning))
                        }
                        return div(
                            {class: 'stack-h'},
                            div(
                                {class: 'padded'},
                                icon('warning')
                            ),
                            div(
                                {class: 'stack-v flex padded inner-space-v mono medium'},
                                ...elems
                            ),
                            div(
                                {class: 'padded', onclick: () => this.game.clearWarnings()},
                                icon('close')
                            )
                        )
                    }

                ),
                div(
                    {class: 'padded stack-h full-h', style: 'background-color: #494964'},
                    div(
                        {class: 'min-content-h no-wrap', style: 'white-space: nowrap; color: #9eaca9; font-family: Tahoma'},
                        'Remake Engine V' + VERSION_ENGINE + ' - © 2022 Binary Druidz'
                    ),
                    div(
                        {class: 'flex'},
                        div(
                            {class: 'center-h inner-space-h stack-h min-content-h'},
                            ...buttonElems
                        )
                    )
                )
            )
        )
    }
}

export {
    DefaultRenderPlugin
}