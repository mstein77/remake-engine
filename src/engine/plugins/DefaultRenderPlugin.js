import { RenderPlugin } from "./RenderPlugin.js";

class DefaultRenderPlugin extends RenderPlugin {

    constructor(props) {
        super(props)
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
            case 'init':
                return {nodes: this.getBootSection()}

            case 'loading':
                return {id: 'status', nodes: this.getSectionLoading()}

            case 'error':
                return {id: 'status', nodes: this.getSectionError(props)}

            case 'main':
                return {nodes: this.getMainSection(props)}
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

    getSectionError({ error }) {
        const { div, button } = this;

        const click = () => this.game.initAndBoot()
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
                            error
                        ),
                        div(
                            {class: 'center-h padded'},
                            button(
                                {style: 'width: 150px', onClick: click},
                                'Retry'
                            )
                        )
                    )
                )
            )
        )
    }

    filterOnOff(value) {
        return value ? 'off' : 'up'
    }

    filterIsMinZoom(value) {
        return value === 1
    }

    filterIsMaxZoom(value) {
        return value === 4
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

    getMainSection() {
        const { div, button, input, icon } = this;

        const goFullScreen = () => console.log('GO FULL-SCREEN!');
        const game = this.game;
        const buttons = [
            {name: 'Fullscreen', sideIcon: 'fullscreen', click: () => {this.game.addWarning('No fullscreen my friend!'); this.game.openFullScreenMode()}},
            {name: 'Editor', sideIcon: 'build', click: () => {this.game.addWarning('No editor available!'); this.game.openEditorMode()}
            },
            {name: 'Reset', sideIcon: 'restart_alt', click: () => this.game.initAndBoot()},
        ];

        const buttonElems = [
            div(
                {class: 'stack-h min-content-h padded-h'},
                div(
                    {class: 'padded-h mono', style: 'color: #FFFFFF'},
                    'Zoom: '
                ),
                button(
                    {disabled: '<game.zoom|isMinZoom>', onClick: () => game.setZoom(Math.max(game.zoom - 1, 0))},
                    '-'
                ),
                input(
                    {readonly: true, size: 1, type: 'text', value: '<game.zoom>'}
                ),
                button(
                    {disabled: '<game.zoom|isMaxZoom>', onClick: () => game.setZoom(Math.min(game.zoom + 1, 9))},
                    '+'
                )
            ),
            div(
                {class: 'stack-h min-content-h padded-h'},
                div(
                    {class: 'padded-h mono', style: 'color: #FFFFFF'},
                    'Volume: '
                ),
                button(
                    {disabled: '<game.muted,game.masterVolume|mutedOrMinVolume>', onClick: () => game.setMasterVolume(Math.max(game.masterVolume - 10, 0))},
                    '-'
                ),
                input(
                    {disabled: '<game.muted>', readonly: true, size: 4, type: 'text', value: '<game.masterVolume>%'}
                ),
                button(
                    {disabled: '<game.muted,game.masterVolume|mutedOrMaxVolume>', onClick: () => game.setMasterVolume(Math.min(game.masterVolume + 10, 100))},
                    '+'
                )
            ),
            button(
                {onClick: () => game.toggleMuted()},
                icon(
                    'volume_<game.muted|onOff>'
                )
            ),
            button(
                {onClick: () => game.toggleRunning()},
                icon(
                    '<game.running|pausePlay>'
                )
            )
        ];
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
                            {id: "screen-div", style: "flex-shrink: 0; margin: 0 15px 0px 15px; padding: 0; width: " + (game.width * game.zoom) + 'px; height: ' + (game.height * game.zoom) + 'px'},
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
                                {class: 'stack-v flex padded inner-space-v'},
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