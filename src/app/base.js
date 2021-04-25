import React, {useState, useContext, useMemo, useRef, useEffect, Fragment} from "react";
import ReactDOM from "react-dom";
import {d} from "../app/helper/helper";
import { useModal, useComponentUpdate, useRefocus, Ruler, OkCancelForm, UndoRedoButtons, EditorCtx, EditorSection, EditorContext, WindowContext, ActionBarContent, Section, EntityStack, EntityStackSections, Canvas, ScrollArea, CssCtx, BackgroundControl, ToolGroup, WindowCtx, BackgroundCtx, AvailContext, AvailContextProvider, PropertyGrid, ValueProp, SideTabs, SideTab } from "./components/BasicComponents"
import { Form, Submit, Input, Select, CheckboxProp, Radio, LabelProp, NumberProp, ColorProp, Button, InputProp, RadioProp, Number, Checkbox, Tuple, TupleProp, SelectProp, TextArea } from "./components/FormComponents";
import { DIR, Block, Stack, Grid, Overlays, Overlay, OverlayContext } from "./components/LayoutComponents";

function OverlayCanvas({ render }) {
    const oContext = useContext(OverlayContext);
    return (
        <Canvas width={oContext.width} height={oContext.height} render={render} />
    );
}

function FlexScrollGrid({ render, size, viewX, viewY, width, setViewX, height, setViewY, border, zoom, rulers }) {
    const aContext = useContext(AvailContext);
    const cellSize = size * zoom;

    const originX = rulers ? 30 : 0;
    const originY = rulers ? 30 : 0;

    let spaceY = (aContext.height - border - originX);
    let newViewY = Math.min(height, Math.floor( spaceY / (cellSize + border)));

    let spaceX = (aContext.width - border - originY);
    const newViewX = Math.min(width, Math.floor( spaceX / (cellSize + border)));

    if (viewX !== newViewX) {
        setViewX(newViewX);
    }
    if (viewY !== newViewY) {
        setViewY(newViewY);
    }

    let elem;
    if (viewX > 0 && viewY > 0) {
        const dim = {
            width: border + (cellSize + border) * viewX,
            height: border + (cellSize + border) * viewY
        };

        elem =
            <Overlays width={dim.width + originX} height={dim.height + originY} originX={originX} originY={originY}>
                <OverlayCanvas render={render} />
                {rulers && <Overlay className="bg1" left={-originX} width={originX - 5} height={dim.height} />}
                {rulers && <Overlay className="bg1" top={-originY} height={originY - 5} width={dim.width} />}
            </Overlays>
    } else {
        elem = <Block shorten center className="small-font">No space to render!</Block>;
    }

    return (
        <Block full centerItems>
            {elem}
        </Block>
    )
}

function TestContent(props) {
    const eContext = useContext(EditorContext);

    const [text, setText] = useState(props.text);
    const [x, setX] = useState(18);
    const [y, setY] = useState(33);
    const [value, setValue] = useState(10);
    const [bool, setBool] = useState(true);
    const onClick = () => {
        eContext.doAction(
            () => d('MODAL DO'),
            () => d('MODAL UNDO')
        );
    };
    const hotKeys = {
        undo: () => eContext.undoAction(),
        redo: () => eContext.redoAction()
    };
    return (
        <Stack vertical hotKeys={hotKeys}>
            <UndoRedoButtons />
            <Checkbox readOnly xicon={false} value={bool} set={setBool} />
            <Number max={30} min={0} value={value} set={setValue} />
            <TupleProp autoFocus name="Size:" x={x} setX={setX} y={y} setY={setY} min={1} max={999} />
            <TextArea value={text} set={setText} />
            <Block full="h" wrap onClick={() => {setText(text + props.text)}}>{text}</Block>
            <Button onClick={onClick} name="Hit me!" />
        </Stack>
    );
}

