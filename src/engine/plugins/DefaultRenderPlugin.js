import { RenderPlugin } from "./RenderPlugin.js";
import "../editor/css/layout.css"
import "../editor/css/base.css"
import { d, round } from "helper/helper.js"

const IS_DIST = false // TODO replace by env var

class DefaultRenderPlugin extends RenderPlugin {

    constructor(...props) {
        super(...props)
        const getCentered = (value, max) => ('' + value).padStart(value.length + ((max - value.length) >> 1), ' ')
        this.addFilters({
            toHidden: value => value ? '' : 'hidden',
            onOff: value => value ? 'off' : 'up',
            isMinZoom: value => value === this.game.minZoom,
            isMaxZoom: (value, maxAvail) => value === maxAvail,
            isMinVolume: value => value === 0,
            isMaxVolume: value => value === 100,
            mutedOrMinVolume: (muted, volume) => muted || volume === 0,
            mutedOrMaxVolume: (muted, volume) => muted || volume === 100,
            pausePlay:value => value ? 'stop' : 'play_arrow',
            toZoomModeIcon: value => value ? 'escalator' : 'stairs',
            toAutoZoomIcon: value => value ? 'close_fullscreen' : 'open_in_full',
            toFpsIcon: value => value ? 'visibility' : 'visibility_off',
            toFpsInfo: value => getCentered(value ? value : '-', 3),
            toFpsRange: (min, max) => getCentered((min ? min : '-') + (min !== max ? '-' + max : ''), 7),
            toAvgFps: value => getCentered(value ? round(value, 2, true) : '-', 6),
            toFullscreenIcon: value => value ? 'fullscreen_exit' : 'fullscreen'
        })
    }

    getCssConstantsValues() {
        return {
            boxBorderWidthPx: 1,
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
            buttonBorderRadiusPx: 4,
            ...this.getOption('cssConstants', {})
        }
    }

    handleError(error) {
        super.handleError(error)
        this.game.openModal(this.getSectionError({message: error.message, error}))
//        return {id: 'modal-div', nodes: , nextFrame: () => this.game.openPopup('modal-div')}
    }

    notify(action, props) {
        if (action === 'change' && props.name === 'autoZoom') {
            const elem = document.getElementById('zoomSlider')
            if (elem) {
                elem.value = this.game.zoom
            }
        }
        const expr = super.notify(action, props)
        if (expr) return expr

        switch(action) {
            case 'state:' + this.game.states.INIT:
                return {id: 'game-div', nodes: this.getBootSection()}

            case 'state:' + this.game.states.CONNECT:
                return {id: 'status', nodes: this.getSectionLoading()}

            case 'state:' + this.game.states.PREBOOT_ERROR:
                return {id: 'status', nodes: this.getSectionPreBootError(props)}

            case 'main':
                return [
                    {id: 'game-div', nodes: this.getMainSection(props)},
                    {id: 'game-overlay-div', subId: 'fps', nodes: this.getFpsOverlay()}
                ]
        }
    }

