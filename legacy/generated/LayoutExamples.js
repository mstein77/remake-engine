import React from "react";
import {Block, Stack, Grid, Overlays, Overlay} from "../components/LayoutComponents";
function Canvas() { return <div></div> };

function getExamples() {
    const examples = [];
    examples.push(
                        <Block full padded className="bg1">
                            <Block maxHeight="75%" center="v" border padded className="bg2">
                                <Block full scroll className="bg3">
                                    Half of the cake
                                </Block>
                            </Block>
                        </Block>
                    
    );
    examples.push(
                        <Block full padded className="bg1">
                            <Block maxHeight="75%" center="v" border padded className="bg2">
                                <Block full scroll className="bg3">
                                    Half of the cake
                                </Block>
                            </Block>
                        </Block>
                    
    );
    examples.push(
                        <Block full padded className="bg1">
                            <Block maxHeight="75%" center="v" border padded className="bg2">
                                <Block full scroll className="bg3">
                                    Half of the cake
                                </Block>
                            </Block>
                        </Block>
                    
    );
    examples.push(
                        <Block full padded className="bg1">
                            <Block maxHeight="75%" center="v" border padded className="bg2">
                                <Block full scroll className="bg3">
                                    Half of the cake
                                </Block>
                            </Block>
                        </Block>
                    
    );
    examples.push(
                        <Stack vertical center="v" border gaps className="bg1">
                            Nothing here to see
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical center="v" border gaps className="bg1">
                            <Block height={50} width={50} center scroll className="bg2">XYZ</Block>
                            <Block full="v" className="bg3">
                                Hier gehts ab...
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical center="v" border gaps className="bg1" scroll>
                            <Block height={50} className="bg2">XYZ</Block>
                            <Block minHeight={40} maxHeight={80} className="bg3">
                                <Block scroll>
                                 Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                </Block>
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical border gaps full="v" className="bg1">
                            <Block height={50} className="bg2">XYZ</Block>
                            <Block center="v" scroll full="v" minHeight={40} maxHeight={80} className="bg3">
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                                Remaining<br />
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Block scroll minWidth={140} maxWidth={266} border className="bg3">
                            Remaining xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                        </Block>
                    
    );
    examples.push(
                        <Block scroll minHeight={140} maxHeight={166} border className="bg3">
                            Remain<br />
                        </Block>
                    
    );
    examples.push(
                        <Stack center="h" border gaps className="bg1">
                            <Block width={50} className="bg2">XYZ</Block>
                            <Block scroll minWidth={140} maxWidth={266} className="bg3">
                                Remaining xxxxxxxxxxxxxxxxxxxxxxxxxxxxyyy
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack center="h" border gaps className="bg1" scroll>
                            <Block width={50} className="bg2">XYZ</Block>
                            <Block minWidth={140} maxWidth={266} className="bg3">
                                <Block scroll>
                                Remaining xxxxxxxxxxxxxxxxxxxxxxxxxxxxyyy
                                </Block>
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack border gaps full="h" className="bg1">
                            <Block width={50} className="bg2">XYZ</Block>
                            <Block center="h" scroll full="h" minWidth={100} maxWidth={266} className="bg3">Remaining Space</Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical border gaps full="v" className="bg1">
                            <Block height={50} className="bg2">XYZ</Block>
                            <Block minHeight={80} maxHeight={180} scroll center="v" full="v" className="bg3">Remaining Space</Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack scroll center="h" border gaps full="h" minWidth={100} maxWidth={266} className="bg1">
                            <Block width={50} className="bg2">XYZ</Block>
                            <Block full="h" className="bg3">Remaining Space</Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical scroll center="v" border gaps full="v" minHeight={80} maxHeight={180} className="bg1">
                            <Block height={50} className="bg2">XYZ</Block>
                            <Block full="v" className="bg3">Remaining Space</Block>
                        </Stack>
                    
    );
    examples.push(
                        <Block full centerItems="v">
                                <Block onclick className="bg2">
                                        Click me!
                                </Block>
                        </Block>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" center border borders full>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" center border borders full>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" center border borders full>
                            <Block center="h" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" border="1" width="275" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center border borders full>
                            <Block center="v" wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full border="1" className="bg2">
                                Children
                            </Block>

                            <Block full="v" border="1" className="bg2" height={350}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" center="v" border borders full="h">
                            <Block center="h" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" width="50%" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" border="1" width="275" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center="h" border borders full="v">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" border="1" className="bg2">
                                Children
                            </Block>

                            <Block full="v" border="1" className="bg2" height={350}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center borders border="1">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" className="bg2">
                                ChildrenX
                            </Block>

                            <Block border="1" className="bg2" height={150}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center="v" borders border="1">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" className="bg2">
                                ChildrenX
                            </Block>

                            <Block border="1" className="bg2" height={150}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack center vertical className="bg1" border="1" gaps>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block width="50%" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="250" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack center="h" vertical className="bg1" border="1" gaps>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block width="50%" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="250" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" border borders gaps full>
                            <Block center="h" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" center="h" width="50%" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" border="1" width="450" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" border borders full="h">
                            <Block center="h" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" width="50%" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" border="1" width="275" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" border borders width="60%">
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="275" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" border borders gaps full>
                            <Block center="v" wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" full="h" height="75%" border="1" className="bg2">
                                Children
                            </Block>

                            <Block center="v" full="v" border="1" className="bg2" height={350}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" border borders full="v">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" border="1" className="bg2">
                                Children
                            </Block>

                            <Block full="v" border="1" className="bg2" height={350}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" border borders>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" border="1" className="bg2">
                                Children
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width="60%">
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="h" border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="275" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width="60%">
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="75%" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width="60%">
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" full="h" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width="60%">
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" center="h" className="bg2">
                                Children
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width={200}>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" center="h" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="275" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width={200}>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="75%" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width={200}>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" full="h" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps width={200}>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width={75} className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" width="75%" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" full="h" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded border="1" gaps>
                            <Block border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" center="h" className="bg2">
                                Children
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps full="v">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" border="1" className="bg2">
                                Children
                            </Block>

                            <Block full="v" border="1" className="bg2" height={350}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps full="v">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2" height="75%">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps full="v">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps full="v">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height="75%">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" border="1" className="bg2">
                                Children
                            </Block>

                            <Block full="v" border="1" className="bg2" height={350}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height="75%">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2" height="75%">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height="75%">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height="75%">
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height={150}>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" border="1" className="bg2">
                                Children
                            </Block>

                            <Block full="v" border="1" className="bg2" height={350}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height={150}>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2" height={50}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height={150}>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2" height="75%">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height={150}>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps height={150}>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2" height={50}>
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2" height="75%">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block full="v" border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded border="1" gaps>
                            <Block wrap border="1" className="bg2">
                                Feuer und Wasser
                            </Block>

                            <Block center="v" border="1" className="bg2">
                                Children
                            </Block>

                            <Block border="1" className="bg2">
                                Children
                            </Block>
                        </Stack>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack full="v" center vertical borders border width={275} className="bg2">
                                <Block xfull="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack center full="h" vertical borders border height={115} className="bg2">
                                <Block full="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack center vertical borders border width={233} height={115} className="bg2">
                                <Block full="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack center full="v" vertical borders border width="75%" className="bg2">
                                <Block full="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack center full="h" vertical borders border height="75%" className="bg2">
                                <Block full="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack center vertical borders border width="75%" className="bg2">
                                <Block full="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack center vertical borders border height="75%" className="bg2">
                                <Block full="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems>
                            <Stack center vertical borders border width="75%" height="75%" className="bg2">
                                <Block full="h">
                                    Feuer und Wasser
                                </Block>

                                <Block full="v">
                                    Children?
                                </Block>
                            </Stack>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" wrap className="bg1">
                            Feuer und Wasser
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" className="bg1">
                            <Block width="233" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block width="233" center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" className="bg1">
                            <Block width="50%" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block width="50%" center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" className="bg1">
                            <Block full="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block full="h" center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            Feuer und Wasser
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center wrap className="bg1">
                            <Block center="v" border>Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            <Block height="175" border>Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center wrap className="bg1">
                            <Block center="v" height="175" border>Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            <Block height="33%" border>Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center wrap className="bg1">
                            <Block center="v" height="33%" border>Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            <Block full="v" border>Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center wrap className="bg1">
                            <Block center="v" full="v" border>Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems wrap className="bg1">
                            Feuer und Wasser
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block center border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" className="bg1">
                            <Block center="v" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" className="bg1">
                            <Block center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems className="bg1">
                            <Block width="233" height="175" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block width="233" height="175" center border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" className="bg1">
                            <Block width="233" height="175" center="v" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" className="bg1">
                            <Block width="233" height="175" center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems className="bg1">
                            <Block width="50%" height="33%" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block width="50%" height="33%" center border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" className="bg1">
                            <Block width="50%" height="33%" center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" className="bg1">
                            <Block width="50%" height="33%" center="v" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems className="bg1">
                            <Block full border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center className="bg1">
                            <Block full center border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="h" className="bg1">
                            <Block center="v" full border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
                        <Block width="90%" height="90%" center centerItems="v" className="bg1">
                            <Block full center="h" border wrap className="bg2">Feuer und Wasser</Block>
                        </Block>
                    
    );
    examples.push(
    <Block border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block full border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block full="h" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block full="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="50%" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="50%" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="50%" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="500" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="500" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="500" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block width="500" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" full border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" full="h" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" full="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="50%" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="50%" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="50%" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="500" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="500" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="500" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="h" width="500" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" full border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" width="50%" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" width="450" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" height="50%" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" height="50%" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" height="50%" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" full="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" height="350" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center="v" height="350" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center full border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center full="v" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center full="v" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center full="h" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center height="50%" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center height="50%" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center full="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center width="50%" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block center height="350" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" full border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" full="h" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" full="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="50%" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="50%" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="50%" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="500" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="500" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="500" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="h" width="500" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" full border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" width="50%" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" width="450" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" height="50%" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" height="50%" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" height="50%" width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" full="h" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" width="50%" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems="v" width="450" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems width="450" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems full border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems width="50%" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems width="450" full="v" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems height="50%" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems height="50%" width="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems width="450" height="50%" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems height="350" full="h" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems width="50%" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block centerItems width="450" height="350" border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
    <Block border="1" padded wrap className="bg1">
        Feuer und Wasser
    </Block>

    );
    examples.push(
                        <Overlays width={200} height={100} className="bg1">
                            <Overlay width={150} height={50} top={10} left={10} className="bg2">xxx</Overlay>
                            <Overlay width={150} height={50} top={20} left={0} className="bg3">yyy</Overlay>
                            <Overlay width={20} height={250} top={-40} left={40} className="bg2">1</Overlay>
                        </Overlays>
                    
    );
    examples.push(
                        <Overlays width={200} height={100} originX={30} originY={30} className="bg1">
                            <Overlay width={150} height={50} top={10} left={10} className="bg2">xxx</Overlay>
                            <Overlay width={150} height={50} top={20} left={0} className="bg3">yyy</Overlay>
                            <Overlay width={20} height={250} top={-40} left={40} className="bg2">1</Overlay>
                        </Overlays>
                    
    );
    examples.push(
        <Stack>
            <Block width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block wrap className="bg3" full="h">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack minHeight={150}>
            <Block width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="h" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack full="v">
            <Block width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="h" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full="v">
            <Block height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="v" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical maxWidth={200} full="v">
            <Block height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="v" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full>
            <Block height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="v" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full>
            <Stack full="h" wrap className="bg1">
                <Block>Sub 1 verr u wuewueuwew uweu weuwe e</Block>
                <Block>Sub 2 hhwehw hwehwe hwehw whewh e</Block>
                <Block>Sub 3</Block>
            </Stack>
            <Block full="v" wrap className="bg2">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
            <Stack full="h" wrap className="bg3">
                <Block>Sub 1 verr u wuewueuwew uweu weuwe e</Block>
                <Block>Sub 2 hhwehw hwehwe hwehw whewh e</Block>
                <Block>Sub 3</Block>
            </Stack>
        </Stack>
    
    );
    examples.push(
        <Stack full>
            <Block maxWidth={100} className="bg1">
                <Stack wrap>
                    <Block>Master on Sub 1</Block>
                    <Block>Sub 2</Block>
                    <Block>Sub 3</Block>
                </Stack>
            </Block>
            <Block full="h" wrap className="bg2">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
            <Block className="bg3">
                <Stack wrap>
                    <Block>Sub 1</Block>
                    <Block>Sub 2</Block>
                    <Block>Sub 3</Block>
                </Stack>
            </Block>
        </Stack>
    
    );
    examples.push(
        <Block shorten width={80} className="bg1">
            Test1<br />
            Thisisalittlebitlongerthanexpected
        </Block>
    
    );
    examples.push(
        <Block shorten maxWidth={80} className="bg1">
            Test1<br />
            Thisisalittlebitlongerthanexpected
        </Block>
    
    );
    examples.push(
        <Stack vertical maxWidth={80}>
            <Block shorten className="bg1">
                Test1<br />
                Thisisalittlebitlongerthanexpected
            </Block>
            <Block shorten className="bg2">
                Test1
            </Block>
        </Stack>
    
    );
    examples.push(
            <Block shorten className="bg1">
                HSH HASHSAHS HS HASH SHS AHSSHASHSAHSSHH SHASHAHS HSHHS S
            </Block>
    
    );
    examples.push(
        <Block scroll full="v" className="bg1">
            HSHAHASHSAHSAHSAHASHASHSAAHSSHASHSAHSSHHASHASHAHSAHSHHSAS
        </Block>
    
    );
    examples.push(
        <Block scroll full="h" className="bg1">
            H<br />SHA<br />HASH<br />SAHSAH<br />SAHASH<br />ASHSAA<br />HSSHA<br />SHSAH<br />SSHHA<br />SHASH<br />AHSAH<br />SHHSAS
            H<br />SHA<br />HASH<br />SAHSAH<br />SAHASH<br />ASHSAA<br />HSSHA<br />SHSAH<br />SSHHA<br />SHASH<br />AHSAH<br />SHHSAS
        </Block>
    
    );
    examples.push(
        <Stack>
            <Block width={100} scroll wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="h" scroll wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack maxHeight={50}>
            <Block width={100} scroll wrap className="bg1">
                Fix size
                <br />ooooooooooooooooooooover
                <br />aaa
                <br />bbb
            </Block>
            <Block scroll wrap className="bg2">
                Min contenteeeeeee
                <br />ooooooooooooooooooooover
                <br />aaa
                <br />bbb
            </Block>
            <Block full="h" scroll wrap className="bg3">
                Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                <br />ooooooooooooooooooooover
                <br />aaa
                <br />bbb
            </Block>
        </Stack>
    
    );
    examples.push(
        <Stack full="h">
            <Block scroll width={100} wrap className="bg1">
                Fix size
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Block>
            <Block scroll wrap className="bg2">
                Min contenteeeeeee
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Block>
            <Block full="h" scroll wrap className="bg3">
                Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full="v">
            <Block scroll height={100} className="bg1">
                Fix size ooooooooooooooooooooover
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Block>
            <Block scroll className="bg2">
                Min contenteeeeeee<br />
                row 2
            </Block>
            <Block scroll full="v" className="bg3">
                Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Block>
        </Stack>
    
    );
    examples.push(
        <Block center="v" full="h" className="bg1">
            Abcde
        </Block>
    
    );
    examples.push(
        <Block center="h" className="bg1">
            Abcde
        </Block>
    
    );
    examples.push(
        <Block center className="bg1">
            Abcde
        </Block>
    
    );
    examples.push(
        <Block center scroll className="bg1">
            Abcdeiwqeqwjiewqijewiqejiwqejwqeijwqejwqjeiwqijewqjiejwqiejiwqeijqwjieqwewqeqwe
        </Block>
    
    );
    examples.push(
        <Block center scroll className="bg1">
            Abcdeiwqeqwjiew<br />
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
        </Block>
    
    );
    examples.push(
        <Block center scroll className="bg1">
            Abcdeiwqeqwjiewqijewiqejiwqejwqeijwqejwqjeiwqijewqjiejwqiejiwqeijqwjieqwewqeqwe<br />
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
        </Block>
    
    );
    examples.push(
        <Grid gaps columns="minmax(80px, 120px) auto" rows="min-content min-content">
            <Block shorten className="bg1">Cellwewewewwew wew wew wewe</Block>
            <Block scroll wrap className="bg2">Cell 2 wew we wew ewew we ewe   wewe wewe we we
                weweqweweweweweweqqrwerqtqrwqrwqrwqewqewqewqewqeqwrwqewqeq</Block>
            <Block wrap className="bg2">Cell 3</Block>
            <Block wrap className="bg1">Cell 4</Block>
        </Grid>
    
    );
    examples.push(
        <Block scroll full>
            <Grid full="h" gaps columns="minmax(80px, 120px) auto">
                <Block shorten className="bg1">Cellwewewewwew wew wew wewe</Block>
                <Block wrap scroll className="bg2">Cell 2 wew we wew ewew we ewe   wewe wewe we we
                    weweqweweweweweweqqrwerqtqrwqrwqrwqewqewqewqewqeqwrwqewqeq</Block>
                <Block wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Block>
                <Block wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Block>
                <Block wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Block>
                <Block wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Block>
                <Block wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Block>
                <Block wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Block>
                <Block wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Block>
                <Block wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Block>
                <Block wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Block>
                <Block wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Block>
                <Block wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Block>
                <Block wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Block>
            </Grid>
        </Block>
    
    );
    examples.push(
        <Grid gaps full centerItems columns="20px auto 20px" rows="20px auto 20px">
            <Block className="bg1">1</Block>
            <Block className="bg2">2</Block>
            <Block className="bg1">3</Block>
            <Block className="bg2">4</Block>
            <Block wrap scroll full className="bg1">
                wwew ewqe wqewq ewqe wqewqe wqe wqewqe wqewqe qwewqe wqe wqe ewqe
                wqewe wqe qwe wqewq ewqe qwe qweqwe wqe qwe qwewqe wqe wqe qwewqe wqeqw e
                wqewqe wqe wqeqw e ewe qw ewqewq e qwewqe wqewqewqewq ewqe eqw ewqe qwe
                wqe wqewqe wq
                ewqewqe qwewqewqewqewqe wqeq weqw ewqewqewqew qewqe wqewqewqewqewqewqewqe wqe eq wqe qew qwe
                qweqwewqe qweqw eqw wqeqw eqwewqeqwe wqe ewqe wqewqeq wewqe weqw qwe
                qwexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xqwewq ewq
                ewq ewqe qwewqewqe wqe qwe wqewq eqw ewqe wqeqw ewqewqe wqewqe
                qe qwe wqeqwe
                qwe qwe qwewq eqwe wqe qweqw
                e qweqwe w
                qweqwewqe qweqw eqw wqeqw eqwewqeqwe wqe ewqe wqewqeq wewqe weqw qwe
                qwe qwewq ewq
                ewq ewqe qwewqewqe wqe qwe wqewq eqw ewqe wqeqw ewqewqe wqewqe
                qe qwe wqeqwe
                qwe qwe qwewq eqwe wqe qweqw
                e qweqwe w
            </Block>
            <Block className="bg2">6</Block>
            <Block className="bg1">7</Block>
            <Block className="bg2">8</Block>
            <Block className="bg1">9</Block>
        </Grid>
    
    );
    examples.push(
            <Block>Unsupported</Block>
    
    );
    examples.push(
        <Stack vertical full>
            <Block height={40}>
                Top...
            </Block>
            <Block full="v">
                <Overlays width={200} height={150}>
                    <Overlay width={200} height={150}>
                        base
                    </Overlay>
                    <Overlay width={200} height={150}>
                        Overlay 1
                    </Overlay>
                    <Overlay width={200} height={150}>
                        Overlay 2
                    </Overlay>
                </Overlays>
            </Block>
            <Block height={40}>
                Bottom...
            </Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full>
            <Block height={40}>
                Top...
            </Block>
            <Block full="v" center>
                <Overlays scroll maxWidth={400} width={500} height={150}>
                    <Overlay width={500} height={150}>
                        base
                    </Overlay>
                    <Overlay width={500} height={150}>
                        Overlay 1
                    </Overlay>
                    <Overlay width={500} height={150}>
                        Overlay 2
                    </Overlay>
                </Overlays>
            </Block>
            <Block height={40}>
                Bottom...
            </Block>
        </Stack>

    
    );
    examples.push(
        <Block padded full="h" className="bg1">
            Children go here...
        </Block>
    
    );
    examples.push(
        <Block padded scroll className="bg1">
            jwejwjejwejwqejwqejwqjewqjewqjewjqejwqejwqjeqwjejwqejwqjeqwjejqwejwqjewqjeqjwej
        </Block>
    
    );
    examples.push(
        <Block padded shorten className="bg1">
            jwejwjejwejwqejwqejwqjewqjewqjewjqejwqejwqjeqwjejwqejwqjeqwjejqwejwqjewqjeqjwej
        </Block>
    
    );
    examples.push(
        <Block padded scroll className="bg1">
            jwejwjejwejwqejwqejwqjewqjewqjewjqejwqejwqjeqwjejwqejwqjeqwjejqwejwqjewqjeqjwej
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
        </Block>

    
    );
    examples.push(
        <Block padded="h" full="h" className="bg1">
            Children go here...
        </Block>
    
    );
    examples.push(
        <Block padded="v" full="h" className="bg1">
            Children go here...
        </Block>
    
    );
    examples.push(
        <Stack gaps>
            <Block width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="h" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical gaps full>
            <Block height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="v" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack borders full="v">
            <Block width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block full="h" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack vertical borders full>
            <Block wrap className="bg2">Min contenteeeeeee</Block>
            <Block height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Block>
            <Block full="v" wrap className="bg3">Max block aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Block>
        </Stack>
    
    );
    examples.push(
        <Stack full="h" wrap gaps className="bg1">
            <Block border>Elem one</Block>
            <Block border>Elem HWHEhwehwehwe</Block>
            <Block border>Elem wjwjewje</Block>
            <Block border>Elem</Block>
            <Block border>Elem geee haw</Block>
            <Block border>Elem geee haw</Block>
            <Block border>Elem geee haw</Block>
            <Block border>Elem Bababsabs</Block>
        </Stack>
    
    );
    examples.push(
        <Stack full="h" wrap gaps centerItems className="bg1">
            <Block border>Elem one</Block>
            <Block wrap border="1">Elem HWHEhwehwehwe</Block>
            <Block wrap border="1">Elem wjwjewje</Block>
            <Block border>Elem</Block>
            <Block border>Elem geee haw</Block>
            <Block wrap border="1">Elem geee haw</Block>
            <Block border>Elem geee haw</Block>
            <Block border>Elem Bababsabs</Block>
        </Stack>
    
    );
    examples.push(
        <Block padded full="h" className="bg1">
            <Stack gaps>
                <Block border width={100} height={100} className="bg2"></Block>
                <Block border width={100} height={100} className="bg3"></Block>
            </Stack>
        </Block>
    
    );
    examples.push(
        <Block padded full="h">
            <Stack gaps>
                <Canvas border width={100} height={100}></Canvas>
                <Canvas border="1" width={100} height={100}></Canvas>
            </Stack>
        </Block>
    
    );
    examples.push(
        <Block padded full="h" className="bg1">
            <Stack borders border>
                <Block width={100} height={100} className="bg2"></Block>
                <Block width={100} height={100} className="bg3"></Block>
            </Stack>
        </Block>

    
    );
    examples.push(
        <Stack vertical gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gaps padded full="h" className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gaps padded className="bg2">
            <Block className="bg1" full="h">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="v" gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gaps padded className="bg2">
            <Block full="v" className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="v" gaps padded className="bg2">
            <Block full="v" className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gaps padded full className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gaps padded full className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block full="v" className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="h" gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block full="v" className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="v" gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block full="v" className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack gaps padded full="h" className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack gaps padded className="bg2">
            <Block className="bg1" full="h">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack full="v" gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack gaps padded className="bg2">
            <Block full="v" className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack full="v" gaps padded className="bg2">
            <Block full="v" className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack gaps padded full className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack gaps padded full className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block full="h" className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack full="h" gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block full="h" className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack full="v" gaps padded className="bg2">
            <Block className="bg1">
                    e1<br />balalaa
            </Block>
            <Block full="h" className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack full gaps padded className="bg2">
            <Block padded width={100} className="bg1">
                    fix
            </Block>
            <Block full="h">
                <Stack full="v" padded gaps className="bg1">
                    <Block padded className="bg3">
                        First
                    </Block>
                    <Block padded wrap className="bg3">
                        Second Box
                    </Block>
                </Stack>
            </Block>
            <Block padded width={100} className="bg3">
                    last
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack full gaps padded className="bg2">
            <Block padded width={100} className="bg1">
                    fix
            </Block>
            <Stack full="v" padded gaps full="h" className="bg1">
                <Block padded className="bg3">
                    First
                </Block>
                <Block padded wrap className="bg3">
                    Second Box
                </Block>
            </Stack>
            <Block padded width={100} className="bg3">
                    last
            </Block>
        </Stack>
                    
    );
    examples.push(
        <Stack full gaps padded scroll className="bg2">
            <Block padded width={100} className="bg1">
                    fix
            </Block>
            <Stack padded gaps full="h" className="bg1">
                <Block padded className="bg3">
                    First
                </Block>
                <Block padded wrap className="bg3">
                    Second Box
                </Block>
                <Block padded className="bg3">
                    Veryveryveryveryveryveryveryveryveryverylong Box
                </Block>
            </Stack>
        </Stack>
                    
    );
    examples.push(
        <Stack full gaps padded scroll className="bg2">
            <Block padded width={100} className="bg1">
                    fix
            </Block>
            <Stack padded gaps full="h" className="bg1">
                <Block padded className="bg3">
                    First
                </Block>
                <Block padded wrap className="bg3">
                    Second Box
                </Block>
                <Block padded className="bg3">
                    Veryveryveryveryveryveryveryveryveryverylong Box
                </Block>
            </Stack>
        </Stack>
                    
    );
    return examples;
}

export {getExamples};/*
RESCUE CODE:

import React from "react";
import {Block, Stack, Grid, Overlays, Overlay} from "../components/LayoutComponents";

function getExamples() {
    return [];
}

export {getExamples};
 */