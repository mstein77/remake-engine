import React, { useContext, useEffect, useMemo, useState, useRef } from "react"
import { Stack, Block } from "../components/LayoutComponents"
import { Button2, Checkbox2, Handle } from "../components/FormComponents"
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
                <Button2 icon="delete" name="Checker!" padded onClick={onClick} />
                <Button2 icon="delete" name="Checker!" padded gaps={false} onClick={onClick} />
                <Button2 icon="delete" onClick={onClick} onClickEnd={() => d('BOOM!')} />
                <Button2 icon="delete" width={100} height={40} onClick={onClick} />
                <Button2 icon="delete" padded onClick={onClick} />
                <Button2 icon="delete" full center padded onClick={onClick} />
                <Button2 name="Checker!" onClick={onClick} />
                <Button2 name="Checker off" padded current={radio} value={0} onClick={setRadio} />
                <Button2 name="Checker on" padded current={radio} value={1} onClick={setRadio} />
                <Button2 name="Checker!" full end padded onClick={onClick} />
                <Button2 icon="delete" name="Checker!" rev padded onClick={onClick}>Suffix!</Button2>
                <Button2 icon="delete" name="Checker whack!" maxWidth={100} padded onClick={onClick}>Suffix!</Button2>
                <Button2 name="CheckerCCC!" padded onClick={onClick2}>Suffix!</Button2>
                <Button2 icon="delete" padded onClick={onClick}>Suffix!</Button2>
                <Button2 padded onClick={onClick}>Suffix!</Button2>
                <Button2 icon="delete" disabled padded state={1} onClick={onClick}>Suffix!</Button2>
                <Button2 icon="delete" full center padded state={1} onClick={onClick}>Suffix!</Button2>
                <Button2 icon="delete" padded state={2} onClick={onClick}>Suffix!</Button2>
                <Button2 icon="delete" full="h" end padded state={2} onClick={onClick}>Suffix!</Button2>
                <Button2 name="delete" full="h" padded state={2} onClick={onClick}><Kbd value="&gt;&nbsp;" /></Button2>

                <Stack vertical>
                    <Button2 icon="add" center iconProps={iProps} onClick={{exec: () => d('+'), repeat: true}} />
                    <Button2 icon="remove" center iconProps={iProps} onClick={() => d('-')} />
                </Stack>

                <Button2 icon="visibility" name="before" state={state} padded onClick={() => setState(1)} onClickEnd={() => setState(0)} />
            </Stack>

            <Button2 vertical icon="add" gaps={false} name="10" onClick={onClick} />
            <Button2 vertical icon="add" gaps={false} name="10" onClick={onClick} />
            <Button2 vertical icon="add" padded gaps={false} name="10" full rev onClick={onClick}>HA</Button2>

            <Stack vertical gaps>
                <Handle width={10} height={30} tab axis="v" onMove={(x, y) => d('OFF', x, y)} onDirKey={(dir, factor, shift) => d('KEY', dir, factor, shift)} />
                <Handle tab axis="v" className="button-color" onMove={(x, y) => d('OFF', x, y)}><Icon name="add" /></Handle>
                <Handle circle width={5} height={5} tab />
                <Checkbox2 size={14} value={check1} set={setCheck1} />
                <Checkbox2 value={check2} set={setCheck2} />
                <Checkbox2 size={14} name="Rulers" value={check1} set={setCheck1} />
                <Checkbox2 name="Rulers" value={check2} set={setCheck2} rev />
                <Checkbox2 readOnly size={14} name="Rulers" value={check1} set={setCheck1} />
                <Checkbox2 disabled size={14} name="Rulers" value={check2} set={setCheck2} />
                <Checkbox2 name="Very very long Rulers" maxWidth={80} value={check2} set={setCheck2} />
                <Checkbox2 name="Very very long Rulers" full="h" value={check2} set={setCheck2} />
            </Stack>
        </Stack>
    )
}

export {
    DemoEditor
}