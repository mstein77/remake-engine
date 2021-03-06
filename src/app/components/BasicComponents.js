import React, {useMemo, useEffect, useRef, useState, Fragment, useContext, useLayoutEffect} from "react";
import {d} from "../helper/helper"
import {Content, Stack, Grid, Overlays, Overlay} from "./LayoutComponents";
import ReactDOM from "react-dom";

const BackgroundContext = React.createContext();

function BackgroundCtx({ children }) {
    const [ color, setColor ] = useState('#A0A0A0');
    const [ opacity, setOpacity ] = useState(12);

    const value = {
        color,
        setColor,
        css: color + (Math.min(opacity * 10, 255)).toString(16).padStart(2, '0'),
        opacity,
        setOpacity
    };

    return (
        <BackgroundContext.Provider value={value}>
            {children}
        </BackgroundContext.Provider>
    )
}

function CanvasBackground() {
    const bContext = useContext(BackgroundContext);

    return (
        <div className="checkerboard-bg absolute full-h full-v">
            <div className="absolute full-h full-v" style={{backgroundColor: bContext.css}} />
        </div>
    )
}

function BackgroundControl() {
    const bContext = useContext(BackgroundContext);

    return (
        <>
            <Int name="Background:" min="0" max="26" set={bContext.setOpacity} value={bContext.opacity} buttons />
            <Color value={bContext.color} set={bContext.setColor} />
        </>
    )
}

function Canvas({ width, height, smoothing, render, plain, boxed, className }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current || !render) {
            return;
        }
        const ctx = canvasRef.current.getContext('2d');
        ctx.imageSmoothingEnabled = smoothing ? true : false;
        render(ctx);
    });

    if (height === 0 || width === 0) return '';

    const cls = ['relative content-box'];
    if (className) {
        cls.push(className);
    }
    if (boxed) {
        cls.push((boxed !== true ? 'thin-' : '') + 'boxed');
    }

    return (
        <div className={cls.join(' ')} style={{height, width}}>
            {!plain && <CanvasBackground />}
            <canvas className="absolute" width={width} height={height} ref={canvasRef} />
        </div>
    )
}

function Section({ name, children, rev, full, flex, collapse, ...props }) {
    const [ collapsed, setCollapsed ] = useState(props.collapsed === true);
    const contentRef = useRef(null);
    const { width, maxWidth, minWidth, ...contProps } = props;
    let dimProps = { width, maxWidth, minWidth };

    let contentElem = '';
    if (!collapsed) {
        contentElem = (
            <Content ref={contentRef} flex full={full} { ...contProps }>
                {children}
            </Content>
        );
    } else {
        if (collapse === 'h') {
            full = 'v';
            dimProps = {width: 'min-content'};
        }
        contentRef.current = null;
    }

    const toggleCollapse = () => {
        setCollapsed(!collapsed);
    };

    const hCollapsed = (collapse === 'h' && collapsed);
    const attr = {};
    let titleCls = '';
    if (!hCollapsed) {
        attr.height = 'min-content';
        attr.full = 'h';
    } else {
        attr.vertical = true;
        titleCls = 'text-vertical';
    }
    const items = [
        <Content key="c" shorten padded className={titleCls}>
            {name}
        </Content>
    ];
    if (collapse) {
        let dir = 'next';
        if (collapse === 'h') {
            dir = 'navigate_' + ((!rev && !collapsed) || (rev && collapsed) ? 'before' : 'next');
        } else {
            dir = 'expand_' + ((!rev && !collapsed) || (rev && collapsed) ? 'less' : 'more');
        }
        const button = <Content key="b" center><Button icon name={dir} click={toggleCollapse} /></Content>;

        if (!hCollapsed && rev) {
            items.push(button);
        } else {
            items.unshift(button);
        }
    }

    const topElem = (
        <Stack padded {...attr}>
            {items}
        </Stack>
    );

    if (collapsed && full) {
        if (full !== 'h') {
            full = 'h';
        }
    }
    if (collapse === 'h') {
        full = 'v'
    }

    return (
        <Stack vertical {...dimProps} flex={flex} border boxed full={full}>
            {topElem}
            {contentElem}
        </Stack>
    )
}

function Button({ name, icon, disabled, click }) {
    const cls = [];
    const bCls = [];
    if (disabled) {
        cls.push('less');
    } else {
        cls.push('hover-inverse');
    }
    let text = icon ? <i className="material-icons md-18">{name}</i> : name;

    if (!icon) {
        bCls.push('padded');
    }

    return (
        <Content className={cls.join(' ')} boxed={1}>
            <Content center click={click} className={bCls.join(' ')}>
                {text}
            </Content>
        </Content>
    )
}

