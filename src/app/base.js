import React, {useMemo, useEffect, useState, Fragment, useContext} from "react";
import ReactDOM from "react-dom";
import {d} from "../app/helper/helper";
import {Section, Button, Canvas, ScrollbarGrid, WindowCtx, AvailContext, AvailContextProvider, PropertyGrid, ValueProp, Int} from "./components/BasicComponents"
import {Content, Stack, Grid, Overlays, Overlay} from "./components/LayoutComponents";
import { EditorCtx } from "./components/Raster";

function FlexScrollGrid({ render, size, viewX, viewY, width, setViewX, height, setViewY, border, zoom }) {
    const aContext = useContext(AvailContext);
    const cellSize = size * zoom;

    let spaceY = (aContext.height - border);
    let newViewY = Math.min(height, Math.floor( spaceY / (cellSize + border)));

    let spaceX = (aContext.width - border);
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

        elem = <Canvas width={dim.width} height={dim.height} render={render} />
    } else {
        elem = <Content shorten className="small-font">No space to render!</Content>;
    }

    return (
        <Content full center>
            {elem}
        </Content>
    )
}

function GridCanvas({size, width, height, ...props}) {
    const [ posX, setPosX ] = useState(0);
    const [ posY, setPosY ] = useState(0);
    const [ viewX, setViewX ] = useState(0);
    const [ viewY, setViewY ] = useState(0);
    const [ border, setBorder ] = useState(props.border || 1);
    const [ zoom, setZoom ] = useState(props.zoom || 1);

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
        <ScrollbarGrid auto x={posX} y={posY} setX={setPosX} setY={setPosY} maxX={width} maxY={height} pageX={viewX} pageY={viewY}>
            <AvailContextProvider>
                <FlexScrollGrid render={render} size={size} width={width} height={height} viewX={viewX} viewY={viewY} setViewX={setViewX} setViewY={setViewY} height={height} border={border} zoom={zoom} />
            </AvailContextProvider>
        </ScrollbarGrid>

    return (
        <Stack vertical border full>
            <Stack className="bg3" wrap gap centerAll full="h">
                <Int name="PosX" value={posX} set={setPosX} min={0} max={maxPosX} buttons />
                <Int name="PosY" value={posY} set={setPosY} min={0} max={maxPosY} buttons />
                <Int name="Zoom" value={zoom} set={setZoom} min={1} max={9} buttons />
                <Int name="Border" value={border} set={setBorder} min={0} max={9} buttons />
                <Content padded thin boxed>White</Content>
                <Content padded thin boxed>Black & White</Content>
                <Content padded thin boxed>DAXX!</Content>
            </Stack>
            <Grid centerAll full flex columns="- * -" rows="- * -">
                <Content padded><Button disabled name="+" /></Content>
                <Content padded><Stack gap><Button name="+" /><Button name="-" /></Stack></Content>
                <Content padded><Button disabled name="+" /></Content>
                <Content padded>4</Content>
                {scrollGrid}
                <Content padded>6</Content>
                <Content padded>7</Content>
                <Content padded>8</Content>
                <Content padded>9</Content>
            </Grid>
            <Stack className="bg3" wrap gap full="h">
                <Content padded thin boxed>Black & White</Content>
                <Content padded thin boxed>DAXX!</Content>
            </Stack>
        </Stack>
    )
}

function BaseApp({}) {
    return (
        <WindowCtx>
            <EditorCtx>
                <Stack vertical gap full padded>
                    <Section full="h" name="Top Section" collapse padded className="bg2">Here is the Top Section</Section>

                    <Stack gap full flex>
                        <Section width="100" collapse="h" full="v" className="bg1" name="First Section">
                            <Stack vertical full="h" scroll padded gap>
                                <Content padded center>
                                    <Canvas width={75} height={75} boxed className="thin-boxed" />
                                </Content>
                                <Content wrap>Property Grid Here And so many more cool things :-)</Content>
                                <PropertyGrid propWidth="-">
                                    <ValueProp name="Just a test">Working or not?</ValueProp>
                                    <ValueProp name="DAng">
                                        <Content wrap>Herer  wewo woe oweo woew eo ow ewe</Content>
                                    </ValueProp>
                                </PropertyGrid>
                            </Stack>
                        </Section>
                        <Section full flex name="Second Section">
                            <GridCanvas size={10} width={50} height={10} />
                        </Section>
                        <Section width={100} collapse="h" rev full="v" shorten className="bg1" padded name="Last Section">
                            Here I am you fucker!
                        </Section>
                    </Stack>

                    <Section full="h" shorten collapsed collapse name="Bottom Section" padded className="bg2">
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
                    </Section>
                </Stack>
            </EditorCtx>
        </WindowCtx>
    )
}

ReactDOM.render(
    <BaseApp />,
    document.getElementById('baseApp')
);