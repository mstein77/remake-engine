import React, { useContext, useEffect, useMemo, useState, useRef } from "react"
import { Stack, Block } from "../components/LayoutComponents"
import { Button, Checkbox, Handle } from "../components/FormComponents"
import { Kbd, Icon } from "../components/BasicComponents";
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

    const [ state, setState ] = useState(0);
    const [ check1, setCheck1 ] = useState(true);
    const [ check2, setCheck2 ] = useState(false);
    const [ radio, setRadio ] = useState(0);

    return (
        <Stack gaps>
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
                <Handle width={10} height={30} tab axis="v" onMove={(x, y) => d('OFF', x, y)} onDirKey={(dir, factor, shift) => d('KEY', dir, factor, shift)} />
                <Handle tab axis="v" className="button-color" onMove={(x, y) => d('OFF', x, y)}><Icon name="add" /></Handle>
                <Handle circle width={5} height={5} tab />
                <Checkbox size={14} value={check1} set={setCheck1} />
                <Checkbox value={check2} set={setCheck2} />
                <Checkbox size={14} name="Rulers" value={check1} set={setCheck1} />
                <Checkbox name="Rulers" value={check2} set={setCheck2} rev />
                <Checkbox readOnly size={14} name="Rulers" value={check1} set={setCheck1} />
                <Checkbox disabled size={14} name="Rulers" value={check2} set={setCheck2} />
                <Checkbox name="Very very long Rulers" maxWidth={80} value={check2} set={setCheck2} />
                <Checkbox name="Very very long Rulers" full="h" value={check2} set={setCheck2} />
            </Stack>
        </Stack>
    )
}

export {
    DemoEditor
}