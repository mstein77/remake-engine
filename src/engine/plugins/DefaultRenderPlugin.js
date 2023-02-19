import { RenderPlugin } from "./classes";
import "../editor/css/layout.css"
import "../editor/css/base.css"
import "./css/defaultRenderPlugin.css"
import { d, round } from "helper/helper.js"
import { STATE } from "core/const"

class DefaultRenderPlugin extends RenderPlugin {

    setup() {
        super.setup()

        this.controls = true
        this.stackH = ( stackProps, ...props ) => {
            if (typeof stackProps === 'object' && !(stackProps instanceof Node)) {
                let { class: stackCls = '', ...objProps } = stackProps
                if (!stackCls.includes('stack-h')) stackCls += ' stack-h'
                return this.div({ class: stackCls, ...objProps }, ...props)
            }
            return this.div({ class: `stack-h ${typeof stackProps === 'string' ? stackProps : ''}`}, typeof stackProps !== 'string' ? stackProps : null, ...props)
        }
        this.stackV = ( stackProps, ...props ) => {
            if (typeof stackProps === 'object' && !(stackProps instanceof Node)) {
                let { class: stackCls = '', ...objProps } = stackProps
                if (!stackCls.includes('stack-v')) stackCls += ' stack-v'
                return this.div({ class: stackCls, ...objProps }, ...props)
            }
            return this.div({ class: `stack-v ${typeof stackProps === 'string' ? stackProps : ''}`}, typeof stackProps !== 'string' ? stackProps : null, ...props)
        }
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
            toLeftMargin: value => value ? 'leftpadded' : '',
            toFpsInfo: value => getCentered(value ? value : '-', 3),
            toFpsRange: (min, max) => getCentered((min ? min : '-') + (min !== max ? '-' + max : ''), 7),
            toAvgFps: value => getCentered(value ? round(value, 2, true) : '-', 6),
            toFullscreenIcon: value => value ? 'fullscreen_exit' : 'fullscreen',
            toRounded: value => '' + round(value, 2)
        })
    }

    getCssConstantsValues() {
        return {
            editorBgRgb: '#202030',
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
        if (action === 'change' && props.name === 'fpsHistory' && this.fpsCanvas) {
            const ctx = this.fpsCanvas.getContext('2d')
            const { width, height } = this.fpsCanvas
            ctx.strokeStyle = '#C0C0C0'
            ctx.fillStyle = '#C0C0C0'
            ctx.clearRect(0, 0, width, height)
            const fpsRange = this.game.maxFps - this.game.minFps;
            const drawRange = Math.max(this.game.maxFps - this.game.minFps, 10)
            const off = Math.max(0, 10 - fpsRange)
            const heightUnits = height / drawRange
            let num = 30
            const widthUnits = width / num
            let posX = 0
            let first = true
            ctx.beginPath()
            for (let fps of this.game.fpsHistory) {
                const posY = height - (fps - this.game.minFps + off) * heightUnits
                if (first) {
                    if (this.game.fpsHistory.length === 1) {
                        ctx.arc(posX, posY, 1, 0, 2 * Math.PI, true);
                        ctx.fill();
                    } else {
                        ctx.moveTo(posX, posY)
                    }
                } else {
                    ctx.lineTo(posX, posY)
                }
                posX += widthUnits
                first = false
            }
            ctx.stroke()
        }
        const expr = super.notify(action, props)
        if (expr) return expr

        switch (action) {
            case 'state:' + STATE.INIT:
                return {id: 'game-div', nodes: this.getBootSection()}

            case 'state:' + STATE.CONNECT:
                return {id: 'status', nodes: this.getSectionLoading()}

            case 'state:' + STATE.PREBOOT_ERROR:
                return {id: 'status', nodes: this.getSectionPreBootError(props)}

            case 'main':
                const nextFrame = !this.system.supportsTouch ? () => {} :
                    () => {
                    };
                return [
                    {id: 'game-div', nodes: this.getMainSection(props), nextFrame},
                    {id: 'game-overlay-div', subId: 'controlsToggler', nodes: this.getControlsToggler()},
                    {id: 'game-overlay-div', subId: 'fps', nodes: this.getFpsOverlay()}
                ]
        }
    }

    getFpsOverlay() {
        const game = this.game
        const { div, pre, icon, kbd, input, stackH, stackV, canvas } = this
        this.fpsCanvas = canvas({width: 120, height: 100})
        return (
            stackV(
                {class: 'full-v full-h absolute'},
                div({class: 'flex'}),
                div({class: 'align-end'},
                    stackV(
                        {class: 'padded inner-space-v align-end all-events min-content-h mono <game.showFps|toHidden>', style: 'background-color: #000000C0; color: white; margin-right: 30px'},
                        stackH(
                            div(
                                {class: 'flex less'},
                                'FPS:'
                            ),
                            div(
                                {class: 'less', onClick: () => game.showFps = false},
                                icon('close')
                            )
                        ),
                        stackH(
                            input(
                                {type: 'text', class: 'less', readOnly: true, tab: -1, size: 3, value: '<game.fps|toFpsInfo>'}
                            ),
                            input(
                                {type: 'text', class: 'less', readOnly: true, tab: -1, size: 6, value: '<game.avgFps|toAvgFps>'}
                            ),
                            input(
                                {type: 'text', class: 'less', readOnly: true, tab: -1, size: 7, value: '<game.minFps,game.maxFps|toFpsRange>'}
                            )
                        ),
                        div(this.fpsCanvas),
                        stackH(
                            'full-h',
                            div({class: 'flex'}),
                            div(
                                {style: 'background-color: #000000C0; color: white', class: 'less'},
                                'Zoom: <game.zoom|toRounded>'
                            )
                        )
                    )
                ),
                div({style: 'height: 60px'})
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
        const { div, stackV } = this

        return div(
            {class: 'center-v'},
            stackV(
            'center-child-h inner-space-v',
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
        const { div, button, pre, stackV, stackH } = this;

        let stack = !IS_DIST && error.stack;
        if (stack) {
            stack = JSON.stringify(stack).replaceAll('\\n', '\n').substring(1);
            stack = stack.substring(0, stack.length - 1)
        }
        return (
            div(
                {class: 'center-v'},
                div({class: 'full-h padded', style: 'background-color: #9f2828;'},
                    stackV(
                        'center-child-h inner-space-v',
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

    getControlsToggler(props) {
        const { div, button, input, icon, stackH, stackV } = this;
        const iconButton = ({ onClick, name, iconName }) => div(
            {class: 'min-content-h'},
            button(
                {onClick, class: 'button-padding'},
                stackH(
                    'inner-space-h padded-h',
                    div(
                        {class: 'min-content-h'},
                        icon(iconName)
                    ),
                    name && div(
                        {class: 'min-content-h hide-when-small'},
                        name
                    )
                )
            )
        )
        return (
            stackV(
                'full-v absolute',
                div({class: 'flex'}),
                div(
                    {class: 'padded all-events'},
                    iconButton({
                        iconName: 'vertical_align_bottom',
                        onClick: () => {
                            this.game.getMandatoryElem('controls').classList.toggle('slide-down')
                            const value = !this.toggle
                            this.toggle = value
                            this.notify('change', {name: 'toggle', value})
                        }
                    })
                )

            )
        )
    }

    getMainSection() {
        const { div, button, input, icon, stackH, stackV } = this;

        const game = this.game
        const system = this.game.system
        const isMobile = system.isMobile

        const toggleFullscreen = () => {
            if (game.isFullscreen) {
                game.exitFullscreenMode()
            } else {
                game.openFullscreenMode()
            }
        }

        const toggleAutoZoom = e => {
            game.autoZoom = !game.autoZoom
        }
        const iconButton = ({ onClick, name, iconName }) => div(
            {class: 'min-content-h'},
            button(
            {onClick, class: 'button-padding'},
                stackH(
                    'inner-space-h padded-h',
                    div(
                        {class: 'min-content-h'},
                        icon(iconName)
                    ),
                    name && div(
                        {class: 'min-content-h hide-when-small'},
                        name
                    )
                )
            )
        )
        const buttons = []

        if (game.hasEditor) {
            buttons.push(
                iconButton({name: 'Editor', iconName: 'build', onClick: () => game.openEditorMode()}),
            )
        }
        const volumeSlider = input(
            {min: 0, max: 100, type: 'range', onInput: e => game.masterVolume = parseInt(e.target.value, 10), value: game.masterVolume}
        )
        const toggleZoomMode = e => {
            game.stepZoom = !game.stepZoom
        }

        const isZoomable = game.minZoom !== game.maxZoom && !(game.autoZoom && !game.autoZoomByUser)

        if (!isMobile) {
            buttons.push(
                stackH(
                    'min-content-h padded-h hide-when-small',
                    div(
                        {class: 'padded-h'},
                        'Zoom:'
                    ),
                    isZoomable && game.autoZoomByUser && iconButton(
                        {onClick: toggleAutoZoom, class: 'button-padding', iconName: '<game.autoZoom|toAutoZoomIcon>'},
                    ),
                    game.stepZoomByUser && iconButton(
                        {onClick: toggleZoomMode, class: 'button-padding', iconName: '<game.stepZoom|toZoomModeIcon>'}
                    ),
                    !isMobile && isZoomable && stackH(
                        {id: 'zoomMode', class: 'min-content-h padded-h hide-when-small', watch: 'game.stepZoom'},
                        stepZoom => stepZoom ?
                            input(
                                {id: 'zoomSlider', min: '<game.minZoom>', step: 1, max: '<game.maxAvailZoom>', type: 'range', onInput: e => game.zoom = parseInt(e.target.value), value: '<game.zoom>'}
                            ) :
                            input(
                                {id: 'zoomSlider', min: '<game.minZoom>', step: 0.01, max: '<game.maxAvailZoom>', type: 'range', onInput: e => game.zoom = parseFloat(e.target.value), value: '<game.zoom>'}
                            )
                    )
                )
            )
        }
        buttons.push(
            iconButton(
                {onClick: () => game.muted = !game.muted, iconName: 'volume_<game.muted|onOff>'}
            )
        )
        if (!isMobile) {
            buttons.push(
                div(
                    {class: 'stack-h min-content-h padded-h hide-when-small'},
                    volumeSlider
                )
            )
        }
       buttons.push(
            iconButton(
                {onClick: () => game.running = !game.running, iconName: '<game.running|pausePlay>'},
            ),
            iconButton(
                {name: 'Reset', iconName: 'restart_alt', onClick: () => game.reset()}
            )
        )
        if (game.showFpsByUser) {
            buttons.push(iconButton(
                {name: 'FPS', iconName: '<game.showFps|toFpsIcon>', onClick: () => game.showFps = !game.showFps}
            ))
        }
        buttons.push(
            iconButton(
                {name: 'Fullscreen', iconName: '<game.isFullscreen|toFullscreenIcon>', onClick: toggleFullscreen}
            )
        )
        const controlBar = div(
            {id: 'controls', class: 'full-h', style: 'background-color: #494964'},
            stackH(
                {class: 'padded full-h'},
                !isMobile && div(
                    {class: 'min-content-h nowrap-shorten hide-when-small', style: 'color: #9eaca9; font-family: Tahoma'},
                    'Remake Engine V' + VERSION_ENGINE + ' - © 2023 do-while-true'
                ),
                div(
                    {class: 'flex mono', style: 'color: white'},
                    div(
                        {class: 'center-h inner-space-h stack-h min-content-h'},
                        ...buttons
                    )
                )
            )
        )

        return (
            stackV(
                {class: 'full-v <this.toggle|toLeftMargin>'},
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
                                    stackH(
                                        'inner-space-h',
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
                        return stackH(
                            div(
                                {class: 'padded'},
                                icon('warning')
                            ),
                            stackV(
                                'flex padded inner-space-v mono medium',
                                ...elems
                            ),
                            div(
                                {class: 'padded', onclick: () => this.game.clearWarnings()},
                                icon('close')
                            )
                        )
                    }

                ),
                controlBar
            )
        )
    }
}

export {
    DefaultRenderPlugin
}