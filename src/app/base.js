import React, {useState, useContext, useMemo, useRef, useEffect, Fragment} from "react";
import ReactDOM from "react-dom";
import { d, getCanvasForDim } from "../app/helper/helper";
import { useModal, useComponentUpdate, useRefocus, Ruler, OkCancelForm, UndoRedoButtons, EditorCtx, EditorSection, EditorContext, WindowContext, ActionBarContent, Section, EntityStack, EntityStackSections, Canvas, ScrollArea, CssCtx, BackgroundControl, ToolGroup, WindowCtx, BackgroundCtx, AvailContext, AvailContextProvider, PropertyGrid, ValueProp, SideTabs, SideTab } from "./components/BasicComponents"
import { Form, Submit, Input, Select, CheckboxProp, Radio, LabelProp, NumberProp, ColorProp, Button, InputProp, RadioProp, Number, Checkbox, Tuple, TupleProp, SelectProp, TextArea } from "./components/FormComponents";
import { DIR, Block, Stack, Grid, Overlays, Overlay, OverlayContext } from "./components/LayoutComponents";
import { TextPaneEditor } from "./editors/TextPaneEditor";
import { MainEditor } from "./editors/MainEditor";

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


function RealApp() {
    return (
        <EditorSection name="TextPane: Whatever goes..." full>

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
        </EditorSection>

    )
}

