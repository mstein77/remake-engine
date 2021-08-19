import React, { useContext, useEffect, useRef, useState } from "react";
import { d, round, clamp, ucfirst, drawCanvasToAvail, getCanvasForBitmap, copy2clipboard, hex2rgb, rgb2hex } from "../helper/helper"
import { Block, Stack, Tooltip, Overlays, Overlay, DIR } from "./LayoutComponents";
import {
    WindowContext,
    EditorContext,
    useModal,
    PropertyGrid,
    Kbd,
    Canvas,
    Gradient,
    Icon,
    SideTab,
    SideTabs,
    useFocusKeyBindings,
    useRefocus,
    useMounted,
    useCssProps,
    useCallAfterwards,
    useComponentUpdate,
    AvailContext, MinMaxCtx, PixelMarker
} from "./BasicComponents";
import { EntityPicker } from "./EntityComponents";
import { BitmapSelector, BitmapEditor } from "./EditorComponents";

const STATE = {
    INACTIVE: 0,
    ACTIVE: 1,
    ERROR: 2,
    AWAITING: 3
}

function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value);
}

function getOptionHandler(options, id) {
    const ids = [];
    let name = null;
    let intIds = true;
    for (let option of options) {
        ids.push(option.id);
        if (option.id === id) {
            name = option.name;
        }
        if (typeof option.id === 'string') {
            intIds = false;
        }
    }
    const currIndex = ids.indexOf(id);
    return {
        id,
        name,
        intIds,
        getNextId() {
            if (currIndex === -1) {
                return null;
            }
            let newIndex = currIndex + 1;
            if (newIndex >= ids.length) {
                newIndex = 0;
            }
            return ids[newIndex];
        },
        getPrevId() {
            if (currIndex === -1) {
                return null;
            }
            let newIndex = currIndex - 1;
            if (newIndex < 0) {
                newIndex = ids.length - 1;
            }
            return ids[newIndex];
        }
    }
}

function getStepHandler(min, max, decimals, step) {
    let factor = 1;
    const stepFactor = step === undefined ? 0.1 : 1;
    if (step === undefined) {
        step = 1;
    }
    let shift = decimals ? decimals : 0;
    while (shift-- > 0) {
        step *= stepFactor;
        factor *= 10;
    }
    const round = value => (Math.round(factor * value) / factor);
    return {
        step,
        round,
        getStepUp: value => {
            if (max !== undefined && value === max) {
                return max;
            }
            let newValue = round(value + step);
            return max !== undefined ? Math.min(max, newValue) : newValue;
        },
        getStepDown: value => {
            if (min !== undefined && value === min) {
                return min;
            }
            let newValue = round(value - step);
            return min !== undefined ? Math.max(min, newValue) : newValue;
        }
    };
}

function useAutoFocus(inputRef, props) {
    useEffect(
        () => {
            if (props.autoFocus && !(props.disabled || props.readOnly)) {
                requestAnimationFrame(() => {
                    if (inputRef.current) {
                        inputRef.current.select();
                        inputRef.current.focus()
                    }
                })
            }
        },
        []
    )
}

function useSet(value, { undo, set }) {
    const eContext = useContext(EditorContext);
    const eRef = useRef(null);
    eRef.current = eContext;

    return newValue => {
        if (undo) {
            const oldValue = value;
            eRef.current.doAction(
                () => set(newValue),
                () => set(oldValue),
                undo
            );
        } else {
            set(newValue)
        }
    }
}

/**
 * Used to put a name in front of the input component (if available). Normally this only should be used
 * in a flow-context (=Toolbar)
 *
 * STRUCTURES
 * ----------------
 *  A) name given:
 *
 *     <Stack gaps *>
 *         <Block center="v" shorten>{name}</Block>
 *         {children}
 *     </Stack>
 *
 *  B) no name
 *
 *     {children}
 *
 * Behaviour:
 *   - name should not be centered vertically but should have enough padding that it seems as if it is
 *   - input element should have sizing priority and name should shorten if total width is too small
 *   - component width should be min-content by default
 *   - full width should be passed through to input elem
 *   - percentage and abs-widths are applied to stack
 *
 *   - full height should be ignored because in flow-context height should only be abs or min
 */
function ComponentWithName({ name, children, ...props }) {
    if (name) {
        const attr = getDimHAttr(props);
        children = (
            <Stack gaps {...attr}>
                <Block center="v" full={attr.full} shorten>{name}</Block>
                {children}
            </Stack>
        )
    }
    return children
}

function getDimHAttr({ full, width, minWidth, maxWidth }) {
    return {
        full: full && full !== 'v' ? 'h' : false,
        width,
        minWidth,
        maxWidth
    }
}

function getDimVAttr({ full, height, minHeight, maxHeight }) {
    return {
        full: full && full !== 'v' ? 'h' : false,
        height,
        minHeight,
        maxHeight
    }
}

function getDimAttr({ full, width, minWidth, maxWidth, height, minHeight, maxHeight }) {
    return {
        full,
        width,
        minWidth,
        maxWidth,
        height,
        minHeight,
        maxHeight
    }
}

function getDimStyle({ width, minWidth, maxWidth, height, minHeight, maxHeight }) {
    return {
        width,
        minWidth,
        maxWidth,
        height,
        minHeight,
        maxHeight
    }
}

function useStatePrefix(state, def = null) {
    if (state) {
        if ([STATE.ACTIVE, STATE.AWAITING].includes(state)) {
            return 'active'
        }
        if (state === STATE.ERROR) {
            return 'error'
        }
    }
    return def
}

const FormContext = React.createContext();

function Form({ children, submit, ...props }) {
    const [invalid, setInvalid] = useState(false);
    const mounted = useMounted();

    const formRef = useRef(null);
    const invalidRef = useRef(null);
    invalidRef.current = invalid;

    const value = {
        invalid,
        markInvalid: () => {
            if (!invalidRef.current) {
                setInvalid(true)
            }
        }
    };

    useEffect(() => {
        if (!mounted.current || !formRef.current) {
            return;
        }

        const hasInvalid = () => {
            return (formRef.current.querySelector('.invalid') !== null);
        };

        const checkForInvalid = () => {
            if (!mounted.current) {
                return;
            }
            if (invalidRef.current && !hasInvalid()) {
                setInvalid(false)
            }
            requestAnimationFrame(checkForInvalid)
        };

        if (hasInvalid()) {
            setInvalid(true);
        }
        checkForInvalid()
    }, []);

    const submitOnReturn = !submit ? null : e => {
        if (e.key === 'Enter' && !invalidRef.current) {
            submit();
            e.preventDefault();
            e.stopPropagation();
        }
    };

    return (
        <FormContext.Provider value={value}>
            <Block className="form" onKeyDown={submitOnReturn} ref={formRef} {...props}>
                {children}
            </Block>
        </FormContext.Provider>
    )
}

function OkCancelForm({ full, save, cancel, submit, left = [], right = [], children }) {
    let elem = (
        <Stack vertical borders full={full}>
            <Block full={full} scroll>
                {children}
            </Block>
            <Stack className="toolbar-bg" full="h" gaps padded>
                {submit ? <Submit padded="h" name="OK" onClick={save} /> : <Button padded="h" onClick={save} icon="done" name="OK" />}
                <Button padded="h" onClick={cancel} name="Cancel" icon="close" />
                {left}
                {right.length > 0 ? <Block full="h" /> : ''}
                {right}
            </Stack>
        </Stack>
    );
    if (submit) {
        elem = (
            <Form full={full} submit={save}>
                {elem}
            </Form>
        )
    }
    return  elem
}

function Checkbox({ name, value, set, rev, size = 14, readOnly, disabled, tab = true, ...props }) {
    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);

    const { checkBoxType } = useCssProps('checkBoxType');
    const type = checkBoxType === '0' ? 'input' : 'button';
    const cls = [type + '-bg ' + type + '-color ' + type + '-border-width ' + type + '-border-radius ' + type + '-border-style ' + type + '-border-color'];
    if (disabled) {
        cls.push('disabled');
        readOnly = true
    }
    if (!readOnly) {
        cls.push('hover-change');
    } else {
        tab = false;
        if (!disabled) {
            cls.push('hover-fix')
        }
    }
    if (tab) {
        cls.push('focus-box');
    }
    const handleClick = upEvent => {
        wContext.startExclusiveMode('toggle-bool', 'pointer');
        wContext.addEventListener(upEvent, () => {
            wContext.endExclusiveMode('toggle-bool');
            setClicked(false)
        }, {once: true});
        set(!value);
        setClicked(true);
    };
    const items = [];
    items.push(
        <Block key="i" tab={tab} center="v" cursor={readOnly ? null : "pointer"} className={cls.join(' ')}
               onLeftClick={readOnly ? null : () => handleClick('mouseup')}
               onKeyDown={readOnly ? null : e => {
                   if (e.keyCode !== 32 || clicked) {
                       return
                   }
                   e.preventDefault();
                   handleClick('keyup')
               }}>
            <Icon name={value ? 'checked' : null} size={size} />
        </Block>
    );
    items.push(
        <Block key="n" full="h" shorten center="v">
            {name}
        </Block>
    );
    if (rev) {
        items.reverse()
    }
    if (items.length === 1) {
        return items[0]
    }
    const attr = getDimHAttr(props);
    return (
        <Stack gaps { ...attr }>
            {items}
        </Stack>
    )
}

