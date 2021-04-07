import React, { useMemo, useEffect, useRef, useState, Fragment, useContext, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import {d} from "../helper/helper"
import { DIR, Block, Stack, Grid } from "./LayoutComponents";
import { Button, Number, Color } from "./FormComponents";

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
        className: 'stack' + (!collapseH && rev ? ' rev-cols' : ''),
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

            const handleElem = <Block key="t" full={collapseH ? 'v' : 'h'} onMouseDown={onMouseDown} {...handleAttr} cursor={cursor}></Block>;
            if (!collapseH) {
                contentElem = <Block key="x" className="flex" full="h" height={size}>{contentElem}</Block>;
                items = [contentElem, handleElem];
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
                    <Stack key="z" vertical={!collapseH} full={contentFull} borders>
                        {items}
                    </Stack>
                );
            }
        }
    }
    items = [
        <Block key="c" verticalText={collapsedByH} full={!collapsed && collapseH && rev ? 'h' : false}  center={collapsedByH ? false : 'v'}  shorten padded={collapsedByH ? 'v' : 'h'}>
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
        const button = <Block key="b" center><Button refocus icon={dir} onClick={toggleCollapse} /></Block>;

        if (collapseH && rev && !collapsed) {
            items.push(button);
        } else {
            items.unshift(button);
        }
    }

    const headerElem = (
        <Stack key="h" padded {...headerAttr}>
            {items}
        </Stack>
    );
    items = [headerElem, contentElem];
    return (
        <Stack vertical {...parentAttr} borders border={inner ? (collapseH ? DIR.RIGHT : false) : true}>
            {items}
        </Stack>
    )
}

function EntityStackSections({ sectionProps, detailProps, active, children, ...props}) {

    const items = [];

    items.push(
        <Section key={0} { ...sectionProps }>
            <EntityStack active={active} { ...props } />
        </Section>
    );
    if (children) {
        items.push(
            <Section key={1} { ...detailProps }>{children}</Section>
        );
    }
    return (
        <>
            {items}
        </>
    )
}

function EntityStack({ entities, getName = item => item.name, getInfo, emptyText, deselect, children, ...props }) {

    let [active, setActiveRaw] = useState(props.active === undefined ? null : props.active);
    if (props.setActive) {
        setActiveRaw = props.setActive;
        active = props.active;
    }
    let [shadow, setShadow] = useState(active);

    const stackRef = useRef(null);
    const refocus = useRefocus(stackRef);
    const setActive = value => {
        refocus();
        if (value !== null) {
            setShadow(value);
        }
        setActiveRaw(value)
    };

    const stackAttr = useFocusKeyBindings({
        keyHandlers: [
            {
                keys: ['ArrowDown', 'ArrowRight'],
                handler:
                    () => {
                        let newIndex = (active === null ? shadow : active) + 1;
                        if (newIndex >= entities.length) {
                            newIndex = 0;
                        }
                        if (active === null) {
                            setShadow(newIndex);
                            refocus();
                        } else {
                            setActive(newIndex);
                        }
                    }
            },
            {
                keys: ['ArrowUp', 'ArrowLeft'],
                handler:
                    () => {
                        let newIndex = (active === null ? shadow : active) - 1;
                        if (newIndex < 0) {
                            newIndex = entities.length - 1;
                        }
                        if (active === null) {
                            setShadow(newIndex);
                            refocus()
                        } else {
                            setActive(newIndex);
                        }
                    }
            },
            {
                keys: [' '],
                handler:
                    () => {
                        if (entities.length === 0) {
                            return
                        }
                        if (!deselect && active !== null) {
                            return;
                        }
                        if (active === null) {
                            setActive(shadow !== null ? shadow : 0);
                        } else {
                            setActive(null);
                        }
                    }
            }
        ]
    });

    const items = [];
    let index = 0;
    // TODO use reasonable font width
    const numLen = (('' + entities.length).length + 2) * 8;
    for(let entity of entities) {
        const curr = index;
        const isActive = index === active;
        const attr = {
            onClick: () => {
                if (curr === active) {
                    if (deselect) {
                        setActive(null);
                    }
                } else {
                    setActive(curr);
                }
            }
        };
        if (isActive || (index === shadow && active === null)) {
            attr.tab = true;
        }
        items.push(
            <Stack key={index} border={DIR.BOTTOM} gaps className={'hover-highlight' + (isActive ? ' active-bg' : ' control-bg')} full="h" {...attr}>
                <Block width={numLen} className="less" padded>#{index}</Block>
                <Block shorten padded>{getName(entity)}</Block>
            </Stack>
        );
        index++
    }
    const isEmpty = items.length === 0;

    let elem = (
        <Stack vertical borders full>
            <Block padded full="h">
                <Stack full gaps>
                    <Button icon="add" />
                    <Button disabled={active === null} icon="delete" />
                    <Block full="h" />
                </Stack>
            </Block>
            <Block full ref={stackRef}>
                <Stack vertical full={isEmpty ? true : "h"} scroll {...stackAttr}>
                    {isEmpty ? <Block center className="less">{emptyText}</Block> : items}
                </Stack>
            </Block>
        </Stack>
    );

    if (children) {
        elem = <Stack>
            {elem}
            <Block>{children}</Block>
        </Stack>
    }

    return elem
}


