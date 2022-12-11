import { TouchControlsPlugin } from "./classes"
import { d } from "helper/helper"
import { div, stackH, stackV } from "helper/dom"

class DefaultTouchControlsPlugin extends TouchControlsPlugin {

    init(options) {
        this.reset()
    }

    reset() {
        super.reset()
        this.touchedElems = new Set()
    }

    getTouchedButtonElems(touch) {
        const elems = []
        const elem = document.elementFromPoint(touch.clientX, touch.clientY)
        if (elem && elem.classList.contains('touch-btn')) elems.push(elem)

        return elems
    }

    markTouchedElem(elem) {
        elem.classList.toggle('touching', true)
        elem.classList.toggle('transparent', false)
    }

    unmarkTouchedElem(elem) {
        elem.classList.toggle('touching', false)
        elem.classList.toggle('transparent', true)
    }

    getTouchIdsForElem(elem) {
        return elem.id.substr(10).split('_')
    }

    syncEventTouches(touches, name) {
        const newInputs = new Set()
        const newTouchedElems = new Set()
        if (touches.length) {
            for (let touch of touches) {
                const elems = this.getTouchedButtonElems(touch)

                for (let elem of elems) {
                    this.markTouchedElem(elem)
                    newTouchedElems.add(elem)
                    const touchIds = this.getTouchIdsForElem(elem)
                    for (const id of touchIds) {
                        newInputs.add(id)
                    }
                }
            }
        }
        for(let elem of this.touchedElems) {
            if (!newTouchedElems.has(elem)) this.unmarkTouchedElem(elem)
        }
        this.touchInputs = newInputs
        this.touchedElems = newTouchedElems
    }

    registerListeners() {
        const { game } = this
        const elem = game.getMandatoryElem('touch-div')
        game.registerListeners([
            {
                elem,
                type: 'touchstart',
                handler: e => {
                    this.syncEventTouches(e.touches, 'start')
                    e.preventDefault()
                }
            },
            {
                elem,
                type: 'touchmove',
                handler: e => {
                    this.syncEventTouches(e.touches, 'move')
                    e.preventDefault()
                }
            },
            {
                elem,
                type: 'touchcancel',
                handler: e => {
                    this.syncEventTouches(e.touches, 'cancel')
                    e.preventDefault()
                }
            },
            {
                elem,
                type: 'touchend',
                handler: e => {
                    this.syncEventTouches(e.touches, 'end')
                    e.preventDefault()
                }
            }
        ])
    }

    notify(action, props) {
        switch(action) {
            case 'change':
                if (props.name === 'running') {
                    this.reset()
                }
                break;

            case 'main':
                const cls = 'touch-btn boxed-1 transparent block'
                this.game.addTouchDiv(
                    div(
                        {class: 'full-h all-events', style: 'padding-top: 30px; padding-bottom: 30px; opacity: 0.3'},
                        stackH(
                            'full-h',
                            div(
                                {class: 'grid', style: 'margin-left: 20px; margin-top: 45px; grid-template-columns: 50px 50px 50px; grid-template-rows: 50px 50px 50px; grid-gap: 2px'},
                                div({id: 'touch-btn-left_up', class: cls, style: 'width: 30px; height: 30px; margin-left: 18px; margin-top: 18px'}),
                                div({id: 'touch-btn-up', class: cls}),
                                div({id: 'touch-btn-right_up', class: cls, style: 'width: 30px; height: 30px; margin-right: 18px; margin-top: 18px'}),
                                div({id: 'touch-btn-left', class: cls}),
                                div(),
                                div({id: 'touch-btn-right', class: cls}),
                                div({id: 'touch-btn-left_down', class: cls, style: 'width: 30px; height: 30px; margin-bottom: 18px; margin-left: 18px'}),
                                div({id: 'touch-btn-down', class: cls}),
                                div({id: 'touch-btn-right_down', class: cls, style: 'width: 30px; height: 30px; margin-bottom: 18px; margin-right: 18px'})
                            ),
                            div(
                                {class: 'flex'}
                            ),
                            stackH(
                                {class: 'inner-space-h padded', style: 'margin-right: 30px; margin-top: 45px'},
                                div(
                                    {
                                        id: 'touch_btn_1',
                                        style: 'width: 55px; height: 110px',
                                        class: 'touch-btn boxed-1 transparent block all-events'
                                    }
                                ),
                                div(
                                    {
                                        id: 'touch_btn_2',
                                        style: 'width: 55px; height: 110px',
                                        class: 'touch-btn boxed-1 transparent block all-events'
                                    }
                                )
                            )
                        )
                    ),
                )
                break;
        }
    }
}

export { DefaultTouchControlsPlugin }