/**
 *
 * TODO: überflüssig?
 *
 * - Focus-Keys
 */
function Handle({ axis = true, border, disabled, circle, cursor = 'grab', onClick, onClickEnd, onDirKey, tab, className, children, ...props }) {
    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);

    const attr = getDimAttr(props);
    const cls = [];
    if (className) {
        cls.push(className);
    }
    if (circle) {
        cls.push('transparent circle-handle');
    } else {
        cls.push('button-bg button-border-style button-border-color button-border-radius');
        if (border === '1') {
            attr.border = '1'
        } else {
            cls.push('button-border-width')
        }
    }
    if (disabled) {
        tab = false;
        cursor = false
    } else {
        cls.push('hover-change')
    }
    if (clicked) {
        cls.push('clicked');
    }
    if (tab) {
        cls.push('focus-box');
    }
    const onLeftClick = (!onClick || disabled) ? null : e => {
        wContext.startExclusiveMode('handle-move', cursor === 'grab' ? 'grabbing' : cursor);
        setClicked(true);
        if (!tab && document.activeElement) {
            document.activeElement.blur()
        }
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('handle-move');
            setClicked(false);
            if (onClickEnd) {
                onClickEnd()
            }
        }, {once: true});
        onClick(e)
    };

    const onKeyDown = !onDirKey ? null : e => {
        let dir = null;
        let factor = 0;
        switch(e.key) {
            case 'ArrowUp':
                dir = 'y';
                factor = -1;
                break;

            case 'ArrowDown':
                dir = 'y';
                factor = 1;
                break;

            case 'ArrowLeft':
                dir = 'x';
                factor = -1;
                break;

            case 'ArrowRight':
                dir = 'x';
                factor = 1;
                break;
        }
        if (!dir) return;

        onDirKey(dir, factor, e.shiftKey);
        e.preventDefault();
    };

    return (
        <Block onLeftClick={onLeftClick} onKeyDown={onKeyDown} tab={tab} cursor={cursor} className={cls.join(' ')} { ...attr }>
            {children}
        </Block>
    )
}

/**
 * TODO
 *  - help
 */
function Button({ icon, name, full, state, iconProps = {}, end, center, centerItems, value, current, rev, disabled, onClick, onClickEnd,
                     tab = true, cursor = 'pointer', gaps = true, border = true, radius = true, padded, vertical, children, ...props }) {
    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);
    const mounted = useMounted();

    const statePrefix = (value === undefined || value !== current) ? useStatePrefix(state, 'button') : 'active';
    const cls = [statePrefix + '-bg', statePrefix + '-color button-font'];

    let repeat = false;
    if (onClick && typeof onClick === 'object') {
        if (onClick.repeat !== undefined) {
            repeat = onClick.repeat
        }
        if (onClick.can && !onClick.can()) {
            disabled = true
        } else {
            const exec = onClick.exec;
            onClick = () => exec()
        }
    }
    const readOnly = !onClick;
    if (disabled) {
        cls.push('disabled');
    }
    if (disabled || readOnly) {
        cursor = 'auto';
        tab = false;
    } else {
        cls.push('hover-' + (state ? 'fix' : 'change'));
        cls.push('focus-box');
    }
    if (tab && value !== undefined && value !== current) {
        tab = false;
    }
    if (border) {
        cls.push(statePrefix + '-border-color');
        cls.push('button-border-width button-border-style');
        if (radius) {
            cls.push('button-border-radius');
        }
    }
    if (padded) {
        if (padded !== true) {
            cls.push('button-padding');
        }
        if (padded !== '1') {
            if (padded !== 'v') {
                cls.push('button-padding-h');
            }
            if (padded !== 'h') {
                cls.push('button-padding-v');
            }
        }
    }
    if (clicked && (!state || value !== undefined)) {
        cls.push('clicked');
    }
    const dir = vertical ? 'v' : 'h';
    const oppDir = vertical ? 'h' : 'v';

    const items = [];
    if (icon) {
        items.push(
            <Icon key="i" center={false} name={icon} { ...iconProps } />
        );
    }
    if (name) {
        items.push(
            <Block key="n" center={oppDir} full={dir} shorten>
                {name}
            </Block>
        )
    }
    if (children) {
        items.push(
            <Block key="c" center={oppDir}>
                {children}
            </Block>
        )
    }
    if (rev) {
        items.reverse()
    }
    const attr = getDimAttr(props);
    if (!(disabled || readOnly)) {
        const handleClick = (upEvent, event = null) => {
            setClicked(true);
            wContext.startExclusiveMode('button-click', upEvent === 'mouseup' ? cursor : false);
            onClick({value, event});
            wContext.addEventListener(upEvent, () => {
                wContext.endExclusiveMode('button-click');
                if (onClickEnd) {
                    onClickEnd()
                }
                if (mounted.current) {
                    setClicked(false);
                }
            }, {once: true})
        };
        if (tab) {
            attr.onKeyDown = e => {
                if (e.keyCode !== 32 || (clicked && !repeat)) {
                    return
                }
                e.preventDefault();
                handleClick('keyup')
            };
        }
        attr.onLeftClick = e => {
            handleClick('mouseup', e)
        }
    }
    if (full && full !== oppDir) {
        attr.full = dir
    }
    const hasStack = items.length > 1;
    const fullStack = !(end || centerItems) ? dir : false;
    if (!hasStack && !fullStack) {
        items[0] = <Block key="e" end={end} center={centerItems}>{items[0]}</Block>;
    }
    return (
        <Block gaps tab={tab} center={center} className={cls.join(' ')} cursor={cursor} { ...attr }>
            {!hasStack ?
                items[0] :
                <Stack key="s" gaps={gaps} center={centerItems} end={end} vertical={vertical} full={fullStack}>
                    {items}
                </Stack>
            }
        </Block>
    )
}

function AsyncButton({ onClick, onClickEnd, ...props }) {
    const [ state, setState ] = useState(STATE.INACTIVE);

    const startAction = () => {
        setState(STATE.LOADING);
        onClick().then(
            () => {
                setState(STATE.ACTIVE);
                if (onClickEnd) {
                    onClickEnd()
                }
            }
        ).catch(
            e => setState(STATE.ERROR)
        )
    };

    return (
        <Button state={state} onClick={startAction} { ...props } />
    )
}


/**
 * TODO:
 *  - wrapping
 *  - min/max-Width
 *  - callAfterwards für invalid
 */
function Radio({ name, icon, options, gaps, value, readOnly, disabled, padded, tab = true, ...props }) {
    const fContext = useContext(FormContext);

    const set = useSet(value, props);

    const radioRef = useRef(null);
    const refocus = useRefocus(radioRef);
    const setAndRefocus = ({value}) => {
        refocus();
        set(value)
    };

    const optionHandler = getOptionHandler(options, value);
    const attr = useFocusKeyBindings({
        keyHandlers: [
            {
                keys: ['ArrowDown', 'ArrowRight'],
                handler:
                    () => {
                        const id = optionHandler.getNextId();
                        if (id !== null) {
                            setAndRefocus({value: id})
                        }
                    }
            },
            {
                keys: ['ArrowUp', 'ArrowLeft'],
                    handler:
                () => {
                    const id = optionHandler.getPrevId();
                    if (id !== null) {
                        setAndRefocus({value: id})
                    }
                }
            }
        ],
        disabled
    });
    if (gaps) {
        attr.gaps = gaps;
    }
    const items = [];
    let found = false;
    for (let {id, name} of options) {
        items.push(
            <Button key={id} tab={tab} padded={padded} disabled={disabled} name={icon ? null : name} icon={icon ? name : null} value={id} current={value} onClick={readOnly ? null : setAndRefocus} />
        );
        if (id === value) {
            found = true;
        }
    }
    if (!found) {
        attr.className = 'invalid';
        if (fContext) {
            fContext.markInvalid()
        }
    }
    return (
        <ComponentWithName name={name} {...props}>
            <Block ref={radioRef}><Stack {...attr}>{items}</Stack></Block>
        </ComponentWithName>
    )
}

/*
    -----------------------
     STRUCTURES
    -----------------------
     A) Einfacher Input ohne Namen
         - Flex-Length (mit Min- bzw. Max)
               <Block full="h" minWidth=x maxWidth=y>
                  <Input full-h />
               </Block>

         - Fix-Length (size)
               <Block>
                  <Input size=x />
               </Block>

         - Fix-Width (width)
               <Block width="x">
                  <Input full="h"  />
               </Block>

         - Default-Length
               <Block>
                  <Input size=calcMin />
               </Block>

     B) Einfacher Input mit Namen (float-context)

            TODO: wohin führt der full auf dem Stack? Wäre es nicht
            besser dem Block einfach ein Flex zu verpassen damit es
            notfalls schrumpfen kann?

            <Stack gaps full="h">
               <Block center="v" full="h" shorten>{name}</Block>
               *
            </Stack>

         - Flex-Length:
                TODO: hier macht das Fix im Prinzip keinen Sinn
                 => Fallback auf Default/Fix-Width

         - Fix-length/Width:
             Sollte problemlos funktionieren

         - Default-Size
             "


     C) Input mit Button ohne Namen


     D) Input mit Button mit Namen


     PLAIN:
      a) without name

        <Block>
            <Input />
        </Block>

      b) with name

        <Stack full="h">
            <Block>
                {name}
            </Block>

            <Block center="v">
                <Input />
            </Block>

        </Stack>

     CLEAR:
        <Stack>
           <Input />
           <Button />
        </Stack>




 */
