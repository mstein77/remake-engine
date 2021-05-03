import React, {useContext, useMemo, useState, useRef } from "react";
import {EditorSection, EditorContext, useModal, NameDialog, EntityStack, OkCancelForm, useUpdateOnEntityIndexChanges, PropertyGrid, EntityStackSections, Section, WindowContext} from "../components/BasicComponents";
import {Block, Grid, Stack} from "../components/LayoutComponents";
import {d} from "../helper/helper";
import {
    Checkbox,
    Input,
    InputProp,
    NumberProp,
    Number,
    RadioProp,
    Select,
    SelectProp,
    LabelProp,
    CheckboxProp,
    FullProp,
    Submit,
    Button,
    TextArea,
    TupleProp
} from "../components/FormComponents";
import {FontIndex, TextBlockIndex} from "../classes/EntityIndex";

function FontProperties({ font, reserved, save, close }) {
    const [value, setValue] = useState(font.value);
    const [width, setWidth] = useState(font.width);
    const [height, setHeight] = useState(font.height);

    const saveFont = () => save({ ...font, value, width, height});

    return (
        <OkCancelForm submit save={saveFont} cancel={close} full>
            <Block full="h" padded>
                <PropertyGrid full="h" padded>
                    <InputProp name="ID:" required match={value => !reserved.includes(value)} value={value} set={setValue} />
                    <TupleProp name="Size:" x={width} setX={setWidth} min={1} max={128} y={height} setY={setHeight} />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function CharManager({ charIndex }) {
    const view = charIndex.getView(0, 10);
    const elems = [];
    for (let index of view.matches) {
        elems.push(<Block key={index} padded border>{charIndex.getEntityValue(index)}</Block>);
    }
    return (
        <Stack center vertical borders>
            <Stack padded gaps>{elems}</Stack>
            <Block>{view.matches.length + ' of ' + view.count}</Block>
        </Stack>
    )
}

function FontEditor({ fontIndex, activeFont, setActiveFont }) {
    const eContext = useContext(EditorContext);

    const NewFontModal = useModal();

    useUpdateOnEntityIndexChanges(fontIndex);

    const currFont = fontIndex.getEntityObject(activeFont);

    const newFont = () => {
        const font = {value: 'MyNewId', map: [], width: 8, height: 8, image: null};
        NewFontModal.open({
            font,
            reserved: fontIndex.getPropValues('value'),
            save: newFont => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = fontIndex.setEntityObject(newFont);
                    },
                    () => {
                        fontIndex.deleteEntity(index);
                    }
                );
                setActiveFont(fontIndex.getLength() - 1);
                NewFontModal.close()
            }
        });
    };

    return (
        <Stack vertical full>
            <Stack full>
                <Section inner
                         name="Fonts" size={250} maxWidth="33%" collapse="h" full="v">
                    <EntityStack
                        area={3} entityIndex={fontIndex} getInfo={obj => 'Size: ' + obj.width + 'x' + obj.height}
                        active={activeFont} setActive={setActiveFont}
                        add={newFont}
                        emptyText="Add new Font"
                    />
                </Section>

                <Section inner full name="Characters">
                    {currFont.chars && <CharManager charIndex={currFont.chars} />}
                </Section>

                <NewFontModal.content name="New Font" width={250}>
                    <FontProperties { ...NewFontModal.props } />
                </NewFontModal.content>
            </Stack>

        </Stack>
    )
}

