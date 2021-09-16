import React, { useContext, useMemo, useEffect, useRef, useState } from "react";
import { d, round, clamp, isEventInRect, drawCanvasToAvail, getCanvasForBitmap, copy2clipboard, hex2rgb, rgb2hex } from "../helper/helper"
import { Block, Stack, Tooltip, Overlays, Overlay, DIR } from "./LayoutComponents";
import {
    WindowContext,
    EditorContext,
    useModal,
    PropertyGrid,
    Kbd,
    Canvas,
    Gradient,
    ColorBox,
    Icon,
    SideTab,
    SideTabs,
    HotKeyKeys,
    useFocusKeyBindings,
    useRefocus,
    useMounted,
    useCssProps,
    useCachedState,
    useCallAfterwards,
    useComponentUpdate,
    AvailContext, MinMaxCtx, CanvasCircleMarker, Portal, BackgroundCtx, EditorCtx
} from "./BasicComponents";
import { EntityPicker } from "./EntityComponents";
import {BitmapSelector, useBitmapSelectionModal, useEditBitmapModal} from "./EditorComponents";

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
function ComponentWithName({ name, center = 'v', children, ...props }) {
    if (name) {
        const attr = getDimHAttr(props);
        children = (
            <Stack gaps {...attr}>
                <Block center={center} full={attr.full} shorten>{name}</Block>
                {children}
            </Stack>
        )
    }
    return children
}