function Input({ name, value, size, min, max, autoFocus, required, disabled, number, clear, readOnly, match, active, step, force = number, decimals = 0, tab = true, onMax, className, ...props }) {

    const fContext = useContext(FormContext);
    const inputRef = useRef(null);

    useAutoFocus(inputRef, {autoFocus, disabled, readOnly});

    const set = useSet(value, props);
    const [curr, setCurr] = useState(value);
    const [edit, setEdit] = useState(false);

    const isFloat = number && (decimals && decimals > 0);
    const cls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius input-padding'];
    if (className) {
        cls.push(className);
    }

    useEffect(() => {
        if (autoFocus) {
            requestAnimationFrame(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select()
                }
            });
        }
    }, []);

    const getParsed = val => {
        if (number) {
            if (!isFloat) {
                const parsed = parseInt(val, 10);
                if (!isValidNumber(parsed)) {
                    return false
                }
                return val.match(/^(-?[1-9]\d*)|0$/) ? parsed : false;
            } else  {
                const parsed = parseFloat(val);

                if (!isValidNumber(parsed)) {
                    return false
                }
                const matches = val.match(/^-?(([1-9]\d*)|0)(.[\d]+)?$/);
                if (!matches) {
                    return false
                }
                if (val.indexOf('.') !== -1) {
                    const parts = val.split('.');
                    if (parts[1].length > decimals) {
                        return false
                    }
                }
                return val !== '-0' ? parsed : false
            }
        }
        return val;
    };

    const valid = (newValue, parse) => {
        if (required && !newValue) {
            return false
        }
        if (parse) {
            newValue = getParsed(newValue);
        }
        if (newValue === false) {
            return false;
        }
        let bounds = null;
        if (number) {
            if (!isValidNumber(newValue)) {
                return false
            }
            bounds = newValue;
        } else {
            if (typeof newValue !== 'string') {
                return false
            }
            bounds = newValue.length;
        }
        if (bounds !== null && (min !== undefined && bounds < min) || (max !== undefined && bounds > max)) {
            return false;
        }
        return (!match || match(newValue))
    };

    if (props.full && props.full !== 'v') {
        cls.push('full-h');
    }

    const attr = {
        value: edit ? curr : value,
        style: {},
        onFocus: e => {
            if (readOnly || disabled) {
                e.target.blur();
                return;
            }
            if (!edit) {
                setCurr('' + value);
                setEdit(true)
            }
        },
        onBlur: e => {
            if (!readOnly && edit) {
                setEdit(false)
            }
        },
        disabled,
        onChange: (edit ?
            e => {
                let newValue = e.target.value;
                let keyMatch = null;
                if (number) {
                    if (isFloat) {
                        keyMatch = (min !== undefined && min >= 0) ? /[\d.]/ :  /[\d.-]$/;
                    } else {
                        keyMatch = (min !== undefined && min >= 0) ? /[\d]/ :  /[\d-]$/;
                    }
                }
                if (keyMatch) {
                    let validChars = '';
                    for (let char of newValue) {
                        if (char.match(keyMatch)) {
                            validChars += char;
                        }
                    }
                    newValue = validChars;
                }
                const parsed = getParsed(newValue);
                if (!force || valid(parsed, false)) {
                    set(parsed === false ? '' : parsed);
                    if (onMax && max && !number && newValue.length === max) {
                        onMax();
                    }
                }
                setCurr(newValue);
            } :
            e => {})
    };
    if (readOnly) {
        attr.readOnly = true;
    }
    if (readOnly || disabled) {
        tab = false;
        attr.style.cursor = 'default'
    } else {
        cls.push('hover-change');
    }
    if (!tab) {
        attr.tabIndex = -1
    } else {
        cls.push('tabbed');
    }

    if (!valid(attr.value, edit)) {
        cls.push('invalid');
        if (fContext) {
            fContext.markInvalid()
        }
    }
    if (active) {
        cls.push('active-border');
    }
    if (number && edit) {
        const stepHandler = getStepHandler(min, max, decimals, step);
        attr.onKeyDown = e => {
            if (e.key === 'ArrowUp') {
                const newValue = stepHandler.getStepUp(value);
                if (value !== newValue) {
                    set(newValue);
                    setCurr('' + newValue);
                }
            } else if (e.key === 'ArrowDown') {
                const newValue = stepHandler.getStepDown(value);
                if (value !== newValue) {
                    set(newValue);
                    setCurr('' + newValue);
                }
            }
        }
    }

    let maxLen = 0;
    if (number) {
        const decimalPart = isFloat ? decimals + 1 : 0;
        if (min !== undefined) {
            maxLen = Math.max(maxLen, ('' + Math.round(min)).length + decimalPart);
        }
        if (max !== undefined) {
            maxLen = Math.max(maxLen, ('' + Math.round(max)).length + decimalPart);
        }
    } else if (max !== undefined && max > 0) {
        maxLen = max;
    }
    if (maxLen > 0) {
        attr.maxLength = maxLen
    }
    if (!size) {
        size = maxLen > 0 ? maxLen : (number ? 4 : 10);
    }
    attr.size = size;

    let input = <input ref={inputRef} type="text" {...attr} className={cls.join(' ')} />;

    if (clear && !readOnly) {
        input =
            <Stack full={props.full}>
                {input}
                <Button icon="clear" center="v" disabled={disabled || value === ''} tab={!(disabled || value === '')} size={14} onClick={() => set('')} />
            </Stack>
    } else {
        input = <Block center="v" full={props.full}>{input}</Block>
    }
    return (
        <ComponentWithName name={name} {...props}>
            {input}
        </ComponentWithName>
    )
}

const numberIconProps = {width: 13, size: 8};

function Number({name, disabled, value, min, max, step, autoFocus, slider = true, decimals = 0, readOnly, buttons = true, tab = true, railProps, gradient, ...props }) {
    const wContext = useContext(WindowContext);

    const set = useSet(value, props);

    const divRef = useRef(null);
    const slideRef = useRef(null);

    const [dim, setDim] = useState(null);
    const [reenter, setReenter] = useState(false);
    const [sliding, setSliding] = useState(false);
    slideRef.current = {sliding, reenter};

    const items = [];

    const blurActive = () => {
        if (document.activeElement) {
            document.activeElement.blur()
        }
    };

    if (readOnly) {
        buttons = false;
        slider = false;
    }
    const hasRange = (min !== undefined && max !== undefined);
    const stepHandler = getStepHandler(min, max, decimals, step);
    if (slider === true) {

        const startSliding = click => {
            const e = click.event;
            if (!e) return;

            const anchor = e.clientY;
            const anchorValue = value;
            const range = (min !== undefined && max !== undefined) ? Math.abs(max - min) : null;
            const minOffset = min !== undefined ? min - anchorValue : null;
            const maxOffset = max !== undefined ? max - anchorValue : null;
            let lastPos = anchor;
            let lastOffset = 0;
            wContext.addEventListener('mousemove', e => {
                const relPos = anchor - e.clientY;
                if (relPos !== lastPos) {
                    lastPos = relPos;
                    let newOffset = stepHandler.round(range ? relPos / Math.max(1, 200 / range) : relPos);
                    if (maxOffset !== null) {
                        newOffset = Math.min(maxOffset, newOffset);
                    }
                    if (minOffset !== null) {
                        newOffset = Math.max(minOffset, newOffset);
                    }
                    if (newOffset !== lastOffset) {
                        lastOffset = newOffset;
                        set(stepHandler.round(anchorValue + newOffset));
                    }
                }
            });
            setSliding(true);
            setReenter(true);
            blurActive()
        };
        const stopSliding = () => {
            setSliding(false);
            if (dim && !slideRef.current.reenter) {
                setDim(null);
            }
        };
        items.push(
            <Button center="v" key={1} full="v" centerItems radius={true} iconProps={{size: 12}} direct disabled={disabled || (min === max && min !== undefined)} onClick={startSliding} onClickEnd={stopSliding} cursor="row-resize" icon="height" tab={false} vertical />
        );
    } else if (hasRange && slider === 'h') {
        items.push(
            <Slider key={1} padded={DIR.RIGHT} tab={false} full="h" disabled={disabled} railProps={railProps} readOnly={readOnly} value={value} decimals={decimals} min={min} max={max} set={set}>{gradient}</Slider>
        )
    }
    const inputCls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius input-padding'];
    if (!(readOnly || disabled)) {
        inputCls.push('hover-change');
    }
    items.push(
        <Input key={2} className={inputCls.join(' ')} tab={tab} readOnly={readOnly} disabled={disabled} autoFocus={autoFocus} decimals={decimals} step={stepHandler.step} number max={max} min={min} value={value} set={set} />
    );
    if (buttons) {
        items.push(
            <Stack center="v" key={3} vertical gaps="1">
                <Button key={4} iconProps={numberIconProps} disabled={disabled || max === value} onClick={() => {set(stepHandler.getStepUp(value)); blurActive()}} padded={false} tab={false} icon="expand_less" />
                <Button key={3} iconProps={numberIconProps} disabled={disabled || min === value} onClick={() => {set(stepHandler.getStepDown(value)); blurActive()}} padded={false} tab={false} icon="expand_more" />
            </Stack>
        );
    }
    let elem = items.length === 1 ? items[0] : <Stack gaps="1" full={props.full}>{items}</Stack>;

    if ((buttons || slider) || !(readOnly || disabled)) {
        const onMouseEnter = e => {
            const rect = divRef.current.getBoundingClientRect();
            if (!slideRef.current.sliding) {
                setDim(rect);
            } else {
                setReenter(true);
            }
        };

        const onMouseLeave = e => {
            if (!slideRef.current.sliding) {
                setDim(null);
            } else {
                setReenter(false);
            }
        };

        const attr = {};
        if (dim) {
            attr.style = {
                top: dim.top,
                left: dim.left,
                width: dim.width,
                height: dim.height,
                zIndex: 2000000
            };
            attr.onMouseLeave = onMouseLeave;
            attr.className = 'fixed';
        } else {
            attr.className = props.full && props.full !== 'v' ? null : 'min-content-h';
        }

        elem = (
            <Block full={props.full} onMouseEnter={onMouseEnter} ref={divRef} width={dim ? dim.width : null} height={dim ? dim.height : null}>
                <div { ...attr }>
                    {elem}
                </div>
            </Block>
        );
    }
    return (
        <ComponentWithName name={name} {...props}>
            {elem}
        </ComponentWithName>
    )
}

