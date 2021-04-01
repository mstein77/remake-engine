import React, {useMemo, useEffect, useRef, useState, Fragment, useContext, useLayoutEffect} from "react";
import {d} from "../helper/helper"
import {DIR, Block, Stack, Grid, Overlays, Overlay} from "./LayoutComponents";
import ReactDOM from "react-dom";
import {useMounted} from "./BaseComponents";

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
            <Number name="Background:" min={0} max={26} set={bContext.setOpacity} value={bContext.opacity} buttons />
            <Color value={bContext.color} set={bContext.setColor} />
        </>
    )
}

function Canvas({ width, height, smoothing, render, plain, border, className }) {
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
    if (border) {
        cls.push((border !== true ? 'thin-' : '') + 'boxed');
    }

    return (
        <div className={cls.join(' ')} style={{height, width}}>
            {!plain && <CanvasBackground />}
            <canvas className="absolute" width={width} height={height} ref={canvasRef} />
        </div>
    )
}

function Section({ name, children, inner, rev, maxSize, minSize, center, centerItems, indented, scroll, full, collapse, ...props }) {
    const wContext = useContext(WindowContext);
    const update = useComponentUpdate();

    const [ collapsed, setCollapsed ] = useState(props.collapsed === true);
    const collapseH = collapse === 'h';
    const minDefault = collapseH ? 100 : 25;
    if (!minSize || minSize < minDefault) {
        minSize = minDefault;
    }
    const [ size, setSize ] = useState(props.size && Math.max(props.size, minSize));

    const contentRef = useRef(null);
    const offsetRef = useRef(null);

    const collapsedByH = collapsed && collapseH;
    const { width, minWidth, maxWidth, height, minHeight, maxHeight, ...contProps } = props;
    let dimProps = { width, maxWidth, minWidth, height, minHeight, maxHeight };

    let fullDir = false;
    let fullXDir = false;
    if (full) {
        if (collapseH) {
            fullDir = full !== 'h';
            fullXDir = full !== 'v';
        } else {
            fullDir = full !== 'v';
            fullXDir = full !== 'h';
        }
    }
    let parentFull;
    if (collapsed) {
        if (collapsedByH) {
            parentFull = 'v';
        } else if (fullDir) {
            parentFull = 'h';
        }
    } else {
        if (fullDir && fullXDir) {
            parentFull = true;
        } else if (collapseH) {
            parentFull = fullDir;
            if (!parentFull && props.size) {
                parentFull = 'h';
            }
            if (dimProps.height && parentFull !== false) {
                parentFull = true;
            }
        }
        if (!parentFull) {
            if (fullDir) {
                parentFull = collapseH ? 'v' : 'h';
            }
            if (fullXDir) {
                parentFull = collapseH ? 'h' : 'v';
            }
        }
    }

    const parentAttr = {
        full: parentFull,
        center,
        scroll,
        indented,
        className: 'stack',
        ...dimProps
    };
    if (collapsedByH) {
        parentAttr.width = 'min-content';
    } else if (collapsed) {
        parentAttr.minHeight = false;
        parentAttr.height = 'min-content';
    }
    const headerAttr = {
        full: collapsedByH ? false : 'h',
        vertical: collapsedByH
    };
    const contentAttr = {centerItems, ...contProps};

    const sizeProp = collapseH ? 'width' : 'height';
    const offProp = 'offset' + sizeProp[0].toUpperCase() + sizeProp.substring(1);

    useEffect(() => {
        if (contentRef.current) {
            let elem = contentRef.current;
            if (!collapseH) {
                elem = elem.parentNode;
            }
            let stackElem = elem.parentNode;
            while(!stackElem.classList.contains('stack')) {
                stackElem = stackElem.parentNode;
            }
            offsetRef.current = stackElem[offProp] - elem[offProp];
            update();
        }
    }, [collapsed]);

    let items;
    let contentElem = '';
    if (!collapsed) {
        const cursor = (collapseH ? 'col' : 'row') +'-resize';
        const attr = {};
        if (size) {
            if (collapseH) {
                parentAttr.width = size + offsetRef.current;
            } else if (offsetRef.current) {
                parentAttr.height = size + offsetRef.current;
                if (parentAttr.maxHeight) {
                    parentAttr.maxHeight = 'max(' + (minSize + offsetRef.current) + 'px, ' + parentAttr.maxHeight +  ')';
                }
            }
            attr.ref = contentRef;
        }
        contentElem = (
            <Block key="a" {...attr} full={collapseH ? parentAttr.full : true} { ...contentAttr }>
                {children}
            </Block>
        );
        if (size) {
            const dimProp = 'client' + (collapseH ? 'X' : 'Y');
            const handleAttr = {};
            handleAttr[sizeProp] = 3;

            const onMouseDown = e => {
                const anchorPos =  e[dimProp];
                const factor = rev ? -1 : 1;

                const currSize =
                    collapseH ? contentRef.current[offProp] :
                        contentRef.current.parentNode.clientHeight;
                wContext.startExclusiveMode('resize-section', cursor);
                wContext.addEventListener('mousemove', e => {
                    let newSize = currSize - factor * (anchorPos - e[dimProp]);
                    if (maxSize && newSize > maxSize) {
                        newSize = maxSize;
                    }
                    if (minSize && newSize < minSize) {
                        newSize = minSize;
                    }
                    if (newSize !== size && newSize > 0) {
                        setSize(newSize)
                    }
                });
                wContext.addEventListener('mouseup', () => {
                    wContext.endExclusiveMode('resize-section');

                    setSize(
                        collapseH ? contentRef.current[offProp] :
                        contentRef.current.parentNode.clientHeight
                    );
                }, {once: true});

                setSize(currSize);

                e.preventDefault();
            };

            const handleElem = <Block key="t" full={collapseH ? 'v' : 'h'} onMouseDown={onMouseDown} xcenterItems {...handleAttr} cursor={cursor}></Block>;
            if (!collapseH) {
                contentElem = <Block key="x" className="flex" full="h" height={size}>{contentElem}</Block>;
                items = [contentElem, handleElem];
                if (rev) {
                    items.reverse();
                }
                contentElem = (
                    <Fragment key="f">
                        {items}
                    </Fragment>
                );
            } else {
                items = [contentElem];
                items.push(handleElem);
                if (rev) {
                    items.reverse();
                }

                let contentFull = parentAttr.full;
                if (contentFull !== true) {
                    if (collapseH) {
                        contentFull = contentFull !== 'h' ? true : 'h';
                    } else {
                        contentFull = contentFull !== 'v' ? true : 'v';
                    }
                }
                contentElem = (
                    <Stack key="a" vertical={!collapseH} full={contentFull} borders>
                        {items}
                    </Stack>
                );
            }
        }
    }
    let titleCls = collapsedByH ? 'text-vertical' : '';
    items = [
        <Block key="c" full={!collapsed && collapseH && rev ? 'h' : false}  center="v"  shorten padded={collapsedByH ? 'v' : 'h'} className={titleCls}>
            {name}
        </Block>
    ];
    if (collapse) {
        let dir;
        if (collapseH) {
            dir = 'navigate_' + ((!rev && !collapsed) || (rev && collapsed) ? 'before' : 'next');
        } else {
            dir = 'expand_' + ((!rev && !collapsed) || (rev && collapsed) ? 'less' : 'more');
        }
        const toggleCollapse = () => {
            setCollapsed(!collapsed);
        };
        const button = <Block key="b" center><Button icon={dir} onClick={toggleCollapse} /></Block>;

        if (collapseH && rev && !collapsed) {
            items.push(button);
        } else {
            items.unshift(button);
        }
    }

    const headerElem = (
        <Stack key="e" padded {...headerAttr}>
            {items}
        </Stack>
    );
    items = !collapseH && rev ? [contentElem, headerElem] : [headerElem, contentElem];
    return (
        <Stack vertical {...parentAttr} borders border={inner ? (collapseH ? DIR.RIGHT : false) : true}>
            {items}
        </Stack>
    )
}