function PropertyGrid({ propWidth = '-', valueWidth = '*', ...props }) {
    return (
        <Grid gap={5} columns={propWidth + " " + valueWidth} {...props} />
    );
}

function ValueProp({ name, children }) {
    return (
        <PropLabel name={name}>
            {children}
        </PropLabel>
    )
}

function PropLabel({ name, children }) {
    return (
        <>
            <Content shorten className="small-font">
                {name}
            </Content>
            <Content full="h">
                {children}
            </Content>
        </>
    )
}

function Color({ value, set }) {
    return (
        <Content>
            <input
                type="color"
                value={value}
                onChange={e => {set(e.target.value)}}
            />
        </Content>
    );
}

function Checkbox({ name, value, set, disabled }) {
    name = name ? <div className="small-font">{name}</div> : '';
    return (
        <Stack gap>
            <Content>{name}</Content>
            <Content>
                <input disabled={disabled} onChange={(e) => {
                set(e.target.checked);
            }} type="checkbox" checked={!!value} /></Content>
        </Stack>
    );
}

function IntField({ readOnly, name, size = 3, step = 1, value = 0, min, set, buttons, max }) {
    const attr = {};
    if (readOnly) {
        attr.readOnly = 'readOnly';
    }
    if (size) {
        attr.size = size;
    } else if (max !== undefined) {
        attr.size = ('' + max).length;
    } else {
        attr.size = 3;
    }
    attr.value = value;
    attr.type = 'text';
    attr.onChange = (e) => {
        set(e.target.value);
    };

    const incValue = e => {
        set(parseInt(value, 10) + step);
        e.stopPropagation();
    };

    const decValue = e => {
        set(parseInt(value, 10) - step);
        e.stopPropagation();
    };

    let buttonPrev = '';
    let buttonNext = '';
    if (buttons) {
        const nextAttr = {
            onClick: incValue
        };
        if (readOnly || (max !== undefined && parseInt(value, 10) + step > parseInt(max, 10))) {
            nextAttr.disabled = 'disabled';
        }
        const prevAttr = {
            onClick: decValue
        };
        if (readOnly || (min !== undefined && parseInt(value, 10) - step < parseInt(min, 10))) {
            prevAttr.disabled = 'disabled';
        }
        buttonPrev =
            <>
                <button {...prevAttr}>-</button>
            </>;

        buttonNext =
            <>
                <button {...nextAttr}>+</button>
            </>;
    }

    return (
        <>
            {name ? <div className="small-font">{name}</div> : ''}
            <Stack centerAll fit full="v">
                {buttonPrev}
                <input {...attr} />
                {buttonNext}
            </Stack>
        </>
    );
}

function Int(props) {
    return (
        <Stack gap centerAll>
            <IntField {...props} />
        </Stack>
    );
}

function ScrollArea({ children, x, setX, maxX, pageX, y, setY, maxY, pageY, auto }) {
    const cssContext = useContext(CssContext);

    const scrollbarX = x !== undefined && (!auto || (x > 0 || maxX > pageX));
    const scrollbarY = y !== undefined && (!auto || (y > 0 || maxY > pageY));

    const columns = ['*'];
    const rows = ['*'];
    if (scrollbarX) {
        rows.push('-');
    }
    if (scrollbarY) {
        columns.push('-');
    }

    const sensitivity = 0.25;
    const onWheel = e => {
        let deltaX = Math.round(e.deltaX * sensitivity);
        let deltaY = Math.round(e.deltaY * sensitivity);

        const newX = Math.min(Math.max(x + deltaX, 0), maxX);
        const newY = Math.min(Math.max(y + deltaY, 0), maxY);
        if (x !== undefined && newX !== x) {
            setX(newX);
        }
        if (y !== undefined && newY !== y) {
            setY(newY);
        }
        e.stopPropagation();
    };

    return (
        <Grid full gap={cssContext.defaultPadding} columns={columns.join(' ')} rows={rows.join(' ')}>
            <Content full flex wheel={onWheel}>{children}</Content>
            {scrollbarY && <Scrollbar vertical pos={y} max={maxY} page={pageY} set={setY} />}
            {scrollbarX && <Scrollbar pos={x} max={maxX} page={pageX} set={setX} />}
        </Grid>
    )
}