function PropertyGrid({ propWidth = '-', valueWidth = '*', ...props }) {
    // TODO use CSS value
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

    const value = useMemo(() => {
        return {
            startExclusiveMode,
            endExclusiveMode,
            addEventListener,
            removeEventListener,
            getModalLevel,
            openModal,
            closeModal,
            focusStack
        }
    }, [focusStack]);

    return (
        <WindowContext.Provider value={value}>
            {children}
            {fixCursor !== null &&
                <div style={{cursor: (fixCursor ? fixCursor : 'auto'), zIndex: 999999}} className={'fixed pos-0 transparent full-h full-v'}></div>
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

    const tabsRef = useRef(null);
    const refocus = useRefocus(tabsRef);

    const [ active, setActiveRaw ] = useState(props.active !== undefined ? props.active : null);
    const setActive = value => {
        refocus();
        setActiveRaw(value)
    }

    const items = useRef([]);

    const attr = useFocusKeyBindings({
        keyHandlers: [
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
    });

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
            <Button key={item} full current={active} value={item} onClick={setActive} name={item} rev icon="keyboard_arrow_right" />
        );
    }
    return (
        <Stack scroll full borders>
            <Block ref={tabsRef} scroll padded="h">
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
                                    <Button icon="close" onClick={e => close()} />
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

function useMounted() {
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        }
    });
    return mounted;
}

function useFocusKeyBindings({keyHandlers = [], disabled = false, direct }) {
    const [ hasFocus, setHasFocus ] = useState(false);

    const attr = {};

    if (!disabled) {
        attr.onFocus = () => {
            setHasFocus(true);
        };
        attr.onBlur = () => {
            setHasFocus(false);
        };
        if (hasFocus) {
            attr.onKeyDown = e => {
                for (let item of keyHandlers) {
                    if (item.keys && item.keys.includes(e.key)) {
                        item.handler();
                        break;
                    }
                }
            }
        }
        if (direct) {
            attr.tab = true
        }
    }
    return attr;
}

function useRefocus(parentRef, direct = false) {
    const refocusRef = useRef(false);

    useEffect(() => {
        if (refocusRef.current) {
            refocusRef.current = false;
            const elems = parentRef.current.querySelectorAll('.tabbed');
            if (elems.length > 0) {
                elems[0].focus();
            }
        }
    });
    return () => {
        refocusRef.current = true;
    }
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
    CssCtx,
    Scrollbar,
    Portal,

    EntityStack,
    EntityStackSections,
    ActionBarContent,

    PropertyGrid,
    ValueProp,

    useModal,
    useComponentUpdate,
    useMounted,
    useFocusKeyBindings,
    useRefocus
}