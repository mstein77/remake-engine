import React, { useState } from "react"
import {Stack, Block, DIR} from "../components/LayoutComponents"
import { TextArea, Button, Radio, Checkbox, Slider, Input } from "../components/FormComponents"
import {Kbd, Icon, Canvas, Gradient, PropertyGrid } from "../components/BasicComponents";
import { d } from "../helper/helper"

function DemoEditor({}) {
    const onClick = value => d('CLICK', value);

    const onClick2 = {
        exec: () => d('yeah!'),
        can: () => true
    };

    const iProps = {
        width: 20,
        height: 10,
        size: 10
    };

    const radioOptions = [
        {id: 0, name: 'Jantipa'}, {id: 1, name: 'Dao'}, {id: 2, name: 'Joy'},
        {id: 3, name: 'Jantipa'}, {id: 4, name: 'Dao'}, {id: 5, name: 'Joy'},
    ];

    const [ state, setState ] = useState(0);
    const [ sliderValue, setSliderValue ] = useState(200);
    const [ test, setTest ] = useState(0);
    const [ decValue, setDecValue ] = useState(0.0);
    const [ check1, setCheck1 ] = useState(true);
    const [ check2, setCheck2 ] = useState(false);
    const [ radio, setRadio ] = useState(0);
    const [ radio2, setRadio2 ] = useState(0);
    const [ text, setText ] = useState('Here...');

    const renderRail = ctx => {
        const size = 150;
        const grdBlack = ctx.createLinearGradient(0, 0, size - 1, 0);
        grdBlack.addColorStop(0, "#00000000");
        grdBlack.addColorStop(1, "#000000FF");
        ctx.clearRect(0, 0, size, 15);
        ctx.fillStyle = grdBlack;
        ctx.fillRect(0, 0, size, 15);
    }

    const renderRailV = ctx => {
        const size = 150;
        ctx.clearRect(0, 0, 15, size);
        const grdBlack = ctx.createLinearGradient(0, 0, 0, size - 1);
        grdBlack.addColorStop(0, "#FF0000");
        grdBlack.addColorStop(1, "#0000FF");
        ctx.fillStyle = grdBlack;
        ctx.fillRect(0, 0, 15, size);
    }

    const renderIndicator = () => {
        const render = ctx => {
            ctx.clearRect(0, 0, 15, 15);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(5, 6);
            ctx.lineTo(14, 0);
            ctx.lineTo(14, 12);
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.moveTo(4, 6);
            ctx.lineTo(13, 0);
            ctx.moveTo(4, 6);
            ctx.lineTo(13, 12);
            ctx.stroke();
        };
        return <Canvas plain width={15} height={12} render={render} />
    }


    return (
        <Stack gaps full>
            <Stack vertical gaps>
                <Button icon="delete" name="Checker!" padded onClick={onClick} />
                <Button icon="delete" name="Checker!" padded gaps={false} onClick={onClick} />
                <Button icon="delete" onClick={onClick} onClickEnd={() => d('BOOM!')} />
                <Button icon="delete" width={100} height={40} onClick={onClick} />
                <Button icon="delete" padded onClick={onClick} />
                <Button icon="delete" full center padded onClick={onClick} />
                <Button name="Checker!" onClick={onClick} />
                <Button name="Checker off" padded current={radio} value={0} onClick={setRadio} />
                <Button name="Checker on" padded current={radio} value={1} onClick={setRadio} />
                <Button name="Checker!" full end padded onClick={onClick} />
                <Button icon="delete" name="Checker!" rev padded onClick={onClick}>Suffix!</Button>
                <Button icon="delete" name="Checker whack!" maxWidth={100} padded onClick={onClick}>Suffix!</Button>
                <Button name="CheckerCCC!" padded onClick={onClick2}>Suffix!</Button>
                <Button icon="delete" padded onClick={onClick}>Suffix!</Button>
                <Button padded onClick={onClick}>Suffix!</Button>
                <Button icon="delete" disabled padded state={1} onClick={onClick}>Suffix!</Button>
                <Button icon="delete" full center padded state={1} onClick={onClick}>Suffix!</Button>
                <Button icon="delete" padded state={2} onClick={onClick}>Suffix!</Button>
                <Button icon="delete" full="h" end padded state={2} onClick={onClick}>Suffix!</Button>
                <Button name="delete" full="h" padded state={2} onClick={onClick}><Kbd value="&gt;&nbsp;" /></Button>

                <Stack vertical>
                    <Button icon="add" center iconProps={iProps} onClick={{exec: () => d('+'), repeat: true}} />
                    <Button icon="remove" center iconProps={iProps} onClick={() => d('-')} />
                </Stack>

                <Button icon="visibility" name="before" state={state} padded onClick={() => setState(1)} onClickEnd={() => setState(0)} />
            </Stack>

            <Button vertical icon="add" gaps={false} name="10" onClick={onClick} />
            <Button vertical icon="add" gaps={false} name="10" onClick={onClick} />
            <Button vertical icon="add" padded gaps={false} name="10" full rev onClick={onClick}>HA</Button>

            <Stack vertical gaps>
                <Checkbox size={14} value={check1} set={setCheck1} />
                <Checkbox value={check2} set={setCheck2} />
                <Checkbox size={14} name="Rulers" value={check1} set={setCheck1} />
                <Checkbox name="Rulers" value={check2} set={setCheck2} rev />
                <Checkbox readOnly size={14} name="Rulers" value={check1} set={setCheck1} />
                <Checkbox disabled size={14} name="Rulers" value={check2} set={setCheck2} />
                <Checkbox name="Very very long Rulers" maxWidth={80} value={check2} set={setCheck2} />
                <Checkbox name="Very very long Rulers" full="h" value={check2} set={setCheck2} />
                <PropertyGrid labelProps={{width: 60}}>
                    <Block padded={DIR.LEFT|DIR.BOTTOM|DIR.RIGHT} shorten>Where are we?</Block>
                    <Block full="h" padded={DIR.BOTTOM|DIR.RIGHT}>Here we go with a long line</Block>

                    <Block padded={DIR.LEFT|DIR.BOTTOM|DIR.RIGHT} wrap={true}>Where are here?</Block>
                    <Block full="h" padded={DIR.BOTTOM|DIR.RIGHT}>Here we go with a long line</Block>

                    <Block padded={DIR.LEFT|DIR.BOTTOM|DIR.RIGHT}><Block end>a:</Block></Block>
                    <Block full="h" className="input-bg" padded={DIR.BOTTOM|DIR.RIGHT} wrap>
                        Here we stop</Block>

                    <Block padded={DIR.LEFT|DIR.BOTTOM|DIR.RIGHT}><Block shorten wrap end>another label:</Block></Block>
                    <Block full="h" padded={DIR.BOTTOM|DIR.RIGHT} wrap>
                        Here we go with a long line</Block>
                </PropertyGrid>
                <Input value={sliderValue} set={setSliderValue} number full="h" />
                <Input value={sliderValue} set={setSliderValue} number full="h" maxWidth={false} />
                <Input value={sliderValue} set={setSliderValue} maxWidth={150} number full="h" />
                <Input value={sliderValue} set={setSliderValue} number />
                <Input value={sliderValue} set={setSliderValue} number size={8} />
                <Input value={sliderValue} set={setSliderValue} number size={8} minWidth={150} />
                <Input value={sliderValue} set={setSliderValue} width={120} number />
                <Input value={sliderValue} set={setSliderValue} number />
                <Input value={'' + sliderValue} set={setSliderValue} />
                <Input value={'' + sliderValue} clear set={setSliderValue} />
                <Input value={sliderValue} number clear set={setSliderValue} full="h" />
                <Input name="Check it out:" value={'' + sliderValue} set={setSliderValue} />
                <TextArea value={text} set={setText} />
                <TextArea name="Forza:" minWidth={250} value={text} set={setText} full="h" />
            </Stack>

            <Slider min={100} max={400} value={sliderValue} set={setSliderValue} vertical />
            <Slider tab min={200} max={201} value={sliderValue} set={setSliderValue}  vertical />
            <Slider readOnly min={100} max={400} value={sliderValue} set={setSliderValue}  vertical />
            <Slider min={100} max={400} value={sliderValue} set={setSliderValue}  vertical railProps={{long: 10}} />
            <Slider
                vertical tab min={100} max={400} value={sliderValue} set={setSliderValue} getIndicator={renderIndicator}
                sledProps={{long: 15, short: 10, margin: 13, radius: false, border: '1'}}
                railProps={{outline: true, border: true, oppSize: 15, center: false}}
                ><Gradient plain colors="#6AA0D7 #AA4450" vertical /></Slider>
            <Block height={300} border>
                <Slider vertical full="v" sledProps={{margin: 10}} railProps={{oppSize: 15, center: false}} min={100} max={400} value={sliderValue} set={setSliderValue} />
            </Block>

            <Stack vertical gaps>
                <Slider center sledProps={{margin: 10}} railProps={{oppSize: 15, center: false}} min={100} max={400} full="h" value={sliderValue} set={setSliderValue} />
                <Slider tab min={0} max={1} value={decValue} set={setDecValue} decimals={2} />
                <Slider min={100} max={400} value={sliderValue} set={setSliderValue} />
                <Slider min={sliderValue} max={sliderValue} value={sliderValue} set={setSliderValue} />
                <Slider tab min={-10} max={5} value={test} set={setTest} />
                <Slider min={100} max={400} value={sliderValue} set={setSliderValue}  rail={10}><Canvas width={150} height={10} render={renderRail} /></Slider>
                <Slider min={100} max={400} value={sliderValue} set={setSliderValue}
                        railProps={{outline: true, oppSize: 15,  center: false}}
                        sledProps={{radius: false, margin: 5}}>
                    <Gradient colors="#00000000 #000000FF" />
                </Slider>
                <Slider min={100} border={false} max={400} value={sliderValue} set={setSliderValue}  long={8} short={8} radius={false} />
                <Slider disabled min={100} max={400} value={sliderValue} set={setSliderValue} rail={15} radius={false} centerItems={false} margin={5}><Canvas width={150} height={15} render={renderRail} /></Slider>
            </Stack>

            <Stack vertical gaps xfull="h">
                <Stack full="h" end>
                    <Slider end full="h" border min={100} max={400} padded="1" value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Stack full="h" end>
                    <Slider full="h" railProps={{maxSize: null}} border min={100} max={400} padded="1" value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Stack full="h" end>
                    <Slider full="h" railProps={{minSize: null}} border min={100} max={400} padded="1" value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Stack>
                    <Slider padded={DIR.RIGHT} size={166} railProps={{minSize: null}} border min={100} max={400} value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Stack>
                    <Slider border min={100} max={400} value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Radio options={radioOptions} name="Who?" value={radio2} set={setRadio2} padded gaps />

            </Stack>

            <Stack gaps full="v">
                <Stack className="xalign-center" vertical full="v">
                    <Slider center vertical full="v" border min={100} max={400} value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Stack vertical full="v">
                    <Slider vertical full="v" railProps={{maxSize: null}} border min={100} max={400} value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Stack vertical full="v">
                    <Slider vertical full="v" railProps={{minSize: null}} border min={100} max={400} value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>

                <Stack vertical>
                    <Slider vertical size={166} border min={100} max={400} value={sliderValue} set={setSliderValue} />
                    <Block>End</Block>
                </Stack>
            </Stack>

        </Stack>
    )
}

export {
    DemoEditor
}