const test = 1;
const model = {
    type: 'TextPane',
    id: 'statusPane',
    fonts: [
        {id: 'marioFontMap', width: 8, height: 8,
            map: {
                "0": {
                    "x": 24,
                    "y": 0
                },
                "1": {
                    "x": 32,
                    "y": 0
                },
                "2": {
                    "x": 40,
                    "y": 0
                },
                "3": {
                    "x": 48,
                    "y": 0
                },
                "4": {
                    "x": 56,
                    "y": 0
                },
                "5": {
                    "x": 64,
                    "y": 0
                },
                "6": {
                    "x": 72,
                    "y": 0
                },
                "7": {
                    "x": 80,
                    "y": 0
                },
                "8": {
                    "x": 88,
                    "y": 0
                },
                "9": {
                    "x": 96,
                    "y": 0
                },
                "!": {
                    "x": 0,
                    "y": 0
                },
                "*": {
                    "x": 8,
                    "y": 0
                },
                "-": {
                    "x": 16,
                    "y": 0
                },
                "A": {
                    "x": 104,
                    "y": 0
                },
                "B": {
                    "x": 112,
                    "y": 0
                },
                "C": {
                    "x": 120,
                    "y": 0
                },
                "D": {
                    "x": 128,
                    "y": 0
                },
                "E": {
                    "x": 136,
                    "y": 0
                },
                "F": {
                    "x": 144,
                    "y": 0
                },
                "G": {
                    "x": 152,
                    "y": 0
                },
                "H": {
                    "x": 160,
                    "y": 0
                },
                "I": {
                    "x": 168,
                    "y": 0
                },
                "J": {
                    "x": 176,
                    "y": 0
                },
                "K": {
                    "x": 184,
                    "y": 0
                },
                "L": {
                    "x": 192,
                    "y": 0
                },
                "M": {
                    "x": 200,
                    "y": 0
                },
                "N": {
                    "x": 208,
                    "y": 0
                },
                "O": {
                    "x": 216,
                    "y": 0
                },
                "P": {
                    "x": 224,
                    "y": 0
                },
                "Q": {
                    "x": 232,
                    "y": 0
                },
                "R": {
                    "x": 240,
                    "y": 0
                },
                "S": {
                    "x": 248,
                    "y": 0
                },
                "T": {
                    "x": 256,
                    "y": 0
                },
                "U": {
                    "x": 264,
                    "y": 0
                },
                "V": {
                    "x": 272,
                    "y": 0
                },
                "W": {
                    "x": 280,
                    "y": 0
                },
                "X": {
                    "x": 288,
                    "y": 0
                },
                "Y": {
                    "x": 296,
                    "y": 0
                },
                "Z": {
                    "x": 304,
                    "y": 0
                }
            }},
        {id: 'whatever', map: {}, width: 16, height: 16, image: "ohoh"}
    ],
    blocks: JSON.parse("[{\"id\":\"status\",\"x\":24,\"y\":8,\"alignToGrid\":false,\"autoCenteringX\":false,\"autoCenteringY\":false,\"text\":\"MARIO         WORLD  TIME\",\"font\":\"marioFontMap\",\"textAlign\":\"left\",\"lineSpacing\":0,\"filters\":\"\",\"width\":25,\"height\":1,\"__type\":\"TextBlockConfig\"},{\"id\":\"score\",\"x\":24,\"y\":16,\"alignToGrid\":false,\"autoCenteringX\":false,\"autoCenteringY\":false,\"text\":\"undefined\",\"font\":\"marioFontMap\",\"textAlign\":\"left\",\"lineSpacing\":0,\"filters\":\"\",\"width\":9,\"height\":1,\"__type\":\"TextBlockConfig\"},{\"id\":\"coins\",\"x\":96,\"y\":16,\"alignToGrid\":false,\"autoCenteringX\":false,\"autoCenteringY\":false,\"text\":\"*undefined\",\"font\":\"marioFontMap\",\"textAlign\":\"left\",\"lineSpacing\":0,\"filters\":\"\",\"width\":10,\"height\":1,\"__type\":\"TextBlockConfig\"},{\"id\":\"world\",\"x\":144,\"y\":16,\"alignToGrid\":false,\"autoCenteringX\":false,\"autoCenteringY\":false,\"text\":\"1-1\",\"font\":\"marioFontMap\",\"textAlign\":\"left\",\"lineSpacing\":0,\"filters\":\"\",\"width\":3,\"height\":1,\"__type\":\"TextBlockConfig\"},{\"id\":\"time\",\"x\":200,\"y\":16,\"alignToGrid\":false,\"autoCenteringX\":false,\"autoCenteringY\":false,\"text\":\"398\",\"font\":\"marioFontMap\",\"textAlign\":\"left\",\"lineSpacing\":0,\"filters\":\"\",\"width\":3,\"height\":1,\"__type\":\"TextBlockConfig\"}]"),
    dim: {x: 256, y: 224},

};
const image = new Image(320, 8);
image.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAATgAAAAICAYAAABtcuNzAAACxElEQVRoQ+1ZW27DMAxbgZ6iN9qJd6OeosCGDNCgCaRIOc0eQPrV1rYs0RSlOJeX9Hk8Hu/bz+v1esn/P+N72O7sv91un/u/3u/f9s9rw5fsIxpH+yAfVtZm22y9mqP8r2fA8DvCf+VbPgMn/m0+O0PEufrfnhgn9hHv1Xo13sXOxip3O/472NQ5Hbdyrm/zVHxHj2eMwu+8p+Lfl5AoEPaI3GYbOZdthrhVgVMAVr+YSLP4HFHv5ij/9o7XA2bJj0SJYY4I4sxFHDgav5UCPIkPJRDaM0SnFhpUeLr91XkePb6Hy4HLEfExfJXAsfwPe5bAZYGKDd0uTyU4ErnawXWEcxLAIXwFSgkyE/ypACl8jhhXmCkCq/V7x1WRUtxj/q/YVR0CKpwKv98ed7nLxH/V/9ARliO1e0SC2hUkVGwsgcuiVsUub4hEQiWoK3CISEz4Qr2n6t9VKCaATjKjJHEeAyePCKsCrc6HJXgtAO7+XQekMHa6xXrmijddwnTcDo65Asg6bBd/dz1KcsU/JiQTgUN4ZP4iUWU50F0VhB33CgfedbEKicTtJwTOISkTGkVABPykQnXkcAji7s8IspIgSpRV/Gq9Glf2J52WG3/2iSWHuoNDHQiKJSfhin+sQHfdYhdf5c4z8WX5rwogilHFoPzONsOWLXD5cNUjggKUCSV6yYAq0iSBHF8qMCsJqMDv7si6eNwE+U93cCv4TooFs8+41HWGU/zrHtP1U74yge2uWPZytYuJ5ZLT4dWOzylESh+st6VVkJhAoS6jdjhIZfMLhmxju4tzOjA0p+tCu0PI1Rf5jsZZ8rnrUWWua9UjSsVevSnrKqzz+FwJq4oeOyMlAKxDcDuAah8lBOPY5IrAKTCoQ+nElfEn/EL+ufGpbhUVXafDmoiSg6/bzCDt2ezbHVwnXufYicCJwInAX0TgA2h85FTA4y6VAAAAAElFTkSuQmCC";
image.decode().then(
    () => {
        const canvas = getCanvasForDim(320, 8);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0);
        model.fonts[0].image = canvas;

        ReactDOM.render(
            <MainEditor>{test ? <TextPaneEditor model={model} /> : <RealApp />}</MainEditor>,
            document.getElementById('app')
        )
    }
);