function Tuple({ name, x, setX, y, setY, undo, min, max, buttons, slider, tab = true, size, step, readOnly, disabled, autoFocus, full, ...props }) {
    const attr = getDimHAttr(props);
    const xAttr = {
        name,
        full: full && full !== 'v' ? 'h' : false,
        value: x,
        min:  min !== undefined ? min : props.minX,
        max: max !== undefined ? max : props.maxX,
        undo: (undo ? undo + '_x' : false),
        size: size !== undefined ? size : props.sizeX,
        set: setX,
        disabled: disabled !== undefined ? disabled : props.disabledX,
        step: step !== undefined ? step : props.stepX,
        autoFocus,
        readOnly: readOnly !== undefined ? readOnly : props.readOnlyX,
        tab,
        buttons,
        slider
    };
    const yAttr = {
        value: y,
        min:  min !== undefined ? min : props.minY,
        max: max !== undefined ? max : props.maxY,
        undo: (undo ? undo + '_y' : false),
        size: size !== undefined ? size : props.sizeY,
        set: setY,
        step: step !== undefined ? step : props.stepY,
        disabled: disabled !== undefined ? disabled : props.disabledY,
        autoFocus,
        readOnly: readOnly !== undefined ? readOnly : props.readOnlyY,
        tab,
        buttons,
        slider
    };
    return (
        <Stack {...attr} gaps="1">
            <Number {...xAttr} />
            <Block center="v"><Icon name="clear" className="less" size={12} /></Block>
            <Number {...yAttr} />
        </Stack>
    );
}

function Select({ name, value, disabled, options, readOnly, buttons = true, tab = true, ...props }) {
    const fContext = useContext(FormContext);

    const cls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius input-padding'];
    const optionHandler = getOptionHandler(options, value);
    if (readOnly) {
        buttons = false;
    }
    if (optionHandler.id === null) {
        cls.push('invalid');
        if (fContext) {
            fContext.markInvalid()
        }
    }
    const set = useSet(value, props);

    const items = [];
    if (buttons) {
        items.push(
            <Button
                key={0}
                disabled={disabled || options.length < 2}
                tab={false}
                icon={'navigate_before'}
                size={14}
                onClick={
                    () => {
                        const id = optionHandler.getPrevId();
                        if (id !== null) set(id);
                    }
                }
            />
        );
    }
    const attr = useFocusKeyBindings({
        keyHandlers: [
            {
                keys: ['ArrowLeft'],
                handler: () => {
                    const id = optionHandler.getPrevId();
                    if (id !== null) set(id);
                }
            },
            {
                keys: ['ArrowRight'],
                handler: () => {
                    const id = optionHandler.getNextId();
                    if (id !== null) set(id);
                }
            }
        ],
        direct: true,
        disabled
    });
    delete attr.tab;
    if (disabled || readOnly) {
        tab = false
    }
    attr.tabIndex = tab ? 0 : -1;
    if (tab) {
        cls.push('tabbed');
    }
    const dimAttr = getDimHAttr(props);
    if (dimAttr.full || dimAttr.full !== 'v') {
        cls.push('full-h');
    }
    if (!(readOnly || disabled)) {
        cls.push('hover-change');
    }
    attr.className = cls.join(' ');
    items.push(
        readOnly ?
            <Block><input key={1} onFocus={e => e.target.blur()} tabIndex={-1} value={optionHandler.name} readOnly={true} /></Block> :
            <select
                key={1}
                value={value}
                disabled={disabled}
                onChange={
                    e => {set(optionHandler.intIds ? parseInt(e.target.value, 10) : e.target.value)}
                }
                {...attr}
            >
                {options.map(
                    item =>
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                )}
            </select>
    );
    if (buttons) {
        items.push(
            <Button
                key={2}
                disabled={disabled || options.length < 2}
                tab={false}
                icon={'navigate_next'}
                size={14}
                onClick={
                    () => {
                        const id = optionHandler.getNextId();
                        if (id !== null) set(id);
                    }
                }
            />
        );
    }
    return (
        <ComponentWithName name={name} {...props}>
            {items.length === 1 ? items[0] : <Stack full={dimAttr.full}>{items}</Stack>}
        </ComponentWithName>
    )
}

function TextArea({ name, value, autoFocus, resize, copy, readOnly, disabled, rows, cols, wrap, tab = true, required, match, className, ...props }) {
    const fContext = useContext(FormContext);
    const wContext = useContext(WindowContext);

    const inputRef = useRef(null);
    const set = useSet(value, props);
    const [copying, setCopying] = useState(false);
    const propsRef = useRef(null);
    propsRef.current = { copying };

    useAutoFocus(inputRef, {autoFocus, disabled, readOnly});

    const style = getDimStyle(props || {});
    if (copy) {
        style.cursor = 'copy';
    }
    const dimAttr = getDimAttr(props);

    const attr = {
        wrap,
        rows,
        cols,
        readOnly,
        disabled,
        value,
        style,
        ref: inputRef,
        onMouseDown: !copy ? null : e => {
            if (e.button !== 0) {
                return;
            }
            wContext.startExclusiveMode('copy-textarea', 'copy');
            setCopying(1);
            copy2clipboard(value).then(
                () =>  {
                    if (propsRef.current.copying === 1) {
                        setCopying(2);
                    }
                },
                err => {
                    console.error('Async: Could not copy text: ', err);
                    if (propsRef.current.copying === 1) {
                        setCopying(3);
                    }
                }
            );
            wContext.addEventListener('mouseup', () => {
                wContext.endExclusiveMode('copy-textarea');
                setCopying(0)
            }, {once: true});
        },
        onChange: e => set(e.target.value)
    };
    if (!resize) {
        attr.style.resize = 'none'
    }
    const cls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius input-padding'];
    if (!(readOnly || disabled)) {
        cls.push('hover-change');
    }
    if (className) {
        cls.push(className);
    }
    if (copying === 2) {
        cls.push('active-highlight');
    } else if (copying === 3) {
        cls.push('invalid-highlight');
    }
    if (dimAttr.full && dimAttr.full !== 'v') {
        cls.push('full-h');
    }
    if (dimAttr.full && dimAttr.full !== 'h') {
        cls.push('full-v');
    }
    if ((required && value === '') || match && !match(value)) {
        cls.push('invalid');
        if (fContext) {
            fContext.markInvalid()
        }
    }
    if (readOnly || disabled) {
        tab = false;
        attr.onFocus = e => e.target.blur()
    }

    if (!tab) {
        attr.tabIndex = -1;
    } else {
        cls.push('tabbed');
    }

    return (
        <ComponentWithName name={name} {...props}>
            <Block {...dimAttr}><textarea
                className={cls.join(' ')}
                {...attr}
            ></textarea></Block>
        </ComponentWithName>
    )
}

function ColorBox({ color, width, height, className }) {
    const boxStyle = {
        width,
        height
    };
    const bgStyle = {
        backgroundColor: color
    };
    const cls = ['checkerboard-bg relative'];
    if (className) {
        cls.push(className);
    }
    return (
        <div className={cls.join(' ')} style={boxStyle}>
            <div className="absolute full-h full-v" style={bgStyle} />
        </div>
    )
}

/*
    TODO
      - rightClick => copy
      - tooltip with hex/dec value
 */
function Color({ name, value, set, readOnly, disabled, alpha, tab = true, ...props }) {
    const wContext = useContext(WindowContext);
    const colorRef = useRef(null);

    const [ clicked, setClicked ] = useState(false);
    colorRef.current = value;

    const btnCls = 'button-bg button-border-1';
    const cls = [btnCls, 'color-input-padding button-border-color border-outset'];
    const innerCls = [btnCls, ' button-border-color border-inset'];
    if (disabled) {
        readOnly = true;
        cls.push('disabled')
    }
    if (!readOnly) {
        cls.push('hover-change')
    } else {
        tab = false
    }
    const handleClick = upEvent => {
        wContext.startExclusiveMode('pick-color', 'pointer');
        wContext.addEventListener(upEvent, () => {
            wContext.endExclusiveMode('pick-color');
            setClicked(false)
        }, {once: true});
        wContext.openColorPickerModal({
            value: colorRef,
            test: value,
            alpha,
            set
        });
        setClicked(true)
    };

    return (
        <ComponentWithName name={name} { ...props }>
            <Block className={cls.join(' ')} cursor={readOnly ? false : "pointer"} tab={tab}
                   onLeftClick={readOnly ? null : () => handleClick('mouseup')}
                   onKeyDown={readOnly ? null : e => {
                       if (e.keyCode !== 32 || clicked) {
                           return
                       }
                       e.preventDefault();
                       handleClick('keyup')
                   }}>
                <Block className={innerCls.join(' ')}>
                    <ColorBox color={value} width={30} height={13} />
                </Block>
            </Block>
        </ComponentWithName>
    )
}