function Scrollbar({ pos, page, max, auto, vertical, size, set }) {
    const wContext = useContext(WindowContext);
    const [ tracking, setTracking ] = useState(false);
    const divRef = useRef(null);

    const pagePerc = max ? Math.round(page / max * 100) : 100;
    if (auto && pagePerc === 100) {
        return '';
    }
    const space = 15;
    const spacePerc = 100 - pagePerc;
    const maxSteps = max - page;
    const minPerc = maxSteps === 0 ? 0 : pos * (spacePerc / maxSteps);
    const maxPerc = 100 - (pagePerc + minPerc);

    const axis = vertical ? 'y' : 'x';
    const axisKey = vertical ? 'height' : 'width';
    const oppAxisKey = vertical ? 'width' : 'height';
    const client = 'client' + axis.toUpperCase();
    const dirKey = (axis === 'x' ? 'h' : 'v');

    const dimMin = {
        [axisKey]: minPerc + '%',
        [oppAxisKey]: space
    };
    const dimMax = {
        [axisKey]: maxPerc + '%',
        [oppAxisKey]: space
    };

    const mouseDown = e => {
        const rect = divRef.current.getBoundingClientRect();
        const anchorPos =  e[client];
        const pixelSteps = rect[axisKey] / max;
        const maxDistRight = (maxSteps - pos) * pixelSteps;
        const minDistLeft = -pos * pixelSteps;

        const getOffset = (value) => {
            const dist = value - anchorPos;
            const relPos = Math.max(Math.min(dist, maxDistRight), minDistLeft);
            return Math.round(relPos / pixelSteps);
        };
        let lastPos = 0;

        wContext.startExclusiveMode('scroll-handle');
        wContext.addEventListener('mousemove', e => {
            const relPos = getOffset(e[client]);
            if (relPos !== lastPos) {
                lastPos = relPos;
                set(pos + relPos);
            }
        });
        wContext.addEventListener('mouseup', () => {
            setTracking(false);
            wContext.endExclusiveMode('scroll-handle')
        }, {once: true});

        setTracking(true);
        e.stopPropagation();
        e.preventDefault();
    };

    const nextPage = e => {
        if (pos < maxSteps) {
            set(Math.min(maxSteps, pos + page));
        }
        e.stopPropagation();
    };

    const prevPage = e => {
        if (pos > 0) {
            set(Math.max(0, pos - page));
        }
        e.stopPropagation();
    };

    const cls = ['scrollbar-div'];
    const dim = {[oppAxisKey]: space};
    if (size) {
        dim[axisKey] = size;
    } else {
        dim[axisKey] = 'calc(100% - 6px)';
    }

    const handleCls = ['scrollbar-handle'];
    if (tracking) {
        handleCls.push('active');
    }

    return (
        <Content full={dirKey} {...dim} ref={divRef} className={cls.join(' ')}>
            <Stack full={dirKey} vertical={vertical}>
                <Content mouseDown={prevPage} {...dimMin} />
                <Content full={vertical ? false : 'v'} width={vertical ? 11 : false} flex mouseDown={mouseDown} className={handleCls.join(' ')}/>
                <Content mouseDown={nextPage} {...dimMax} />
            </Stack>
        </Content>
    );
}

const WindowContext = React.createContext();