function getStackAndDimHAttr(props, defaults = {}) {
    let { full, width, minWidth, maxWidth } = getDimHAttr(props);

    const stackAttr = {};
    const dimAttr = {};
    let flexCls = 'full-h';

    if (width) {
        // fix width
        stackAttr.width = width;
        dimAttr.full = 'h'
    } else {
        if (!minWidth && minWidth !== false) {
            minWidth = defaults.min
        }
        if (!maxWidth && maxWidth !== false) {
            maxWidth = defaults.max
        }
        stackAttr.minWidth = minWidth;
        stackAttr.maxWidth = maxWidth;
        if (full) {
            stackAttr.full = 'h';
            dimAttr.full = 'h'
        } else {
            flexCls = '';
        }
    }
    return {
        stackAttr,
        dimAttr,
        flexCls
    }
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

function Form({ children, submit, onKeyDown, ...props }) {
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
        } else if (onKeyDown) {
            onKeyDown(e);
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
            <Stack className="secondary-bg" full="h" gaps padded>
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

function FixTooltip({ title, hotKey, click, children, hostRef }) {
    const [ arrow, setArrow ] = useState(false);

    const hostRect = hostRef.current ? hostRef.current.getBoundingClientRect() : null;
    const divRef = useRef(null);
    const dist = 10;
    const styleRef = useRef({
        zIndex: 10000,
        arrowUp: true
    });
    const cls = ['fixed tooltip primary-bg primary-color small-font padded thin-boxed wrap-normal'];
    if (!arrow) {
        cls.push('invisible')
    }

    useEffect(() => {
        if (!hostRef.current || !divRef.current) return;

        const rect = divRef.current.getBoundingClientRect();
        const out = {
            top: rect.top < 0,
            left: rect.left < 0,
            bottom: rect.bottom > window.innerHeight,
            right: rect.right > window.innerWidth
        };
        if (out.right) {
            styleRef.current.marginLeft = window.innerWidth - rect.right - dist
        } else if (out.left) {
            styleRef.current.marginLeft = -rect.left
        }
        if (out.bottom) {
            styleRef.current.marginTop = -(rect.height + hostRect.height + 2 * dist);
        } else if (out.top) {
            styleRef.current.marginTop = -rect.top
        }
        if (!arrow) {
            setArrow(out.bottom ? 'down' : 'up');
        }
    }, [hostRef.current, divRef.current]);

    if (!hostRef.current) return '';

    if (styleRef.current.top === undefined) {
        styleRef.current.top = hostRect.top + hostRect.height + dist;
        styleRef.current.left = hostRect.left;
    }
    const arrowStyle = {
        top: hostRect.top + (arrow === 'up' ? hostRect.height + 1 : - (dist)),
        left: hostRect.left + 5,
        zIndex: styleRef.current.zIndex
    };

    return (
        <Portal id="modals-container">
            <div ref={divRef} style={{ ...styleRef.current }} className={cls.join(' ')}>
                {title}
                {title && children ? <br /> : ''}
                {children}
                {(hotKey || click) && <>
                    <Stack gaps end padded={DIR.TOP}>
                        {click &&
                            <>
                                <Block center="v"><Icon name="mouse" size={13} /></Block>
                                <Block border="1" center="v" padded="h">{click}</Block>
                            </>
                        }
                        {hotKey &&
                            <>
                                <Block center="v"><Icon name="keyboard" /></Block>
                                <HotKeyKeys padded="h" className="align-end" hotKey={hotKey} />
                            </>
                        }
                    </Stack>
                </>}
            </div>
            <div className="fixed" style={arrowStyle}><div className={"triangle-v triangle-" + arrow} /></div>
        </Portal>
    )
}

function useTooltip({ title, hotKey, clicked, info, click }) {
    const wContext = useContext(WindowContext);

    const hostRef = useRef(null);
    const mounted = useMounted();

    const [ showTooltip, setShowTooltipRaw ] = useState(false);
    const setShowTooltip = value => {
        if (!mounted.current) return;
        setShowTooltipRaw(value)
    }
    const propsRef = useRef();
    propsRef.current = {
        showTooltip,
        setShowTooltip
    };

    if (!wContext.editorConfig.tooltips || !(title || info)) {
        return {enabled: false}
    }

    const checkTooltip = () => {
        wContext.clearTooltipTimer(propsRef);
        if (wContext.isInExclusiveMode()) {
            wContext.addEventListener(
                'mouseup', e => {
                    if (!isEventInRect(e, hostRef.current.getBoundingClientRect())) {
                        setShowTooltip(false)
                    }
                },
                {once: true}
            );
            setShowTooltip(null);
            return;
        }
        setShowTooltip(false)
    }

    if (clicked && showTooltip !== null) {
        checkTooltip()
    }

    const attr = {
        ref: hostRef,
        onMouseOver: () => {
            wContext.startTooltipTimer(propsRef);
        },
        onMouseOut: checkTooltip
    };

    return {
        enabled: true,
        attr,
        render: showTooltip && <FixTooltip title={title} hotKey={hotKey} click={click} hostRef={hostRef}>{info}</FixTooltip>
    }
}

function addPaddingCls(cls, padded, type) {
    if (padded) {
        if (padded !== true) {
            cls.push(type + '-padding');
        }
        if (padded !== '1') {
            if (padded !== 'v') {
                cls.push(type + '-padding-h');
            }
            if (padded !== 'h') {
                cls.push(type + '-padding-v');
            }
        }
    }
}

/**
 */
function Button({ icon, name, help, action, full, state, iconProps = {}, end, center, centerItems, value, current, rev, disabled, onClick, onClickEnd, click,
                   className,  tab = true, cursor = 'pointer', gaps = true, border = true, radius = true, padded, vertical, children, ...props }) {
    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);
    const mounted = useMounted();

    const statePrefix = (value === undefined || value !== current) ? useStatePrefix(state, 'button') : 'active';

    const cls = [statePrefix + '-bg', statePrefix + '-color button-font'];
    if (className) {
        cls.push(className);
    }

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
    addPaddingCls(cls, padded, 'button');

    if (clicked && (!state || value !== undefined)) {
        cls.push('clicked');
    }
    const dir = vertical ? 'v' : 'h';
    const oppDir = vertical ? 'h' : 'v';

    const helpProps = {
        title: '',
        clicked
    };
    if (help && !(disabled || readOnly)) {
        if (action) {
            helpProps.hotKey = wContext.hotKeyActions.action2hotKey[action];
        }
        if (click) {
            helpProps.click = click
        }
        if (typeof help === 'string') {
            helpProps.title = help;
        } else {
            if (help.title) {
                helpProps.title = help.title
            }
            if (help.details) {
                helpProps.info = <span className="less">
                    {help.details}
                </span>
            }
            if (help.hotKey) {
                helpProps.hotKey = help.hotKey
            }
        }
    }
    const tooltip = useTooltip(helpProps)

    const items = [];
    if (icon) {
        items.push(
            <Icon key="i" center={false} name={icon} { ...iconProps } />
        );
    }
    if (name) {
        items.push(
            <Block key="n" center={oppDir} full={dir} shorten={!tooltip.enabled}>
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
        <Block gaps tab={tab} center={center} className={cls.join(' ')} cursor={cursor} { ...tooltip.attr } { ...attr }>
            <>
            {!hasStack ?
                items[0] :
                <Stack key="s" gaps={gaps} center={centerItems} end={end} vertical={vertical} full={fullStack}>
                    {items}
                </Stack>
            }
            {tooltip.render}
            </>
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

function Radio({ name, icon, options, gaps, value, readOnly, disabled, padded, wrap, tab = true, floatProps = {}, ...props }) {
    const fContext = useContext(FormContext);

    const callAfterwards = useCallAfterwards();
    const set = useSet(value, props);

    const radioRef = useRef(null);
    const refocus = useRefocus(radioRef);
    const setAndRefocus = ({value}) => {
        refocus();
        set(value)
    };

    const dimProps = getDimHAttr(props);

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
    for (let { id, name, help } of options) {
        items.push(
            <Button key={id} tab={tab} help={help} padded={padded} disabled={disabled} name={icon ? null : name} icon={icon ? name : null} value={id} current={value} onClick={readOnly ? null : setAndRefocus} />
        );
        if (id === value) {
            found = true;
        }
    }
    if (!found) {
        attr.className = 'invalid';
        if (fContext) {
            callAfterwards(fContext.markInvalid)
        }
    }
    return (
        <ComponentWithName name={name} { ...floatProps }>
            <Block ref={radioRef} { ...dimProps }><Stack full="h" wrap={wrap} { ...attr }>{items}</Stack></Block>
        </ComponentWithName>
    )
}

const iconPropsInputButton = {size: 14};

function Input({ name, value, size, min, max, autoFocus, required, disabled, number, clear, readOnly, match, active, step, force = number, decimals = 0, tab = true, padded = 'h', onMax, floatProps = {}, onClear, onClick, className, ...props }) {

    const fContext = useContext(FormContext);
    const inputRef = useRef(null);
    if (props.inputRef) {
        props.inputRef.current = inputRef.current;
    }
    const callAfterwards = useCallAfterwards();

    useAutoFocus(inputRef, {autoFocus, disabled, readOnly});

    const set = useSet(value, props);
    const [curr, setCurr] = useState(value);
    const [edit, setEdit] = useState(false);

    const isFloat = number && (decimals && decimals > 0);
    const cls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius'];
    addPaddingCls(cls, padded, 'input');
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

    const hDimAttr = getDimHAttr(props);
    if (!hDimAttr.width && !hDimAttr.maxWidth && hDimAttr.maxWidth !== false) {
        hDimAttr.maxWidth = number ? 80 : 200;
    }
    if (hDimAttr.width || (props.full && props.full !== 'v')) {
        cls.push('full-h');
    }
    const attr = {
        value: edit ? curr : value,
        style: {
            minWidth: hDimAttr.minWidth,
            maxWidth: hDimAttr.maxWidth
        },
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
            callAfterwards(fContext.markInvalid)
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
        const decimalPart = isFloat ? decimals /* + 1 */ : 0;
        if (min !== undefined) {
            maxLen = Math.max(maxLen, ('' + Math.abs(round(min))).length + decimalPart);
        }
        if (max !== undefined) {
            maxLen = Math.max(maxLen, ('' + Math.abs(round(max))).length + decimalPart);
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

    // TODO improve with key/click-Locking
    let onKeyDown = null;
    if (onClick) {
        attr.style.cursor = 'pointer';
        attr.readOnly = true;
        onKeyDown = e => {
            if (e.key === ' ') {
                onClick();
                e.preventDefault()
            }
        }
    }
    let input = (
        <Block center="v" { ...hDimAttr } onKeyDown={onKeyDown} onClick={onClick}>
            <input ref={inputRef} type="text" { ...attr } className={cls.join(' ')} />
        </Block>
    );

    if (clear && !readOnly) {
        input =
            <Stack { ...hDimAttr } gaps="1">
                {input}
                <Button vertical full="v" iconProps={iconPropsInputButton} icon="clear" centerItems disabled={disabled || value === ''} tab={!(disabled || value === '')} onClick={onClear ? onClear : () => set('')} />
            </Stack>
    }
    return (
        <ComponentWithName name={name} { ...floatProps }>
            {input}
        </ComponentWithName>
    )
}

function VirtualNumber({ value, set, min = 0, max, decimals, virtualMin = 0, virtualMax = 100, rangeDecimals, ...props }) {
    const callAfterwards = useCallAfterwards();
    const valueDist = Math.abs(max - min);
    const virtualDist = Math.abs(virtualMax - virtualMin);
    const lastValueRef = useRef(value);

    const value2virtual = round(virtualMin + (valueDist ? (value - min) * virtualDist / valueDist : 0), rangeDecimals);
    const [ virtual, setVirtualRaw ] = useState(value2virtual);

    const setVirtual = newVirtual => {
        const newValue = round(min + (virtualDist ? (newVirtual - virtualMin) * valueDist / virtualDist : 0), decimals);
        if (value !== newValue) {
            lastValueRef.current = newValue;
            set(newValue);
        }
        setVirtualRaw(newVirtual)
    };
    if (value !== lastValueRef.current) {
        callAfterwards(setVirtualRaw, value2virtual);
        lastValueRef.current = value;
    }
    return (
        <Number value={virtual} set={setVirtual} min={virtualMin} max={virtualMax}
            decimals={rangeDecimals} { ...props }
        />
    )
}

const numberIconProps = {width: 13, center: true, size: 8};

function Number({ name, disabled, value, size, min, max, step,
                    autoFocus, slider = true, decimals = 0, readOnly, buttons = true, tab = true, railProps, gradient, floatProps = {}, ...props }) {
    const wContext = useContext(WindowContext);

    const set = useSet(value, props);
    const divRef = useRef(null);
    const slideRef = useRef(null);
    const inputRef = useRef(null);

    const [ dim, setDim ] = useState(null);
    const [ sliding, setSliding ] = useState(false);
    slideRef.current = { sliding, dim };

    const dimProps = getDimHAttr(props);

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

    const fullSlider = hasRange && slider === 'h';

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
            blurActive()
        };
        const stopSliding = () => {
            setSliding(false);
        };
        items.push(
            <Button key={1} vertical center="v" full="v" centerItems radius iconProps={iconPropsInputButton} disabled={disabled || (min === max && min !== undefined)} onClick={startSliding} onClickEnd={stopSliding} cursor="row-resize" icon="height" tab={false} />
        );
    }
    const inputCls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius input-padding'];
    if (!(readOnly || disabled)) {
        inputCls.push('hover-change');
    }
    items.push(
        <Input
            key={2} number className={inputCls.join(' ')} tab={tab} readOnly={readOnly} disabled={disabled} autoFocus={autoFocus}
            decimals={decimals} step={step} max={max} min={min} size={size}
            value={value} set={set} inputRef={inputRef} { ...dimProps }
            full={fullSlider ? false : dimProps.full}
        />
    );
    if (buttons) {
        items.push(
            <div key={3} className="center-v parent block">
                <Block height="50%">
                    <Button vertical help="Increase" center="v" full="v" centerItems key={4} iconProps={numberIconProps} disabled={disabled || max === value} onClick={() => {set(stepHandler.getStepUp(value)); blurActive()}} padded={false} tab={false} icon="expand_less" />
                </Block>
                <Block height="50%">
                    <Button vertical help="Decrease" center="v" full="v" centerItems key={3} iconProps={numberIconProps} disabled={disabled || min === value} onClick={() => {set(stepHandler.getStepDown(value)); blurActive()}} padded={false} tab={false} icon="expand_more" />
                </Block>
            </div>
        );
    }
    let elem = items.length === 1 ? items[0] : <Stack gaps="1" full={dimProps.full}>{items}</Stack>;

    if (fullSlider) {
        elem = (
            <Stack full="h" gaps>
                <Slider key={1} tab={false} focusRef={inputRef} full="h" disabled={disabled} railProps={railProps} readOnly={readOnly} value={value} decimals={decimals} min={min} max={max} set={set}>{gradient}</Slider>
                <Block center="v">{elem}</Block>
            </Stack>
        )
    }

    let setDimOnClick = null;
    if ((buttons || slider) || !(readOnly || disabled)) {
        setDimOnClick = () => {
            if (!slideRef.current.dim) {
                const rect = divRef.current.getBoundingClientRect();
                setDim(rect);
            }
        }

        const attr = {};
        if (dim) {
            const currLevel = wContext.getModalLevel();
            attr.style = {
                top: dim.top,
                left: dim.left,
                width: dim.width,
                height: dim.height,
                zIndex: 2000000
            };
            attr.onMouseLeave = () => {
                if (wContext.getModalLevel() !== currLevel || !wContext.isInExclusiveMode()) {
                    setDim(null);
                    return;
                }
                window.addEventListener('mouseup', e => {
                    if (!isEventInRect(e, dim)) {
                        setDim(null)
                    }
                }, {once: true});
            }
            attr.className = 'fixed';
        } else {
            attr.className = props.full && props.full !== 'v' ? null : 'min-content-h';
        }
        elem = (
            <Block full={dimProps.full} onLeftClick={setDimOnClick} ref={divRef} width={dim ? dim.width : null} height={dim ? dim.height : null}>
                <div { ...attr }>
                    {elem}
                </div>
            </Block>
        );
    }
    return (
        <ComponentWithName name={name} { ...floatProps }>
            {elem}
        </ComponentWithName>
    )
}

function Tuple({ name, x, setX, y, setY, undo, min, max, buttons, slider, tab = true, size, step, readOnly, disabled, autoFocus, full, wrap, center, ...props }) {
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
    const cls = [];
    if (wrap) {
        cls.push('wrap full-h flow-padding-gaps')
    }
    return (
        <Stack {...attr} gaps="1" center={center} className={cls.join(' ')}>
            <Number {...xAttr} />
            <Block center="v"><Icon name="clear" className="less" size={12} /></Block>
            <Number {...yAttr} />
        </Stack>
    );
}

function Select({ name, value, disabled, options, readOnly, padded = '1', buttons = true, tab = true, floatProps = {}, ...props }) {

    const fContext = useContext(FormContext);
    const callAfterwards = useCallAfterwards();

    const cls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius'];
    addPaddingCls(cls, padded, 'input');
    const optionHandler = getOptionHandler(options, value);
    if (readOnly) {
        buttons = false;
    }
    if (optionHandler.id === null) {
        cls.push('invalid');
        if (fContext) {
            callAfterwards(fContext.markInvalid)
        }
    }
    const set = useSet(value, props);

    const items = [];
    if (buttons) {
        items.push(
            <Button
                vertical full="v" key={0} disabled={disabled || options.length < 2}
                centerItems iconProps={iconPropsInputButton}
                tab={false} icon={'navigate_before'}
                onClick={
                    () => {
                        const id = optionHandler.getPrevId();
                        if (id !== null) set(id);
                    }
                }
            />
        );
    };
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
    const { stackAttr, dimAttr, flexCls } = getStackAndDimHAttr(props, {min: 100, max: 250});
    stackAttr.gaps = '1';
    if (flexCls) {
        cls.push(flexCls);
    }
    if (!(readOnly || disabled)) {
        cls.push('hover-change');
    }
    attr.className = cls.join(' ');
    items.push(
        <Block key={1} center="v" { ...dimAttr }>
            {readOnly ?
                <input onFocus={e => e.target.blur()} tabIndex={-1} value={optionHandler.name} readOnly={true} className={cls.join(' ') + " full-h"} /> :
                <select
                    key={1}
                    value={value}
                    disabled={disabled}
                    onChange={
                        e => {set(optionHandler.intIds ? parseInt(e.target.value, 10) : e.target.value)}
                    }
                    { ...attr }
                >
                    {options.map(
                        item =>
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                    )}
                </select>
            }
        </Block>
    );
    if (buttons) {
        items.push(
            <Button
                vertical full="v" key={2} disabled={disabled || options.length < 2}
                centerItems iconProps={iconPropsInputButton}
                tab={false}
                icon={'navigate_next'}
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
        <ComponentWithName name={name} { ...floatProps }>
            <Stack { ...stackAttr }>{items}</Stack>
        </ComponentWithName>
    )
}

function TextArea({ name, value, autoFocus, resize, floatProps = {}, padded = 'h', copy, readOnly, disabled, rows, cols, wrap, tab = true, required, match, className, ...props }) {
    const fContext = useContext(FormContext);
    const wContext = useContext(WindowContext);

    const callAfterwards = useCallAfterwards();
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
    if (!style.width && !style.minWidth && style.minWidth !== false) {
        dimAttr.minWidth = 60;
        style.minWidth = 60
    }
    if (!style.height && !style.minHeight && style.minHeight !== false) {
        dimAttr.minHeight = 20;
        style.minHeight = 20
    }
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
    const cls = ['input-color input-bg input-border-color input-border-style input-border-width input-border-radius'];
    addPaddingCls(cls, padded, 'input');
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
            callAfterwards(fContext.markInvalid);
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
        <ComponentWithName name={name} center={false} { ...floatProps }>
            <Block { ...dimAttr }><textarea
                className={cls.join(' ')}
                { ...attr }
            ></textarea></Block>
        </ComponentWithName>
    )
}

function Color({ name, value, set, readOnly, disabled, alpha, tab = true, floatProps = {} }) {
    const fContext = useContext(FormContext);
    const wContext = useContext(WindowContext);

    const callAfterwards = useCallAfterwards();
    const colorRef = useRef(null);
    const [ clicked, setClicked ] = useState(false);

    const { openColorPickerModal, ColorPickerModal } = useColorPickerModal();

    colorRef.current = value;

    const tooltip = useTooltip({title: value, clicked});

    const invalid = typeof value !== 'string' || !value.match(alpha ?/^#[0-9a-f]{8}$/i : /^#[0-9a-f]{6}$/i);
    if (invalid && fContext) {
        callAfterwards(fContext.markInvalid);
    }

    const btnCls = 'button-border-1';
    const cls = ['button-bg ' + btnCls, 'color-input-padding button-border-color border-outset'];
    const innerCls = ['secondary-bg ' + btnCls, ' button-border-color border-inset'];
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
        if (invalid) {
            colorRef.current = '#000000' + (alpha ? '00' : '');
        }
        wContext.startExclusiveMode('pick-color', 'pointer');
        wContext.addEventListener(upEvent, () => {
            wContext.endExclusiveMode('pick-color');
            setClicked(false)
        }, {once: true});
        openColorPickerModal({
            value: colorRef,
            alpha,
            set
        });
        setClicked(true);
        if (invalid) set(colorRef.current);
    };
    const width = 30;
    const height = 13;
    return (
        <ComponentWithName name={name} { ...floatProps }>
            <Block className={cls.join(' ')} cursor={readOnly ? false : "pointer"} tab={tab}
                   { ...tooltip.attr }
                   onLeftClick={readOnly ? null : () => handleClick('mouseup')}
                   onRightClick={readOnly ? null : () => copy2clipboard(value)}
                   onKeyDown={readOnly ? null : e => {
                       if (e.keyCode !== 32 || clicked) {
                           return
                       }
                       e.preventDefault();
                       handleClick('keyup')
                   }}>
                <Block className={innerCls.join(' ')}>
                    {invalid ?
                        <Block width={width} height={height} className="invalid" /> :
                        <ColorBox color={value} width={width} height={height} />
                    }
                </Block>
                {tooltip.render}
            </Block>
            {ColorPickerModal}
        </ComponentWithName>
    )
}

const MAX_H = 360;
const MAX_S = 255;
const MAX_V = 255;

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

const getHueIndex = (maxIndex, varIndex, diff) => {
    let dist = Math.round(diff / H_FACTOR);
    if (maxIndex === 0) {
        return varIndex === 2 ? 5 * H_SEG - 1 + dist : H_SEG - dist;
    } else if (maxIndex === 1) {
        return varIndex === 0 ? H_SEG - 1 + dist : 2 * H_SEG - 1 + (H_SEG - dist);
    }
    return varIndex !== 0 ? 3 * H_SEG - 1 + dist : 4 * H_SEG - 1 + (H_SEG - dist);
}

const colSortValueDesc = (a, b) => a.v === b.v ? 0 : (a.v > b.v ? -1 : 1);
const colSortIndexAsc = (a, b) => a.i === b.i ? 0 : (a.i < b.i ? -1 : 1);

const hsv2rgb = (h, s, v) => {
    const b = getHueRgb(h);
    const sorted = [ ...b ].sort(colSortValueDesc);
    const b2 = Math.round(sorted[1].v / 255 * s);

    sorted[0].n = Math.round(s);
    sorted[2].n = Math.round(s / 255 * v);
    sorted[1].n = Math.round((s - b2) / 255 * v + b2);

    sorted.sort(colSortIndexAsc);
    //        ( S / 255 * V  ,   S,   (255 - B2) / 255 * V + B2 )
    //        C3            C1            C2

    let rgb = '#';
    for (let item of sorted) {
        rgb += (item.n).toString(16).padStart(2, '0')
    }
    return rgb;
}

const rgb2hsv = rgb => {
    const sorted = [
        {i: 0, v: parseInt(rgb.substr(1, 2), 16)},
        {i: 1, v: parseInt(rgb.substr(3, 2), 16)},
        {i: 2, v: parseInt(rgb.substr(5, 2), 16)}
    ].sort(colSortValueDesc);
    return {
        s: sorted[0].v,
        v: sorted[2].v,
        h: getHueIndex(sorted[0].i, sorted[1].i, sorted[0].v - sorted[1].v)
    };
}

const COLOR_MODEL = {
    RGB: 'RGB',
    HSV: 'HSV'
}

function useColorPickerModal() {
    const PickerModal = useModal();
    return useMemo(
        () => {
            return {
                openColorPickerModal: props => PickerModal.open({id: 'ColorPickerModal', close: PickerModal.close, ...props }),
                ColorPickerModal: <PickerModal.content name="Change color" drag transparent>
                    <BackgroundCtx>
                        <EditorCtx>
                            <ColorPicker { ...PickerModal.props } />
                        </EditorCtx>
                    </BackgroundCtx>
                </PickerModal.content>
            }
        },
        [PickerModal.props]
    );
}

/**
 * TODO
 *  - BUGFIX: korrekte Umrechnung

 *  - Positionierung nahe ColorBox
 *  - CHECK: modal-cancel reset
 */
function ColorPicker({ value, set, alpha, close }) {

    const wContext = useContext(WindowContext);
    const PickerModal = useModal();

    const [ before ] = useState(value.current);
    const [ showingBefore, setShowingBefore ] = useState(false);
    const afterRef = useState(null);

    const rgb = hex2rgb(value.current);
    const update = useComponentUpdate();

    const [ colorModel, setColorModel ] = useCachedState('global','lastColorModel', COLOR_MODEL.RGB);
    const gradientsRef = useRef({colors: {}});

    const hsv = rgb2hsv(value.current);

    const [ h, setH ] = useState(hsv.h);
    const [ s, setS ] = useState(hsv.s);
    const [ v, setV ] = useState(hsv.v);

    const alphaHex = alpha ? value.current.substr(7, 2) : '';
    const propsRef = useRef(null);
    propsRef.current = { h, s, v, alphaHex, showingBefore };

    const hueSelectorCanvas = wContext.getHueColorsCanvas();
    const colorMaskCanvas = wContext.getHueMaskCanvas();

    useEffect(() => {
        return () => {
            wContext.addLastColor(value.current);
        }
    }, []);

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
            setAndSync(newValue)
        }
    };

    const setAndSync = newValue => {
        const hsv = rgb2hsv(newValue);
        set(newValue);
        setH(hsv.h);
        setS(hsv.s);
        setV(hsv.v);
        requestAnimationFrame(update)
    }

    const renderSquare = ctx => {
        ctx.fillStyle =
            hsv2rgb(h, 255, 0);
        ctx.fillRect(0, 0, 192, 192);
        ctx.drawImage(colorMaskCanvas, 0, 0, 192, 192);
    };

    const renderHue = ctx => {
        ctx.drawImage(hueSelectorCanvas, 0, 0, hueSelectorCanvas.width, hueSelectorCanvas.height)
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
        setAndSync(color);
        PickerModal.close();
    }

    const setColorFromEntityPicker = index => {
        let color = wContext.lastColorsIndex.getEntityValue(index);
        if (alpha) {
            color += value.current.substr(7)
        }
        setAndSync(color);
    }

    const undoOp = {
        exec: () => {set(before); requestAnimationFrame(update)},
        can: () => showingBefore || value.current !== before
    };
    const showBeforeOp = {
        exec: () => {
            afterRef.current = value.current;
            setShowingBefore(true);
            setAndSync(before);
        },
        can: () => showingBefore || value.current !== before
    };
    const showBeforeEnd = () => {
        setAndSync(afterRef.current);
        setShowingBefore(false);
    };

    const gradients = gradientsRef.current;
    const updateGradient = (id, colors) => {
        const curr = gradients.colors[id];
        if (!curr || curr !== colors) {
            gradients.colors[id] = colors;
            gradients[id] = <Gradient colors={colors} />
        }
    }

    alpha && updateGradient(
        'alpha',
        value.current.substr(0, 7) + '00 ' + value.current.substr(0, 7) + 'FF'
    );
    if (colorModel === COLOR_MODEL.RGB || !gradients.red) {
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
    if (colorModel === COLOR_MODEL.HSV || !gradients.hue) {
        const hueColors = [
            '#FF0000', '#FFFF00', '#00FF00', '#00FFFF',
            '#0000FF', '#FF00FF', '#FF0001'
        ];
        updateGradient(
            'hue',
            hueColors.join(alphaHex + ' ') + alphaHex
        );
        updateGradient(
            's',
            hsv2rgb(h, 0, v) + alphaHex + ' ' +
            hsv2rgb(h, 255, v) + alphaHex
        );
        updateGradient(
            'v',
            hsv2rgb(h, s, 0) + alphaHex + ' ' +
            hsv2rgb(h, s, 255) + alphaHex
        )
    }

    const syncColor2Hsv = () => {
        requestAnimationFrame(() => {
            const newHsv = propsRef.current;
            set(hsv2rgb(newHsv.h, newHsv.s, newHsv.v) + newHsv.alphaHex);
            requestAnimationFrame(update);
        });
    }
    const setHsvH = newH => {
        setH(newH);
        syncColor2Hsv()
    }
    const setHsvS = newS => {
        setS(newS);
        syncColor2Hsv()
    }
    const setHsvV = newV => {
        setV(newV);
        syncColor2Hsv()
    }
    const setHsvSV = (newS, newV) => {
        setV(newV);
        setS(newS);
        syncColor2Hsv()
    }

    const invertColor = () => {
        const rgb = hex2rgb(value.current.substr(0, 7));
        rgb.r = 255 - rgb.r;
        rgb.g = 255 - rgb.g;
        rgb.b = 255 - rgb.b;
        setAndSync(rgb2hex(rgb) + propsRef.current.alphaHex);
    }
    const handleEsc = e => {
        if (e.key === 'Escape') {
            set(before);
            requestAnimationFrame(close);
            e.stopPropagation();
            e.preventDefault()
        }
    };

    return (
        <Form submit={close} onKeyDown={handleEsc}>
        <Stack vertical borders height={260}>
            <Stack borders full>
                <Stack vertical borders width={310} full="v">
                    <Stack gaps padded full="h">
                        <ColorBox className="thin-boxed" color={value.current} width={35} height={26} />
                        <Block center="v"><Input name="#" match={isValid} force className="autofocus" value={value.current.substring(1)} set={value => {set('#' + value); requestAnimationFrame(() => update())}} max={len} /></Block>
                        <Stack center="v" gaps>
                            <Button icon="colorize" onClick={() => PickerModal.open({})} />
                            <Button icon="invert_colors" onClick={invertColor} />
                            <Button icon="undo" onClick={undoOp} />
                            <Button icon="visibility" onClick={showBeforeOp} onClickEnd={showBeforeEnd} />
                        </Stack>
                        <ColorBox className="thin-boxed" color={hsv2rgb(h, s, v)} width={35} height={26} />
                    </Stack>

                    <Block full>
                        <SideTabs active={colorModel} setActive={setColorModel} icon={false} full>
                            <SideTab full name="RGB">
                                {colorModel === COLOR_MODEL.RGB &&
                                    <Block full="h">
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
                                {colorModel === COLOR_MODEL.HSV &&
                                    <Block full="h">
                                        <PropertyGrid>
                                            <VirtualNumberProp name="H" full="h" gradient={gradients.hue} virtualMax={359}
                                                       railProps={railProps} value={h} set={setHsvH} min={0} max={MAX_H - 1}
                                                       slider="h" size={4} />
                                            <VirtualNumberProp name="S" full="h" gradient={gradients.s} railProps={railProps}
                                                       value={s} rangeDecimals={1} set={setHsvS} min={0} max={255}
                                                       slider="h" size={4} />
                                            <VirtualNumberProp name="V" full="h" gradient={gradients.v} railProps={railProps}
                                                       value={v} rangeDecimals={1} set={setHsvV} min={0} max={255}
                                                       slider="h" size={4} />
                                            {alpha &&
                                                <VirtualNumberProp name="A" gradient={gradients.alpha} railProps={railProps} full="h"
                                                           value={rgb.a} set={setByte(3)} min={0} max={255} slider="h" size={4} />
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
                        <CanvasCircleMarker
                            size={7} rangeX={256} rangeY={256}
                             x={255 - v} setX={value => setHsvV(255 - value)}
                             y={255 - s} setY={value => setHsvS(255 - value)}
                             setXY={(newX, newY) => setHsvSV(255 - newY, 255 - newX)}
                        >
                            <Canvas width={192} height={192} render={renderSquare} plain />
                        </CanvasCircleMarker>

                        <Slider vertical tab
                                sledProps={{margin: 10, short: 10, long: 14, radius: true}}
                                railProps={{size: 192, oppSize: 12, center: false, radius: false}}
                                min={0} max={MAX_H - 1} value={h} set={setHsvH}
                                getIndicator={renderIndicator}
                        >
                            <Canvas width={12} height={192} render={renderHue} />
                        </Slider>
                    </Stack>
                </Block>

            </Stack>

            <Stack gaps full="h">
                <Block padded width={150}>
                    <Select full="h" buttons tab options={[{id: 'last used', name: 'Last used'}]} value="last used"  />
                </Block>
                <Block full>
                    <EntityPicker centerItems={false} entityIndex={wContext.lastColorsIndex} select={setColorFromEntityPicker} border={1} rulers={false} />
                </Block>
            </Stack>

        </Stack>
            <PickerModal.content name="Pick a color..." full>
                <BitmapSelector type={alpha ? 'rgba' : 'rgb'} save={setColorFromPicker} close={PickerModal.close} selection={{type: 'rect', width: 1, height: 1, fixed: true}} />
            </PickerModal.content>
        </Form>
    )
}

function Bitmap({ value, set, colors, empty, zoomOrAvail = 1, entityIndex }) {
    const { EditBitmapModal, openEditBitmapModal, closeEditBitmapModal } = useEditBitmapModal();
    const CopyBitmapModal = useModal();
    const { BitmapSelectionModal, openBitmapSelectionModal, closeBitmapSelectionModal } = useBitmapSelectionModal('Select image...');

    const editBitmap = () => {
        openEditBitmapModal({
            image: value,
            colors,
            save: newImage => {
                set(newImage);
                closeEditBitmapModal()
            }
        });
    };

    const importBitmap = () => {
        const selected = image => {
            set(image);
            closeBitmapSelectionModal()
        };
        openBitmapSelectionModal({
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

            {EditBitmapModal}

            {BitmapSelectionModal}

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
        railProps = {}, sledProps = {}, getIndicator, borders, focusRef, children }) {

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
            setClicked(false);
            if (focusRef && focusRef.current) {
                focusRef.current.focus();
            }
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
    const callAfterwards = useCallAfterwards();

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
    if (required && fContext) {
        callAfterwards(fContext.markInvalid)
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

function LabelProp({ name, labelProps, inputPadding = true, bottomPadding = true, children }) {
    let leftPadding = DIR.H;
    let rightPadding = DIR.RIGHT;
    if (bottomPadding) {
        leftPadding |= DIR.BOTTOM;
        rightPadding |= DIR.BOTTOM
    }
    const innerCls = [];
    if (inputPadding) {
        innerCls.push('input-padding-1-v');
    }
    return (
        <>
            <Block padded={leftPadding} className="small-font" { ...labelProps }>
                <Block className={innerCls.join(' ')}>
                    {name}
                </Block>
            </Block>
            <Block full="h" padded={rightPadding}>
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

function TupleProp({ name, wrap, ...props }) {
    return (
        <LabelProp name={name} bottomPadding={!wrap}>
            <Tuple wrap={wrap} {...props} />
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

function VirtualNumberProp({ name, ...props }) {
    return (
        <LabelProp name={name}>
            <VirtualNumber {...props} />
        </LabelProp>
    )
}

function CheckboxProp({ name, ...props }) {
    return (
        <LabelProp name={name} inputPadding={false}>
            <Checkbox {...props} />
        </LabelProp>
    )
}

function FullProp({ name, children}) {
    return (
        <>
            {name && <Block padded={DIR.H|DIR.BOTTOM} full="h" className="small-font col-span-2">{name}</Block>}
            <Block padded={DIR.H|DIR.BOTTOM} full="h" className="col-span-2">
                {children}
            </Block>
        </>
    )
}

function PropSection({ name }) {
    return (
        <FullProp>
            <Block full="h" border={DIR.BOTTOM}>
                <Block className="more" full="h">{name}</Block>
            </Block>
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
    VirtualNumber,
    VirtualNumberProp,
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