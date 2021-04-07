import React, { useState, useContext } from "react";
import ReactDOM from "react-dom";
import {d} from "../app/helper/helper";
import { useModal, WindowContext, ActionBarContent, Section, EntityStack, EntityStackSections, Canvas, ScrollArea, CssCtx, BackgroundControl, ToolGroup, WindowCtx, BackgroundCtx, AvailContext, AvailContextProvider, PropertyGrid, ValueProp, SideTabs, SideTab } from "./components/BasicComponents"
import { Form, Submit, Input, Button, InputProp, RadioProp, Number, Checkbox, Tuple, TupleProp, SelectProp, TextArea } from "./components/FormComponents";
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
    const [text, setText] = useState(props.text);
    const [x, setX] = useState(18);
    const [y, setY] = useState(33);
    const [value, setValue] = useState(10);
    const [bool, setBool] = useState(true);
    return (
        <Stack vertical>
            <Checkbox readOnly xicon={false} value={bool} set={setBool} />
            <Number max={30} min={0} value={value} set={setValue} />
            <TupleProp autoFocus name="Size:" x={x} setX={setX} y={y} setY={setY} min={1} max={999} />
            <TextArea value={text} set={setText} />
            <Block full="h" wrap onClick={() => {setText(text + props.text)}}>{text}</Block>
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
                <ActionBarContent full="h" padded wrap scroll>
                    <TestContent text={"Auto Width/Height :\n" +
                    "                    And what now, why dont I like it as it is???\n" +
                    "                    And what now, why dont I like it as it is???"} />
                </ActionBarContent>
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

function TestApp() {
    // TODO: move this to new App Parent Component
    const wContext = useContext(WindowContext);
    const onFocus = e => {
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

    const [mode, setMode] = useState(0);
    const [test, setTest] = useState(6);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
    const [myText, setMyText] = useState('Schwätz nicht du Depp!');
    const [align, setAlign] = useState('left');
    const [activeAlign, setActiveAlign] = useState(1);

    const [repeat, setRepeat] = useState(1);
    let text = '';
    let i = repeat;
    while (i > 0) {
        text += 'So many many many words!';
        i--;
    }
    const options = [
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
        <Block onFocus={onFocus} center="h" full padded="h" className="editor-bounds">
            <Stack vertical full>

                <Block full="h">
                    <Stack full="h" padded="v">
                        <Button icon="keyboard_backspace" padded="h" name="Back" />
                        <Block padded="h" center="v" full="h" shorten>And a very very long very very long very very long very very long title goes here and here and here</Block>
                        <Stack gaps center="v">
                            <Block center="v">Space for Buttons</Block>
                            <Button xborder={DIR.RIGHT|DIR.LEFT} padded="h" icon="pause_circle_outline" name="Replay" />
                            <Button icon="play_circle_outline" disabled padded="h" name="Play" onClick={() => console.log(666)} />
                            <Button border={false} padded={false} icon="build" />
                        </Stack>
                    </Stack>
                </Block>

                <Stack full vertical gaps>
                    <Section full="h" centerItems size={300} maxSize={400} name="TextPane">
                        <Stack vertical borders full>
                            <Section name="Properties" inner collapse scroll full="h">
                                <Stack vertical full="h" collapsed padded>
                                    Somewhere in time...
                                </Stack>
                            </Section>
                            <Stack full>
                                <EntityStackSections
                                    entities={alignOptions} deselect emptyText="Add new font" active={activeAlign} setActive={setActiveAlign}
                                    sectionProps={{inner: true, name: 'Fonts', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                                    detailProps={{inner: true, name: 'Font Properties', size: 250, maxWidth: '33%', collapse: 'h', full: 'v'}}
                                    >
                                    {activeAlign === null ?
                                        <Block center className="less">No font selected</Block> :
                                        <Block padded full="h">
                                            <Grid gaps columns="70px *" full="h">
                                                <InputProp name="Id:" value={alignOptions[activeAlign].id} readOnly />
                                                <TupleProp name="Size:" x={x} setX={setX} y={y} setY={setY} min={1} max={999} />
                                                <SelectProp tab name="Whatever:" options={options} value={mode} set={setMode} />
                                                <RadioProp name="Text Align:" options={alignOptions} gaps="1" icon value={align} set={setAlign} />
                                            </Grid>
                                        </Block>
                                    }
                                </EntityStackSections>

                                <Section inner full name="Characters">
                                    <Stack borders full="v">
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


                                        <Block padded>
                                            <Stack vertical gaps>
                                                <Number name="Slide:" slider="h" tab decimals={2} min={-5} max={10} value={test} set={setTest} />
                                                <TextArea tab xname="terror" required value={myText} set={setMyText} rows={10} />
                                                <Submit name="Speichern" />
                                            </Stack>
                                        </Block>

                                        <Block centerItems full padded>
                                            <Stack vertical>
                                                <Number slider buttons={false} name="Repeat" set={setRepeat} value={repeat} min={0} max={30} />
                                                <Block wrap width={200}>{text}</Block>
                                            </Stack>
                                        </Block>
                                    </Stack>
                                </Section>
                            </Stack>
                        </Stack>
                    </Section>

                    <Section full name="Preview">
                        <Stack full>
                            <Section name="Text Blocks" inner collapse="h" size={300} full="v">
                                <EntityStack entities={options} active={0} />
                            </Section>
                            <Section name="Screen" full inner>
                                <GridCanvas size={10} width={50} height={10} />
                            </Section>
                        </Stack>
                    </Section>
                    <Block />
                </Stack>

            </Stack>
        </Block>
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


function BaseApp({}) {
    const test = 1;

    return (
        <CssCtx>
            <WindowCtx>
                <BackgroundCtx>
                    {test ? <TestApp /> : <RealApp />}
                </BackgroundCtx>
            </WindowCtx>
        </CssCtx>
    )
}

ReactDOM.render(
    <BaseApp />,
    document.getElementById('app')
);