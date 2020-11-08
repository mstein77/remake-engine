import React, {Fragment, useMemo, useState} from "react";
import {Section, Stack, Content, useModal} from "./BaseComponents";
import {BitmapEditor, EditorCtx, useMountedReadyCellProvider} from "./Raster";
import {d} from '../helper/helper';

function StackExamples(props) {
    const examples = [
        {},
        {flex: true},
        {fullHeight: true},
        {fit: true},
        {fit: true, fullHeight: true},
        {fit: true, flex: true},
        {fit: true, fullHeight: true, flex: true},
    ];
    const boxes = [];
    for (let example of examples) {
        const {flex, ...attr} = example;
        const allAttr = Object.assign({}, attr);
        const names = [];
        for (let key in allAttr) {
            if (allAttr[key]) {
                names.push(key);
            }
        }
        if (flex) {
            names.push('flex-child');
        }
        const name = names.join(' | ');
        boxes.push(
            <div key={boxes.length} className="title-area-active">{name}</div>
        );
        boxes.push(
            <div key={boxes.length} style={{display: 'flex'}}>
                <div>
                    <div style={{height: 400, width: 800, border: '1px solid white'}}>
                        <Stack {...allAttr} className="test">
                            <div className="" style={{backgroundColor: 'yellow', width: 200}}>This is one<br />>with two lines</div>
                            <div className={flex ? 'flex' : ''}  style={{backgroundColor: 'blue'}}>This is one</div>
                            <div className=""  style={{backgroundColor: 'green', height: 200}}>This is fix height</div>
                        </Stack>
                    </div>
                </div>

                <div>
                    <div style={{height: 400, width: 800, border: '1px solid white'}}>
                        <Stack vertical {...allAttr} className="test">
                            <div className="" style={{backgroundColor: 'yellow', width: 200}}>This is one<br />>with two lines</div>
                            <div className={flex ? 'flex' : ''}  style={{backgroundColor: 'blue'}}>This is one</div>
                            <div className=""  style={{backgroundColor: 'green', height: 200}}>This is fix height</div>
                        </Stack>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div style={{height: 800, overflow: 'auto'}}>
            {boxes}
        </div>
    );
}

function SpriteSheetEditor(props) {

    const SelectModal = useModal();

    const selectSprite = () => {
        SelectModal.open({bitmap: props.spriteSheet.sheet.elem.toDataURL('image/png'), save: () => {}});
    };

//    return <StackExamples />;

    return (
        <EditorCtx>
            <Content fullHeight>
                <Section name="Sprite sheet" collapse>
                    <Content padded scroll>
                        <button onClick={selectSprite}>Select Sprite</button>
                        {JSON.stringify(props.spriteSheet)}
                    </Content>
                </Section>
            </Content>

            <SelectModal.content name="Select Sprite" height={600} closeable>
                <BitmapEditor
                    resize={false}
                    zoom="2"
                    border="0"
                    cancelHandler={SelectModal.close}
                    saveHandler={SelectModal.props.save}
                    bitmap={SelectModal.props.bitmap}
                />
            </SelectModal.content>
        </EditorCtx>
    );
}

export default SpriteSheetEditor;
