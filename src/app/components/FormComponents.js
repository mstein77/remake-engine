import React, { useContext, useEffect, useRef, useState } from "react";
import { d } from "../helper/helper"
import { Block, Stack } from "./LayoutComponents";
import { WindowContext, useFocusKeyBindings, useRefocus, useMounted } from "./BasicComponents";

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
                    inputRef.current.select();
                    inputRef.current.focus()
                })
            }
        },
        []
    )
}

function ComponentWithName({ name, children }) {
    if (name) {
        children = (
            <Stack gaps>
                <Block center="v">{name}</Block>
                {children}
            </Stack>
        )
    }
    return children
}

const FormContext = React.createContext();

function Form({ children, ...props }) {
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

    return (
        <FormContext.Provider value={value}>
            <Block ref={formRef} {...props}>
                {children}
            </Block>
        </FormContext.Provider>
    )
}


/**
 * readOnly
 * disabled
 * tabbed
 */
function Checkbox({ name, value, set, tab = true, disabled, readOnly, rev, icon = true }) {

    const items = [];
    if (icon) {
        items.push(
            <Button
                key={1}
                border={false}
                tab={tab}
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
            <Block key={2} shorten center="v">{name}</Block>
        )
    }
    if (rev) {
        items.reverse()
    }
    if (items.length === 1) {
        return items[0]
    }
    return (
        <Stack gaps>{items}</Stack>
    )
}

/**
 *
 */
function Button({ name, icon, current, value, disabled, iconWidth, iconHeight, onClick, direct, rev, size = 18, cursor = 'default', padded = (name ? true : false), tab = true, border = "1", className, ...props }) {
    const wContext = useContext(WindowContext);

    const mounted = useMounted();
    const focusRef = useRef(null);

    const [clicked, setClicked] = useState(false);

    const readOnly = !onClick;
    let attr = { ...props };
    const cls = [];
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
        items.push(
            <div style={style} className="min-content-h center-h" key={1} dangerouslySetInnerHTML={{ __html: '<i class="material-icons center-h min-content-h" style="font-size: ' + size + 'px; display: block">' + icon + '</i>' }} />
        );
    }
    if (name) {
        items.push(
            <Block shorten full="h" key={2}>{name}</Block>
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
                handleClick('keyup');
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
function Radio({ name, icon, options, gaps, value, set, readOnly, disabled, padded, tab = true }) {

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
    for (let {id, name} of options) {
        items.push(
            <Button key={id} tab={tab} padded={padded} disabled={disabled} name={icon ? null : name} icon={icon ? name : null} value={id} current={value} onClick={readOnly ? null : setAndRefocus} />
        );
    }
    return (
        <ComponentWithName name={name}>
            <Block ref={radioRef}><Stack {...attr}>{items}</Stack></Block>
        </ComponentWithName>
    )
}

function Number({name, disabled, set, value, min, max, step, autoFocus, slider = true, decimals = 0, readOnly, buttons = true, tab = true}) {
    const wContext = useContext(WindowContext);

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
                    let newOffset = Math.round(range ? relPos / Math.max(1, 200 / range) : relPos);
                    if (maxOffset !== null) {
                        newOffset = Math.min(maxOffset, newOffset);
                    }
                    if (minOffset !== null) {
                        newOffset = Math.max(minOffset, newOffset);
                    }
                    if (newOffset !== lastOffset) {
                        lastOffset = newOffset;
                        set(anchorValue + newOffset);
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
        <ComponentWithName name={name}>
            {elem}
        </ComponentWithName>
    )
}

/*
 */
function Input({ name, value, set, size, min, max, autoFocus, required, disabled, number, clear, readOnly, match, active, step, force = number, decimals = 0, tab = true, className }) {

    const fContext = useContext(FormContext);
    const inputRef = useRef(null);

    useAutoFocus(inputRef, {autoFocus, disabled, readOnly});

    const [curr, setCurr] = useState(value);
    const [edit, setEdit] = useState(false);

    const isFloat = number && (decimals && decimals > 0);
    const cls = [];
    if (className) {
        cls.push(className);
    }

    useEffect(() => {
        if (autoFocus) {
            requestAnimationFrame(() => {
                inputRef.current.focus();
                inputRef.current.select();

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
        input = <Stack>{input}<Button icon="clear" disabled={disabled} tab={false} size={14} onClick={() => set('')} /></Stack>
    } else {
        input = <Block>{input}</Block>
    }
    return (
        <ComponentWithName name={name}>
            {input}
        </ComponentWithName>
    )
}

function Tuple({ name, x, setX, y, setY, min, max, buttons, slider, tab = true, size, step, readOnly, disabled, autoFocus, ...props }) {

    const xAttr = {
        name,
        value: x,
        min:  min !== undefined ? min : props.minX,
        max: max !== undefined ? max : props.maxX,
        size: size !== undefined ? size : props.sizeX,
        set: setX,
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
        size: size !== undefined ? size : props.sizeY,
        set: setY,
        step: step !== undefined ? step : props.stepY,
        autoFocus,
        readOnly: readOnly !== undefined ? readOnly : props.readOnlyY,
        tab,
        buttons,
        slider
    };
    return (
        <Stack gaps>
            <Number {...xAttr} />
            <Button tab={false} className="less" size={12} icon="clear" border={false} />
            <Number {...yAttr} />
        </Stack>
    );
}

function Select({ name, value, set, disabled, options, readOnly, buttons = true, tab = true }) {

    const optionHandler = getOptionHandler(options, value);
    if (readOnly) {
        buttons = false;
    }

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
    if (disabled || readOnly) {
        tab = false
    }
    attr.tabIndex = tab ? 0 : -1;
    if (tab) {
        attr.className = 'tabbed'
    }
    items.push(
        readOnly ?
            <Block><input key={1} onFocus={e => e.target.blur()} tabIndex={-1} value={optionHandler.name} readOnly={true} /></Block> :
            <select
                key={1}
                value={value}
                disabled={disabled}
                onChange={
                    e => {
                        set(optionHandler.intIds ? parseInt(e.target.value, 10) : e.target.value)
                    }
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
        <ComponentWithName name={name}>
            {items.length === 1 ? items[0] : <Stack>{items}</Stack>}
        </ComponentWithName>
    )
}

function TextArea({ name, value, set, autoFocus, readOnly, disabled, rows, cols, wrap, tab = true, required, match, className }) {
    const fContext = useContext(FormContext);
    const inputRef = useRef(null);

    useAutoFocus(inputRef, {autoFocus, disabled, readOnly});

    const attr = {
        wrap,
        rows,
        cols,
        readOnly,
        disabled,
        value,
        ref: inputRef,
        onChange: e => set(e.target.value)
    };
    const cls = [];
    if (className) {
        cls.push(className);
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
        <ComponentWithName name={name}>
            <textarea
                className={cls.join(' ')}
                {...attr}
            ></textarea>
        </ComponentWithName>
    )
}

function Color({ name, value, set, readOnly, disabled, tab = true }) {
    const cls = [];
    if (!tab || (readOnly || disabled)) {
        tab = false;
    } else {
        cls.push('tabbed');
    }
    return (
        <ComponentWithName name={name}>
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

function Submit({ disabled, ...props }) {
    const fContext = useContext(FormContext);

    return (
        <Button disabled={disabled || (fContext && fContext.invalid)} { ...props } />
    )
}

export {
    Form,
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
    LabelProp
}