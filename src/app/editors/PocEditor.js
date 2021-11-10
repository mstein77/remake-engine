import React, { Fragment, useState, useContext, useRef, useEffect, useMemo } from "react";
import { Stack, Block } from "../components/LayoutComponents";
import { d, clamp } from "../helper/helper";
import { Button, OkCancelForm } from "../components/FormComponents";
import { useModal, ButtonStack, Canvas, useFocusElements } from "../components/BasicComponents";
import { ColorIndex } from "../classes/EntityIndex";
import { EntityStack } from "../components/EntityComponents";

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

// TODO: remove
function FastCanvas() {
    const sizeX = 2;
    const sizeY = 2;
    const cells = 100;
    const width = sizeX * cells;
    const height = sizeY * cells;
    const buffer = new ArrayBuffer((cells * cells) << 2);
    const colors32 = new Uint32Array(buffer);
    for (let y = 0; y < cells; y++ ) {
        for (let x = 0; x < cells; x++) {
            colors32[y * cells + x] = parseInt((x + y) % 2 === 0 ? 'F04040FF' : 'D0D0D0FF', 16);
        }
    }
    const render = ctx => {
        let pos = 0;
        let posY = 0;
        for (let y = 0; y < cells; y++) {
            let posX = 0;
            for (let x = 0; x < cells; x++) {
                ctx.fillStyle = '#' + colors32[pos].toString(16);
                ctx.fillRect(posX, posY, sizeX, sizeY);
                pos++;
                posX += sizeX;
            }
            posY += sizeY;
        }
    };
    return (
        <Block><Canvas border width={width} height={height} render={render} /></Block>
    );
}

function TestForm({close, save}) {
    return (
        <OkCancelForm full cancel={close} submit save={save}>
            Hello!
        </OkCancelForm>
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
    const TestModal = useModal();
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
        {name: 'Here!', onClick: () => {
            TestModal.open({
                save: () => {
                    TestModal.close()
                }
            });
            }
        }
    ];
    const buttons2 = [
        {name: 'Hey'}, {name: 'Right'}, {name: 'Here!'},
        {name: 'Hey2', disabled: true}, {name: 'Right2'}, {name: 'Here!2'},
    ];

    const colIndex = useMemo(() => {
        return new ColorIndex({colors: ['#FFFFFF00', '#00000000', '#888888FF']});
    }, [])

    return (
        <Stack vertical gaps>
            <Block full="h" border="1">
                <EntityStack
                    entityIndex={colIndex}
                />
            </Block>
            <FocusMarker items={items1} reset page={3} />
            <FocusMarker items={items} page={3} />
            <FocusMarker items={items} page={10} reset />
            <FocusMarker items={items} reset />

            <FocusButtons items={buttons} page={10} />
            <FocusButtons items={buttons2} page={10} />

            <ButtonStack
                gaps="1" buttons={buttons3} buttonProps={{padded: 'h'}} />

            <TestModal.content width={200} height={200}>
                <TestForm { ...TestModal.props } />
            </TestModal.content>
        </Stack>
    )
}

export {
    PocEditor
}