function WindowCtx({ children }) {
    const [ fixCursor, setFixCursor ] = useState(null);
    const modeRef = useRef(null);
    const modalStack = useMemo(() => [],[]);

    const listeners = useMemo(() => { return {} }, []);

    const getModalLevel = () => {
        return modalStack.length
    };

    const openModal = () => {
        let zIndex = 10000;
        const len = modalStack.length;
        if (len > 0) {
            zIndex = modalStack[len - 1] + 10;
        }
        modalStack.push(zIndex);
        return zIndex;
    };
    const closeModal = zIndex => {
        const index = modalStack.indexOf(zIndex);
        if (index === -1) {
            return;
        }
        modalStack.splice(index, 1);
    };

    const startExclusiveMode = (id, cursor = 'auto') => {
        if (modeRef.current !== null) {
            endExclusiveMode(modeRef.current);
        }
        modeRef.current = id;
        setFixCursor(cursor);
    };

    const endExclusiveMode = id => {
        if (!id || modeRef.current !== id) {
            return;
        }
        if (listeners) {
            for (let type of Object.keys(listeners)) {
                removeEventListener(type)
            }
        }
        modeRef.current = null;
        setFixCursor(null);
    };

    const addEventListener = (type, listener, options = false) => {
        if (!modeRef.current) throw Error(`No call of start exclusive mode before addEventListener`);

        const handler = (event, ...params) => {
            let result = false;
            try {
                result = listener(event, ...params);
            } catch (e) {
                console.error(`An error occured in the event handler "${type}": ${e}`);
                endExclusiveMode(modeRef.current);
            }
            if (options.once) {
                removeEventListener(type)
            }
            if (!options.propagate) {
                event.stopPropagation();
            }
            return result
        };
        window.addEventListener(type, handler, options);
        if (!listeners[type]) {
            listeners[type] = [];
        }
        listeners[type].push({handler, options});
    };

    const removeEventListener = type => {
        const handlers = listeners[type];
        if (!handlers || handlers.length === 0) {
            return;
        }
        const last = handlers.pop();
        window.removeEventListener(type, last.handler, last.options);
    };

    const value = {
        fixCursor,
        startExclusiveMode,
        endExclusiveMode,
        addEventListener,
        removeEventListener,
        getModalLevel,
        openModal,
        closeModal
    };
    const cls = ['fixed pos-0 transparent full-h full-v'];

    return (
        <WindowContext.Provider value={value}>
            {children}
            {fixCursor !== null &&
                <div style={{cursor: (fixCursor ? fixCursor : 'auto'), zIndex: 999999}} className={cls.join(' ')}></div>
            }
        </WindowContext.Provider>
    )
}

const AvailContext = React.createContext();

function AvailContextProvider({ children }) {
    const [ width, setWidth ] = useState(0);
    const [ height, setHeight] = useState(0);
    const propsRef = useRef(null);
    const observerRef = useRef(null);
    const divRef = useRef(null);

    propsRef.current = {width, height};

    useLayoutEffect(() => {
        const checkSize = () => {
            if (!divRef.current) return;
            const rect = divRef.current.getBoundingClientRect();
// TODO: why?
            rect.width -= 10;
            rect.height -= 10;
            if (rect.width !== propsRef.current.width) {
                setWidth(rect.width);
            }
            if (rect.height !== propsRef.current.height) {
                setHeight(rect.height);
            }
        };
        const observer = new ResizeObserver(checkSize);
        observerRef.current = observer;
        observer.observe(divRef.current);
        checkSize();
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        }
    }, []);

    const value = useMemo(
        () => {
            return {
                width, height
            }
        },
        [width, height]
    );

    return (
        <div ref={divRef} className="full-v full-h overlays">
            <AvailContext.Provider value={value}>
                <div className="bounds overlay" style={value}>
                    {children}
                </div>
            </AvailContext.Provider>
        </div>
    )
}

function ToolGroup({ children }) {
    return (
        <>
            {children}
            <Content>
                <Content width={1} height={25} className="separator-h less"></Content>
            </Content>
        </>
    );
}

const TabContext = React.createContext();

function SideTabs({ children, ...props }) {
    const [ active, setActive ] = useState(props.active !== undefined ? props.active : null);
    const items = useRef([]);

    const value = {
        active,
        setActive,
        add: name => {
            if (!items.current.includes(name)) {
                items.current.push(name);
            }
        }
    };

    const tabs = [];
    for(let item of items.current) {
        tabs.push(
            <Stack key={item} gap className={item === active ? 'switch-button-enabled' : ''} boxed="1" click={() => setActive(item)} padded full="h">
                <Content>{' '}</Content>
                <Content full="h">{item}</Content>
                <Content>{' '}</Content>
                <Content><kbd>{' > '}</kbd></Content>
            </Stack>
        );
    }

    return (
        <Stack full="v" border>
            <Content padded full="v">
                <Stack vertical gap full="v">{tabs}</Stack>
            </Content>
            <Content flex>
                <TabContext.Provider value={value}>
                    {children}
                </TabContext.Provider>
            </Content>
        </Stack>
    )
}

function SideTab({ name, active, children }) {
    const tabContext = useContext(TabContext);
    useEffect(() => {
        tabContext.add(name);
        if (active) {
            tabContext.setActive(name);
        }
    }, []);
    if (tabContext.active !== name) {
        return '';
    }
    return (
        children
    )
}