const MAX_H = 360;
const MAX_S = 100;
const MAX_V = 100;

const H_SEG = MAX_H / 6;
const H_FACTOR = 256 / H_SEG;

const getHueRgb = h => {
    const b = [{i: 0, v: 0}, {i: 1, v: 0}, {i: 2, v: 0}];
    if (h < H_SEG) {
        b[0].v = 255;
        b[1].v = h * H_FACTOR
    } else if (h < (2 * H_SEG)) {
        b[1].v = 255;
        b[0].v = 255 - (h - (H_SEG - 1)) * H_FACTOR
    } else if (h < (3 * H_SEG)) {
        b[1].v = 255;
        b[2].v = (h - (2 * H_SEG - 1)) * H_FACTOR
    } else if (h < (4 * H_SEG)) {
        b[2].v = 255;
        b[1].v = 255 - (h - (3 * H_SEG - 1)) * H_FACTOR
    } else if (h < (5 * H_SEG)) {
        b[2].v = 255;
        b[0].v = (h - (4 * H_SEG - 1)) * H_FACTOR
    } else {
        b[0].v = 255;
        b[2].v = 255 - (h - (5 * H_SEG - 1)) * H_FACTOR
    }
    return b;
}

const hsv2rgb = (h, s, v) => {
    const b = getHueRgb(h);
    const sorted = [ ...b ].sort((a, b) => a.v === b.v ? 0 : (a.v > b.v ? -1 : 1));
    const b2 = Math.round(sorted[1].v / 255 * s);

    sorted[0].n = Math.round(s);
    sorted[2].n = Math.round(s / 255 * v);
    sorted[1].n = Math.round((s - b2) / 255 * v + b2);

    sorted.sort((a, b) => a.i === b.i ? 0 : (a.i < b.i ? -1 : 1));
    //        ( S / 255 * V  ,   S,   (255 - B2) / 255 * V + B2 )
    //        C3            C1            C2

    let rgb = '#';
    for (let item of sorted) {
        rgb += (item.n).toString(16).padStart(2, '0')
    }
    return rgb;
}

/**
 * TODO
 *  * slider: setByClick => Move
 *  - number: percentage
 *  - inverse-color
 */
function ColorPicker({ value, set, alpha }) {
    const wContext = useContext(WindowContext);
    const PickerModal = useModal();

    const [ before ] = useState(value.current);
    const afterRef = useState(null);

    const rgb = hex2rgb(value.current);
    const update = useComponentUpdate();

    const [ active, setActive ] = useState(null);
    const gradientsRef = useRef({colors: {}});

    const [ h, setH ] = useState(100);
    const [ s, setS ] = useState(255);
    const [ v, setV ] = useState(0);

    const baseColorCanvas = wContext.getBaseColorCanvas();
    const colorMaskCanvas = wContext.getColorMaskCanvas();

    const [ baseColorIndex, setBaseColorIndexRaw ] = useState(0);
    const setBaseColorIndex = index => {
        setBaseColorIndexRaw(index);
        const ctx = baseColorCanvas.getContext('2d');
        const data = ctx.getImageData(0, 191 - index, 1, 1).data;
        setBaseColor(rgb2hex({r: data[0], g: data[1], b: data[2]}));
    };
    const [ baseColor, setBaseColor ] = useState('#FF0000');

    useEffect(() => {
        return () => {
            wContext.addLastColor(value.current);
        }
    }, []);

    const height = baseColorCanvas.height;

    const setByte = index => {
        return byteValue => {
            let i = 0;
            let newValue = '#';
            const iMax = alpha ? 3 : 2;
            while (i <= iMax) {
                if (i === index) {
                    newValue += byteValue.toString(16).padStart(2, '0');
                } else {
                    newValue += value.current.substr(1 + i * 2, 2)
                }
                i++;
            }
            set(newValue);

            /*
                HSV -> RGB

                H = 120
                S = 55   (Saturation also Höhe von 0)
                V = 100  (Lightness also Breite von )

                über H kommen wir auf BaseColor [b1, b2]
                V bestimmt den Wert
                   C-B1 = S
                   C-B2 = S * b2 / 255  +  |b1 - b2| / 255 * V
                   C-B3 = V

                b1 = 255, b2 = 210

                C-B1 = 55
                C-B2 = 55 * (210 / 255) + 45 / (255 * 100)
                     = 45.29 + 17.6 = 63
                C-B3 = 100

             V=255                V=128               V=0    b2
        255, 255, 255  --->  (128, 255, 188) --->   0, 255, 120   S=255
              |    S                |                   |    b2*
        128, 128, 128  --->  ( 64, 128,  94) --->   0, 128,  60   S=128
              |                     |                   |
          0,   0,   0  --->  (  0,   0,   0) --->   0,   0,   0   S=0

       ( S / 255 * V  ,   S,   (255 - B2) / 255 * V + B2 )
           C3            C1            C2

           (S - b2*) * v + b2*

           => B2 (aus H), S, V




255 / 128 = 120 / x <=> x = (120 * 128) / 255


                MaxChannel = Max(c)
                MidChannel


                Die beiden größten Channels bestimmen c1, c2
                S = |c1|




                HSV
                -----------------
                white -------> baseColor (Hue)
                  |              |
                  |              |
                black -------> black

             */


            // TODO calc base color
            /*
            const rgb = hex2rgb(newValue);
            const values = [rgb.r, rgb.g, rgb.b];
            values.sort((a, b) => a < b ? -1 : (a === b ? 0 : 1));
            const max = values[2];
            const min = values[0];

            let hexBaseColor = '#';
            if (min === max) {
                hexBaseColor = '#ff0000'
            } else {
                hexBaseColor += rgb.r === max ? 'ff' : (rgb.r === min ? '00' : (max - values[1]).toString(16).padStart(2, '0'));
                hexBaseColor += rgb.g === max ? 'ff' : (rgb.g === min ? '00' : (max - values[1]).toString(16).padStart(2, '0'));
                hexBaseColor += rgb.b === max ? 'ff' : (rgb.b === min ? '00' : (max - values[1]).toString(16).padStart(2, '0'));
            }
            setBaseColor(hexBaseColor);
            d('->', newValue, hexBaseColor);
             */
            requestAnimationFrame(update);
        }
    };

    const renderSquare = ctx => {
        ctx.fillStyle =
            hsv2rgb(h, 255, 0);
        ctx.fillRect(0, 0, 192, 192);
        ctx.drawImage(colorMaskCanvas, 0, 0, 192, 192);
    };

    const renderRainbow = ctx => {
        ctx.drawImage(baseColorCanvas, 0, 0, baseColorCanvas.width, baseColorCanvas.height)
    };

    const len = alpha ? 8 : 6;
    const isValid = hex => hex.length === len && hex.match(/^[a-fA-F0-9]+$/);

    const getColorWithChannel = (color, channel, value) => {
        let result = '#';
        let pos = 1;
        if (channel > 0) {
            const len = (channel - 1) * 2 + 2;
            result += color.substr(1,  len);
            pos += len;
        }
        result += value;
        pos += 2;
        if (pos < (color.length - 1)) {
            result += color.substr(pos)
        }
        return result
    }

    /*
    1     +254    +254   +254   +254   +254   +253
    [00]   [FF]   [00]   [FF]   [00]   [FF]   [01]
    0 ..   255 .. 509 .. 763 .. 1017   1271   1524
    FF0000 FFFF00 00FF00 00FFFF 0000FF FF00FF FF0001
    0 ..   60  .. 120 .. 180 .. 240 .  300 .. 359

    255 / 59 = 4.32
    1 * 4.32 = 4
    2 * 4.32 = 9
    10 * 4.32 = 43
    20 * 4,32 = 96
    59 * 4,32 = 255


    0 .. 1524

    1525 / 5 = 305

    1525 / 256 =

    Deg: 0 .. 359

    360 / 6 = 36

    256 / 36
*/
    const railProps = {
        outline: true,
        oppSize: 12
    };

    const renderIndicator = () => {
        const render = ctx => {
            ctx.clearRect(0, 0, 13, 15);
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.moveTo(5, 6);
            ctx.lineTo(12, 0);
            ctx.lineTo(12, 12);
            ctx.fill();
            ctx.strokeStyle = '#00000066';
            ctx.moveTo(4, 6);
            ctx.lineTo(11, 0);
            ctx.moveTo(4, 6);
            ctx.lineTo(11, 12);
            ctx.stroke();
        };
        return <Canvas plain width={15} height={12} render={render} />
    }
    const setColorFromPicker = color => {
        set(color);
        PickerModal.close();
        requestAnimationFrame(update)
    }

    const setColorFromEntityPicker = index => {
        let color = wContext.lastColorsIndex.getEntityValue(index);
        if (alpha) {
            color += value.current.substr(7)
        }
        set(color);
        requestAnimationFrame(update)
    }

    const undoOp = {
        exec: () => {set(before); requestAnimationFrame(update)},
        can: () => value.current !== before
    };
    const showBeforeOp = {
        exec: () => {
            afterRef.current = value.current;
            set(before);
            requestAnimationFrame(update)
        },
        can: () => value.current !== before
    };
    const showBeforeEnd = () => {
        set(afterRef.current);
        requestAnimationFrame(update)
    };

    const gradients = gradientsRef.current;
    const updateGradient = (id, colors) => {
        const curr = gradients.colors[id];
        if (!curr || curr !== colors) {
            gradients.colors[id] = colors;
            gradients[id] = <Gradient colors={colors} />
        }
    }

    const grad = alpha ? value.current.substr(7, 2) : '';
    alpha && updateGradient(
        'alpha',
        value.current.substr(0, 7) + '00 ' + value.current.substr(0, 7) + 'FF'
    );
    if (active === 'RGB' || !gradients.red) {
        updateGradient(
            'red',
            getColorWithChannel(value.current, 0, '00') + ' ' +
            getColorWithChannel(value.current, 0, 'FF')
        );
        updateGradient(
            'green',
            getColorWithChannel(value.current, 1, '00') + ' ' +
            getColorWithChannel(value.current, 1, 'FF')
        );
        updateGradient(
            'blue',
            getColorWithChannel(value.current, 2, '00') + ' ' +
            getColorWithChannel(value.current, 2, 'FF')
        )
    }
    if (active === 'HSV' || !gradients.hue) {
        updateGradient(
            'hue',
            "#FF0000" + grad + " #FFFF00" + grad + " #00FF00" + grad + " #00FFFF" +
            grad + " #0000FF" + grad + " #FF00FF" + grad + " #FF0001" + grad
        );
        updateGradient(
            's',
            hsv2rgb(h, 0, v) + grad + ' ' +
            hsv2rgb(h, 255, v) + grad
        );
        updateGradient(
            'v',
            hsv2rgb(h, s, 0) + grad + ' ' +
            hsv2rgb(h, s, 255) + grad
        )
    }

    return (
        <>
        <Stack vertical borders height={260}>
            <Stack borders full="h">
                <Stack vertical borders width={310}>
                    <Stack gaps padded>
                        <ColorBox className="thin-boxed" color={value.current} width={35} height={26} />
                        <Block center="v"><Input name="#" match={isValid} force className="autofocus" value={value.current.substring(1)} set={value => {set('#' + value); requestAnimationFrame(() => update())}} max={len} /></Block>
                        <Stack center="v" gaps>
                            <Button icon="colorize" onClick={() => PickerModal.open({})} />
                            <Button icon="undo" onClick={undoOp} />
                            <Button icon="visibility" onClick={showBeforeOp} onClickEnd={showBeforeEnd} />
                        </Stack>
                        <ColorBox className="thin-boxed" color={hsv2rgb(h, s, v)} width={35} height={26} />
                    </Stack>

                    <Block full="h">
                        <SideTabs active={active} setActive={setActive} icon={false} full>
                            <SideTab full active name="RGB">
                                {active === 'RGB' &&
                                    <Block padded full="h">
                                        <PropertyGrid>
                                            <NumberProp name="R" full="h" gradient={gradients.red} railProps={railProps} value={rgb.r} set={setByte(0)} min={0} max={255} slider="h" />
                                            <NumberProp name="G" full="h" gradient={gradients.green} railProps={railProps} value={rgb.g} set={setByte(1)} min={0} max={255} slider="h" />
                                            <NumberProp name="B" full="h" gradient={gradients.blue} railProps={railProps} value={rgb.b} set={setByte(2)} min={0} max={255} slider="h" />
                                            {alpha &&
                                                <NumberProp name="A" gradient={gradients.alpha} railProps={railProps} full="h" value={rgb.a} set={setByte(3)} min={0} max={255} slider="h" />
                                            }
                                        </PropertyGrid>
                                    </Block>
                                }
                            </SideTab>

                            <SideTab full name="HSV">
                                {active === 'HSV' &&
                                    <Block padded full="h">
                                        <PropertyGrid>
                                            <NumberProp name="H" full="h" gradient={gradients.hue} railProps={railProps} value={h} set={setH} min={0} max={MAX_H - 1} slider="h" />
                                            <NumberProp name="S" full="h" gradient={gradients.s} railProps={railProps} value={s} set={setS} min={0} max={255} slider="h" />
                                            <NumberProp name="V" full="h" gradient={gradients.v} railProps={railProps} value={v} set={setV} min={0} max={255} slider="h" />
                                            {alpha &&
                                                <NumberProp name="A" gradient={gradients.alpha} railProps={railProps} full="h" value={rgb.a} set={setByte(3)} min={0} max={255} slider="h" />
                                            }
                                        </PropertyGrid>
                                    </Block>
                                }
                            </SideTab>
                        </SideTabs>
                    </Block>
                </Stack>

                <Block padded>
                    <Stack>
                        <PixelMarker size={7} space={192} rangeX={256} rangeY={256} setX={value => setV(255 - value)} x={255 - v} y={255 - s} setY={value => setS(255 - value)}>
                            <Canvas width={192} height={192} render={renderSquare} plain />
                        </PixelMarker>

                        <Slider vertical tab
                                sledProps={{margin: 10, short: 10, long: 14, radius: true}}
                                railProps={{size: 192, oppSize: 12, center: false, radius: false}}
                                min={0} max={MAX_H - 1} value={h} set={setH}
                                getIndicator={renderIndicator}
                        >
                            <Canvas width={12} height={192} render={renderRainbow} />
                        </Slider>
                    </Stack>
                </Block>

            </Stack>

            <Stack gaps full>
                <Block padded width={150}><Select full="h" buttons tab options={[{id: 'last used', name: 'Last used'}]} value="last used"  /></Block>
                <Block full>
                    <EntityPicker centerItems={false} entityIndex={wContext.lastColorsIndex} select={setColorFromEntityPicker} />
                </Block>
            </Stack>
        </Stack>
            <PickerModal.content name="Pick a color..." full>
                <BitmapSelector type={alpha ? 'rgba' : 'rgb'} save={setColorFromPicker} close={PickerModal.close} selection={{type: 'rect', width: 1, height: 1, fixed: true}} />
            </PickerModal.content>
        </>
    )
}

