import React, { useContext, useEffect, useRef, useState } from "react";
import {d, drawCanvasToAvail, getCanvasForBitmap} from "../helper/helper"
import { Block, Stack } from "./LayoutComponents";
import { WindowContext, EditorContext, useModal, Canvas, Icon, useFocusKeyBindings, useRefocus, useMounted } from "./BasicComponents";
import { EntityPicker } from "./EntityComponents";

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
            if (!invalid) {
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

/**
 * readOnly
 * disabled
 * tabbed
 */
function Checkbox({ name, value, tab = true, disabled, readOnly, rev, icon = true, ...props }) {

    const set = useSet(value, props);

    const items = [];
    if (icon) {
        items.push(
            <Button
                key={1}
                border={false}
                tab={tab}
                className="transparent"
                iconCls="checkbox"
                icon={value ? 'check_box' : 'check_box_outline_blank'}
                padded={false}
                disabled={disabled}
                onClick={
                    readOnly ? null :
                    () => {
                        set(!value)
                    }
                }
            />
        )
    } else {
        const inputProps = {};
        if (disabled || readOnly) {
            tab = false;
        }
        if (!tab) {
            inputProps.tabIndex = -1
        } else {
            inputProps.className = "tabbed"
        }
        items.push(
            <input
                key={1}
                type="checkbox"
                checked={!!value}
                readOnly={readOnly}
                disabled={disabled}
                onClick={e => {
                    if (readOnly) {
                        e.preventDefault();
                        e.stopPropagation()
                    }
                }}
                onChange={e => {
                    set(e.target.checked)
                }}
                {...inputProps}
            />
        )
    }
    if (name) {
        items.push(
            <Block full="h" key={2} shorten center="v">{name}</Block>
        )
    }
    if (rev) {
        items.reverse()
    }
    if (items.length === 1) {
        return items[0]
    }
    return (
        <Stack gaps {...getDimHAttr(props)}>{items}</Stack>
    )
}

/**
 *
 */
function Button({ name, icon, current, value, disabled, iconWidth, iconHeight, iconCls, onClick, onClickEnd, direct, rev, size = 18, cursor = 'default', padded = (name ? true : false), tab = true, border = "1", className, ...props }) {
    const wContext = useContext(WindowContext);

    const mounted = useMounted();
    const focusRef = useRef(null);

    const [clicked, setClicked] = useState(false);

    if (onClick && typeof onClick === 'object') {
        if (onClick.can && !onClick.can()) {
            disabled = true
        } else {
            const exec = onClick.exec;
            onClick = () => exec();
        }
    }

    const readOnly = !onClick;
    let attr = { ...props };
    const cls = ['button'];
    if (border) {
        cls.push('button-border');
    }
    if (className) {
        cls.push(className);
    }

    let active = false;
    if (value !== undefined) {
        if (value == current) {
            cls.push('active');
            active = true;
        } else {
            tab = false;
        }
    }
    if (disabled) {
        cls.push('disabled');
    } else {
        cls.push('hover-highlight');
    }
    if (tab && (disabled || readOnly)) {
        tab = false;
    }
    attr = { ...attr, tab, border, padded, cursor, indented: (padded ? false : '1'), center: 'v' };

    attr.ref = focusRef;

    const items = [];
    if (icon) {
        const style = {
            width: iconWidth || size,
            height: iconHeight || size
        };
        const iCls = ['min-content-h center-h'];
        if (iconCls) {
            iCls.push(iconCls);
        }

        items.push(
            <div style={style} className={iCls.join(' ')} key={1} dangerouslySetInnerHTML={{ __html: '<i class="material-icons center-h min-content-h" style="font-size: ' + size + 'px; display: block">' + icon + '</i>' }} />
        );
    }
    if (name) {
        items.push(
            <Block center="v" shorten full="h" key={2}>{name}</Block>
        );
    }
    if (rev) {
        items.reverse()
    }
    if (clicked) {
        cls.push('clicked');
    }
    if ((name || border)) {
        cls.push(active ? 'active-bg' : 'control-bg');
    }
    const text = items.length === 1 ? items[0] : <Stack gaps full="h">{items}</Stack>;

    attr.onFocus = e => {
        if (tab && !(disabled || readOnly)) {
            e.target.focus();
        } else {
            e.target.blur();
        }
    };

    if (!(disabled || readOnly) && onClick && !clicked) {
        const handleClick = (endEvent, directEvent = false) => {
            wContext.startExclusiveMode('button-click', cursor);
            wContext.addEventListener(endEvent, () => {
                if (!directEvent) {
                    onClick(value);
                }
                if (mounted.current) {
                    setClicked(false);
                }
                if (onClickEnd) {
                    onClickEnd();
                }
                wContext.endExclusiveMode('button-click', cursor);
            }, {once: true});
            setClicked(true);
            if (directEvent) {
                onClick(directEvent);
            }
        };

        if (tab) {
            attr.onKeyDown = e => {
                if (e.keyCode !== 32) {
                    return;
                }
                e.preventDefault();
                handleClick('keyup', direct ? e : null);
            }

        }
        attr.onMouseDown = e => {
            handleClick('mouseup', direct ? e : null);
// TODO: check selection problem: e.preventDefault();
        }
    }
    return (
        <Block className={cls.join(' ')} {...attr}>{text}</Block>
    )
}

/**
 *
 */
function Radio({ name, icon, options, gaps, value, readOnly, disabled, padded, tab = true, ...props }) {
    const fContext = useContext(FormContext);

    const set = useSet(value, props);

    const radioRef = useRef(null);
    const refocus = useRefocus(radioRef);
    const setAndRefocus = value => {
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
                            setAndRefocus(id)
                        }
                    }
            },
            {
                keys: ['ArrowUp', 'ArrowLeft'],
                    handler:
                () => {
                    const id = optionHandler.getPrevId();
                    if (id !== null) {
                        setAndRefocus(id)
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

function Number({name, disabled, value, min, max, step, autoFocus, slider = true, decimals = 0, readOnly, buttons = true, tab = true, ...props }) {
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

        const startSliding = e => {
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
            }, {
                cleanUp: () => {
                    setSliding(false);
                    if (dim && !slideRef.current.reenter) {
                        setDim(null);
                    }
                }
            });
            setSliding(true);
            setReenter(true);
            blurActive()
        };
        items.push(
            <Button key={1} size={14} padding={false} direct disabled={disabled || (min === max && min !== undefined)} onClick={startSliding} cursor="row-resize" icon="height" tab={false} />
        );
    } else if (hasRange && slider === 'h') {
        items.push(
            <input key={1} disabled={disabled} readOnly={readOnly} tabIndex={-1} type="range" step={stepHandler.step} value={value} min={min} max={max} onChange={e => set(stepHandler.round(e.target.valueAsNumber))} />
        );
    }
    items.push(
        <Input key={2} tab={tab} readOnly={readOnly} disabled={disabled} autoFocus={autoFocus} decimals={decimals} step={stepHandler.step} number max={max} min={min} value={value} set={set} />
    );
    if (buttons) {
        items.push(
            <Stack key={3} vertical gaps="1">
                <Button key={4} iconWidth={14} size={8} disabled={disabled || max === value} onClick={() => {set(stepHandler.getStepUp(value)); blurActive()}} padded={false} tab={false} icon="expand_less"></Button>
                <Button key={3} iconWidth={14} size={8} disabled={disabled || min === value} onClick={() => {set(stepHandler.getStepDown(value)); blurActive()}} padded={false} tab={false} icon="expand_more"></Button>
            </Stack>
        );
    }
    let elem = items.length === 1 ? items[0] : <Stack>{items}</Stack>;

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
            attr.className = 'min-content-h';
        }

        elem = (
            <Block onMouseEnter={onMouseEnter} ref={divRef} width={dim ? dim.width : null} height={dim ? dim.height : null}>
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

function Input({ name, value, size, min, max, autoFocus, required, disabled, number, clear, readOnly, match, active, step, force = number, decimals = 0, tab = true, onMax, className, ...props }) {

    const fContext = useContext(FormContext);
    const inputRef = useRef(null);

    useAutoFocus(inputRef, {autoFocus, disabled, readOnly});

    const set = useSet(value, props);
    const [curr, setCurr] = useState(value);
    const [edit, setEdit] = useState(false);

    const isFloat = number && (decimals && decimals > 0);
    const cls = ['input'];
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
        input = <Stack full={props.full}>{input}<Button icon="clear" center="v" disabled={disabled || value === ''} tab={!(disabled || value === '')} size={14} onClick={() => set('')} /></Stack>
    } else {
        input = <Block center="v" full={props.full}>{input}</Block>
    }
    return (
        <ComponentWithName name={name} {...props}>
            {input}
        </ComponentWithName>
    )
}