function useModal() {
    const context = useContext(WindowContext);
    const [isOpen, setIsOpen] = useState(false);
    const propsRef = useRef(null);
    const currRef = useRef(null);
    currRef.current = isOpen;

    const close = () => {
        propsRef.current = null;
        context.closeModal(currRef.current);
        setIsOpen(false);
    };
    const open = props => {
        propsRef.current = props;
        setIsOpen(context.openModal());
    };
    const content = function ({full, width, maxWidth, minWidth, height, maxHeight, minHeight, ...props}) {
        const title = propsRef.current && propsRef.current.title ? propsRef.current.title : props.name;
        const dimProps = {full, width, height, maxWidth, minWidth, maxHeight, minHeight};
        dimProps.zIndex = isOpen;
        return (
            <>
                {isOpen && <Modal close={close} name={title} closeable={props.closeable} {...dimProps}>{props.children}</Modal>}
            </>
        );
    };
    return {
        content,
        open,
        close,
        get props() {
            const props = propsRef.current === null ? {} : propsRef.current;
            return props.close ? props : {...props, close};
        }
    };
}

function useKeyListener(keyCode, action, doRegister = () => true) {
    useEffect(
        () => {
            if (!doRegister()) {
                return;
            }
            const keyHandler = (e) => {
                if (e.keyCode === keyCode) {
                    if (!action()) {
                        return;
                    }
                    e.stopPropagation();
                    e.preventDefault();
                }
            };
            window.addEventListener(
                'keydown',
                keyHandler,
                {capture: false}
            );
            return () => {
                window.removeEventListener(
                    'keydown',
                    keyHandler,
                    {capture: false}
                )
            }
        },
        []
    );
}

function Portal({ id, children }) {
    const domElem = document.getElementById(id);
    if (!domElem) {
        return '';
    }

    return ReactDOM.createPortal(
        children,
        domElem
    );
}

/**
 * <Modal full>  => Volle Max-Breit + Höhe (100%-20px)
 *
 * <Content center full fixed> -- Overlay (ganzer Bildschirm clickhandler
 *   <Content overlay-bounds [center=x]>
 *      <Stack [full=x]>
 *
 * Falls full dann kein "center" in overlay-bounds
 * ansonsten
 *
 *
 *
 * <Modal full="h" => Volle Breite + Mindest-Höhe bzw. MaxHöhe
 *
 * <Modal full="v" => Volle Höhe + Mindest-Breite bzw. MaxBreite
 *
 * <Modal width=320 => Breite 320 oder max-Breite, Mindest-Höhe
 *
 * <Modal maxWidth=500>
 *
 *
 */
const Modal = function ({ name, close, closeable, zIndex = 0, full, width, height, children, ...props }) {
    useKeyListener(27, () => {close(); return true}, () => closeable);

    const styleProps = {zIndex, width, height}; // useStyleProps(props);
    const click = closeable ?
        e => {
            let target = e.target;
            while(target.classList !== undefined) {
                if (target.classList.contains('modal-centered')) {
                    return;
                }
                target = target.parentNode;
            }
            close();
            e.stopPropagation();
            e.preventDefault();
        } : null;

    return (
        <Portal id="modals-container">
            <Content full centerItems className="modal-overlay fixed pos-0" click={click} zIndex={styleProps.zIndex - 1}>
                <Content width="90%" height="90%" centerItems className="modal-bounds">
                    <Stack full={full} vertical border boxed {...styleProps} className="modal-centered bg2">
                        <Stack gap full="h" centerAll padded>
                            <Content shorten flex>{name}</Content>
                            <Button name="close" icon click={e => {
                                close();
                                e.stopPropagation();
                            }} />
                        </Stack>

                        <Content flex>
                            {children}
                        </Content>
                    </Stack>
                </Content>
            </Content>
        </Portal>
    );
};

const CssContext = React.createContext();

function CssCtx({ children }) {
    const value = useMemo(() => {
        const style = getComputedStyle(document.body);
        const values = {};
        values.defaultPadding = parseInt(style.getPropertyValue('--default-padding'), 10);
        return values
    }, []);

    return (
        <CssContext.Provider value={value}>
            {children}
        </CssContext.Provider>
    )
}

export {
    AvailContext,
    AvailContextProvider,
    Canvas,
    Section,
    ToolGroup,
    WindowCtx,
    ScrollArea,
    BackgroundCtx,
    BackgroundControl,
    SideTabs,
    SideTab,
    useModal,
    CssCtx,

    Button,
    Int,
    Checkbox,
    Scrollbar,

    PropertyGrid,
    ValueProp
}