function EntityStack() {
    return (
        <Stack vertical borders full>
            <Block padded full="h">
                <Stack full gaps>
                    <Button icon="add" />
                    <Button icon="delete" />
                    <Block full="h" />
                </Stack>
            </Block>
            <Block full>
                <Stack vertical full="h" scroll>
                    <Stack gaps full="h">
                        <Block width={30} padded>#1</Block>
                        <Block shorten padded>My first font</Block>
                    </Stack>
                    <Stack gaps full="h">
                        <Block width={30} padded>#2</Block>
                        <Block shorten padded>My second font</Block>
                    </Stack>
                    <Stack gaps full="h">
                        <Block width={30} padded>#3</Block>
                        <Block shorten padded>My first font</Block>
                    </Stack>
                    <Stack gaps full="h">
                        <Block width={30} padded>#4</Block>
                        <Block shorten padded>My first font</Block>
                    </Stack>
                </Stack>
            </Block>
        </Stack>
    )
}


function PropertyGrid({ propWidth = '-', valueWidth = '*', ...props }) {
    return (
        <Grid gaps={5} columns={propWidth + " " + valueWidth} {...props} />
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
            <Block shorten className="small-font">
                {name}
            </Block>
            <Block full="h">
                {children}
            </Block>
        </>
    )
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
        <Grid full gaps={cssContext.defaultPadding} columns={columns.join(' ')} rows={rows.join(' ')}>
            <Block full onWheel={onWheel}>{children}</Block>
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

    const onMouseDown = e => {
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
        <Block full={dirKey} {...dim} ref={divRef} className={cls.join(' ')}>
            <Stack full={dirKey} vertical={vertical}>
                <Block onMouseDown={prevPage} {...dimMin} />
                <Block width={vertical ? 11 : false} full={vertical ? 'v' : true} onMouseDown={onMouseDown} className={handleCls.join(' ')}/>
                <Block onMouseDown={nextPage} {...dimMax} />
            </Stack>
        </Block>
    );
}