function Tuple({ name, x, setX, y, setY, undo, min, max, buttons, slider, tab = true, size, step, readOnly, disabled, autoFocus, full, ...props }) {
    const attr = getDimHAttr(props);
    const xAttr = {
        name,
        full: 'h',
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

    const cls = ['input'];
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
                    e => {
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
                    e => {
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

function TextArea({ name, value, autoFocus, resize, readOnly, disabled, rows, cols, wrap, tab = true, required, match, className, ...props }) {
    const fContext = useContext(FormContext);
    const inputRef = useRef(null);
    const set = useSet(value, props);

    useAutoFocus(inputRef, {autoFocus, disabled, readOnly});

    const style = getDimStyle(props || {});
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
        onChange: e => set(e.target.value)
    };
    if (!resize) {
        attr.style.resize = 'none'
    }
    const cls = ['input'];
    if (className) {
        cls.push(className);
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

function Color({ name, value, readOnly, disabled, full, tab = true, ...props }) {
    const set = useSet(value, props);

    const cls = ['input'];
    if (!tab || (readOnly || disabled)) {
        tab = false;
    } else {
        cls.push('tabbed');
    }
    return (
        <ComponentWithName name={name} {...props}>
            <Block>
                <input
                    type="color"
                    tabIndex={tab ? 0 : -1}
                    value={value}
                    className={cls.join(' ')}
                    disabled={disabled}
                    onClick={readOnly ? e => {
                        e.preventDefault();
                        e.stopPropagation()
                    } : null}
                    onChange={e => {set(e.target.value)}}
                />
            </Block>
        </ComponentWithName>
    )
}

function Bitmap({ value, set, colors, empty, zoomOrAvail = 1, entityIndex }) {
    const CopyBitmapModal = useModal();

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
                    <Button name="edit" padded="h" />
                    <Button name="import" padded="h" />
                    {entityIndex && <Button name="copy" onClick={copy} padded="h" />}
                    {empty && <Button icon="clear" onClick={() => set(null)} />}
                </Stack>
                <Block padded>
                    <Canvas width={width} height={height} render={render} border="1" />
                </Block>
            </Stack>

            {entityIndex &&
                <CopyBitmapModal.content name="Copy image from..."  width="75%" height={500}>
                    <EntityPicker {...CopyBitmapModal.props} />
                </CopyBitmapModal.content>
            }
        </>
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

export {
    Form,
    OkCancelForm,
    FormContext,
    Button,
    Submit,
    Number,
    NumberProp,
    Checkbox,
    CheckboxProp,
    Radio,
    RadioProp,
    Input,
    InputProp,
    Tuple,
    TupleProp,
    Select,
    SelectProp,
    TextArea,
    TextAreaProp,
    Color,
    ColorProp,
    Bitmap,
    BitmapProp,
    LabelProp,
    FullProp
}