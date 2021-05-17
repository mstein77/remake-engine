import React, { Fragment, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BackgroundCtx, CssCtx, Icon, PropertyGrid, Ruler, SideTab, SideTabs, useComponentUpdate, useModal, WindowContext, WindowCtx } from "../components/BasicComponents";
import { Block, DIR, Grid, Stack } from "../components/LayoutComponents";
import { OkCancelForm, Button, CheckboxProp, LabelProp, Checkbox, Number, ColorProp, InputProp, NumberProp } from "../components/FormComponents";
import { NameDialog } from "../components/EditorComponents";
import { d } from "../helper/helper";

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
                    <Button full="h" name={'< ' + item.name} padded="h" onClick={() => setDefaultedValues({ ...item.values })} />
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
                <Button full="h" name={'< ' + item.name} padded="h" onClick={() => setDefaultedValues(item.values)} />
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
                <NameDialog { ...NameModal.props} />
            </NameModal.content>
        </Block>
    )
}

function ConfigSettings({ config, setConfig }) {
    const lastDim = useRef(null);

    useEffect(() => {
        const width = config.noMaxWidth ? 'none' : config.maxWidth;
        const height = config.noMaxHeight ? 'none' : config.maxHeight;

        if (lastDim.current === null) {
            lastDim.current = {width, height};
        }
        if (lastDim.current.width !== width) {
            document.body.style.setProperty('--max-width', width + (width !== 'none' ?  'px' : ''));
            lastDim.current.width = width
        }
        if (lastDim.current.height !== height) {
            document.body.style.setProperty('--max-height', height + (height !== 'none' ? 'px' : ''));
            lastDim.current.height = height
        }
    });

    const propSetter = prop => value => setConfig({ ...config, [prop]: value});

    return (
        <Stack full borders>
            <Block padded full="h">
                <PropertyGrid padded>
                    <LabelProp name="Max Width">
                        <Stack vertical full="h">
                            <Checkbox name="Unlimited" value={config.noMaxWidth} set={propSetter('noMaxWidth')} />
                            <Number disabled={config.noMaxWidth} slider="h" value={config.maxWidth} max={5000} set={propSetter('maxWidth')} min={400} />
                        </Stack>
                    </LabelProp>
                    <LabelProp name="Max Height">
                        <Stack vertical full="h">
                            <Checkbox name="Unlimited" value={config.noMaxHeight} set={propSetter('noMaxHeight')} />
                            <NumberProp disabled={config.noMaxHeight} slider="h" value={config.maxHeight} max={5000} set={propSetter('maxHeight')} min={400} />
                        </Stack>
                    </LabelProp>
                    <CheckboxProp name="UI Animations" value={config.uiAnimations} set={propSetter('uiAnimations')} />
                    <NumberProp name="History size" value={config.maxHistory} max={100} set={propSetter('maxHistory')} min={5} />
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


function ThemeSettings({ theme, setTheme, cssPropUpdate }) {
    const wContext = useContext(WindowContext);
    const themeRef = useRef(null);

    useEffect(() => {
        if (!themeRef.current) {
            themeRef.current = { ...theme };
        }
        for (let key of Object.keys(themeRef.current)) {
            if (theme[key] !== themeRef.current[key]) {
                themeRef.current[key] = theme[key];
                cssPropUpdate(document.body.style, key, theme[key]);
                if (key === 'linkResources') {
                    wContext.syncLinks(theme[key]);
                }
            }
        }
    });

    const propSetter = prop => value => setTheme({ ...theme, [prop]: value});

    return (
        <Stack full borders>
            <Block full="h" padded scroll>
                <PropertyGrid>
                    <ColorProp name="Background" value={theme.editorBgColor} set={propSetter('editorBgColor')} />
                    <ColorProp name="Color" value={theme.editorColor} set={propSetter('editorColor')} />
                    <NumberProp name="Padding" value={theme.defaultPadding} max={20} set={propSetter('defaultPadding')} min={0} />

                    <NumberProp name="Border Width" value={theme.boxBorderWidth} max={10} set={propSetter('boxBorderWidth')} min={0} />
                    <ColorProp name="Border Color" value={theme.boxBorderColor} set={propSetter('boxBorderColor')} />

                    <ColorProp name="Toolbar Background" value={theme.toolbarBgColor} set={propSetter('toolbarBgColor')} />

                    <ColorProp name="Input Color" value={theme.inputColor} set={propSetter('inputColor')} />
                    <ColorProp name="Input Background" value={theme.inputBgColor} set={propSetter('inputBgColor')} />
                    <ColorProp name="Input Border Color" value={theme.inputBorderColor} set={propSetter('inputBorderColor')} />


                    <ColorProp name="Button Background" value={theme.buttonBgColor} set={propSetter('buttonBgColor')} />
                    <ColorProp name="Button Color" value={theme.buttonColor} set={propSetter('buttonColor')} />
                    <InputProp name="Button Font" value={theme.buttonFontFamily} set={propSetter('buttonFontFamily')} />
                    <InputProp name="Button Border Style" value={theme.buttonBorderStyle} set={propSetter('buttonBorderStyle')} />
                    <ColorProp name="Button Border Color" value={theme.buttonBorderColor} set={propSetter('buttonBorderColor')} />
                    <NumberProp name="Button radius" value={theme.buttonBorderRadius} max={10} set={propSetter('buttonBorderRadius')} min={0} />

                    <LabelProp name="Link-Resources">
                        <ConcatList value={theme.linkResources} separator=" " set={propSetter('linkResources')} />
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
                elems.push(<Block center="v" key={'_' + elems.length}><Icon name="add" size={12} className="less" /></Block>);
            }
            elems.push(<Block key={key} padded border="1"><kbd>{key}</kbd></Block>);

        }
        return (
            <Stack center="v" gaps="1">{elems}</Stack>
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

    const beforeRef = useRef(null);
    const afterRef = useRef(null);

    const [config, setConfig] = useState(wContext.editorConfig);
    const [theme, setTheme] = useState(wContext.theme);
    const [mapping, setMapping] = useState(wContext.hotKeyActions.action2hotKey);

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
    };
    const restoreAfter  = () => {
        setConfig(afterRef.current.config);
        setTheme(afterRef.current.theme);
        setMapping(afterRef.current.mapping);
        afterRef.current = null;
    };
    const leftButtons = [
        <Button key="before" icon="visibility" name="before" padded="h" direct onClick={showBefore} onClickEnd={restoreAfter} />
    ];
    const rightButtons = [
        <Button key="clear" name="Clear all settings" padded="h" onClick={() => {
            wContext.clearAllSettings();
            // TODO: find a better solution to update css live props
            for (let [key, value] of Object.entries(defaults.theme)) {
                wContext.cssPropUpdate.current(document.body.style, key, value);
            }
            wContext.cssPropUpdate.current(document.body.style, 'maxWidth', defaults.config.maxWidth);
            wContext.cssPropUpdate.current(document.body.style, 'maxHeight', defaults.config.maxHeight);
            save({
                config: defaults.config,
                theme: defaults.theme,
                mapping: defaults.mapping
            }, false);
        }} />
    ];
    return (
        <OkCancelForm full save={() => save({ config, theme, mapping })} cancel={close} left={leftButtons} right={rightButtons}>
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
        <Block onFocus={onFocus} center full padded className="editor-bounds">
            <Stack vertical gaps full>
                <Block full="h">
                    <Stack full="h" xpadded="v">
                        <Button icon="keyboard_backspace" padded="h" name="Back" />
                        <Block padded="h" center="v" full="h" shorten></Block>
                        <Stack gaps center="v">
                            <Button icon="build" onClick={() => wContext.openSettings()} />
                            <Button name="Play" icon="play_circle_outline" padded="h" />
                            <Button name="Exit" icon="logout" padded="h" onClick={() => console.log(666)} />
                        </Stack>
                    </Stack>
                </Block>
                {children}
            </Stack>
            <SettingsModal.content name="Settings" height="50%" width="50%" minWidth={500} maxWidth={650} closeable={false} fixStyle transparent drag>
                <Settings { ...SettingsModal.props } />
            </SettingsModal.content>
        </Block>
    )
}

function MainEditor({ children }) {
    return (
        <CssCtx>
            <WindowCtx>
                <BackgroundCtx>
                    <BaseAppInner>
                        {children}
                    </BaseAppInner>
                </BackgroundCtx>
            </WindowCtx>
        </CssCtx>
    )
}

export {
    MainEditor
}