function GridCanvas({size, width, height, ...props}) {
    const TestModal1 = useModal();
    const TestModal2 = useModal();
    const TestModal3 = useModal();
    const TestModal4 = useModal();

    const [ posX, setPosX ] = useState(0);
    const [ posY, setPosY ] = useState(0);
    const [ viewX, setViewX ] = useState(0);
    const [ viewY, setViewY ] = useState(0);
    const [ border, setBorder ] = useState(props.border || 1);
    const [ zoom, setZoom ] = useState(props.zoom || 1);
    const [ rulers, setRulers ] = useState(true);

    const render = ctx => {
        const grid = border;
        const tileX = size * zoom;
        const tileXPlusBorder = tileX + grid;
        const tileY = size * zoom;
        const tileYPlusBorder = tileY + grid;
        ctx.clearRect(0, 0, viewX * tileX, viewY * tileY);

        ctx.fillStyle = '#000000'; // context.contentTextColor;

        const gridHeight = viewY * tileYPlusBorder + grid;
        const gridWidth = viewX * tileXPlusBorder + grid;
        let curr = 0;
        if (grid > 0) {
            for (let x = 0; x <= viewX; x++) {
                ctx.fillRect(curr, 0, grid, gridHeight);
                curr += tileXPlusBorder;
            }
            curr = 0;
            for (let y = 0; y <= viewY; y++) {
                ctx.fillRect(0, curr, gridWidth, grid);
                curr += tileYPlusBorder;
            }
        }
    };

    const maxPosX = Math.max(0, width - viewX);
    const maxPosY = Math.max(0, height - viewY);

    if (posX > maxPosX) {
        setPosX(maxPosX);
    }
    if (posY > maxPosY) {
        setPosY(maxPosY);
    }

    const scrollGrid =
        <ScrollArea auto x={posX} y={posY} setX={setPosX} setY={setPosY} maxX={width} maxY={height} pageX={viewX} pageY={viewY}>
            <AvailContextProvider>
                <FlexScrollGrid render={render} rulers={rulers} size={size} width={width} height={height} viewX={viewX} viewY={viewY} setViewX={setViewX} setViewY={setViewY} height={height} border={border} zoom={zoom} />
            </AvailContextProvider>
        </ScrollArea>;

    const showModal1 = () => {TestModal1.open({});};
    const showModal2 = () => {TestModal2.open({});};
    const showModal3 = () => {TestModal3.open({});};
    const showModal4 = () => {TestModal4.open({});};

    return (
        <>
            <Stack vertical borders full>
                <Stack className="bg3" wrap gaps centerItems full="h">
                    <ToolGroup>
                        <Tuple name="Pos" x={posX} setX={setPosX} min={0} maxX={maxPosX} y={posY} setY={setPosY} maxY={maxPosY} buttons />
                        <Number name="Zoom" value={zoom} set={setZoom} min={1} max={9} buttons />
                        <Number name="Border" value={border} set={setBorder} min={0} max={9} buttons />
                    </ToolGroup>
                    <ToolGroup>
                        <Checkbox name="Rulers" rev={true} icon={true} value={rulers} set={setRulers} />
                    </ToolGroup>
                    <ToolGroup>
                        <Block padded border={1}>Black & White</Block>
                        <Block padded thin border={1}>DAXX!</Block>
                    </ToolGroup>
                    <BackgroundControl />
                </Stack>
                <Grid centerItems full columns="- * -" rows="- * -">
                    <Block padded><Button disabled size={14} icon="add" /></Block>
                    <Block padded><Stack gaps><Button size={14} icon="add" /><Button size={14} icon="remove" /></Stack></Block>
                    <Block padded><Button disabled size={14} icon="remove" /></Block>
                    <Block padded>4</Block>
                    {scrollGrid}
                    <Block padded>6</Block>
                    <Block padded>7</Block>
                    <Block padded>8</Block>
                    <Block padded>9</Block>
                </Grid>
                <Stack className="bg3" wrap gaps full="h">
                    <Block onClick={showModal1} padded border="1">Modal1</Block>
                    <Block onClick={showModal2} padded border="1">Modal2</Block>
                    <Block onClick={showModal3} padded border="1">Modal3</Block>
                    <Block onClick={showModal4} padded border="1">Modal4</Block>
                </Stack>
            </Stack>

            <TestModal1.content name="Arasaka is down">
                <EditorCtx id="modal">
                    <ActionBarContent full="h" padded wrap scroll>
                        <TestContent text={"Auto Width/Height :\n" +
                        "                    And what now, why dont I like it as it is???\n" +
                        "                    And what now, why dont I like it as it is???"} />
                    </ActionBarContent>
                </EditorCtx>
            </TestModal1.content>

            <TestModal2.content name="Arasaka is down" height="50%" width="50%">
                <ActionBarContent full="h" padded wrap scroll>
                    <TestContent text={"Width 50% / Height 50% :\n" +
                    "                    And what now, why dont I like it as it is???\n" +
                    "                    And what now, why dont I like it as it is???"} />
                </ActionBarContent>
            </TestModal2.content>

            <TestModal3.content name="Arasaka is down" maxWidth="50%" maxHeight="50%">
                <ActionBarContent full="h" padded wrap scroll>
                    <TestContent text={"MaxWidth 50% / MaxHeight 50%"} />
                </ActionBarContent>
            </TestModal3.content>

            <TestModal4.content name="Arasaka is down" maxWidth={650} maxHeight={150}>
                <ActionBarContent full="h" padded wrap scroll>
                    <TestContent text={"MaxWidth 250 / MaxHeight 150"} />
                </ActionBarContent>
            </TestModal4.content>

        </>
    )
}

