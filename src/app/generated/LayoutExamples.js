import React from "react";
import {Content, Stack, Grid, Overlays, Overlay} from "../components/LayoutComponents";
function Canvas() { return <div></div> };

function getExamples() {
    const examples = [];
    examples.push(
                        <Stack vertical className="bg1" center boxed border full>
                            <Content center="h" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" boxed="1" width="275" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center boxed border full>
                            <Content center="v" wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={350}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" center="v" boxed border full="h">
                            <Content center="h" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" width="50%" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" boxed="1" width="275" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center="h" boxed border full="v">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={350}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center border boxed="1">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" className="bg2">
                                ChildrenX
                            </Content>

                            <Content boxed="1" className="bg2" height={150}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" center="v" border boxed="1">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" className="bg2">
                                ChildrenX
                            </Content>

                            <Content boxed="1" className="bg2" height={150}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack center vertical className="bg1" boxed="1" gap>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content width="50%" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="250" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack center="h" vertical className="bg1" boxed="1" gap>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content width="50%" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="250" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" boxed border gap full>
                            <Content center="h" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" center="h" width="50%" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" boxed="1" width="450" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" boxed border full="h">
                            <Content center="h" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" width="50%" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" boxed="1" width="275" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" boxed border width="60%">
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="275" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" boxed border gap full>
                            <Content center="v" wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" full="h" height="75%" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content center="v" full="v" boxed="1" className="bg2" height={350}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" boxed border full="v">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={350}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" boxed border>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width="60%">
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="h" boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="275" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width="60%">
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="75%" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width="60%">
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" full="h" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width="60%">
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" center="h" className="bg2">
                                Children
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width={200}>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" center="h" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="275" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width={200}>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="75%" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width={200}>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" full="h" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap width={200}>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width={75} className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" width="75%" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" full="h" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack vertical className="bg1" padded boxed="1" gap>
                            <Content boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" center="h" className="bg2">
                                Children
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap full="v">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={350}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap full="v">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height="75%">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap full="v">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap full="v">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height="75%">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={350}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height="75%">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height="75%">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height="75%">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height="75%">
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height={150}>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={350}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height={150}>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={50}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height={150}>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height="75%">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height={150}>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap height={150}>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height={50}>
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2" height="75%">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content full="v" boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Stack className="bg1" padded boxed="1" gap>
                            <Content wrap boxed="1" className="bg2">
                                Feuer und Wasser
                            </Content>

                            <Content center="v" boxed="1" className="bg2">
                                Children
                            </Content>

                            <Content boxed="1" className="bg2">
                                Children
                            </Content>
                        </Stack>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack full="v" center vertical border boxed width={275} className="bg2">
                                <Content xfull="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack center full="h" vertical border boxed height={115} className="bg2">
                                <Content full="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack center vertical border boxed width={233} height={115} className="bg2">
                                <Content full="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack center full="v" vertical border boxed width="75%" className="bg2">
                                <Content full="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack center full="h" vertical border boxed height="75%" className="bg2">
                                <Content full="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack center vertical border boxed width="75%" className="bg2">
                                <Content full="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack center vertical border boxed height="75%" className="bg2">
                                <Content full="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems>
                            <Stack center vertical border boxed width="75%" height="75%" className="bg2">
                                <Content full="h">
                                    Feuer und Wasser
                                </Content>

                                <Content flex>
                                    Children?
                                </Content>
                            </Stack>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" wrap className="bg1">
                            Feuer und Wasser
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" className="bg1">
                            <Content width="233" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content width="233" center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" className="bg1">
                            <Content width="50%" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content width="50%" center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" className="bg1">
                            <Content full="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content full="h" center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            Feuer und Wasser
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center wrap className="bg1">
                            <Content center="v" boxed>Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            <Content height="175" boxed>Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center wrap className="bg1">
                            <Content center="v" height="175" boxed>Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            <Content height="33%" boxed>Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center wrap className="bg1">
                            <Content center="v" height="33%" boxed>Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" wrap className="bg1">
                            <Content full="v" boxed>Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center wrap className="bg1">
                            <Content center="v" full="v" boxed>Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems wrap className="bg1">
                            Feuer und Wasser
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content center boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" className="bg1">
                            <Content center="v" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" className="bg1">
                            <Content center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems className="bg1">
                            <Content width="233" height="175" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content width="233" height="175" center boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" className="bg1">
                            <Content width="233" height="175" center="v" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" className="bg1">
                            <Content width="233" height="175" center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems className="bg1">
                            <Content width="50%" height="33%" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content width="50%" height="33%" center boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" className="bg1">
                            <Content width="50%" height="33%" center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" className="bg1">
                            <Content width="50%" height="33%" center="v" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems className="bg1">
                            <Content full boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center className="bg1">
                            <Content full center boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="h" className="bg1">
                            <Content center="v" full boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
                        <Content width="90%" height="90%" center centerItems="v" className="bg1">
                            <Content full center="h" boxed wrap className="bg2">Feuer und Wasser</Content>
                        </Content>
                    
    );
    examples.push(
    <Content boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content full boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content full="h" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content full="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="50%" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="50%" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="50%" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="500" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="500" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="500" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content width="500" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" full boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" full="h" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" full="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="50%" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="50%" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="50%" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="500" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="500" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="500" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="h" width="500" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" full boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" width="50%" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" width="450" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" height="50%" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" height="50%" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" height="50%" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" full="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" height="350" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center="v" height="350" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center full boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center full="v" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center full="v" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center full="h" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center height="50%" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center height="50%" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center full="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center width="50%" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content center height="350" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" full boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" full="h" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" full="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="50%" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="50%" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="50%" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="500" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="500" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="500" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="h" width="500" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" full boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" width="50%" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" width="450" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" height="50%" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" height="50%" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" height="50%" width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" full="h" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" width="50%" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems="v" width="450" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems width="450" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems full boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems width="50%" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems width="450" full="v" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems height="50%" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems height="50%" width="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems width="450" height="50%" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems height="350" full="h" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems width="50%" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content centerItems width="450" height="350" boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

    );
    examples.push(
    <Content boxed="1" padded wrap className="bg1">
        Feuer und Wasser
    </Content>

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
            <Content width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content wrap className="bg3" flex>Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack minHeight={150}>
            <Content width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack full="v">
            <Content width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full="v">
            <Content height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical maxWidth={200} full="v">
            <Content height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full>
            <Content height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full>
            <Stack full="h" wrap className="bg1">
                <Content>Sub 1 verr u wuewueuwew uweu weuwe e</Content>
                <Content>Sub 2 hhwehw hwehwe hwehw whewh e</Content>
                <Content>Sub 3</Content>
            </Stack>
            <Content flex wrap className="bg2">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
            <Stack full="h" wrap className="bg3">
                <Content>Sub 1 verr u wuewueuwew uweu weuwe e</Content>
                <Content>Sub 2 hhwehw hwehwe hwehw whewh e</Content>
                <Content>Sub 3</Content>
            </Stack>
        </Stack>
    
    );
    examples.push(
        <Stack full>
            <Content maxWidth={100} className="bg1">
                <Stack wrap>
                    <Content>Master on Sub 1</Content>
                    <Content>Sub 2</Content>
                    <Content>Sub 3</Content>
                </Stack>
            </Content>
            <Content flex wrap className="bg2">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
            <Content className="bg3">
                <Stack wrap>
                    <Content>Sub 1</Content>
                    <Content>Sub 2</Content>
                    <Content>Sub 3</Content>
                </Stack>
            </Content>
        </Stack>
    
    );
    examples.push(
        <Content shorten width={80} className="bg1">
            Test1<br />
            Thisisalittlebitlongerthanexpected
        </Content>
    
    );
    examples.push(
        <Content shorten maxWidth={80} className="bg1">
            Test1<br />
            Thisisalittlebitlongerthanexpected
        </Content>
    
    );
    examples.push(
        <Stack vertical maxWidth={80}>
            <Content shorten className="bg1">
                Test1<br />
                Thisisalittlebitlongerthanexpected
            </Content>
            <Content shorten className="bg2">
                Test1
            </Content>
        </Stack>
    
    );
    examples.push(
            <Content shorten className="bg1">
                HSH HASHSAHS HS HASH SHS AHSSHASHSAHSSHH SHASHAHS HSHHS S
            </Content>
    
    );
    examples.push(
        <Content scroll full="v" className="bg1">
            HSHAHASHSAHSAHSAHASHASHSAAHSSHASHSAHSSHHASHASHAHSAHSHHSAS
        </Content>
    
    );
    examples.push(
        <Content scroll full="h" className="bg1">
            H<br />SHA<br />HASH<br />SAHSAH<br />SAHASH<br />ASHSAA<br />HSSHA<br />SHSAH<br />SSHHA<br />SHASH<br />AHSAH<br />SHHSAS
            H<br />SHA<br />HASH<br />SAHSAH<br />SAHASH<br />ASHSAA<br />HSSHA<br />SHSAH<br />SSHHA<br />SHASH<br />AHSAH<br />SHHSAS
        </Content>
    
    );
    examples.push(
        <Stack>
            <Content width={100} scroll wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex scroll wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack maxHeight={50}>
            <Content width={100} scroll wrap className="bg1">
                Fix size
                <br />ooooooooooooooooooooover
                <br />aaa
                <br />bbb
            </Content>
            <Content scroll wrap className="bg2">
                Min contenteeeeeee
                <br />ooooooooooooooooooooover
                <br />aaa
                <br />bbb
            </Content>
            <Content flex scroll wrap className="bg3">
                Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                <br />ooooooooooooooooooooover
                <br />aaa
                <br />bbb
            </Content>
        </Stack>
    
    );
    examples.push(
        <Stack full="h">
            <Content scroll width={100} wrap className="bg1">
                Fix size
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Content>
            <Content scroll wrap className="bg2">
                Min contenteeeeeee
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Content>
            <Content flex scroll wrap className="bg3">
                Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full="v">
            <Content scroll height={100} className="bg1">
                Fix size ooooooooooooooooooooover
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Content>
            <Content scroll className="bg2">
                Min contenteeeeeee<br />
                row 2
            </Content>
            <Content scroll flex className="bg3">
                Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
                <br />ooooooooooooooooooooover<br />aaa<br />bbb
            </Content>
        </Stack>
    
    );
    examples.push(
        <Content center="v" full="h" className="bg1">
            Abcde
        </Content>
    
    );
    examples.push(
        <Content center="h" className="bg1">
            Abcde
        </Content>
    
    );
    examples.push(
        <Content center className="bg1">
            Abcde
        </Content>
    
    );
    examples.push(
        <Content center scroll className="bg1">
            Abcdeiwqeqwjiewqijewiqejiwqejwqeijwqejwqjeiwqijewqjiejwqiejiwqeijqwjieqwewqeqwe
        </Content>
    
    );
    examples.push(
        <Content center scroll className="bg1">
            Abcdeiwqeqwjiew<br />
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
        </Content>
    
    );
    examples.push(
        <Content center scroll className="bg1">
            Abcdeiwqeqwjiewqijewiqejiwqejwqeijwqejwqjeiwqijewqjiejwqiejiwqeijqwjieqwewqeqwe<br />
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
        </Content>
    
    );
    examples.push(
        <Grid gap columns="minmax(80px, 120px) auto" rows="min-content min-content">
            <Content shorten className="bg1">Cellwewewewwew wew wew wewe</Content>
            <Content scroll wrap className="bg2">Cell 2 wew we wew ewew we ewe   wewe wewe we we
                weweqweweweweweweqqrwerqtqrwqrwqrwqewqewqewqewqeqwrwqewqeq</Content>
            <Content wrap className="bg2">Cell 3</Content>
            <Content wrap className="bg1">Cell 4</Content>
        </Grid>
    
    );
    examples.push(
        <Content scroll full>
            <Grid full="h" gap columns="minmax(80px, 120px) auto">
                <Content shorten className="bg1">Cellwewewewwew wew wew wewe</Content>
                <Content wrap scroll className="bg2">Cell 2 wew we wew ewew we ewe   wewe wewe we we
                    weweqweweweweweweqqrwerqtqrwqrwqrwqewqewqewqewqeqwrwqewqeq</Content>
                <Content wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Content>
                <Content wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Content>
                <Content wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Content>
                <Content wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Content>
                <Content wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Content>
                <Content wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Content>
                <Content wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Content>
                <Content wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Content>
                <Content wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Content>
                <Content wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Content>
                <Content wrap className="bg2">Cell 3weqweqqwewqewqeqwewqeq</Content>
                <Content wrap className="bg1">Cell 4 wqew ewqe wqewqe wqewqe wqewqewqewqewqewqewq ewqe qweqwewqewqe wqewq wqe eqweqweqw</Content>
            </Grid>
        </Content>
    
    );
    examples.push(
        <Grid gap full centerAll columns="20px auto 20px" rows="20px auto 20px">
            <Content className="bg1">1</Content>
            <Content className="bg2">2</Content>
            <Content className="bg1">3</Content>
            <Content className="bg2">4</Content>
            <Content wrap scroll full className="bg1">
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
            </Content>
            <Content className="bg2">6</Content>
            <Content className="bg1">7</Content>
            <Content className="bg2">8</Content>
            <Content className="bg1">9</Content>
        </Grid>
    
    );
    examples.push(
            <Content>Unsupported</Content>
    
    );
    examples.push(
        <Stack vertical full>
            <Content height={40}>
                Top...
            </Content>
            <Content flex>
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
            </Content>
            <Content height={40}>
                Bottom...
            </Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical full>
            <Content height={40}>
                Top...
            </Content>
            <Content flex center>
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
            </Content>
            <Content height={40}>
                Bottom...
            </Content>
        </Stack>

    
    );
    examples.push(
        <Content padded full="h" className="bg1">
            Children go here...
        </Content>
    
    );
    examples.push(
        <Content padded scroll className="bg1">
            jwejwjejwejwqejwqejwqjewqjewqjewjqejwqejwqjeqwjejwqejwqjeqwjejqwejwqjewqjeqjwej
        </Content>
    
    );
    examples.push(
        <Content padded shorten className="bg1">
            jwejwjejwejwqejwqejwqjewqjewqjewjqejwqejwqjeqwjejwqejwqjeqwjejqwejwqjewqjeqjwej
        </Content>
    
    );
    examples.push(
        <Content padded scroll className="bg1">
            jwejwjejwejwqejwqejwqjewqjewqjewjqejwqejwqjeqwjejwqejwqjeqwjejqwejwqjewqjeqjwej
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
            <br />ooooooooooooooooooooover<br />aaa<br />bbb
        </Content>

    
    );
    examples.push(
        <Content padded="h" full="h" className="bg1">
            Children go here...
        </Content>
    
    );
    examples.push(
        <Content padded="v" full="h" className="bg1">
            Children go here...
        </Content>
    
    );
    examples.push(
        <Stack gap>
            <Content width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical gap full>
            <Content height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack border full="v">
            <Content width={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack vertical border full>
            <Content wrap className="bg2">Min contenteeeeeee</Content>
            <Content height={100} wrap className="bg1">Fix size ooooooooooooooooooooover</Content>
            <Content flex wrap className="bg3">Max content aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa</Content>
        </Stack>
    
    );
    examples.push(
        <Stack full="h" wrap gap className="bg1">
            <Content thin boxed>Elem one</Content>
            <Content thin boxed>Elem HWHEhwehwehwe</Content>
            <Content thin boxed>Elem wjwjewje</Content>
            <Content thin boxed>Elem</Content>
            <Content thin boxed>Elem geee haw</Content>
            <Content thin boxed>Elem geee haw</Content>
            <Content thin boxed>Elem geee haw</Content>
            <Content thin boxed>Elem Bababsabs</Content>
        </Stack>
    
    );
    examples.push(
        <Stack full="h" wrap gap centerAll className="bg1">
            <Content thin boxed>Elem one</Content>
            <Content wrap thin boxed>Elem HWHEhwehwehwe</Content>
            <Content wrap thin boxed>Elem wjwjewje</Content>
            <Content boxed>Elem</Content>
            <Content boxed>Elem geee haw</Content>
            <Content wrap thin boxed>Elem geee haw</Content>
            <Content thin boxed>Elem geee haw</Content>
            <Content thin boxed>Elem Bababsabs</Content>
        </Stack>
    
    );
    examples.push(
        <Content padded full="h" className="bg1">
            <Stack gap>
                <Content boxed width={100} height={100} className="bg2"></Content>
                <Content thin boxed width={100} height={100} className="bg3"></Content>
            </Stack>
        </Content>
    
    );
    examples.push(
        <Content padded full="h">
            <Stack gap>
                <Canvas boxed width={100} height={100}></Canvas>
                <Canvas thin boxed width={100} height={100}></Canvas>
            </Stack>
        </Content>
    
    );
    examples.push(
        <Content padded full="h" className="bg1">
            <Stack border boxed>
                <Content width={100} height={100} className="bg2"></Content>
                <Content width={100} height={100} className="bg3"></Content>
            </Stack>
        </Content>

    
    );
    examples.push(
        <Stack vertical gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gap padded full="h" className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gap padded className="bg2">
            <Content className="bg1" full="h">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="v" gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gap padded className="bg2">
            <Content full="v" className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="v" gap padded className="bg2">
            <Content full="v" className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gap padded full className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical gap padded full className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content flex className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="h" gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content flex className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack vertical full="v" gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content flex className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack gap padded full="h" className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack gap padded className="bg2">
            <Content className="bg1" full="h">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack full="v" gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack gap padded className="bg2">
            <Content full="v" className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack full="v" gap padded className="bg2">
            <Content full="v" className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack gap padded full className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack gap padded full className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content flex className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack full="h" gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content flex className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack full="v" gap padded className="bg2">
            <Content className="bg1">
                    e1<br />balalaa
            </Content>
            <Content flex className="bg3">
                    e2<br />balalaaaaaaaaaaaa<br />heey
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack full gap padded className="bg2">
            <Content padded width={100} className="bg1">
                    fix
            </Content>
            <Content flex>
                <Stack full="v" padded gap flex className="bg1">
                    <Content padded className="bg3">
                        First
                    </Content>
                    <Content padded wrap className="bg3">
                        Second Box
                    </Content>
                </Stack>
            </Content>
            <Content padded width={100} className="bg3">
                    last
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack full gap padded className="bg2">
            <Content padded width={100} className="bg1">
                    fix
            </Content>
            <Stack full="v" padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
            </Stack>
            <Content padded width={100} className="bg3">
                    last
            </Content>
        </Stack>
                    
    );
    examples.push(
        <Stack full gap padded scroll className="bg2">
            <Content padded width={100} className="bg1">
                    fix
            </Content>
            <Stack padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
                <Content padded className="bg3">
                    Veryveryveryveryveryveryveryveryveryverylong Box
                </Content>
            </Stack>
        </Stack>
                    
    );
    examples.push(
        <Stack full gap padded scroll className="bg2">
            <Content padded width={100} className="bg1">
                    fix
            </Content>
            <Stack padded gap flex className="bg1">
                <Content padded className="bg3">
                    First
                </Content>
                <Content padded wrap className="bg3">
                    Second Box
                </Content>
                <Content padded className="bg3">
                    Veryveryveryveryveryveryveryveryveryverylong Box
                </Content>
            </Stack>
        </Stack>
                    
    );
    return examples;
}

export {getExamples};/*
RESCUE CODE:

import React from "react";
import {Content, Stack, Grid, Overlays, Overlay} from "../components/LayoutComponents";

function getExamples() {
    return [];
}

export {getExamples};
 */