function CanvasHitRegion({width, height, render, plain, onHit, x, y }) {
    const wContext = useContext(WindowContext);
    const blockRef = useRef(null);

    const onLeftClick = e => {
        const rect = blockRef.current.getBoundingClientRect();
        onHit(round(256 / width * (e.clientX - rect.x)), round(256 / height * (e.clientY - rect.y)));
        wContext.startExclusiveMode('set-hit', 'pointer');
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('set-hit')
        }, {once: true});
    };
    const handleSize = 9;
    const handleHalfSize = handleSize >> 1;
    const posX = width / 256 * x;
    const posY = height / 256 * y;
    return (
        <Overlays width={width + handleSize} height={height + handleSize} originX={handleHalfSize} originY={handleHalfSize}>
            <Overlay>
                <Block ref={blockRef} onLeftClick={onLeftClick} cursor="pointer">
                    <Canvas plain={plain} width={width} height={height} border="1" render={render} />
                </Block>
            </Overlay>

            <Overlay top={-handleHalfSize + posY} left={-handleHalfSize + posX}>
                <Handle tab width={handleSize} height={handleSize} circle />
            </Overlay>
        </Overlays>
    )
}

function Bitmap({ value, set, colors, empty, zoomOrAvail = 1, entityIndex }) {
    const EditBitmapModal = useModal();
    const CopyBitmapModal = useModal();
    const ImportBitmapModal = useModal();

    const editBitmap = () => {
        EditBitmapModal.open({
            image: value,
            colors,
            save: newImage => {
                set(newImage);
                EditBitmapModal.close()
            }
        });
    };

    const importBitmap = () => {
        const selected = image => {
            set(image);
            ImportBitmapModal.close();
        };
        ImportBitmapModal.open({
            zoom: 1,
            border: 0,
            save: selected,
            selection: {
                type: 'rect',
                width: entityIndex.hasEntityDim() ? 1 : entityIndex.getSizeX(),
                height: entityIndex.hasEntityDim() ? 1 : entityIndex.getSizeY(),
                fixed: !entityIndex.hasEntityDim(),
                multi: false,
                doubleClick: selected
            }
        });
    };

    const copy = () => {
        CopyBitmapModal.open({
            entityIndex,
            controls: true,
            filter: true,
            select: index => {
                set(entityIndex.getEntityPropValue(index, 'image'));
                CopyBitmapModal.close();
            }
        });
    };

    const width = value ? (typeof zoomOrAvail === 'object' ? zoomOrAvail.width : zoomOrAvail * value.width) : 0;
    const height = value ? (typeof zoomOrAvail === 'object' ? zoomOrAvail.height : zoomOrAvail * value.height) : 0;

    const render = ctx => {
        ctx.clearRect(0, 0, width, height);
        drawCanvasToAvail(getCanvasForBitmap(value), ctx, 0, 0, {width, height});
    };
    return (
        <>
            <Stack vertical>
                <Stack gaps="1">
                    <Button name="edit" padded="h" onClick={editBitmap} />
                    <Button name="import" onClick={importBitmap} padded="h" />
                    {entityIndex && <Button name="copy" onClick={copy} padded="h" />}
                    {empty && <Button icon="clear" onClick={() => set(null)} />}
                </Stack>
                <Block padded onLeftClick={editBitmap}>
                    <Canvas width={width} height={height} render={render} border="1" />
                </Block>
            </Stack>

            <EditBitmapModal.content name="Edit Bitmap" full>
                <BitmapEditor { ...EditBitmapModal.props } />
            </EditBitmapModal.content>

            <ImportBitmapModal.content name="Select image..." full>
                <BitmapSelector {...ImportBitmapModal.props} />
            </ImportBitmapModal.content>

            {entityIndex &&
                <CopyBitmapModal.content name="Copy image from..." width="75%" height={500}>
                    <EntityPicker {...CopyBitmapModal.props} />
                </CopyBitmapModal.content>
            }
        </>
    )
}