    getFpsOverlay() {
        const game = this.game
        const { div, pre, icon, kbd, input } = this
        return (
            div(
                {class: 'padded min-content-h stack-v absolute mono <game.showFps|toHidden>', style: 'background-color: #000000C0; color: white; left: 25px; top: 25px'},
                div(
                    {class: 'stack-h'},
                    div(
                        {class: 'flex less'},
                        'FPS:'
                    ),
                    div(
                        {class: 'less', onClick: () => game.showFps = false},
                        icon('close')
                    )
                ),
                div(
                    {class: 'stack-h'},
                    input(
                        {type: 'text', class: 'less', readOnly: true, tab: -1, size: 3, value: '<game.fps|toFpsInfo>'}
                    ),
                    input(
                        {type: 'text', class: 'less', readOnly: true, tab: -1, size: 6, value: '<game.avgFps|toAvgFps>'}
                    ),
                    input(
                        {type: 'text', class: 'less', readOnly: true, tab: -1, size: 7, value: '<game.minFps,game.maxFps|toFpsRange>'}
                    )
                )
            )
        )
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
            this.game.closeModal()
            this.game.running = true
        }
        return this.getErrorDiv({ ...props, click, buttonText: 'Continue' })
    }

    getMainSection() {
        const { div, button, input, icon } = this;

        const game = this.game
        const system = this.game.system
        const isMobile = system.isMobile

        const toggleFullScreen = () => {
            if (game.isFullscreen) {
                game.exitFullScreenMode()
            } else {
                game.openFullScreenMode()
            }
        }

        const toggleAutoZoom = e => {
            game.autoZoom = !game.autoZoom
        }
        const buttons = [
            {name: 'Reset', sideIcon: 'restart_alt', click: () => game.reset()},
            {name: 'Fullscreen', sideIcon: '<game.isFullscreen|toFullscreenIcon>', click: toggleFullScreen}
        ]
        if (game.showFpsByUser) {
            buttons.push(
                {name: 'FPS', sideIcon: '<game.showFps|toFpsIcon>', click: () => game.showFps = !game.showFps}
            )
        }
        const volumeSlider = input(
            {min: 0, max: 100, type: 'range', onInput: e => game.masterVolume = parseInt(e.target.value, 10), value: game.masterVolume}
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
        const isZoomable = game.minZoom !== game.maxZoom && !(game.autoZoom && !game.autoZoomByUser)
        buttonElems.push(
            div(
                {class: 'stack-h min-content-h padded-h'},
                !isMobile && div(
                    {class: 'padded-h'},
                    'Zoom:'
                ),
                isZoomable && game.autoZoomByUser && button(
                    {onClick: toggleAutoZoom},
                    icon(
                        '<game.autoZoom|toAutoZoomIcon>'
                    )
                ),
                game.stepZoomByUser && button(
                    {onClick: toggleZoomMode},
                    icon(
                        '<game.stepZoom|toZoomModeIcon>'
                    )
                ),
                !isMobile && isZoomable && div(
                    {id: 'zoomMode', class: 'min-content-h padded-h stack-h', watch: 'game.stepZoom'},
                    stepZoom => stepZoom ?
                        input(
                            {id: 'zoomSlider', min: '<game.minZoom>', step: 1, max: '<game.maxAvailZoom>', type: 'range', onInput: e => game.zoom = parseInt(e.target.value), value: '<game.zoom>'}
                        ) :
                        input(
                            {id: 'zoomSlider', min: '<game.minZoom>', step: 0.01, max: '<game.maxAvailZoom>', type: 'range', onInput: e => game.zoom = parseFloat(e.target.value), value: '<game.zoom>'}
                        )
                )
            ),
            button(
                {onClick: () => game.muted = !game.muted},
                icon(
                    'volume_<game.muted|onOff>'
                )
            ),
            !isMobile && div(
                {class: 'stack-h min-content-h padded-h'},
                volumeSlider
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
                    !isMobile && div(
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
                    {class: 'block padded full-h flex screen-bounds'},
                    div(
                        {class: 'block min-content-h center-h', style: 'border: 1px solid #ffffff'},
                        game.screenDiv
                    )
                ),
                div(
                    {id: 'warnings', watch: ['game.warnings'], style: 'background-color: #D0D0D0'},
                    warnings => {
                        if (!warnings.length) return div()

                        const elems = []
                        for (const { msg, actions } of warnings) {
                            if (actions && actions.length) {
                                const actionButtons = []
                                for (const { action, click } of actions) {
                                    actionButtons.push(div(button({ onclick: click }, action)))
                                }
                                elems.push(
                                    div(
                                        {class: 'stack-h inner-space-h'},
                                        div(msg),
                                        ...actionButtons
                                    )
                                )
                            } else {
                                elems.push(
                                    div(msg)
                                )
                            }
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
                    !isMobile && div(
                        {class: 'min-content-h nowrap-shorten', style: 'color: #9eaca9; font-family: Tahoma'},
                        'Remake Engine V' + VERSION_ENGINE + ' - © 2022 Servants of Hex'
                    ),
                    div(
                        {class: 'flex mono', style: 'color: white'},
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