function MyActionButton() {
    const eContext = useContext(EditorContext);

    const onClick = () => {
        eContext.doAction(
            () => {d('PLEASE DO!')},
            () => {d('PLEASE UNDO!')}
        );
    };
    return (
        <Button name="Launch" onClick={onClick} />
    )
}

function TestApp() {
    const wContext = useContext(WindowContext);

    const [mode, setMode] = useState(0);
    const [test, setTest] = useState(6);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [myText, setMyText] = useState('Schwätz nicht du Depp!');
    const [align, setAlign] = useState('left');
    const [activeAlign, setActiveAlign] = useState(1);
    const [entities, setEntities] = useState([
        {id: -1, name: 'xxx'},
        {id: 0, name: 'Here again'},
        {id: 1, name: 'To Daxx'},
        {id: 2, name: 'Space alert!'}
    ]);

    const [repeat, setRepeat] = useState(1);
    let text = '';
    let i = repeat;
    while (i > 0) {
        text += 'So many many many words!';
        i--;
    }
    const options = [
        {id: -1, name: 'xxx'},
        {id: 0, name: 'Here again'},
        {id: 1, name: 'To Daxx'},
        {id: 2, name: 'Space alert!'}
    ];
    const alignOptions = [
        {id: 'left', name: 'format_align_left'},
        {id: 'center', name: 'format_align_center'},
        {id: 'right', name: 'format_align_right'}
    ];
    return (
        <Stack vertical full>

            <Block full="h">
                <Stack full="h" padded="v">
                    <Button icon="keyboard_backspace" padded="h" name="Back" />
                    <Block padded="h" center="v" full="h" shorten>And a very very long very very long very very long very very long title goes here and here and here</Block>
                    <Stack gaps center="v">
                        <Block center="v">Space for Buttons</Block>
                        <Button xborder={DIR.RIGHT|DIR.LEFT} padded="h" icon="pause_circle_outline" name="Replay" />
                        <Button icon="play_circle_outline" disabled padded="h" name="Play" onClick={() => console.log(666)} />
                        <Button border={false} padded={false} onClick={() => wContext.openSettings()} icon="build" />
                    </Stack>
                </Stack>
            </Block>

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
                    <Stack vertical borders full>
                        <Section name="Properties" inner collapse scroll full="h">
                            <Stack vertical full="h" collapsed padded>
                                <MyActionButton />
                            </Stack>
                        </Section>
                        <Stack full>
                            <Section name="Fonts" inner collapse="h" size={300} full="v">
                                <EntityStack area={3} entities={entities} set={setEntities} active={0} />
                            </Section>

                            <Section inner full name="Characters">
                                <Stack borders full>
                                    <Stack vertical gaps padded scroll>
                                        <Checkbox value={true} set={() => {}} />
                                        <Checkbox icon value={true} set={() => {}} />
                                        <Checkbox name="Rulers" value={true} set={() => {}} />
                                        <Checkbox icon name="Rulers" value={true} set={() => {}} />
                                        <Checkbox name="Rulers" rev value={true} set={() => {}} />
                                        <Checkbox icon name="Rulers" rev value={true} set={() => {}} />
                                        <Checkbox name="Rulers" disabled value={true} set={() => {}} />
                                        <Checkbox icon name="x Rulers" disabled value={true} set={() => {}} />
                                    </Stack>


                                    <Block padded full>
                                        <Stack full="h" vertical gaps>
                                            <Select name="Text Align:" options={alignOptions} gaps="1" icon value={align} set={setAlign} />
                                            <Number name="Slide:" xslider="h" tab decimals={2} min={-5} max={10} value={test} set={setTest} />
                                            <TextArea inputDim={{width: '100%'}} tab name="terror squad" cols={10} required value={myText} set={setMyText} rows={5} />
                                            <Submit name="Speichern" />
                                        </Stack>
                                    </Block>

                                    <Block centerItems full="v" padded>
                                        <Stack vertical>
                                            <Number slider buttons={false} name="Repeat" set={setRepeat} value={repeat} min={0} max={30} />
                                            <Block wrap width={200}>{text}</Block>
                                        </Stack>
                                    </Block>
                                </Stack>
                            </Section>
                        </Stack>
                    </Stack>
                </EditorSection>

                <EditorSection id="preview" area={2} full name="Preview" actions={
                    [
                        {name: 'Export', onClick: () => d('EXPORT!')}
                    ]
                }>
                    <Stack full>
                        <EntityStackSections
                            sectionProps={{inner: true, name: 'Text Blocks', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                            detailProps={{inner: true, name: 'Text Block Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                            entities={alignOptions} deselect emptyText="Add new block" active={activeAlign} setActive={setActiveAlign}
                        >
                            {activeAlign === null ?
                                <Block center className="less">No font selected</Block> :
                                <Block padded full="h">
                                    <Grid gaps columns="70px *" full="h">
                                        <InputProp name="Id:" value={alignOptions[activeAlign].id} readOnly />
                                        <TupleProp undo="size" name="Size:" x={x} setX={setX} y={y} setY={setY} min={1} max={999} />
                                        <SelectProp undo={'whatever-' + alignOptions[activeAlign].id} tab={true} required name="Whatever:" options={options} value={mode} set={setMode} />
                                        <RadioProp undo="textalign" name="Text Align:" options={alignOptions} gaps="1" icon value={align} set={setAlign} />
                                    </Grid>
                                </Block>
                            }
                        </EntityStackSections>
                        <Section name="Screen" full inner>
                            <GridCanvas size={10} width={50} height={10} />
                        </Section>
                    </Stack>
                </EditorSection>
                <Block />
            </Stack>
        </Stack>
    )
}


function RealApp() {
    return (
        <Stack vertical gaps full padded>
            <Section size={100} maxHeight="50%" full="h" name="Top Section" collapse padded className="bg2">Here is the Top Section hweh whew hwhe wehw hwe hwehw whe whe hw ehweh wehw hew ehweh weh hewe hwehw ehw</Section>

            <Stack gaps full>
                <Section width={300} minSize={50} maxWidth="25%" maxSize={400} size={155} collapse="h" full className="bg1" name="First Section">
                    <Stack vertical full="h" scroll padded gaps>
                        <Block padded center>
                            <Canvas width={75} height={75} border={1} />
                        </Block>
                        <Block full="h" wrap>Property Grid Here And so many more cool things :-)</Block>
                        <PropertyGrid propWidth="-">
                            <ValueProp name="Just a test">Working or not?</ValueProp>
                            <ValueProp name="DAng">
                                <Block wrap>Herer  wewo woe oweo woew eo ow ewe</Block>
                            </ValueProp>
                        </PropertyGrid>
                    </Stack>
                </Section>
                <Section full name="Second Section">
                    <GridCanvas size={10} width={50} height={10} />
                </Section>
                <Section size={100} collapse="h" rev full="v" shorten className="bg1" padded name="Last Section">
                    Here I am you fucker!
                </Section>
            </Stack>

            <Section full="h" rev size={100} minSize={25} maxHeight="50%" collapsed collapse name="Bottom Section" className="bg2">
                <SideTabs>
                    <SideTab name="First one!" active>
                        Hey man nice shot
                    </SideTab>

                    <SideTab name="A second one?">
                        <Block padded shorten full="h">
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                            XXX Bottom Section
                        </Block>
                    </SideTab>
                </SideTabs>
            </Section>
        </Stack>
    )
}

function NameDialog({ close, save, max, reserved = [], ...props }) {
    const [name, setName] = useState(props.name || '');
    const match = value => !reserved.includes(value);
    return (
        <OkCancelForm full="h" submit padded cancel={close} save={() => save(name)}>
            <Block full="h" padded>
                <PropertyGrid full="h">
                    <InputProp full="h" autoFocus name="Name:" value={name} set={setName} match={match} max={max} required />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function PresetsManager({ id, set, config, ...props }) {
    const wContext = useContext(WindowContext);

    const NameModal = useModal();
    const update = useComponentUpdate();

    const defaultItems = [];
    const customItems = [];

    const presetKey = 'presets.' + id;
    const presets = wContext.storage.getDefaultedArray(presetKey, []);

    const setDefaultedValues = values => {
        set((presets.length > 0) ? { ...presets[0].values, ...values } : { ...values });
    };

    const defaults = wContext.defaults[id];
    if (defaults) {
        for (let item of defaults) {
            defaultItems.push(
                <Block key={item.name} padded="h" full="h">
                    <Button full="h" name={'< ' + item.name} onClick={() => setDefaultedValues({ ...item.values })} />
                </Block>
            )
        }
    }

    const reserved = [];
    for (let item of presets) {
        reserved.push(item.name);
        customItems.push(
            <Stack vertical key={item.name} padded="h" full="h" gaps="1">
                <Button full="h" name={'< ' + item.name} onClick={() => setDefaultedValues(item.values)} />
                <Stack full="h" gaps="1">
                    <Block full="h"></Block>
                    <Button icon="edit" onClick={() => editPresets(item.name)} />
                    <Button icon="delete" onClick={() => deletePresets(item.name)} />
                </Stack>
            </Stack>
        )
    }

    const deletePresets = name => {
        wContext.storage.storeJson(presetKey, presets.filter(item => item.name !== name));
        update();
    };

    const editPresets = name => {
        NameModal.open({
            reserved: reserved.filter(item => item !== name),
            name,
            max: 20,
            save: newName => {
                const newPresets = [];
                for (let item of presets) {
                    newPresets.push(
                        item.name === name ?
                            { ...item, name: newName } : item
                    );
                }
                wContext.storage.storeJson(presetKey, newPresets);
                NameModal.close()
            }
        })
    };

    const addPresets = () => {
        NameModal.open({
            reserved,
            max: 20,
            save: name => {
                wContext.storage.storeJson(presetKey,  [ ...presets, {name, values: props.values} ] )
                NameModal.close();
            }
        });
    };

    return (
        <Block full="v" scroll>
            <Stack full="h" gaps vertical padded>
                {defaultItems}
                <Ruler />
                <Block center>
                    <Button icon="add" onClick={addPresets} />
                </Block>
                <Ruler />
                {customItems}
            </Stack>

            <NameModal.content name={'Store ' + id + ' as...'} width={200}>
                <NameDialog { ...NameModal.props} />
            </NameModal.content>
        </Block>
    )
}

function ConfigSettings({ config, setConfig }) {
    const lastDim = useRef(null);

    useEffect(() => {
        if (lastDim.current === null) {
            lastDim.current = config.maxWidth;
        }
        if (lastDim.current !== config.maxWidth) {
            document.body.style.setProperty('--' + 'max-width', config.maxWidth + 'px')
            lastDim.current = config.maxWidth
        }
    });

    const propSetter = prop => value => setConfig({ ...config, [prop]: value});

    return (
        <Stack full borders>
            <Block padded full="h">
                <PropertyGrid padded>
                    <NumberProp name="Max Width" slider="h" value={config.maxWidth} max={5000} set={propSetter('maxWidth')} min={400} />
                    <NumberProp name="Max Height" slider="h" value={config.maxHeight} max={5000} set={propSetter('maxHeight')} min={400} />
                    <CheckboxProp name="UI Animations" value={config.uiAnimations} set={propSetter('uiAnimations')} />
                    <NumberProp name="History size" value={config.maxHistory} max={100} set={propSetter('maxHistory')} min={5} />
                </PropertyGrid>
            </Block>

            <PresetsManager id="config" set={setConfig} values={config} />
        </Stack>
    )
}

function ThemeSettings({ theme, setTheme, cssPropUpdate }) {
    const themeRef = useRef(null);

    useEffect(() => {
        if (!themeRef.current) {
            themeRef.current = { ...theme };
        }
        for (let key of Object.keys(themeRef.current)) {
            if (theme[key] !== themeRef.current[key]) {
                themeRef.current[key] = theme[key];
                cssPropUpdate(document.body.style, key, theme[key]);
            }
        }
    });

    const propSetter = prop => value => setTheme({ ...theme, [prop]: value});

    return (
        <Stack full borders>
            <Block full="h" padded>
                <PropertyGrid>
                    <NumberProp name="Padding" value={theme.defaultPadding} max={20} set={propSetter('defaultPadding')} min={0} />
                    <NumberProp name="Border Width" value={theme.boxBorderWidth} max={10} set={propSetter('boxBorderWidth')} min={0} />
                    <ColorProp name="Border Color" value={theme.boxBorderColor} set={propSetter('boxBorderColor')} />
                    <InputProp name="Font-URL" value={theme.fontUrl} set={propSetter('fontUrl')} />
                </PropertyGrid>
            </Block>
            <PresetsManager id="theme" set={setTheme} values={theme} />
        </Stack>
    )
}

function HotKeyRecorder({ action, save, close, mapping, ...props }) {
    const [hotKey, setHotKey] = useState(null);
    const recorderRef = useRef(null);

    const onKeyDown = e => {
        let newHotKey = '';
        let actionKey = '';
        if (e.metaKey) {
            newHotKey += 'm';
        } else if (e.ctrlKey) {
            newHotKey += 'c';
        } else if (e.altKey) {
            newHotKey += 'a';
        } else if (HotKeySingleKeys.includes(e.key)) {
            actionKey = e.key;
        }
        if (newHotKey.length > 0 && e.shiftKey) {
            newHotKey += 'i';
        }
        if (newHotKey !== '') {
            actionKey = newHotKey;
            if (!HotKeySkipValues.includes(e.key)) {
                actionKey += ' ' + e.key;
            }
        }

        if (e.key !== 'Tab') {
            e.preventDefault();
            e.stopPropagation();
        } else return;

        if (actionKey === hotKey) {
            return
        }
        setHotKey(actionKey !== '' ? actionKey : null)
    };

    let delAction = null;
    if (hotKey && hotKey !== props.hotKey) {
        for (let [currAction, actionHotKey] of Object.entries(mapping)) {
            if (hotKey === actionHotKey) {
                delAction = currAction;
            }
        }
    }

    const isHotKeyOnly = value => value.match(/^[mca]i?$/);

    const onKeyUp = e => {
        if (hotKey !== null && isHotKeyOnly(hotKey)) {
            setHotKey(null);
        }
    };

    const okOp = {
        can: () => hotKey !== null && !isHotKeyOnly(hotKey),
        exec: () => save(hotKey, delAction)
    };

    return (
        <Stack vertical borders width={300}>
            <Stack padded center vertical gaps full="h">
                <Block center="h">{'Press HotKey for action "' + action + '":'}</Block>
                <Block padded center>
                    <Block onKeyDown={onKeyDown} onKeyUp={onKeyUp} ref={recorderRef} tab border height={60} className="autofocus" padded>
                        <HotKeyKeys hotKey={hotKey} empty="press hotkey" />
                    </Block>
                </Block>
                {
                    delAction &&
                        <Block full="h" padded>
                            <Stack padded border="1" full="h">
                                <Block padded centerItems><Button border={false} icon="warning" /></Block>
                                <Block padded wrap full="h">
                                    {`This HotKey is currently assigned to "${delAction}", if you save this assignment gets deleted!`}
                                </Block>
                            </Stack>
                        </Block>
                }
            </Stack>
            <Stack padded gaps>
                <Button name="OK" onClick={okOp} />
                <Button name="Cancel" onClick={close} />
            </Stack>
        </Stack>
    )
}

const HotKeySingleKeys = ['Escape'];
const HotKeySkipValues = ['Meta', 'Control', 'Alt', 'Shift'];

function HotKeyKeys({ hotKey, empty }) {

    const keys = [];
    let elems = [];
    if (hotKey !== null) {
        const [hotPart, keyPart] = hotKey.split(' ');
        if (hotPart.startsWith('m')) {
            keys.push('CMD ⌘')
        } else if (hotPart.startsWith('c')) {
            keys.push('CTRL')
        } else if (hotPart.startsWith('a')) {
            keys.push('ALT');
        }
        if (keys.length > 0) {
            if (hotPart.indexOf('i') !== -1) {
                keys.push('SHIFT');
            }
            if (keyPart) {
                keys.push(keyPart);
            }
        } else if (HotKeySingleKeys.includes(hotPart)) {
            keys.push(hotPart);
        }
    }
    if (keys.length) {
        for(let key of keys) {
            if (elems.length) {
                elems.push(<Button key={'_' + elems.length} border={false} icon="add" className="less" />);
            }
            elems.push(<Block key={key} padded border="1"><kbd>{key}</kbd></Block>);

        }
        return (
            <Stack gaps center="v">{elems}</Stack>
        )
    }
    return (
        <Block centerItems full className="less">{empty}</Block>
    )
}

function HotKeySettings({ mapping, setMapping }) {
    const RecordModal = useModal();

    const clearAction = action => {
        const newMapping = { ...mapping };
        newMapping[action] = null;
        setMapping(newMapping)
    };

    const items = [];
    for (let [action, hotKey] of Object.entries(mapping)) {
        const deleteOp = {
            exec: () => clearAction(action),
            can: () => hotKey !== null
        };
        const assignOp = () => {
            RecordModal.open({
                action,
                hotKey,
                mapping,
                save: (value, oldAction) => {
                    const newMapping = { ...mapping };
                    if (oldAction) {
                        newMapping[oldAction] = null;
                    }
                    newMapping[action] = value;
                    setMapping(newMapping);
                    RecordModal.close()
                }
            });
        };
        items.push(
            <Fragment key={items.length}>
                <Block padded center="v">{action + ':'}</Block>
                <HotKeyKeys hotKey={hotKey} empty="not assigned" />
                <Stack padding="h" gaps center>
                    <Button icon="delete" onClick={deleteOp} />
                    <Button icon="keyboard" onClick={assignOp} />
                </Stack>
            </Fragment>
        )
    }
    return (
        <Stack full borders>
            <Block padded scroll full="h">
                <Grid columns="- + 80px" full="v" gaps>
                    {items}
                </Grid>
                <RecordModal.content name="Assign HotKey">
                    <HotKeyRecorder {...RecordModal.props} />
                </RecordModal.content>
            </Block>
            <PresetsManager id="mapping" set={setMapping} values={mapping} />
        </Stack>
    )
}

function Settings({ save, close, defaults }) {
    const wContext = useContext(WindowContext);

    const [config, setConfig] = useState(wContext.editorConfig);
    const [theme, setTheme] = useState(wContext.theme);
    const [mapping, setMapping] = useState(wContext.hotKeyActions.action2hotKey);

    const buttons = useMemo(() => {
        return [
            <Button key="clear" name="Clear all settings" onClick={() => {
                wContext.clearAllSettings();
                setConfig(defaults.config);
                setTheme(defaults.theme);
                for (let [key, value] of Object.entries(defaults.theme)) {
                    wContext.cssPropUpdate.current(document.body.style, key, value);
                }
                setMapping(defaults.mapping);
            }} />
        ];
    }, []);

    return (
        <OkCancelForm full save={() => save({ config, theme, mapping })} cancel={close} buttons={buttons}>
            <SideTabs full>
                <SideTab name="Editor" active full>
                    <ConfigSettings config={config} setConfig={setConfig} />
                </SideTab>

                <SideTab name="Theme" full>
                    <ThemeSettings theme={theme} setTheme={setTheme} cssPropUpdate={wContext.cssPropUpdate.current} />
                </SideTab>

                <SideTab name="HotKeys" full scroll>
                    <HotKeySettings mapping={mapping} defaults={defaults.mapping} setMapping={setMapping} />
                </SideTab>
            </SideTabs>
        </OkCancelForm>
    )
}

function BaseAppInner({ children }) {
    const wContext = useContext(WindowContext);
    const SettingsModal = useModal();

    wContext.settingsRef.current = SettingsModal;

    const onFocus = e => {
        wContext.lastTarget.current = e.target;
        const zIndex = wContext.focusStack.zIndex;
        if (!zIndex) {
            return;
        }
        const focusElem = wContext.focusStack.elem[zIndex];
        if (!focusElem || !focusElem.top) {
            return;
        }
        if (focusElem.top.contains(document.activeElement)) {
            return;
        }
        focusElem.start.focus();
    };

    useEffect(() => {
        const hotkeyListener = e => {
            if (wContext.isInExclusiveMode()) {
                // TODO allow certain hotkeys?
                return;
            }
            let hotKey = '';
            let actionKey = '';
            if (e.metaKey) {
                hotKey += 'm';
            } else if (e.ctrlKey) {
                hotKey += 'c';
            } else if (e.altKey) {
                hotKey += 'a';
            } else if (HotKeySingleKeys.includes(e.key)) {
                actionKey = e.key;
            } else if (e.key >= '0' && e.key <= '9' &&
                !(document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName))) {
                if (wContext.focusHotKeyArea(e.key)) {
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
            }
            if (hotKey.length > 0 && e.shiftKey) {
                hotKey += 'i';
            }
            if (hotKey !== '') {
                actionKey = hotKey;
                if (!HotKeySkipValues.includes(e.key)) {
                    actionKey += ' ' + e.key;
                }
            }
            if (!actionKey) {
                return;
            }
            const elem = document.activeElement === document.body ? wContext.lastTarget.current : document.activeElement;
            const handler = wContext.getHandlerForActionKey(actionKey, elem);
            if (handler) {
                if (!e.repeat) {
                    if (typeof handler === 'object') {
                        if (!handler.can || handler.can()) {
                            handler.exec();
                        }
                    } else {
                        handler();
                    }
                }
                e.stopPropagation();
                e.preventDefault();
            }
        };
        const clickListener = e => {
            wContext.lastTarget.current = e.target;
        };
        window.addEventListener('mousedown', clickListener, {});
        window.addEventListener('keydown', hotkeyListener, {});
        return () => {
            window.removeEventListener('mousedown', clickListener, {});
            window.removeEventListener('keydown', hotkeyListener, {})
        }
    });
    return (
            <Block onFocus={onFocus} center="h" full padded="h" className="editor-bounds">
                <>
                    {children}
                    <SettingsModal.content name="Settings" height="50%" width="50%" fixStyle transparent drag>
                        <Settings { ...SettingsModal.props } />
                    </SettingsModal.content>
                </>
            </Block>
    )
}


function BaseApp({}) {
    const test = 1;

    return (
        <CssCtx>
            <WindowCtx>
                <BackgroundCtx>
                    <BaseAppInner>
                        {test ? <TestApp /> : <RealApp />}
                    </BaseAppInner>
                </BackgroundCtx>
            </WindowCtx>
        </CssCtx>
    )
}

ReactDOM.render(
    <BaseApp />,
    document.getElementById('app')
);