/**
 * TODO:
 *   - bessere Lösung für outline
 *   - end / center auf funktioniert vertical noch nicht richtig
 */
function Slider({ vertical, center, end, padded, border, size, full, sledProps = {}, railProps = {}, ...props }) {
    const { buttonBorderWidthPx } = useCssProps('buttonBorderWidthPx', 'defaultPaddingPx');

    railProps = { size: 150, radius: true, oppSize: 8, minSize: 80, maxSize: 180, outline: false, center: true, ...railProps };
    sledProps = { border: true, short: 10, long: 25, margin: 0, radius: true, ...sledProps, borders };
    if (size) {
        railProps.size = size;
        railProps.minSize = size;
        railProps.maxSize = size;
    }
    let borders = 0;
    if (sledProps.border) {
        borders = sledProps.border === '1' ? 1 : buttonBorderWidthPx;
    }
    const min = (railProps.minSize === null) ? false : railProps.minSize + sledProps.short + 2 * buttonBorderWidthPx;
    let max = (railProps.maxSize === null) ? false : railProps.maxSize + sledProps.short + 2 * buttonBorderWidthPx;
    const attr = {
        full: vertical ? 'v' : 'h',
        [vertical ? 'width' : 'height']: sledProps.margin + sledProps.long + 2 * borders
    };
    return (
        <MinMaxCtx vertical={vertical} padded={padded} end={end} center={center} min={min} max={max} border={border} { ...attr }>
            <SliderInner end={end} center={center} vertical={vertical} { ...props } borders={borders} railProps={railProps} sledProps={sledProps} />
        </MinMaxCtx>
    )
}

function SliderInner({ vertical, sledProps, railProps, borders, end, center, ...props }) {
    const aContext = useContext(AvailContext);
    const axisDim = vertical ? 'height' : 'width';
    railProps.size = clamp(railProps.minSize, aContext[axisDim] - sledProps.short - 2 * borders, railProps.maxSize);
    return (
        <RailAndSled vertical={vertical} sledProps={sledProps} railProps={railProps} borders={borders} { ...props } />
    )
}

function RailAndSled({ vertical, value, set, min = 0, max, tab, readOnly, disabled, decimals = 0,
        railProps = {}, sledProps = {}, getIndicator, borders, children }) {

    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);

    const divRef = useRef(null);
    const sledRef = useRef(null);
    const propsRef = useRef(null);
    propsRef.current = { value };

    const { oppSize, size, minSize, maxSize, outline, center, radius: railRadius } = railProps;
    const { border, short, long, margin, radius } = sledProps;

    const cls = ['overflow'];
    const stackCls = [];

    if (outline) {
        stackCls.push('input-border-1 input-border-color input-border-style border-box');
    }
    const sledBorders = 2 * borders;
    const sledShort = short + sledBorders;
    const sledLong = long + sledBorders + margin;

    const clampedSize = clamp(minSize, size, maxSize);
    let interval = Math.abs(max - min);
    let points = interval;
    let i = 0;
    let step = 1;
    while(i < decimals) {
        step *= 0.1;
        points *= 10;
        i++
    }
    points++;
    const pixelSize = interval / clampedSize;
    const pixelPoints = points / clampedSize;
    const pointDist = Math.max(clampedSize / points, 1);

    let valuePos;
    const invalid = !(value >= min && value <= max);
    if (!invalid) {
        if (min === max) {
            valuePos = vertical ? 0 : size;
            readOnly = true
        } else {
            valuePos = -Math.round((value - min) / pixelSize);
            if (vertical) {
                valuePos += size;
            } else {
                valuePos *= -1;
            }
        }
    }
    const axis = vertical ? 'Y' : 'X';
    const oppDir = vertical ? 'h' : 'v';
    const axisDim = vertical ? 'height' : 'width';
    const oppAxisDim = vertical ? 'width' : 'height';
    const axisMargin = vertical ? 'top' : 'left';
    const oppAxisMargin = vertical ? 'left' : 'top';

    const overlayAttr = {
        ['origin' + axis]: (sledShort >> 1),
        [axisDim]: size + (sledShort >> 1),
        [oppAxisDim]: sledLong
    };
    const stackAttr = {
        [axisDim]: clampedSize,
        [oppAxisDim]: oppSize
    };
    const valueAttr = invalid ? {} : {
        [axisDim]: vertical ? size - valuePos : valuePos
    };
    const sledOverlayAttr = invalid ? {} : {
        [axisMargin]: -(sledShort >> 1) + valuePos,
        [oppAxisMargin]: margin
    };
    const indicatorAttr = invalid ? {} : {
        [axisMargin]: -(sledShort >> 1) + valuePos
    };
    const handleAttr = {
        [axisDim]: sledShort - sledBorders,
        [oppAxisDim]: sledLong - sledBorders - margin
    }
    if (disabled) {
        cls.push('disabled');
        readOnly = true
    }
    const gripCls = ['button-bg'];
    if (border) {
        gripCls.push('button-border-' + (border === '1' ? '1' : 'width'));
        gripCls.push('button-border-color button-border-style')
    }
    if (radius) {
        gripCls.push('button-border-radius')
    }
    if (railRadius) {
        stackCls.push('input-border-radius');
    }
    if (!readOnly) {
        gripCls.push('hover-change')
    } else {
        cls.push('no-events');
        tab = false
    }
    if (clicked) {
        gripCls.push('clicked')
    }
    if (invalid) {
        children = <Block full className="input-bg invalid" tab={tab} onKeyDown={e => e.key === ' ' && set(min)} />;
    } else if (!children) {
        children = [];
        children.push(
            <Block key="a" full={oppDir} className="button-bg" { ...valueAttr } />
        );
        children.push(
            <Block key="b" full className="input-bg" />
        );
        if (vertical) {
            children.reverse()
        }
    }

    const setSliderPos = readOnly ? null : e => {
        const rect = divRef.current.getBoundingClientRect();
        let dist = (e['client' + axis] - rect[axis.toLowerCase()]);
        if (vertical) {
            dist = clampedSize - dist
        }
        if (pixelPoints < 1) {
            dist = Math.round(Math.max(dist - (pointDist / 2), 0) / pointDist) * step;
        } else {
            dist *= pixelSize;
        }
        set(clamp(min, round(min + dist, decimals), max));
        if (tab) {
            requestAnimationFrame(() => sledRef.current && sledRef.current.focus());
        }
        startSliding();
    };

    const startSliding = readOnly ? null : () => {
        const rect = divRef.current.getBoundingClientRect();
        const start = rect[axis.toLowerCase()];
        wContext.startExclusiveMode('move-slider', 'grabbing');
        setClicked(true);
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('move-slider');
            setClicked(false)
        }, {once: true});
        wContext.addEventListener('mousemove', e => {
            const { value } = propsRef.current;
            let dist = e['client' + axis] - start;
            if (vertical) {
                dist = clampedSize - dist
            }
            dist *= pixelSize;
            const newValue = clamp(min, round(min + dist, decimals), max);
            if (value !== newValue) {
                set(newValue)
            }
        })
    }

    const focusAttr = useFocusKeyBindings({
        keyHandlers: [
            {
                keys: ['ArrowDown', 'ArrowLeft'],
                handler:
                    e => {
                        const { value } = propsRef.current;
                        const newValue =
                            clamp(min, value - (e.shiftKey ? step * 10 : step), max);
                        if (newValue !== value) {
                            set(newValue)
                        }
                    }
            },
            {
                keys: ['ArrowUp', 'ArrowRight'],
                handler:
                    e => {
                        const { value } = propsRef.current;
                        const newValue =
                            clamp(min, value + (e.shiftKey ? step * 10 : step), max);
                        if (newValue !== value) {
                            set(newValue)
                        }
                    }
            },
        ]
    }, readOnly);
    return (
        <Overlays full={oppDir} className={cls.join(' ')} { ...overlayAttr }>

            <Overlay className={'full-' + oppDir}>
                <Block full centerItems={center} ref={divRef}>
                    <AvailContext.Provider value={{[axisDim]: clampedSize, [oppAxisDim]: railProps.oppSize}}>
                        <Stack className={stackCls.join(' ')} onLeftClick={setSliderPos} cursor="pointer" vertical={vertical} { ...stackAttr }>
                            {children}
                        </Stack>
                    </AvailContext.Provider>
                </Block>
            </Overlay>
            {
                getIndicator && !invalid &&
                    <Overlay className="no-events" { ...indicatorAttr }>
                        {getIndicator()}
                    </Overlay>
            }
            {!invalid &&
                <Overlay { ...sledOverlayAttr }>
                    <Block ref={sledRef} cursor="grab" tab={tab} onLeftClick={startSliding} className={gripCls.join(' ')} { ...handleAttr } { ...focusAttr } />
                </Overlay>
            }
        </Overlays>
    )
}

