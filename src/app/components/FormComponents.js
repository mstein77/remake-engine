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
    Icon,
    AvailContextProvider,
    useFocusKeyBindings,
    useRefocus,
    useMounted,
    useComponentUpdate, AvailContext
} from "./BasicComponents";
import { EntityPicker } from "./EntityComponents";
import { BitmapSelector, BitmapEditor } from "./EditorComponents";

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

function Checkbox2({ name, value, set, rev, size = 14, readOnly, disabled, tab = true, ...props }) {
    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);

    const cls = ['button-bg button-color button-border-width button-border-radius button-border-style button-border-color'];
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
 * Checkbox
 *
 * STRUCTURES:
 *
 *  A) icon and no name
 *
 *     <Button icon="checkbox" />
 *
 *  B) icon and name (optional rev for reverse)
 *
 *     <Stack gaps h.*>
 *         <Button icon="checkbox" />
 *         <Block full="h" center="v" shorten>{name}</Block>
 *     </Stack>
 *
 * Behaviour
 *  - name should be centered vertically
 *  - checkbox elem should be min-width and name element flex-width with shortening
 *  - abs- or rel-width should only be applied to stack
 *  - full-vertical should be ignored
 *  - stack should be min-width by default
 *
 * Features:
 *  - readOnly (no change)
 *  - disabled (no change and opacity)
 *  - tabbed
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

function useStatePrefix(state, def = null) {
    if (state) {
        if (state === 1) {
            return 'active'
        }
        if (state === 2) {
            return 'error'
        }
    }
    return def
}

/**
 * - Focus-Keys
 */
