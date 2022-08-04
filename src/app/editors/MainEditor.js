import React, { Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BackgroundCtx, CssCtx, Icon, PropertyGrid, Ruler, SideTab, SideTabs, HotKeyKeys, HotKeySingleKeys, HotKeySkipValues, useComponentUpdate, useModal, WindowContext, CssContext, WindowCtx } from "../components/BasicComponents";
import { Block, DIR, Grid, Stack } from "../components/LayoutComponents";
import { ButtonStack } from "../components/BasicComponents";
import { PropSection, OkCancelForm, Button, Select, Input, CssGradient, CheckboxProp, Radio, LabelProp, Checkbox, Number, Color, NumberProp, VirtualNumber } from "../components/FormComponents";
import { NameDialog, useConfirmDialog, useContentSwitcher } from "../components/EditorComponents";
import { d, getParsedCssValueRec } from "../helper/helper";
import ReactDOM from "react-dom";

function PresetsManager({ id, set, config, ...props }) {
    const wContext = useContext(WindowContext);

    const NameModal = useModal();
    const update = useComponentUpdate();

    const defaultItems = [];
    const customItems = [];

    const presetKey = 'presets.' + id;
    const defaults = wContext.defaults[id];
    const setDefaultedValues = values => {
        set(defaults.length > 0 ? { ...defaults[0].values, ...values } : { ...values });
    };

    if (defaults) {
        for (let item of defaults) {
            defaultItems.push(
                <Block key={item.name} padded="h" full="h">
                    <Button full="h" name={item.name} padded="h" onClick={() => setDefaultedValues({ ...item.values })} rev><Icon name="keyboard_arrow_left" /></Button>
                </Block>
            )
        }
    }

    const presets = wContext.storage.getDefaultedArray(presetKey, []);
    const reserved = [];
    for (let item of presets) {
        reserved.push(item.name);
        customItems.push(
            <Stack vertical key={item.name} padded="h" full="h" gaps="1">
                <Button full="h" name={item.name} padded="h" onClick={() => setDefaultedValues(item.values)} rev><Icon name="keyboard_arrow_left" /></Button>
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
        <Block full="v" maxWidth="30%" minWidth={80}>
            <Stack full="h" gaps vertical padded scroll>
                {defaultItems}
                <Ruler />
                <Block center>
                    <Button icon="add" onClick={addPresets} />
                </Block>
                <Ruler />
                {customItems}
            </Stack>

            <NameModal.content name={'Store ' + id + ' as...'} width={200}>
                <NameDialog { ...NameModal.props } />
            </NameModal.content>
        </Block>
    )
}

function NumberOrNoneProp({ name, value, set, def, min = 0, ...props }) {
    const none = value === 'none';
    const [ noneValue, setNoneValue ] = useState(none ? (def === undefined ? min : def) : value);

    const toggleNone = newNone => {
        if (newNone) {
            set('none')
        } else {
            set(noneValue);
        }
    };
    const setNumber = newNumber => {
        set(newNumber);
        setNoneValue(newNumber)
    };

    return (
        <LabelProp name={name}>
            <Stack vertical full="h" gaps>
                <Checkbox name="Unlimited" value={none} set={toggleNone} />
                <Number
                    full="h"
                    disabled={none} slider="h" min={min}
                    value={none ? noneValue : value}
                    set={setNumber} { ...props }
                />
            </Stack>
        </LabelProp>
    )
}

function ConfigSettings({ config, setConfig }) {
    const propSetter = prop => value => {
        setConfig({ ...config, [prop]: value});
    };

    return (
        <Stack full borders>
            <Block padded full="h" scroll>
                <PropertyGrid padded>
                    <NumberOrNoneProp
                        name="Max Width"
                        value={config.maxWidthPx} set={propSetter('maxWidthPx')}
                        min={400} max={5000} def={1000}
                    />
                    <NumberOrNoneProp
                        name="Max Height"
                        value={config.maxHeightPx} set={propSetter('maxHeightPx')}
                        min={400} max={5000} def={1000}
                    />
                    <CheckboxProp name="Help Tooltips" value={config.tooltips} set={propSetter('tooltips')} />
                    <CheckboxProp name="UI Animations" value={config.uiAnimations} set={propSetter('uiAnimations')} />
                    <NumberProp name="History size" value={config.maxHistory} max={100} set={propSetter('maxHistory')} min={5} />
                    <NumberProp name="Tab spaces" value={config.tabSpaces} max={10} set={propSetter('tabSpaces')} min={1} />
                    <NumberProp name="Double Click Ms" value={config.doubleClickMs} max={1000} set={propSetter('doubleClickMs')} min={0} />
                </PropertyGrid>
            </Block>

            <PresetsManager id="config" set={setConfig} values={config} />
        </Stack>
    )
}

function ConcatList({ value, set, separator }) {
    const PartModal = useModal();

    const parts = value === '' ? [] : value.split(separator);

    const deletePart = part => {
        parts.splice(parts.indexOf(part), 1);
        const newValue = parts.join(separator);
        set(newValue)
    };

    const editPart = part => {
        const index = parts.indexOf(part);
        const reserved = [ ...parts ];
        reserved.splice(index, 1);
        PartModal.open({
            match: name => name.indexOf(' ') === -1 && name.match(/^http(s)?:\/\/.+/),
            name: part,
            save: newPart => {
                const newParts = [ ...parts ];
                newParts.splice(index, 1, newPart);
                set(newParts.join(separator));
                PartModal.close()
            },
            reserved
        })
    };

    const items = [];
    for (let part of parts) {
        items.push(
            <Stack gaps full="h" key={part} padded={DIR.BOTTOM}>
                <Block full="h" center="v" shorten>{part}</Block>
                <Button icon="edit" onClick={() => editPart(part)} />
                <Button icon="delete" onClick={() => deletePart(part)} />
            </Stack>
        );
    }

    const addNew = () => PartModal.open({
        match: name => name.indexOf(' ') === -1 && name.match(/^http(s)?:\/\/.+/),
        name: 'https://',
        save: part => {
            set([ ...parts, part].join(separator));
            PartModal.close()
        },
        reserved: parts
    });

    items.push(
        <Block key="__add" padded><Button icon="add" onClick={addNew} /></Block>
    );

    return (
        <>
            <Stack vertical borders="1" maxWidth={250}>
                {items}
            </Stack>

            <PartModal.content name="New Resource" width={300}>
                <NameDialog { ...PartModal.props } />
            </PartModal.content>
        </>
    )
}

const borderStyleOptions = [
    {id: 'solid', name: 'solid'},
    {id: 'dotted', name: 'dotted'},
    {id: 'dashed', name: 'dashed'},
    {id: 'inset', name: 'inset'},
    {id: 'outset', name: 'outset'},
    {id: 'double', name: 'double'},
    {id: 'groove', name: 'groove'},
    {id: 'ridge', name: 'ridge'},
    {id: 'none', name: 'none'}
];

const checkboxStyleOptions = [
    {id: 0, name: 'Input'},
    {id: 1, name: 'Button'}
];

const headerTypeOptions = [
    {id: 0, name: 'Window'},
    {id: 1, name: 'Floating'},
];

const bgTypeOptions = [
    {id: 0, name: 'Primary'},
    {id: 1, name: 'Color'},
    {id: 2, name: 'Gradient'}
];

const titleStyleOptions = [
    {id: 0, name: 'Plain'},
    {id: 1, name: 'Color'},
    {id: 2, name: 'Gradient'}
];

const hoverChangeOptions = [
    {id: -1, name: 'darker'},
    {id: 1, name: 'brighter'}
];

function ThemeSettings({ theme, setTheme }) {
    d('THEME', theme);
    const propSetter = prop => value => setTheme({ ...theme, [prop]: value});

    const setTitleGrad = titleBgGrad => {
        const parsed = getParsedCssValueRec(titleBgGrad);
        const currDeg = parsed.params[0];
        const parts = [
            (parseInt(currDeg.substr(0,currDeg.length - 3), 10) + 90) + 'deg'
        ];
        let i = 1;
        while(i < parsed.params.length) {
            if (typeof parsed.params[i] !== 'string') {
                parts.push(parsed.params[i][0] + ' ' + parsed.params[i][1])
            }
            i++
        }
        const titleVertBgGrad = 'linear-gradient(' + parts.join(', ') + ')';
        setTheme({ ...theme, titleBgGrad, titleVertBgGrad });
    }
    return (
        <Stack full borders>
            <Block full="h" padded scroll>
                <PropertyGrid>

                    <PropSection name="Editor" />

                    <LabelProp name="Colors">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.editorBgRgb} set={propSetter('editorBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="format_color_text" />
                                <Color value={theme.editorRgb} set={propSetter('editorRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="border_color" />
                                <Color value={theme.boxBorderRgb} set={propSetter('boxBorderRgb')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <LabelProp name="Defaults">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="padding" />
                                <Number value={theme.defaultPaddingPx} max={20} set={propSetter('defaultPaddingPx')} min={0} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="line_weight" />
                                <Number value={theme.boxBorderWidthPx} max={10} set={propSetter('boxBorderWidthPx')} min={0} />
                            </Stack>
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Font Size">
                        <Stack gaps>
                            <Block center="v"><Icon name="format_size" size={12} /></Block>
                            <Number value={theme.fontSizeSmallPx} min={7} max={20} set={propSetter('fontSizeSmallPx')} />
                            <Block center="v"><Icon name="format_size" size={16} /></Block>
                            <Number value={theme.fontSizeMediumPx} min={7} max={20} set={propSetter('fontSizeMediumPx')} />
                            <Block center="v"><Icon name="format_size" size={20} /></Block>
                            <Number value={theme.fontSizeBigPx} min={7} max={20} set={propSetter('fontSizeBigPx')} />
                        </Stack>
                    </LabelProp>

                    <PropSection name="Content" />
                    <LabelProp name="Primary">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.primaryBgRgb} set={propSetter('primaryBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="format_color_text" />
                                <Color value={theme.primaryRgb} set={propSetter('primaryRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon className="less" name="image" />
                                <Color value={theme.ghostBgRgb} set={propSetter('ghostBgRgb')} />
                            </Stack>
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Secondary">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.secondaryBgRgb} set={propSetter('secondaryBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="format_color_text" />
                                <Color value={theme.secondaryRgb} set={propSetter('secondaryRgb')} />
                            </Stack>
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Overlay">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.overlayBgRgba} alpha set={propSetter('overlayBgRgba')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Focus" />
                    <LabelProp name="Border">
                        <Stack gaps>
                            <Icon name="image" />
                            <Color value={theme.focusBgRgba} alpha set={propSetter('focusBgRgba')} />
                            <Icon name="line_weight" />
                            <Number value={theme.focusWidthPx} max={10} set={propSetter('focusWidthPx')} min={0} />
                        </Stack>
                    </LabelProp>

                    <PropSection name="Active" />
                    <LabelProp name="Colors">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.activeBgRgb} set={propSetter('activeBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="format_color_text" />
                                <Color value={theme.activeRgb} set={propSetter('activeRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="border_color" />
                                <Color value={theme.activeBorderRgb} set={propSetter('activeBorderRgb')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Warning" />
                    <LabelProp name="Colors">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.warningBgRgb} set={propSetter('warningBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="format_color_text" />
                                <Color value={theme.warningRgb} set={propSetter('warningRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="border_color" />
                                <Color value={theme.warningBorderRgb} set={propSetter('warningBorderRgb')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Input" />
                    <LabelProp name="Colors">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.inputBgRgb} set={propSetter('inputBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="format_color_text" />
                                <Color value={theme.inputRgb} set={propSetter('inputRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="border_color" />
                                <Color value={theme.inputBorderRgb} set={propSetter('inputBorderRgb')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <LabelProp name="Border">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="line_style" />
                                <Block width={110}>
                                    <Select full="h" value={theme.inputBstyle} options={borderStyleOptions} set={propSetter('inputBstyle')} />
                                </Block>
                            </Stack>
                            <Stack gaps>
                                <Icon name="line_weight" />
                                <Number value={theme.inputBorderWidthPx} max={10} set={propSetter('inputBorderWidthPx')} min={0} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="rounded_corner" />
                                <Number value={theme.inputBorderRadiusPx} max={10} set={propSetter('inputBorderRadiusPx')} min={0} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="padding" />
                                <Number value={theme.inputMinPaddingPx} max={10} set={propSetter('inputMinPaddingPx')} min={0} />
                                <Block center="v">-</Block>
                                <Number value={theme.inputPaddingPx} max={10} set={propSetter('inputPaddingPx')} min={0} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Header" />
                    <LabelProp name="Type">
                        <Stack wrap gaps full="h">
                            <Radio value={theme.headerType} set={propSetter('headerType')} options={headerTypeOptions} gaps padded="h" />
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Background">
                        <Stack wrap gaps full="h">
                            <Radio value={theme.headerBgType} set={propSetter('headerBgType')} options={bgTypeOptions} gaps padded="h" />
                        </Stack>
                    </LabelProp>
                    <LabelProp name="">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon className={theme.headerBgType !== 1 ? 'disabled' : ''} name="image" />
                                <Color disabled={theme.headerBgType !== 1} value={theme.headerBgRgb} set={propSetter('headerBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon className={theme.headerBgType !== 2 ? 'disabled' : ''} name="gradient" />
                                <CssGradient disabled={theme.headerBgType !== 2} value={theme.headerBgGrad} set={propSetter('headerBgGrad')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Title" />
                    <LabelProp name="Background">
                        <Stack wrap gaps full="h">
                            <Radio value={theme.titleBgType} set={propSetter('titleBgType')} options={bgTypeOptions} gaps padded="h" /><br />
                        </Stack>
                    </LabelProp>
                    <LabelProp name="">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon className={theme.titleBgType !== 1 ? 'disabled' : ''} name="image" />
                                <Color disabled={theme.titleBgType !== 1} value={theme.titleBgRgb} set={propSetter('titleBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon className={theme.titleBgType !== 2 ? 'disabled' : ''} name="gradient" />
                                <CssGradient disabled={theme.titleBgType !== 2} value={theme.titleBgGrad}
                                    set={setTitleGrad}
                                />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Checkbox" />
                    <LabelProp name="Style">
                        <Radio value={theme.checkBoxType} set={propSetter('checkBoxType')} options={checkboxStyleOptions} gaps padded="h" />
                    </LabelProp>

                    <PropSection name="Button" />
                    <LabelProp name="Colors">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="image" />
                                <Color value={theme.buttonBgRgb} set={propSetter('buttonBgRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="format_color_text" />
                                <Color value={theme.buttonRgb} set={propSetter('buttonRgb')} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="border_color" />
                                <Color value={theme.buttonBorderRgb} set={propSetter('buttonBorderRgb')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <LabelProp name="Border">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="line_style" />
                                <Block width={110}>
                                    <Select full="h" value={theme.buttonBstyle} options={borderStyleOptions} set={propSetter('buttonBstyle')} />
                                </Block>
                            </Stack>
                            <Stack gaps>
                                <Icon name="line_weight" />
                                <Number value={theme.buttonBorderWidthPx} max={10} set={propSetter('buttonBorderWidthPx')} min={0} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="rounded_corner" />
                                <Number value={theme.buttonBorderRadiusPx} max={10} set={propSetter('buttonBorderRadiusPx')} min={0} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="padding" />
                                <Number value={theme.buttonMinPaddingPx} max={10} set={propSetter('buttonMinPaddingPx')} min={0} />
                                <Block center="v">-</Block>
                                <Number value={theme.buttonPaddingPx} max={10} set={propSetter('buttonPaddingPx')} min={0} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <LabelProp name="Font">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="text_format" />
                                <Input value={theme.buttonFont} set={propSetter('buttonFont')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Marker" />
                    <LabelProp name="Highlighted">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="line_weight" />
                                <Number value={theme.markerWidthMinPx} max={10} set={propSetter('markerWidthMinPx')} min={1} />
                                <Block>...</Block>
                                <Number value={theme.markerWidthMaxPx} max={10} set={propSetter('markerWidthMaxPx')} min={0} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="opacity" />
                                <Number value={theme.markerOpacityMinPerc} set={propSetter('markerOpacityMinPerc')} min={0} max={100} />
                                <Block>...</Block>
                                <Number value={theme.markerOpacityMaxPerc} set={propSetter('markerOpacityMaxPerc')} min={0} max={100} />
                            </Stack>
                            <Stack gaps>
                                <Icon name="invert_colors" />
                                <Number value={theme.markerInvertMaxPerc} set={propSetter('markerInvertMaxPerc')} min={0} max={100} />
                            </Stack>
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Cursor">
                        <Stack gaps>
                            <Icon name="image" />
                            <Color value={theme.cursorBgRgba} alpha set={propSetter('cursorBgRgba')} />
                        </Stack>
                    </LabelProp>

                    <PropSection name="Other" />
                    <LabelProp name="Hover change">
                        <Stack vertical gaps>
                            <Radio value={theme.hoverChangeType} set={propSetter('hoverChangeType')} options={hoverChangeOptions} gaps padded="h" />
                            <VirtualNumber min={0} max={1} value={theme.hoverIntensityFloat} set={propSetter('hoverIntensityFloat')} decimals={2} />
                        </Stack>

                    </LabelProp>
                    <LabelProp name="Dark Text">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="opacity" />
                                <Number min={0} max={100} slider="h" value={theme.lessPerc} set={propSetter('lessPerc')} />
                            </Stack>
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Bright Text">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="brightness_medium" />
                                <Number min={0} max={200} slider="h" value={theme.morePerc} set={propSetter('morePerc')} />
                            </Stack>
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Disabled">
                        <Stack wrap gaps full="h">
                            <Stack gaps>
                                <Icon name="opacity" />
                                <Number min={0} max={100} slider="h" value={theme.disabledPerc} set={propSetter('disabledPerc')} />
                            </Stack>
                        </Stack>
                    </LabelProp>

                    <PropSection name="Meta" />
                    <LabelProp name="Resources">
                        <ConcatList value={theme.linkResourcesUrls} separator=" " set={propSetter('linkResourcesUrls')} />
                    </LabelProp>
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
        setHotKey(actionKey !== '' ? actionKey : null);
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
                <Button name="OK" padded="h" onClick={okOp} />
                <Button name="Cancel" padded="h" onClick={close} />
            </Stack>
        </Stack>
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
                <Grid columns="- + 80px" full="h" gaps>
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

function StorageSettings() {
    const wContext = useContext(WindowContext);

    return (
        <Block full="h" centerItems="h">
            <Stack padded>
                <Button padded="h" name="Clear Cache" onClick={wContext.clearAllCaches} />
            </Stack>
        </Block>
    )
}

function Settings({ save, close, defaults }) {
    const cssContext = useContext(CssContext);
    const wContext = useContext(WindowContext);

    const beforeRef = useRef(null);
    const afterRef = useRef(null);
    const [ beforeState, setBeforeState ] = useState(0);

    const [config, setConfigRaw] = useState(wContext.editorConfig);
    const configRef = useRef(null);
    configRef.current = config;
    const setConfig = newConfig => {
        for (let [key, value] of Object.entries(newConfig)) {
            if (configRef.current[key] !== newConfig[key] &&
                ['maxWidthPx', 'maxHeightPx'].includes(key)) {
                    cssContext.setValue(key, value)
                }
        }
        setConfigRaw(newConfig)
    };
    const [theme, setThemeRaw] = useState(wContext.theme);
    const themeRef = useRef(null);
    themeRef.current = theme;
    const setTheme = newTheme => {
        for (let [key, value] of Object.entries(newTheme)) {
            if (themeRef.current[key] !== newTheme[key]) {
                cssContext.setValue(key, value)
                if (key === 'linkResourcesUrls') {
                    wContext.syncLinks(value);
                }
            }
        }
        setThemeRaw(newTheme)
    };
    const [ mapping, setMapping ] = useState(wContext.hotKeyActions.action2hotKey);

    useEffect(() => {
        beforeRef.current = {
            config,
            theme,
            mapping
        };
    }, []);

    const showBefore = () => {
        afterRef.current = {config, theme, mapping};
        setConfig(beforeRef.current.config);
        setTheme(beforeRef.current.theme);
        setMapping(beforeRef.current.mapping);
        setBeforeState(1);
    };
    const restoreAfter  = () => {
        setConfig(afterRef.current.config);
        setTheme(afterRef.current.theme);
        setMapping(afterRef.current.mapping);
        setBeforeState(0);
        afterRef.current = null;
    };
    const leftButtons = [
        {state: beforeState, icon: "visibility", name: "before", onClick: showBefore, onClickEnd: restoreAfter}
    ];
    const rightButtons = [
        {icon: "delete", name: "Clear all settings", padded: "h", onClick: () => {
            wContext.clearAllSettings();
            wContext.clearAllCaches();

            setConfig(defaults.config);
            setTheme(defaults.theme);
            setMapping(defaults.mapping);
            save({
                config: defaults.config,
                theme: defaults.theme,
                mapping: defaults.mapping
            }, false);
        }}
    ];
    return (
        <OkCancelForm full save={() => save({ config, theme, mapping })} cancel={close} left={leftButtons} right={rightButtons}>
            <SideTabs full>
                <SideTab name="Editor" active full>
                    <ConfigSettings config={config} setConfig={setConfig} />
                </SideTab>

                <SideTab name="Theme" full>
                    <ThemeSettings theme={theme} setTheme={setTheme} />
                </SideTab>

                <SideTab name="HotKeys" full>
                    <HotKeySettings mapping={mapping} setMapping={setMapping} />
                </SideTab>

                <SideTab name="Storage" full>
                    <StorageSettings />
                </SideTab>
            </SideTabs>
        </OkCancelForm>
    )
}

function BaseAppInner({ contentProvider, active }) {
    const wContext = useContext(WindowContext);
    const SettingsModal = useModal();
    const { openConfirmModal, Modals } = useConfirmDialog();

    wContext.register('settings', SettingsModal);

    const { ContentSwitcher, hasTransitioned, isRoot } = useContentSwitcher(contentProvider, active);

    const confirm = callback => {
        if (wContext.needsConfirmation()) {
            openConfirmModal({
                msg: 'You have unsaved changes, are you sure that you want to leave?',
                save: () => {
                    callback()
                }
            });
        } else {
            callback()
        }
    };

    const play = () => {
        wContext.onExclusiveModeEnd(
            () => {
                const gameRef = wContext.game;
                ReactDOM.unmountComponentAtNode(document.getElementById('editor'));
                if (wContext.isDirty()) {
                    // TODO: hier sollte eigentlich eher der Screen restartet werden?
                    // zumindest sollte der Editor nicht direkt wieder geöffnet werden
                    // man könnte sich aber den letzten Editor durchaus merken
                    gameRef.reloadScreen(wContext.registry('callStack'));
                } else {
                    gameRef.restart(true);
                }
            }
        );
    };

    const onFocus = e => {
        wContext.register('lastTarget', e.target);
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
            if (wContext.isInExclusiveMode() || wContext.isTransitioning()) {
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
            const elem = document.activeElement === document.body ? wContext.getLastTarget() : document.activeElement;
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
            } else if (handler === null && actionKey === 'Escape') {
                e.stopPropagation();
                e.preventDefault();
                confirm(play)
            }
        };
        const clickListener = e => {
            wContext.register('lastTarget', e.target);
        };
        window.addEventListener('mousedown', clickListener, {});
        window.addEventListener('keydown', hotkeyListener, {});
        return () => {
            window.removeEventListener('mousedown', clickListener, {});
            window.removeEventListener('keydown', hotkeyListener, {})
        }
    });

    const rightButtons = useMemo(() => {
        return [
//            {name: 'PoC', padded: true, onClick: () => wContext.stateForward('poc', {})},
            {icon: "build", help: "Editor Settings", padded: "1", onClick: () => wContext.openSettings()},
//            {name: "Play", icon: "play_circle_outline", padded: "h"},
            {
                name: "Exit", click: "double", help: {title: "Exit editor", hotKey: "c h", details: "Returns to the game, all changes will be lost"},
                icon: "logout", padded: "h",  onClick: () => confirm(play)
            }
        ]
    }, []);
    const back = () => wContext.stateBack();
    return (
        <Block onFocus={onFocus} center full padded className="editor-bounds">
            <Stack vertical gaps full>
                <Block full="h">
                    <Stack full="h">
                        <Button disabled={isRoot || !hasTransitioned} icon="keyboard_backspace" padded="h" name="Back" onClick={() => confirm(back)} />
                        <Block padded="h" center="v" full="h" shorten />
                        <ButtonStack gaps center="v" buttons={rightButtons} />
                    </Stack>
                </Block>
                {ContentSwitcher}
            </Stack>

            <SettingsModal.content name="Settings" height="50%" width="50%" minWidth={500} maxWidth={650} closeable={false} transparent drag>
                <Settings { ...SettingsModal.props } />
            </SettingsModal.content>

            <Modals />
        </Block>
    )
}

function MainEditor({ imageResources = [], filters = [], game, ...props }) {
    return (
        <CssCtx>
            <WindowCtx imageResources={imageResources} filters={filters} game={game}>
                <BackgroundCtx>
                    <BaseAppInner { ...props} />
                </BackgroundCtx>
            </WindowCtx>
        </CssCtx>
    )
}

export {
    MainEditor
}