function FileDropZone({ type, full, save, required }) {
    const fContext = useContext(FormContext);
    const wContext = useContext(WindowContext);

    const [error, setError] = useState('');
    const [showTooltip, setShowTooltip] = useState(false);

    const dragEnterRef = useRef(null);
    const dropzoneRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const currLevel = wContext.getModalLevel();

        const handlePaste = (event) => {
            if (currLevel !== wContext.getModalLevel()) return;

            let items = (event.clipboardData  || event.originalEvent.clipboardData).items;
            handleImages(items);
            event.stopPropagation();
            event.preventDefault();
        };
        window.addEventListener('paste', handlePaste, {capture: false});
        return () => {
            window.removeEventListener('paste', handlePaste, {capture: false});
        }
    }, []);

    const handleImages = items => {
        dropzoneRef.current.classList.toggle('blink', false);
        const matches = [];
        const invTypes = new Map();
        for(let item of items) {
            if (type && item.type.startsWith(type + '/')) {
                matches.push(item);
            } else {
                invTypes.set('"' + item.type + '"', null);
            }
        }
        if (matches.length === 0) {
            if (invTypes.size > 0) {
                setError('The given types ' + [...invTypes.keys()].join(', ') + ' are not supported!');
            } else {
                setError('No content found!');
            }
            return;
        } else if (matches.length > 1) {
            setError('Multiple files not allowed!');
            return;
        }
        const file = matches[0];

        const reader = new FileReader();
        reader.onloadend = () => {
            save(reader.result, file.name);
            setError('');
        };
        reader.readAsDataURL(file.getAsFile ? file.getAsFile() : file);
    };

    const handleDrop = e => {
        handleImages(e.dataTransfer.files);
        e.stopPropagation();
        e.preventDefault();
    };
    const handleDragOver = e => {
        e.stopPropagation();
        e.preventDefault();
    };
    const handleDragEnter = e => {
        if (dropzoneRef.current) {
            dropzoneRef.current.classList.toggle('blink', true);
            dragEnterRef.current = e.target;
        }
        e.stopPropagation();
        e.preventDefault();
    };
    const handleDragLeave = e => {
        if (dropzoneRef.current && dragEnterRef.current === e.target) {
            dropzoneRef.current.classList.toggle('blink', false);
        }
        e.preventDefault();
    };
    const handleFileSelection = e => {
        e.preventDefault();
        handleImages(e.target.files);
    };

    const accept = type ? type + '/*' : '*';

    const attr = {};
    if (error) {
        attr.tab = true;
        attr.onMouseEnter = () => {
            setShowTooltip(true)
        };
        attr.onMouseLeave = () => {
            setShowTooltip(false)
        };
        attr.onFocus = () => {
            setShowTooltip(true)
        };
        attr.onBlur = () => {
            setShowTooltip(false)
        }
    }
    if (required) {
        fContext.markInvalid()
    }
    return (
        <Block
            ref={dropzoneRef}
            full={full}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            <Stack center border className={required ? 'invalid' : ''}>
                <Block padded center="v" { ...attr }>
                    <Stack vertical className={error ? 'blink color-warning' : ''}>
                        <Icon name={error ? 'report_problem' : 'file_upload'} />
                        {showTooltip && <Block><Tooltip>{error}</Tooltip></Block>}
                    </Stack>
                </Block>
                <Stack vertical padded vertical gaps>
                    <Block center="h">Drop/paste image here or</Block>
                    <Block center="h">
                        <Button name="Select image" padded="h" onClick={() => fileInputRef.current.click()} />
                        <input ref={fileInputRef} className="hidden" onChange={handleFileSelection} type="file" accept={accept} />
                    </Block>
                </Stack>
            </Stack>
        </Block>
    )
}

function ImageProp({ name, value, set, setName, required, zoomOrAvail, ...props }) {
    return (
        <LabelProp name={name}>
            {value ?
                <Stack vertical gaps>
                    <Stack>
                        <Block padded>Size: <Kbd value={value.width + 'x' + value.height} /></Block>
                        <Button icon="clear" onClick={() => {
                            set(null);
                        }} />
                    </Stack>
                    <Block border="1">
                        <Canvas
                            width={zoomOrAvail ? zoomOrAvail.width : value.width}
                            height={zoomOrAvail ? zoomOrAvail.height : value.height}
                            render={ctx => {
                                if (zoomOrAvail) {
                                    drawCanvasToAvail(value, ctx, 0, 0, zoomOrAvail)
                                } else {
                                    ctx.drawImage(value, 0, 0)
                                }
                            }}
                        />
                    </Block>
                </Stack> :
                <FileDropZone
                    type="image"
                    required={required}
                    save={
                        (bitmap, name = null) => {
                            const img = new Image();
                            img.src = bitmap;
                            img.decode().then(() => {
                                set(img);
                                if (setName && name) {
                                    setName(name)
                                }
                            })
                        }
                    }
                    { ...props }
                />
            }
        </LabelProp>
    )
}

function LabelProp({name, children}) {
    return (
        <>
            <Block className="small-font">
                {name}
            </Block>
            <Block>
                {children}
            </Block>
        </>
    )
}

function InputProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Input {...props} />
        </LabelProp>
    )
}

function TupleProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Tuple {...props} />
        </LabelProp>
    )
}

function SelectProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Select {...props} />
        </LabelProp>
    )
}

function RadioProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Radio {...props} />
        </LabelProp>
    )
}

function NumberProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Number {...props} />
        </LabelProp>
    )
}

function CheckboxProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Checkbox {...props} />
        </LabelProp>
    )
}

// TODO: braucht full eine Dim?
function FullProp({ name, children}) {
    return (
        <>
            {name && <Block full="h" className="small-font col-span-2">{name}</Block>}
            <Block full="h" className="col-span-2">
                {children}
            </Block>
        </>
    )
}

function PropSection({ name }) {
    return (
        <FullProp>
            <Block full="h" border={DIR.BOTTOM} className="less">{name}</Block>
        </FullProp>
    )
}

function TextAreaProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <TextArea {...props} />
        </LabelProp>
    )
}

function ColorProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Color {...props} />
        </LabelProp>
    )
}

function BitmapProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <Bitmap { ...props } />
        </LabelProp>
    )
}

function Submit({ disabled, className, ...props }) {
    const fContext = useContext(FormContext);
    const cls = ['submit'];
    if (className) {
        cls.push(className);
    }

    return (
        <Button icon="done" className={cls.join(' ')} disabled={disabled || (fContext && fContext.invalid)} { ...props } />
    )
}

function Hidden({ invalid }) {
    const callAfterwards = useCallAfterwards();
    const fContext = useContext(FormContext);

    const cls = [];
    if (invalid) {
        cls.push('invalid');
        if (fContext) {
            callAfterwards(fContext.markInvalid)
        }
    }
    return (
        <input type="hidden" className={cls.join(' ')} />
    )
}

function KeyInput({ value, set, onInput, className }) {
    const fContext = useContext(FormContext);
    const [record, setRecord] = useState(false);

    const cls = ['input'];
    if (className) {
        cls.push(className);
    }
    if (value === '') {
        cls.push('invalid');
        if (fContext) {
            fContext.markInvalid()
        }
    }
    const getInputFromTarget = e => {
        let elem = e.target;
        while (elem && !elem.classList.contains('input')) {
            elem = elem.parentNode
        }
        return elem
    };

    const selfFocus = e => {
        const elem = getInputFromTarget(e);
        if (elem) {
            elem.focus();
            e.stopPropagation();
            e.preventDefault();
        }
    };
    const setKeyInput = e => {
        const code = e.key.length === 1 ? e.key.charCodeAt(0) : 0;
        if (code >= 32) {
            const elem = getInputFromTarget(e);
            set(String.fromCharCode(code));
            elem.blur();
            e.stopPropagation();
            e.preventDefault()
            if (onInput) onInput();
        }
    };
    return (
        <Stack vertical tab className={cls.join(' ')} onFocus={() => setRecord(true)} onBlur={() => setRecord(false)} onMouseDown={selfFocus} onKeyDown={setKeyInput}>
            <Block border="1" full="h" className={record ? 'blink' : ''} padded="h" center="h">
                {value === '' && record ? <Icon name="keyboard" size={13} /> : <Kbd value={value !== '' ? value : ' '} />}
            </Block>
            <Block full="h"><Kbd value={value !== '' ? value.charCodeAt(0) : ''} length={4} /></Block>
        </Stack>
    )
}

export {
    Form,
    OkCancelForm,
    FormContext,
    Button,
    AsyncButton,
    Submit,
    Number,
    NumberProp,
    Handle,
    Checkbox,
    CheckboxProp,
    Radio,
    RadioProp,
    Input,
    InputProp,
    KeyInput,
    Tuple,
    TupleProp,
    Select,
    SelectProp,
    TextArea,
    TextAreaProp,
    Color,
    ColorProp,
    ColorPicker,
    Slider,
    Bitmap,
    BitmapProp,
    FileDropZone,
    ImageProp,
    LabelProp,
    Hidden,
    FullProp,
    PropSection
}