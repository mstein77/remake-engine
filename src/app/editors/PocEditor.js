import React, { Fragment, useState, useContext, useRef, useEffect } from "react";
import { Stack, Block } from "../components/LayoutComponents";
import { d, clamp } from "../helper/helper";
import { Button } from "../components/FormComponents";
import {ButtonStack, useFocusElements} from "../components/BasicComponents";

function FocusMarker({ reset, items, page }) {
    const [ pos, setPos ] = useState(0);
    const [ active, setActive ] = useState(reset ? null : 0);

    const fElems = useFocusElements({ count: items.length, pos, handleSpace: true, setPos, active, setActive, page, reset });
    const elems = [];
    let i = pos;
    while (i <= fElems.last) {
        const curr = i;
        elems.push(
            <Block
                key={curr} onLeftClick={fElems.leftClick(curr)} tab={fElems.focusItem === curr}
                width={50} height={50} border="1" padded className={(active === curr ? 'active' : 'secondary') + '-bg'}>
                {curr}
            </Block>
        )
        i++
    }
    return (
        <Block { ...fElems.attr } className="stack-h padded inner-space-h">
            {elems}
        </Block>
    )
}

function FocusButtons({ items, reset }) {
    const [ active, setActive ] = useState(reset ? null : 0);

    const fElems = useFocusElements({ count: items.length, active, setActive, reset });
    const elems = [];
    let i = 0;
    while (i <= fElems.last) {
        const curr = i;
        const props = items[i];
        elems.push(
            <Button
                key={curr} current={active} value={i}
                onClick={fElems.leftClick(curr)}
                tab={fElems.focusItem === curr}
                padded="h"
                tabControlled
                { ...props }
            />
        );
        i++
    }
    return (
        <Block { ...fElems.attr } className="stack-h padded inner-space-h">
            {elems}
        </Block>
    )
}

/**
 * TODO:
 *
 *
 *   a) hotkey behaviour
 *       - add
 *       - delete
 *
 *   b) id-strings
 *
 *
 * @returns {JSX.Element}
 * @constructor
 */
function PocEditor() {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const items1 = ['x'];
    const [x ,setX ] = useState(true);
    const buttons = [
        {name: 'Hey'},
        {name: 'Right'},
        {name: 'Here!'}
    ];
    const buttons3 = [
        {name: 'Hey', onClick: {exec: () => setX(false), can: () => x}},
        {name: 'Right', onClick: () => setX(true), onClickEnd: () => {d('END?')}},
        {name: 'Here!', onClick: () => d('###')}
    ];
    const buttons2 = [
        {name: 'Hey'}, {name: 'Right'}, {name: 'Here!'},
        {name: 'Hey2', disabled: true}, {name: 'Right2'}, {name: 'Here!2'},
    ];
    return (
        <Stack vertical gaps>
            <FocusMarker items={items1} reset page={3} />
            <FocusMarker items={items} page={3} />
            <FocusMarker items={items} page={10} reset />
            <FocusMarker items={items} reset />

            <FocusButtons items={buttons} page={10} />
            <FocusButtons items={buttons2} page={10} />

            <ButtonStack
                gaps="1" buttons={buttons3} buttonProps={{padded: 'h'}} />
        </Stack>
    )
}

export {
    PocEditor
}