function Handle({ axis = true, circle, cursor = 'grab', onMove, onMoveEnd, onDirKey, tab, className, children, ...props }) {
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
        cls.push('button-bg button-border-width button-border-style button-border-color button-border-radius hover-change');
    }
    if (clicked) {
        cls.push('clicked');
    }
    if (tab) {
        cls.push('focus-box');
    }
    const onLeftClick = !onMove ? null : e => {
        wContext.startExclusiveMode('handle-move', cursor === 'grab' ? 'grabbing' : cursor);
        setClicked(true);
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('handle-move');
            setClicked(false);
            if (onMoveEnd) {
                onMoveEnd()
            }
        }, {once: true});

        const anchor = {x: e.clientX, y: e.clientY};
        wContext.addEventListener('mousemove', e => {
            onMove(e.clientX - anchor.x, e.clientY - anchor.y);
        })
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
function Button2({ icon, name, full, state, iconProps = {}, end, center, value, current, rev, disabled, onClick, onClickEnd,
                     tab = true, cursor = 'pointer', gaps = true, border = true, padded, vertical, children, ...props }) {
    const wContext = useContext(WindowContext);

    const [ clicked, setClicked ] = useState(false);

    const statePrefix = (value === undefined || value !== current) ? useStatePrefix(state, 'button') : 'active';
    const cls = [statePrefix + '-bg', statePrefix + '-color'];

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
    if (border) {
        cls.push(statePrefix + '-border-color');
        cls.push('button-border-width button-border-style button-border-radius')
    }
    if (padded) {
        cls.push('button-padding');
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
        const handleClick = upEvent => {
            setClicked(true);
            wContext.startExclusiveMode('button-click', upEvent === 'mouseup' ? cursor : false);
            onClick(value);
            wContext.addEventListener(upEvent, () => {
                wContext.endExclusiveMode('button-click');
                setClicked(false);
                if (onClickEnd) {
                    onClickEnd()
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
        attr.onLeftClick = () => {
            handleClick('mouseup')
        }
    }
    if (full && full !== oppDir) {
        attr.full = dir
    }
    const hasStack = items.length > 1;
    const fullStack = !(end || center) ? dir : false;
    if (!hasStack && !fullStack) {
        items[0] = <Block key="e" end={end} center={center}>{items[0]}</Block>;
    }
    return (
        <Block gaps tab={tab} className={cls.join(' ')} cursor={cursor} { ...attr }>
            {!hasStack ?
                items[0] :
                <Stack key="s" gaps={gaps} center={center} end={end} vertical={vertical} full={fullStack}>
                    {items}
                </Stack>
            }
        </Block>
    )
}


/**
 * Button
 *
 * STRUCTURES:
 *
 *  A) icon and no name
 *
 *    <Block>
 *       <Icon name={icon} />
 *    </Block>
 *
 *  B) name and no icon
 *
 *    <Block>
 *       <Block center={oppDir} shorten full={dir}>{name}</Block>
 *    </Block>
 *
 *  C) icon and name
 *
 *    <Block>
 *       <Stack vertical={vert?} gaps full="h">
 *          <Icon name={icon} />
 *          <Block center={oppDir} shorten full={dir}>{name}</Block>
 *       </Stack>
 *    </Block>
 *
 * VARIANTS:
 *  - simple click button:
 *      button-bg / button-color / button-border / button-radius
 *      onLeftClick: sets clicked until release and invokes handler (without event?)
 *      cursor: pointer
 *      keys: space
 *
 *  - radio button
 *      (active|button)-bg / (active|button-)color / border / radius
 *      onLeftClick: sets clicked until release and invokes handler (with activation-value)
 *      shows active-state if current-value = activation-value
 *      cursor: pointer
 *      keys: space / arrows
 *
 *  - state button
 *      (active|button|error)-bg / (active|button|error)-color / border /radius
 *      cursor: pointer
 *      keys: space
 *
 *      "Before"
 *        => Click: state = 'active'
 *        => endClick: state = 'default'
 *
 *      "Copy2Clipboard"
 *        => Click: export().then(state = 'active').catch(state = 'error')
 *        => endClick: state = 'default'
 *
 *  - suffix button
 *      ...simple/state button but with a suffix-text, normally combined with full-dir and
 *      shortening and full on the text elem part
 *
 *  - checkbox button
 *      cursor: pointer
 *      keys: space
 *
 *  - normal slider button
 *      button-bg / border / radius(?)
 *      onLeftClick: MOVE-DIR
 *      cursor: grab(bing)
 *      keys: arrows / shift
 *
 *  - plain slider button
 *      button-bg / border
 *      onLeftClick: MOVE-DIR
 *      cursor: grab(bing)
 *      keys: arrows / shift
 *
 *  - position button
 *      transparent-bg / fix-white-round-border
 *      onLeftClick: MOVE
 *      cursor: grab(bing)
 *      keys: arrows / shift
 *
 */
function Button({ name, icon, rotate, current, vertical, value, disabled, warning, iconWidth, iconHeight, iconCls, onClick, onClickEnd, direct, rev, size = 18, cursor = 'default', padded = (name ? true : false), tab = true, border = "1", className, ...props }) {
    const wContext = useContext(WindowContext);

    const mounted = useMounted();
    const focusRef = useRef(null);

    const [ clicked, setClicked ] = useState(false);

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
            tab = (value === true);
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
        items.push(
            <Icon name={icon} width={iconWidth} className={iconCls} height={iconHeight} size={size} rotate={rotate} />
        )
    }
    if (name) {
        items.push(
            <Block center={vertical ? 'h' : 'v'} shorten full={vertical ? 'v' : 'h'} key={2}>{name}</Block>
        );
    }
    if (rev) {
        items.reverse()
    }
    if (clicked) {
        cls.push('clicked');
    }
    if (warning) {
        cls.push('invalid-highlight');
    } else if ((name || border)) {
        cls.push(active ? 'active-bg' : 'control-bg');
    }
    const text = items.length === 1 ? items[0] : <Stack vertical={vertical} gaps full="h">{items}</Stack>;

    attr.onFocus = e => {
        if (tab && !(disabled || readOnly)) {
            e.target.focus();
        } else {
            e.target.blur();
        }
    };

    if (!(disabled || readOnly) && onClick && !clicked) {
        const handleClick = (endEvent, directEvent = false) => {
            wContext.startExclusiveMode('button-click', cursor === 'grab' ? 'grabbing' : cursor);
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
                wContext.endExclusiveMode('button-click');
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
        attr.onLeftClick = e => {
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
            <Block key={1} full="h" padded="h" center="v">
                <Slider key={1} tab={false} end disabled={disabled} readOnly={readOnly} value={value} decimals={decimals} min={min} max={max} set={set} />
            </Block>
        )
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
    let elem = items.length === 1 ? items[0] : <Stack full={props.full}>{items}</Stack>;

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
    const cls = ['input'];
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

function ColorBox({color, width, height, className}) {
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

function ColorPicker({ value, set, alpha }) {
    const wContext = useContext(WindowContext);
    const PickerModal = useModal();

    const rgb = hex2rgb(value.current);
    const update = useComponentUpdate();

    const baseColorCanvas = wContext.getBaseColorCanvas();
    const colorMaskCanvas = wContext.getColorMaskCanvas();

    const [ baseColorIndex, setBaseColorIndexRaw ] = useState(0);
    const setBaseColorIndex = index => {
        setBaseColorIndexRaw(index);
        const ctx = baseColorCanvas.getContext('2d');
        const data = ctx.getImageData(0, index, 1, 1).data;
        setBaseColor(rgb2hex({r: data[0], g: data[1], b: data[2]}));
    };
    const [ baseColor, setBaseColor ] = useState('#FF0000');

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
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, 192, 192);
        ctx.drawImage(colorMaskCanvas, 0, 0, 192, 192);
    };

    const renderRainbow = ctx => {
        ctx.drawImage(baseColorCanvas, 0, 0, baseColorCanvas.width, baseColorCanvas.height)
    };

    const len = alpha ? 8 : 6;
    const isValid = hex => hex.length === len && hex.match(/^[a-fA-F0-9]+$/);

    return (
        <Stack borders>
            <Stack vertical borders width={280}>
                <Stack gaps padded>
                    <ColorBox className="thin-boxed" color={value.current} width={35} height={26} />
                    <Block center="v"><Input name="#" match={isValid} force className="autofocus" value={value.current.substring(1)} set={value => {set('#' + value); requestAnimationFrame(() => update())}} max={len} /></Block>
                    <Button icon="colorize" onClick={() => PickerModal.open({})} />
                </Stack>

                <Block padded full="h">
                    <PropertyGrid>
                        <NumberProp name="R" full="h" value={rgb.r} set={setByte(0)} min={0} max={255} slider="h" />
                        <NumberProp name="G" full="h" value={rgb.g} set={setByte(1)} min={0} max={255} slider="h" />
                        <NumberProp name="B" full="h" value={rgb.b} set={setByte(2)} min={0} max={255} slider="h" />
                        {alpha &&
                            <NumberProp name="A" full="h" value={rgb.a} set={setByte(3)} min={0} max={255} slider="h" />
                        }
                    </PropertyGrid>
                </Block>
            </Stack>

            <Block padded>
                <Stack gaps>

                    <CanvasHitRegion plain width={height} height={height} border render={renderSquare}
                        onHit={(x, y) => {
                            d('HIT', x, y);
                        }}
                    />

                    <Overlays width={baseColorCanvas.width + 11} height={height + 16}>
                        <Overlay top={5} width={baseColorCanvas.width} height={height + 16}>
                            <CanvasHitRegion
                                plain width={15} height={height}
                                onHit={(x, y) => {
                                    const posY = round(y - 2);
                                    setBaseColorIndex(posY);
                                }}
                                render={renderRainbow}
                            />
                        </Overlay>
                        <Overlay top={1 + baseColorIndex} left={7} width={10} height={10}><Block className="slider-arrow-left" /></Overlay>
                        <Overlay left={12} width={15} height={204} className="no-events"><Slider vertical plain min={0} max={191} value={baseColorIndex} set={setBaseColorIndex} /></Overlay>

                    </Overlays>
                </Stack>
            </Block>

            <PickerModal.content name="Pick a color..." full>
                <BitmapSelector save={() => d(666)} selection={{type: 'rect', width: 1, height: 1, fixed: true}} />
            </PickerModal.content>
        </Stack>
    )
}

function CanvasHitRegion({width, height, render, plain, onHit }) {
    const wContext = useContext(WindowContext);
    const blockRef = useRef(null);

    const onLeftClick = e => {
        const rect = blockRef.current.getBoundingClientRect();
        onHit(round(e.clientX - rect.x), round(e.clientY - rect.y));
        wContext.startExclusiveMode('set-hit', 'pointer');
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('set-hit')
        }, {once: true});
    };

    return (
        <Block ref={blockRef} onLeftClick={onLeftClick} cursor="pointer">
            <Canvas plain={plain} width={width} height={height} border="1" render={render} />
        </Block>
    )
}


function Color({ name, value, set, readOnly, disabled, full, alpha, tab = true, ...props }) {
    const wContext = useContext(WindowContext);
    const colorRef = useRef(null);
    colorRef.current = value;

    const openColorPicker = () => {
        wContext.openColorPickerModal({
            value: colorRef,
            test: value,
            alpha,
            set
        });
    };
    return (
        <ComponentWithName name={name} { ...props }>
            <Block className="button button-border" tab border="1" padded onLeftClick={openColorPicker}>
                <Block padded="1">
                    <ColorBox className="thin-boxed button-border" color={value} width={35} height={16} />
                </Block>
            </Block>
        </ComponentWithName>
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

const sliderHandleSize = 20;

function Slider({ vertical, center, size, end, maxSize = 250, minSize = 100, ...props }) {
    const axisKey = vertical ? 'height' : 'width';
    const oppAxisKey = vertical ? 'width' : 'height';

    const attr = {
        [oppAxisKey]: sliderHandleSize,
        ['min' + ucfirst(axisKey)]: minSize,
        ['max' + ucfirst(axisKey)]: maxSize
    };
    if (size) {
        attr[axisKey] = size
    } else {
        attr.full = vertical ? 'v' : 'h'
    }
    return (
        <Block center={center} end={end} { ...attr }>
            <AvailContextProvider>
                <SliderInner vertical={vertical} { ...props } />
            </AvailContextProvider>
        </Block>
    )
}

function SliderInner({ vertical, plain, min, max, disabled, decimals = 0, value, set, tab = true }) {
    const aContext = useContext(AvailContext);
    const wContext = useContext(WindowContext);

    const divRef = useRef(null);
    const propsRef = useRef(null);
    propsRef.current = value;

    const dirKey = vertical ? 'v' : 'h';

    const axisKey = vertical ? 'height' : 'width';
    const size = aContext[axisKey];

    const space = 8;
    const points = max - min;

    // take handle size (with borders) into account
    const pointDist = (size - 12) / points;

    const startOffset = value - min;
    const startDist = points === 0 ? size - 12 : startOffset * pointDist;

    const axis = vertical ? 'y' : 'x';
    const oppAxisKey = vertical ? 'width' : 'height';
    const client = 'client' + axis.toUpperCase();

    const dimMin = {
        [axisKey]: startDist,
        [oppAxisKey]: space
    };
    const dimMax = {
        [oppAxisKey]: space
    };

    const cls = ['relative overflow'];
    const dim = {
        [oppAxisKey]: sliderHandleSize,
        [axisKey]: size
    };

    const startSliding = disabled || points === 0 ? null : e => {
        const anchorPos = e[client];
        const anchorValue = value;
        let oldDist = 0;

        wContext.addEventListener('mousemove', e => {
            const dist = Math.round((e[client] - anchorPos) / pointDist);

            if (dist === oldDist) return;

            oldDist = dist;

            const newValue = round(clamp(min, anchorValue + dist, max), decimals);

            if (propsRef.current !== newValue) {
                set(newValue);
            }
        });
        e.stopPropagation();
        e.preventDefault();
    };

    const setPos = disabled || plain ? null : e => {
        wContext.startExclusiveMode('set-slider', 'pointer');
        wContext.addEventListener('mouseup', () => {
            wContext.endExclusiveMode('set-slider')
        }, {once: true});

        const rect = divRef.current.getBoundingClientRect();
        const dist = (e[client] - rect.x - 5);
        const newValue = round(clamp(min, min + dist / pointDist, max), decimals);
        if (propsRef.current !== newValue) {
            set(newValue);
        }
    };
    const handleStyle = {
        [vertical ? 'left' : 'top']: 0,
        [vertical ? 'top' : 'left']: startDist
    };

    const dir = vertical ? 'v' : 'h';
    const oppDir = vertical ? 'h' : 'v';

    if (disabled) {
        cls.push('disabled')
    }

    return (
        <Block full={dirKey} { ...dim } ref={divRef} className={cls.join(' ')}>
            <Stack full vertical={vertical} className={"slider-padding-" + dir}>
                <Block center={oppDir} cursor="pointer"  onMouseDown={setPos} {...dimMin} className={plain ? "transparent" : "slider-bg-less"} />
                <Block center={oppDir} full={dirKey} cursor="pointer" onMouseDown={setPos} className={plain ? "transparent" :"slider-bg-more"} {...dimMax} />
            </Stack>

            <div className="absolute all-events" style={handleStyle}>
                <Button name=" " cursor="grab" tab={tab} direct onClick={startSliding} className={"slider-handle-" + dir} />
            </div>
        </Block>
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
    const fContext = useContext(FormContext);

    const cls = [];
    if (invalid) {
        cls.push('invalid');
        if (fContext) {
            fContext.markInvalid()
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
    Submit,
    Number,
    NumberProp,
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
    PropSection,

    Checkbox2,
    Button2,
    Handle
}