const WindowContext = React.createContext();

function WindowCtx({ children }) {
    const [ fixCursor, setFixCursor ] = useState(null);
    const modeRef = useRef(null);
    const modalStack = useMemo(() => [],[]);
    const focusStack = useMemo(() => { return {elem: {}, zIndex: null}}, []);

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
        focusStack.zIndex = zIndex;
        focusStack.elem[zIndex] = {top: null, start: null};
        return zIndex;
    };
    const closeModal = zIndex => {
        const index = modalStack.indexOf(zIndex);
        if (index === -1) {
            return;
        }
        modalStack.splice(index, 1);
        delete focusStack.elem[zIndex];
        focusStack.zIndex = modalStack.length ? modalStack[modalStack.length - 1] : null;
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
        if (last.options.cleanUp) {
            last.options.cleanUp()
        }
    };

    const value = {
        fixCursor,
        startExclusiveMode,
        endExclusiveMode,
        addEventListener,
        removeEventListener,
        getModalLevel,
        openModal,
        closeModal,
        focusStack
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
            <Block>
                <Block width={1} height={25} className="separator-h less"></Block>
            </Block>
        </>
    );
}

const TabContext = React.createContext();

function SideTabs({ children, ...props }) {
    const [ active, setActive ] = useState(props.active !== undefined ? props.active : null);
    const items = useRef([]);

    const attr = useFocusKeys(
        [
            {
                keys: ['ArrowDown', 'ArrowRight'],
                handler:
                    () => {
                        const currIndex = items.current.indexOf(active);
                        if (currIndex === -1) {
                            return;
                        }
                        let newIndex = currIndex + 1;
                        if (newIndex >= items.current.length) {
                            newIndex = 0;
                        }
                        setActive(items.current[newIndex]);
                    }
            },
            {
                keys: ['ArrowUp', 'ArrowLeft'],
                handler:
                    () => {
                        const currIndex = items.current.indexOf(active);
                        if (currIndex === -1) {
                            return;
                        }
                        let newIndex = currIndex - 1;
                        if (newIndex < 0) {
                            newIndex = items.current.length - 1;
                        }
                        setActive(items.current[newIndex]);
                    }
            },
        ]
    );

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
            <Button tab={false} key={item} full current={active} value={item} onClick={setActive} name={item} rev icon="keyboard_arrow_right" />
        );
    }
    return (
        <Stack scroll full borders>
            <Block scroll padded="h">
                <Stack indented vertical gaps {...attr}>{tabs}</Stack>
            </Block>

            <Block full="h">
                <TabContext.Provider value={value}>
                    {children}
                </TabContext.Provider>
            </Block>
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
        return null;
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

function ActionBarContent({ children, scroll, ...props }) {
    const {maxHeight, ...childProps} = props;

    const InnerModal = useModal();


    return (
        <Stack vertical full borders className="max-v">
            <Block full scroll={scroll} maxHeight={maxHeight} className="max-v scroll">
                <>
                    <Block {...childProps}>
                    {children}
                    </Block>
                    <InnerModal.content full="v" name="Inner Sanctum">
                        <Block padded full centerItems>Welcome my friend!</Block>
                    </InnerModal.content>
                </>
            </Block>
            <Block full="h">
                <Stack wrap centerItems gaps full="h">
                    <Button name="Store" onClick={e => InnerModal.open()} />
                    <Button name="Cancel" />
                    <Button name="Whatever" />
                </Stack>
            </Block>
        </Stack>
    )
}

/**
 * <Modal full>  => Volle Max-Breit + Höhe (100%-20px)
 *
 * <Block center full fixed> -- Overlay (ganzer Bildschirm clickhandler
 *   <Block overlay-bounds [center=x]>
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
const Modal = function ({ name, close, closeable = true, zIndex = 0, full, width, maxWidth, height, maxHeight, children }) {
    const wContext = useContext(WindowContext);
    useKeyListener(27, () => {close(); return true}, () => closeable);

    const trapRef = useRef(null);

    useEffect(() => {
        const focusElem = wContext.focusStack.elem[zIndex];
        if (!focusElem) {
            return;
        }
        focusElem.top = trapRef.current;
        const elems = trapRef.current.querySelectorAll('.tabbed');
        focusElem.start = elems ? elems[0] : null;
    });

    useEffect(() => {
        const focusElem = wContext.focusStack.elem[zIndex];
        if (!focusElem || !focusElem.start) {
            return;
        }
        focusElem.start.focus();
    }, []);

    const onClick = closeable ?
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

    const onKeyDown = null;
    const hDivCls = ['center-v center-h block'];
    if (!full || (full === 'v')) {
        hDivCls.push('min-content-h');
    }
    if (!maxWidth) {
        maxWidth = '100%';
    } else {
        if (typeof maxWidth === 'number') {
            maxWidth = maxWidth + 'px';
        }
        maxWidth = 'min(' + maxWidth + ', 100%)';
    }
    const hDivStyle = {
        maxWidth,
        width
    };
    if (!maxHeight) {
        maxHeight = '100%';
    } else {
        if (typeof maxHeight === 'number') {
            maxHeight = maxHeight + 'px';
        }
        maxHeight = 'min(' + maxHeight + ', 100%)';
    }
    const vDivStyle = {
        maxHeight,
        height,
        zIndex
    };
    const parentDivStyle = {
        width: 'calc(100% - 50px)',
        height: 'calc(100% - 50px)'
    };

    const vDivCls = ['stack-v full-h boxed modal-centered bg2'];
    if (full && full !== 'h') {
        vDivCls.push('full-v');
    }

    return (
        <Portal id="modals-container">
            <Block ref={trapRef} onKeyDown={onKeyDown} full className="modal-overlay fixed pos-0" onClick={onClick} zIndex={zIndex - 1}>
                <div className="center-v center-h full-h editor-bounds">
                    <div className="center-h block" style={parentDivStyle}>
                        <div className={hDivCls.join(' ')} style={hDivStyle}>
                            <div className={vDivCls.join(' ')} style={vDivStyle}>
                                <Stack gaps full="h" padded>
                                    <Block center="v" shorten full="h">{name}</Block>
                                    <Button icon="close" onClick={e => {
                                        close();
                                        e.stopPropagation();
                                    }} />
                                </Stack>
                                <div className="border-div-v"></div>
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </Block>
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
function useComponentUpdate() {
    const mounted = useMounted();
    const [updates, setUpdates] = useState(false);
    const updateRef = useRef(null);
    updateRef.current = updates;
    return () => {
        if (mounted.current) {
            setUpdates(!updateRef.current);
        }
    }
}


function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value);
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

function useFocusKeys(keyHandler, disabled = false) {
    const [ hasFocus, setHasFocus ] = useState(false);

    const attr = {};

    if (!disabled) {
        attr.tab = true;
        attr.onFocus = () => {
            setHasFocus(true);
        };
        attr.onBlur = () => {
            setHasFocus(false);
        };
        if (hasFocus) {
            attr.onKeyDown = e => {
                for (let item of keyHandler) {
                    if (item.keys && item.keys.includes(e.key)) {
                        item.handler();
                        break;
                    }
                }
            }
        }
    }
    return attr;
}

// ---------------------------- I N P U T   C O M P O N E N T S -------------------------

/**
 *
 */
function Checkbox({ name, value, set, disabled, rev, icon = true }) {

    const items = [];
    if (icon) {
        items.push(
            <Button
                key={1}
                border={false}
                icon={value ? 'check_box' : 'check_box_outline_blank'}
                padded={false}
                disabled={disabled}
                onClick={() => {
                    set(!value)
                }}
            />
        )
    } else {
        const inputProps = {};
        if (disabled) {
            inputProps.tabIndex = -1
        } else {
            inputProps.className = "tabbed"
        }
        items.push(
            <input
                key={1}
                type="checkbox"
                checked={!!value}
                disabled={disabled}
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
function Button({ name, icon, current, value, disabled, direct, size = 18, cursor = 'default', padded = (name ? true : false), rev, onClick, tab = true, border = "1", className, ...props }) {

    const wContext = useContext(WindowContext);

    const mounted = useMounted();
    const [clicked, setClicked] = useState(false);

    let attr = { ...props };
    const cls = [];
    if (className) {
        cls.push(className);
    }

    let active = false;
    if (value) {
        if (value == current) {
            cls.push('active');
            active = true;
        } else {
            tab = false;
        }
    }
    if (disabled) {
        cls.push('disabled');
        if (tab) {
            tab = false;
        }
    } else {
        cls.push('hover-highlight');
    }
    attr = { ...attr, tab, border, padded, cursor, indented: (padded ? false : '1'), center: 'v' };

    const items = [];
    if (icon) {
        const attr = {
            style: {
                fontSize: size
            }
        };
        items.push(
            <Block height={size} key={1}><i className="material-icons" {...attr}>{icon}</i></Block>
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
        if (tab && !disabled) {
            e.target.focus();
        } else {
            e.target.blur();
        }
    };

    if (!disabled && onClick && !clicked) {
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
function Radio({ name, options, set, disabled, padded, ...props }) {

    const values = Object.keys(options);
    const currIndex = values.indexOf(props.value);

    const attr = useFocusKeys(
        [
            {
                keys: ['ArrowDown', 'ArrowRight'],
                handler:
                    () => {
                        if (currIndex === -1) {
                            return;
                        }
                        let newIndex = currIndex + 1;
                        if (newIndex >= values.length) {
                            newIndex = 0;
                        }
                        set(values[newIndex]);
                    }
            },
            {
                keys: ['ArrowUp', 'ArrowLeft'],
                handler:
                    () => {
                        if (currIndex === -1) {
                            return;
                        }
                        let newIndex = currIndex - 1;
                        if (newIndex < 0) {
                            newIndex = values.length - 1;
                        }
                        set(values[newIndex]);
                    }
            },
        ],
        disabled
    );
    const items = [];
    for (let [value, name] of Object.entries(options)) {
        items.push(
            <Button key={value} tab={false} padded={padded} disabled={disabled} name={name} value={value} current={props.value} onClick={set} />
        );
    }
    return (
        <Stack gaps {...attr}>
            <Block center="v">{name}</Block>
            {items}
        </Stack>
    )
}

function Number({name, set, value, min, max, step, slider = true, decimals = 0, readOnly, buttons = true, ...props}) {
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
            <Button key={1} size={14} padding={false} direct disabled={min === max && min !== undefined} onClick={startSliding} cursor="row-resize" icon="height" tab={false} />
        );
    } else if (hasRange && slider === 'h') {
        items.push(
            <input key={1} tabIndex={-1} type="range" step={stepHandler.step} value={value} min={min} max={max} onChange={e => set(stepHandler.round(e.target.valueAsNumber))} />
        );
    }
    items.push(
        <Input key={2} readOnly={readOnly} decimals={decimals} step={stepHandler.step} number max={max} min={min} value={value} set={set} />
    );
    if (buttons) {
        items.push(
            <Button key={4} size={14} disabled={max === value} onClick={() => {set(stepHandler.getStepUp(value)); blurActive()}} padded={false} tab={false} icon="add"></Button>
        );
        items.push(
            <Button key={3} size={14} disabled={min === value} onClick={() => {set(stepHandler.getStepDown(value)); blurActive()}} padded={false} tab={false} icon="remove"></Button>
        );
    }
    let elem = items.length === 1 ? items[0] : <Stack>{items}</Stack>;

    if (buttons || slider) {
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

    if (name) {
        elem = (
            <Stack gaps>
                <Block center="v">{name}</Block>
                {elem}
            </Stack>
        );
    }
    return elem
}

/*
 */
function Input({ name, value, set, size, min, max, required, number, clear, readOnly, match, active, step, force = number, decimals = 0, className }) {

    const inputRef = useRef(null);

    const [curr, setCurr] = useState(value);
    const [edit, setEdit] = useState(false);

    const isFloat = number && (decimals && decimals > 0);
    const cls = [];
    if (className) {
        cls.push(className);
    }

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
            if (readOnly) {
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
                    newValue = validChars
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
       attr.tabIndex = -1
    }
    if (!valid(attr.value, edit)) {
        cls.push('invalid');
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
        input = <Stack>{input}<Button icon="clear" tab={false} size={14} onClick={() => set('')} /></Stack>
    } else {
        input = <Block>{input}</Block>
    }
    if (name) {
        input = (
            <Stack gaps>
                <Block center="v" shorten>{name}</Block>
                {input}
            </Stack>
        )
    }
    return input
}

function Tuple(props) {
    const maxX = props.max !== undefined ? props.max : props.maxX;
    const maxY = props.max !== undefined ? props.max : props.maxY;
    const minX = props.min !== undefined ? props.min : props.minX;
    const minY = props.min !== undefined ? props.min : props.minY;
    const sizeX = props.size !== undefined ? props.size : props.sizeX;
    const sizeY = props.size !== undefined ? props.size : props.sizeY;
    const stepX = props.step !== undefined ? props.step : props.stepX;
    const stepY = props.step !== undefined ? props.step : props.stepY;
    const readOnlyX = props.readOnly !== undefined ? props.readOnly : props.readOnlyX;
    const readOnlyY = props.readOnly !== undefined ? props.readOnly : props.readOnlyY;

    const xAttr = {
        name: props.name,
        value: props.x,
        min: minX,
        max: maxX,
        size: sizeX,
        set: props.setX,
        step: stepX,
        readOnly: readOnlyX,
        buttons: props.buttons
    };
    const yAttr = {
        value: props.y,
        min: minY,
        max: maxY,
        size: sizeY,
        set: props.setY,
        step: stepY,
        readOnly: readOnlyY,
        buttons: props.buttons
    };

    return (
        <Stack gaps>
            <Number {...xAttr} />
            <Block className="less">x</Block>
            <Number {...yAttr} />
        </Stack>
    );
}

function Select({ name, readOnly, buttons = true, value, set, ...props }) {

    const options = [];
    let active = null;
    let activeName = '';
    let index = 0;
    let intValues = true;
    for (let item of props.options) {
        options.push(
            <option key={item.id} value={item.id}>
                {item.name}
            </option>
        );
        if (item.id == value) {
            active = index;
            activeName = item.name;
        }
        if (typeof item.id === 'string') {
            intValues = false
        }
        index++
    }
    if (readOnly) {
        buttons = false;
    }

    const items = [];

    if (buttons) {
        items.push(
            <Button
                key={0}
                disabled={index < 2}
                tab={false}
                icon={'navigate_before'}
                size={14}
                onClick={
                    e => {
                        set(props.options[active > 0 ? active - 1 : props.options.length - 1].id)
                    }
                }
            />
        );
    }
    items.push(
        readOnly ?
            <Block><input key={1} value={activeName} readOnly={readOnly} /></Block> :
            <select
                key={1}
                readOnly={readOnly}
                value={value}
                onChange={
                    e => {
                        set(intValues ? parseInt(e.target.value, 10) : e.target.value)
                    }
                }
            >
                {options}
            </select>
    );
    if (buttons) {
        items.push(
            <Button
                key={2}
                disabled={index < 2}
                tab={false}
                icon={'navigate_next'}
                size={14}
                onClick={
                    e => {
                        set(props.options[active < (props.options.length - 1) ? active + 1 : 0].id)
                    }
                }
            />
        );
    }
    let elem = items.length === 1 ? items[0] : <Stack>{items}</Stack>;
    if (name) {
        elem = (
            <Stack gaps>
                <Block center="v">{name}</Block>
                {elem}
            </Stack>
        )
    }
    return elem;
}

function TextArea({ name, value, set, readOnly, rows, cols, wrap, tab = true, required, match, className }) {
    const attr = {
        wrap,
        rows,
        cols,
        readOnly,
        value,
        onChange: e => set(e.target.value)
    };
    const cls = [];
    if (className) {
        cls.push(className);
    }
    if ((required && value === '') || match && !match(value)) {
        cls.push('invalid');
    }
    if (readOnly) {
        tab = false;
        attr.onFocus = e => e.target.blur()
    }

    if (!tab) {
        attr.tabIndex = -1;
    }
    let elem = (
        <textarea
            className={cls.join(' ')}
            {...attr}
        ></textarea>
    );
    if (name) {
        elem = (
            <Stack>
                <Block center="v">{name}</Block>
                {elem}
            </Stack>
        )
    }
    return elem
}

function Color({ name, value, set }) {
    let elem = (
        <Block>
            <input
                type="color"
                value={value}
                onChange={e => {set(e.target.value)}}
            />
        </Block>
    );
    if (name) {
        elem = (
            <Stack>
                <Block center="v">{name}</Block>
                {elem}
            </Stack>
        )
    }
    return elem;
}


export {
    AvailContext,
    AvailContextProvider,
    Canvas,
    Section,
    ToolGroup,
    WindowContext,
    WindowCtx,
    ScrollArea,
    BackgroundCtx,
    BackgroundControl,
    SideTabs,
    SideTab,
    useModal,
    CssCtx,
    Scrollbar,

    EntityStack,
    ActionBarContent,

    Button,
    Number,
    Checkbox,
    Radio,
    Input,
    Tuple,
    Select,
    TextArea,
    Color,

    PropertyGrid,
    ValueProp
}