function TextBlockEditor({ blockIndex, fontIndex, activeFont }) {
    const eContext = useContext(EditorContext);

    const NewBlockModal = useModal();

    const [activeBlock, setActiveBlock] = useState(0);

    useUpdateOnEntityIndexChanges(blockIndex);

    const blockRef = useRef(null);
    blockRef.current = blockIndex.getEntityObject(activeBlock);

    const alignOptions = [
        {id: 'left', name: 'format_align_left'},
        {id: 'center', name: 'format_align_center'},
        {id: 'right', name: 'format_align_right'}
    ];

    const setEntityProp = prop => {
        return value => {
            blockIndex.setEntityPropValue(blockRef.current.index, prop, value);
            blockIndex.notify();
        };
    };

    const fontOptions = [];
    const values = fontIndex.getPropValues('value');
    for (let value of values) {
        fontOptions.push({id: value, name: value});
    }

    const currBlock = blockRef.current;

    const clearFilter = () => {
        const redoValue = currBlock.filters;
        const index = currBlock.index;
        eContext.doAction(
            () => blockIndex.setEntityPropValue(index, 'filters', ''),
            () => blockIndex.setEntityPropValue(index, 'filters', redoValue)
        )
    };

    const newBlock = () => {
        NewBlockModal.open({
            reserved: blockIndex.getPropValues('value'),
            save: value => {
                let index = null;
                const font = fontIndex.getEntityValue(activeFont);
                eContext.doAction(
                    () => index = blockIndex.setEntityObject({
                        value,
                        text: '',
                        font,
                        lineSpacing: 0,
                        autoCenteringX: false,
                        autoCenteringY: false,
                        alignToGrid: false,
                        textAlign: 'left',
                        filters: '',
                        x: 0,
                        y: 0,

                    }),
                    () => blockIndex.deleteEntity(index)
                );
                setActiveBlock(blockIndex.getLength() - 1);
                NewBlockModal.close();
            }
        })
    };

    return (
        <Stack full>
            <EntityStackSections
                sectionProps={{inner: true, name: 'Text Blocks', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                detailProps={{inner: true, name: 'Text Block Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                entityIndex={blockIndex}
                deselect add={newBlock} clone order
                emptyText="Add new block"
                active={activeBlock} setActive={setActiveBlock}
            >
                {currBlock === null ?
                    <Block center className="less">No block selected</Block> :
                    <Block padded full="h" scroll>
                        <Grid gaps columns="90px *" full="h">
                            <SelectProp name="Font:" undo="font" options={fontOptions} value={currBlock.font} set={setEntityProp('font')} />
                            <TupleProp name="Position:" undo="position" x={currBlock.x} setX={setEntityProp('x')} y={currBlock.y} setY={setEntityProp('y')} />
                            <NumberProp name="Line Spacing" undo="spacing" value={currBlock.lineSpacing} set={setEntityProp('lineSpacing')} />
                            <LabelProp name="Auto Centering">
                                <Stack gaps>
                                    <Checkbox name="X" undo="center-x" value={currBlock.autoCenteringX} set={setEntityProp('autoCenteringX')} />
                                    <Checkbox name="Y" undo="center-y" value={currBlock.autoCenteringY} set={setEntityProp('autoCenteringY')} />
                                </Stack>
                            </LabelProp>
                            <CheckboxProp name="Align to grid" undo="alignGrid" value={currBlock.alignToGrid} set={setEntityProp('alignToGrid')} />
                            <RadioProp undo="textalign" name="Text Align:" options={alignOptions} gaps="1" icon value={currBlock.textAlign} set={setEntityProp('textAlign')} />
                            <FullProp name="Text:">
                                <TextArea undo="text" value={currBlock.text} set={setEntityProp('text')} full="h" rows={5} />
                            </FullProp>
                            <LabelProp name="Filters:">
                                <Stack full="h">
                                    <Stack>
                                        <Input full="h" readOnly value={currBlock.filters} />
                                        <Button icon="clear" onClick={clearFilter} />
                                    </Stack>
                                </Stack>
                            </LabelProp>
                        </Grid>
                    </Block>
                }
            </EntityStackSections>

            <Section name="Screen" full inner>
                <Block center>Preview goes here...</Block>
            </Section>

            <NewBlockModal.content name="New Text Block" width={250}>
                <NameDialog { ...NewBlockModal.props } />
            </NewBlockModal.content>
        </Stack>
    )
}

function TextPaneEditor({ model }) {
    const wContext = useContext(WindowContext);

    const [activeFont, setActiveFont] = useState(0);

    const fontIndex = useMemo(() => {
        return new FontIndex(model);
    }, [model]);

    const blockIndex = useMemo(() => {
        return new TextBlockIndex(model)
    }, [model]);

    return (
        <Stack full vertical gaps>
            <EditorSection id="pane" area={1} link={3} full="h" centerItems size={300} maxSize={400} name="TextPane"
                           actions={
                               [
                                   {name: 'Revert', onClick: () => d('REVERT!')},
                                   {name: 'Save',
                                       disabled: eContext => eContext.hasStorePos(),
                                       onClick: eContext => {
                                           eContext.updateRestorePos()
                                       }
                                   },
                                   {name: 'Deploy', onClick: () => {d('DEPLOY!'); wContext.clearEditor('preview')}},
                                   {name: 'Export', onClick: () => d('EXPORT!')},
                               ]
                           }>
                <FontEditor full fontIndex={fontIndex} activeFont={activeFont} setActiveFont={setActiveFont} />
            </EditorSection>

            <EditorSection id="preview" area={2} full name="Preview" actions={
                [
                    {name: 'Export', onClick: () => d('EXPORT!')}
                ]
            }>
                <TextBlockEditor full blockIndex={blockIndex} fontIndex={fontIndex} activeFont={activeFont} />
            </EditorSection>
        </Stack>
    )
}

export {
    TextPaneEditor
}