import React, { useMemo, useEffect, useRef, useState, Fragment, useContext, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import {d, Storage} from "../helper/helper"
import { DIR, Block, Stack, Grid } from "./LayoutComponents";
import {Button, Number, Color, Form, Submit, InputProp} from "./FormComponents";

const BackgroundContext = React.createContext();

function Ruler({ }) {
    return (
        <Stack full="h" className="less">
            <Block height={3}></Block>
            <Block height={3} full="h" border={DIR.TOP}></Block>
        </Stack>
    )
}

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

function Toolbar({ children }) {
    return (
        <Stack full="h" wrap gaps centerItems className="toolbar-bg">
            {children}
        </Stack>
    )
}


const EditorContext = React.createContext();

function EditorCtx({ id, children }) {

    const wContext = useContext(WindowContext);

    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);
    const [storePos, setStorePos] = useState(0);
    const [historyPos, setHistoryPos] = useState(0);
    const lastId = useRef(null);

    const value = {
        doAction: (doAction, undoAction, uid = null) => {
            let action;
            if (uid !== null && uid === lastId.current) {
                action = past[past.length - 1];
                action.doAction = doAction;
            } else {
                lastId.current = uid;
                action = {doAction, undoAction};
                const newPast = [ ...past ];
                if (newPast.length > 10) {
                    newPast.shift();
                }
                newPast.push(action);
                setPast(newPast);
                setFuture([]);
                setHistoryPos(historyPos + 1);
            }
            action.doAction();
        },
        undoAction: () => {
            lastId.current = null;
            if (past.length === 0) {
                return;
            }
            const newPast = [ ...past ];
            const newFuture = [ ...future ];
            const action = newPast.pop();
            newFuture.push(action);
            setPast(newPast);
            setFuture(newFuture);
            setHistoryPos(historyPos - 1);
            action.undoAction();
        },
        redoAction: () => {
            lastId.current = null;
            if (future.length === 0) {
                return;
            }
            const newPast = [ ...past ];
            const newFuture = [ ...future ];
            const action = newFuture.pop();
            newPast.push(action);
            setPast(newPast);
            setFuture(newFuture);
            setHistoryPos(historyPos + 1);
            action.doAction();
        },
        hasFuture: () => future.length > 0,
        hasPast: () => past.length > 0,
        hasStorePos: () => historyPos === storePos,
        updateRestorePos: () => setStorePos(historyPos),
        clear: () => {
            lastId.current = null;
            setPast([]);
            setFuture([]);
            setHistoryPos(0);
            setStorePos(-1)
        }
    };

    // TODO: this might not work correctly
    useEffect(() => {
        wContext.registerEditor(id, value.clear);
        return () => {
            wContext.unregisterEditor(id)
        }
    }, []);
    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    )
}


function UndoRedoButtons({ hotKeys }) {
    const eContext = useContext(EditorContext);

    if (!hotKeys) {
        hotKeys = {
            undo: {
                exec: () => eContext.undoAction(),
                can: () => eContext.hasPast()
            },
            redo: {
                exec: () => eContext.redoAction(),
                can: () => eContext.hasFuture()
            }
        }
    }
    return (
        <Stack gaps="1">
            <Button icon="undo" onClick={hotKeys.undo}>Undo</Button>
            <Button icon="redo" onClick={hotKeys.redo}>Redo</Button>
        </Stack>

    )
}

function EditorSection({ id, ...props }) {
    return (
        <EditorCtx id={id}>
            <EditorSectionInner { ...props } />
        </EditorCtx>
    )
}

function EditorSectionInner({ name, actions = [], area, link, children, ...props }) {
    const eContext = useContext(EditorContext);

    const hotKeys = {
        undo: {
            exec: () => eContext.undoAction(),
            can: () => eContext.hasPast()
        },
        redo: {
            exec: () => eContext.redoAction(),
            can: () => eContext.hasFuture()
        }
    };
    const header = (
        <Stack full="h" key="eh">
            <Stack full="h" gaps>
                <Block center="v" padded xshorten>{name}</Block>
                <Block className="control-bg" center="v" padded>Resources:</Block>
                <Block center="v" padded className="less">5</Block>
                <Block full="h"> </Block>
            </Stack>
            <Block center="v"><UndoRedoButtons hotKeys={hotKeys} /></Block>
            <Stack center="v" padded="h" gaps="1">
                {
                    actions.map(
                        item => {
                            const attr = {};
                            if (item.disabled && item.disabled(eContext)) {
                                attr.disabled = true;
                            }
                            return (
                                <Button key={item.name} {...attr} padded="h" name={item.name} onClick={() => item.onClick(eContext)} />
                            )
                        }
                    )
                }
            </Stack>
        </Stack>
    );
    return (
        <SectionFrame
            header={header}
            hotKeys={hotKeys}
            link={link}
            area={area}
            name={name} {...props}>
            {children}
        </SectionFrame>
    );
}

function SectionFrame({ header, name, children, hotKeys, area, link, inner, rev, maxSize, minSize, center, centerItems, indented, scroll, full, collapse, ...props }) {
    const wContext = useContext(WindowContext);
    const update = useComponentUpdate();

    const contentRef = useRef(null);

    const [ collapsed, setCollapsed ] = useState(props.collapsed === true);
    const collapseH = collapse === 'h';
    const minDefault = collapseH ? 100 : 25;
    if (!minSize || minSize < minDefault) {
        minSize = minDefault;
    }
    const [ size, setSize ] = useState(props.size && Math.max(props.size, minSize));

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
        hotKeys,
        area,
        link,
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
            handleAttr[sizeProp] = 4;

            const handleCls = 'resize-handle-' + (collapseH ? 'v' : 'h');

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

                let elem = e.target.querySelector('.tabbed');
                if (elem === null) {
                    elem = e.target;
                    do {
                        elem = elem.parentNode;
                        if (!elem) break;

                    } while (
                        !elem.classList && elem.classList.contains('.tabbed')
                    )
                }
                if (elem) {
                    elem.focus();
                }
            };

            const incKey = collapseH ? 'Right' : 'Down';
            const decKey = collapseH ? 'Left' : 'Up';

            const handleKey = e => {
                if (e.key === 'Arrow' + decKey) {
                    if (size > 0 && !(minSize && size <= minSize)) {
                        setSize(size - 1);
                    }
                } else if (e.key === 'Arrow' + incKey) {
                    if (!(maxSize && size >= maxSize)) {
                        setSize(size + 1);
                    }
                }
            };

            const handleElem = (
                <Block onKeyDown={handleKey} className="padded-1" key="t" full={collapseH ? 'v' : 'h'} onMouseDown={onMouseDown} {...handleAttr} cursor={cursor}>
                    <Stack center vertical={collapseH} tab gaps="1" className="hover-highlight">
                        <Block full={collapseH ? 'h' : 'v'} className={'button ' + handleCls}></Block>
                        <Block full={collapseH ? 'h' : 'v'} className={'button ' + handleCls}></Block>
                    </Stack>
                </Block>
            );
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
    items = [];
    if (!collapsed && header) {
        items.push(header);
    } else {
        items.push(
            <Block key="c" verticalText={collapsedByH} full={(!collapsed && collapseH && rev) ? 'h' : false}  center={collapsedByH ? false : 'v'}  shorten padded={collapsedByH ? 'v' : 'h'}>
                {name}
            </Block>
        );
    }

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
        <Stack key="h" padded={!header} {...headerAttr}>
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

function makeOp(customOp, defaultOp, defaultCan = true) {
    const isObj = typeof customOp === 'object';
    const hasCustomExec = isObj && customOp.exec;
    const canByDefault = typeof defaultCan === 'function' ? defaultCan() : defaultCan;
    return {
        exec: () => !customOp || (isObj && !hasCustomExec) ? defaultOp() : (hasCustomExec ? customOp.exec() : customOp()),
        can: () => canByDefault && (!customOp || !isObj || !customOp.can || customOp.can())
    }
}

function Section({ ...props }) {
    return (
        <SectionFrame {...props} />
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

function EntityStack({ entityIndex, set, getName = item => item.value, getInfo, area, addOp, cloneOp, editOp, deleteOp, order, emptyText, deselect, children, ...props }) {
    const eContext = useContext(EditorContext);

    const add = props.add !== undefined ? props.add : !!addOp;
    const clone = props.clone !== undefined ? props.clone : !!cloneOp;
    const del = props.del !== undefined ? props.del : !!deleteOp;

    useUpdateOnEntityIndexChanges(entityIndex);

    let [active, setActiveRaw] = useState(props.active === undefined ? null : props.active);
    const entities = entityIndex.getEntityObjects();
    if (props.setActive !== undefined) {
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

    const indexSize = entityIndex.getLength();

    if (indexSize > 0 && active >= indexSize) {
        // TODO check why setActive does not work here
        setActiveRaw(indexSize - 1);
        return ''
    }

    const items = [];
    let index = 0;
    // TODO use reasonable font width
    const numLen = (('' + indexSize).length + 2) * 8;
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
                <Stack vertical full="h" padded gaps>
                    <Block shorten>{getName(entity)}</Block>
                    {getInfo && <Block className="less" shorten>{getInfo(entity)}</Block>}
                </Stack>
            </Stack>
        );
        index++
    }
    const isEmpty = items.length === 0;

    const execAdd = () => d('ADD');

    const execDelete = () => {
        const oldEntity = entityIndex.getEntityObject(active);
        eContext.doAction(
            () => entityIndex.deleteEntity(oldEntity.index),
            () => entityIndex.setEntityObject(oldEntity)
        )
    };

    const execClone = () => {
        const index = active;
        const cloneEntity = { ...entityIndex.getEntityObject(index) };

        let no = 2;
        let name = cloneEntity.value;
        const matches = name.match(/ #(\d)+$/);
        if (matches) {
            name = name.substr(0, matches.index + 2);
            no = parseInt(matches[1])
        } else {
            name += ' #';
        }
        while (entityIndex.hasPropValue('value', name + no)) {
            no++;
        }
        cloneEntity.value = name + no;
        cloneEntity.index++;
        eContext.doAction(
            () => entityIndex.setEntityObject(cloneEntity),
            () => entityIndex.deleteEntity(index + 1)
        );
        setActive(cloneEntity.index);
    };

    const execUp = !order ? null : () => {
        const index = active;
        eContext.doAction(
            () => {
                const old = entityIndex.getEntityObject(index - 1);
                entityIndex.deleteEntity(index - 1);
                entityIndex.setEntityObject({ ...old, index});
            },
            () => {
                const old = entityIndex.getEntityObject(index);
                entityIndex.deleteEntity(index);
                entityIndex.setEntityObject({ ...old, index: index - 1});
            }
        );
        setActive(index - 1)
    };

    const execDown = !order ? null : () => {
        const index = active;
        eContext.doAction(
            () => {
                const old = entityIndex.getEntityObject(index + 1);
                entityIndex.deleteEntity(index + 1);
                entityIndex.setEntityObject({ ...old, index});
            },
            () => {
                const old = entityIndex.getEntityObject(index);
                entityIndex.deleteEntity(index);
                entityIndex.setEntityObject({ ...old, index: index + 1});
            }
        );
        setActive(index + 1)
    };

    const hotKeys = {
        new: makeOp(addOp, execAdd),
        delete: makeOp(deleteOp, execDelete, active !== null && items.length > 0),
        clone: makeOp(cloneOp, execClone, clone && active !== null),
        up: {
            exec: () => execUp(),
            can: () => active !== null && active > 0
        },
        down: {
            exec: () => execDown(),
            can: () => active !== null && active < (entityIndex.getLength() - 1)
        },
    };

    let elem = (
        <Stack vertical borders full area={area} hotKeys={hotKeys}>
            <Block full="h">
                <Stack full wrap gaps className="toolbar-bg">
                    {add && <Button icon="add" onClick={hotKeys.new} />}
                    {clone && <Button icon="content_copy" onClick={hotKeys.clone} />}
                    {del && <Button icon="delete" onClick={hotKeys.delete} />}
                    {order && <Button icon="keyboard_arrow_up" onClick={hotKeys.up} />}
                    {order && <Button icon="keyboard_arrow_down" onClick={hotKeys.down} />}
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
        <Grid full gaps={cssContext.values.defaultPadding} columns={columns.join(' ')} rows={rows.join(' ')}>
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
    const cssContext = useContext(CssContext);
    const cssRef = useRef(null);
    cssRef.current = cssContext;

    const [ fixCursor, setFixCursor ] = useState(null);
    const lastTarget = useRef(null);
    const modeRef = useRef(null);

    const settingsRef = useRef(null);
    const modalStack = useMemo(() => [],[]);
    const focusStack = useMemo(() => { return {elem: {}, zIndex: null}}, []);
    const storage = useMemo(() => {
        return new Storage(localStorage, 'remake-engine.editor.');
    }, []);

    const listeners = useMemo(() => { return {} }, []);
    const editors = useMemo(() => { return {} }, []);
    const styleLock = useMemo(() => {
        return {
            state: 'unlocked',
            style: null
        }
    }, []);

    const defaults = useMemo(() => {
        return {
            config: [
                {
                    name: 'Defaults',
                    values: {
                        maxWidth: 1600,
                        noMaxWidth: false,
                        maxHeight: 1200,
                        noMaxHeight: true,
                        uiAnimations: true,
                        maxHistory: 10
                    }
                }
            ],
            theme: [
                {
                    name: 'Defaults',
                    values: cssContext.values
                }
            ],
            mapping: [
                {
                    name: 'Defaults',
                    values: {
                        undo: 'm z',
                        redo: 'm y',
                        save: 'm s',
                        export: 'm x',
                        new: 'c n',
                        select: null,
                        delete: 'c d',
                        quit: 'c q',
                        edit: 'm e',
                        all: 'c a',
                        pick: 'c p',
                        play: 'm p',
                        close: 'Escape'
                    }
                }
            ]
        }
    }, []);
    const defaultEditorConfig = defaults.config[0].values;
    const defaultTheme = defaults.theme[0].values;
    const defaultMapping = defaults.mapping[0].values;

    const editorConfig = useMemo(() => {
        return storage.getDefaultedJson('config', defaultEditorConfig);
    }, []);

    const theme = useMemo(() => {
        return storage.getDefaultedJson('theme', defaultTheme);
    }, []);

    const hotKeyActions = useMemo(() => {
        const action2hotKey = storage.getDefaultedJson('hotkeys', defaultMapping);
        const hotKey2action = {};
        for (let [action, key] of Object.entries(action2hotKey)) {
            if (key !== null) {
                hotKey2action[key] = action;
            }
        }
        return {
            action2hotKey,
            hotKey2action
        }
    }, []);

    const links = useMemo(() => {
        return {defaults: [], backups: []}
    }, []);

    const syncLinks = currLinks => {
        const elems = document.querySelectorAll('link');
        const parts = currLinks.split(' ');
        const found = [];
        for (let elem of elems) {
            const href = elem.href;
            if (
                links.defaults.includes(href) ||
                links.backups.includes(href) ||
                parts.includes(href)) {
                found.push(elem);
            } else {
                const parent = elem.parentNode;
                parent.removeChild(elem);
            }
        }
        const head = document.querySelector('head');
        for (let part of parts) {
            if (!found.includes(part)) {
                const linkNode = document.createElement('link');
                linkNode.href = part;
                linkNode.rel = 'stylesheet';
                linkNode.type ='text/css';
                head.appendChild(
                    linkNode
                );
            }
        }
    };

    useEffect(() => {
        // 1. get current link elements
        const elems = document.querySelectorAll('link');
        for (let elem of elems) {
            links.defaults.push(elem.href);
        }

        cssContext.setStyleToValues(document.body.style, theme);
        cssContext.update();

        document.body.style.setProperty('--max-width', editorConfig.noMaxWidth ? 'none' :  editorConfig.maxWidth + 'px');
        document.body.style.setProperty('--max-height', editorConfig.noMaxHeight ? 'none' :  editorConfig.maxHeight + 'px');
        syncLinks(theme.linkResources);

    }, []);

    const elemKeyBindings = useMemo(() => [], []);

    const addElemKeyBinding = (elem, action2handlers = {}, area = null, link = null) => {
        if (elem === null) {
            return;
        }
        if (!link) {
            link = []
        } else if (!Array.isArray(link)) {
            link = [link];
        }
        elemKeyBindings.push([elem, action2handlers, area, getModalLevel(), link]);
    };

    const deleteElemKeyBindings = elem => {
        let index = 0;
        for (let item of elemKeyBindings) {
            if (item[0] === elem) {
                elemKeyBindings.splice(index, 1);
                break;
            }
            index++;
        }
    };

    const getHotKeyArea = area => {
        const currLevel = getModalLevel();
        for (let item of elemKeyBindings) {
            if (currLevel === item[3] && item[2] == area) {
                return item[0];
            }
        }
        return null;
    };

    const focusHotKeyArea = area => {
        let elem = getHotKeyArea(area);
        if (elem) {
            elem = elem.querySelector('.tabbed');
            if (elem) {
                elem.focus();
                lastTarget.current = elem;
                return true;
            }
        }
        return false;
    };

    const getHandlerForAction = (action, elem, followLinks = true, passed = false) => {
        const currLevel = getModalLevel();
        for (let [node, bindings, area, level, links] of elemKeyBindings) {
            if (elem === node && level === currLevel) {
                passed = true;
                const binding = bindings[action];
                if (binding) {
                    return binding
                }
                if (followLinks) {
                    for (let link of links) {
                        const node = getHotKeyArea(link);
                        if (node) {
                            const binding = getHandlerForAction(action, node, false, passed);
                            if (binding) {
                                return binding
                            }
                        }
                    }
                }
            }
        }
        if (!followLinks || !elem || elem.id === 'modals-container') {
            return passed ? undefined : false;
        }
        elem = elem.parentNode;
        if (elem) {
            return getHandlerForAction(action, elem, true, passed)
        }
        return passed ? undefined : false
    };

    const getHandlerForActionKey = (actionKey, elem) => {
        if (elemKeyBindings.length === 0) {
            return null;
        }
        const action = hotKeyActions.hotKey2action[actionKey];
        if (!action) {
            return null;
        }
        let handler = getHandlerForAction(action, elem);

        if (handler === false) {
            // try hotkey region 1 when no area was found along the node path
            const node = getHotKeyArea(1);
            if (node) {
                handler = getHandlerForAction(action, node);
            }
        }

        return handler ? handler : null;
    };

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
        focusStack.elem[zIndex] = {top: null, start: null, lastTarget: lastTarget.current };
        return zIndex;
    };
    const closeModal = zIndex => {
        const index = modalStack.indexOf(zIndex);
        if (index === -1) {
            return;
        }
        modalStack.splice(index, 1);
        lastTarget.current = focusStack.elem[zIndex].lastTarget;
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

    const isInExclusiveMode = () => modeRef.current !== null;

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

    const registerEditor = (id, clear) => {
        editors[id] = clear
    };

    const unregisterEditor = id => {
        delete editors[id]
    };

    const clearEditor = id => {
        if (editors[id]) {
            editors[id]()
        }
    };

    const isStyleLocked = () => styleLock.state !== 'unlocked';

    const setStyleLock = (state, cssStyle = null) => {
        if (state === 'locked') {
            styleLock.state = 'locked';
            styleLock.style = cssStyle;
            links.backups = theme.linkResources.split(' ');
        } else if (state === 'saved') {
            styleLock.state = 'saved';
        } else if (state === 'unlocked') {
            if (styleLock.state !== 'saved' && styleLock.style !== null) {
                for (let [key, value] of Object.entries(styleLock.style)) {
                    cssContext.cssPropUpdate.current(document.body.style, key, value);
                }
            } else {
                cssContext.update();
            }
            styleLock.style = null;
            links.backups = [];
            styleLock.state = 'unlocked';
        }
    };

    const clearAllSettings = () => {
        const keys = storage.getKeys();
        for(let key of keys) {
            if (!key.startsWith('presets.')) {
                storage.deleteJson(key);
            }
        }
    };

    const openSettings = () => {
        setStyleLock('locked', cssRef.current.values);
        settingsRef.current.open({
            defaults: {
                mapping: defaultMapping,
                theme: defaultTheme,
                config: defaultEditorConfig
            },
            cleanUp: () => {
                setStyleLock('unlocked');
                syncLinks(theme.linkResources);
            },
            save: (newSettings, persist = true) => {
                const diff = [];
                for (let [action, hotKey] of Object.entries(newSettings.mapping)) {
                    const oldHotKey = hotKeyActions.action2hotKey[action];
                    if (hotKey !== oldHotKey) {
                        diff.push([action, hotKey, oldHotKey]);
                    }
                }
                for(let [action, hotKey, oldHotKey] of diff) {
                    hotKeyActions.action2hotKey[action] = hotKey;
                    if (oldHotKey !== null) {
                        delete hotKeyActions.hotKey2action[oldHotKey];
                    }
                    if (hotKey !== null) {
                        hotKeyActions.hotKey2action[hotKey] = action;
                    }
                }
                for (let [key, value] of Object.entries(newSettings.config)) {
                    editorConfig[key] = value;
                }

                for (let [key, value] of Object.entries(newSettings.theme)) {
                    theme[key] = value;
                }
                if (persist) {
                    storage.storeJson('hotkeys', hotKeyActions.action2hotKey);
                    storage.storeJson('config', newSettings.config);
                    storage.storeJson('theme', newSettings.theme);
                }

                setStyleLock('saved');
                settingsRef.current.close()
            }
        });
    };

    const value = useMemo(() => {
        return {
            lastTarget,
            editorConfig,
            theme,
            startExclusiveMode,
            endExclusiveMode,
            isInExclusiveMode,
            addEventListener,
            removeEventListener,
            getModalLevel,
            openModal,
            closeModal,
            registerEditor,
            unregisterEditor,
            clearEditor,
            addElemKeyBinding,
            deleteElemKeyBindings,
            getHotKeyArea,
            focusHotKeyArea,
            getHandlerForActionKey,
            hotKeyActions,
            settingsRef,
            openSettings,
            clearAllSettings,
            setStyleLock,
            isStyleLocked,
            syncLinks,
            cssPropUpdate: cssContext.cssPropUpdate,
            defaults,
            storage,
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
    };

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

            <Block full>
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
    const [ isOpen, setIsOpen ] = useState(false);
    const propsRef = useRef(null);
    const currRef = useRef(null);
    currRef.current = isOpen;

    const close = () => {
        if (propsRef.current && propsRef.current.cleanUp) {
            propsRef.current.cleanUp();
        }
        propsRef.current = null;
        context.closeModal(currRef.current);
        setIsOpen(false);
    };
    const open = props => {
        propsRef.current = props;
        setIsOpen(context.openModal());
    };
    const content = function ({full, fixStyle, width, maxWidth, minWidth, height, maxHeight, minHeight, transparent, drag, ...props}) {
        const title = propsRef.current && propsRef.current.title ? propsRef.current.title : props.name;
        const dimProps = {full, width, height, maxWidth, minWidth, maxHeight, minHeight};
        dimProps.zIndex = isOpen;
        return (
            <>
                {isOpen && <Modal close={close} name={title} drag={drag} transparent={transparent} closeable={props.closeable} fixStyle={fixStyle} {...dimProps}>{props.children}</Modal>}
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

function OkCancelForm({ full, save, cancel, submit, buttons = [], children }) {
    let elem = (
        <Stack vertical borders full={full}>
            <Block full={full} scroll>
                {children}
            </Block>
            <Stack className="toolbar-bg" full="h" gaps padded>
                {submit ? <Submit padded="h" name="OK" onClick={save} /> : <Button padded="h" onClick={save} name="OK" />}
                <Button padded="h" onClick={cancel} name="Cancel" />
                {buttons.length > 0 ? <Block full="h" /> : ''}
                {buttons}
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

function ThemeFreeze({ blockRef, children }) {
    const cContext = useContext(CssContext);
    const [fixValue, setFixValue] = useState({ ...cContext.values, setStyles: cContext.setStyles });

    useEffect(() => {
        fixValue.setStyles(blockRef.current.style);
    }, []);

    return (
        <CssContext.Provider value={fixValue}>
            {children}
        </CssContext.Provider>
    )
}

/**
 */
const Modal = function ({ name, close, fixStyle, closeable = true, zIndex = 0, full, width, transparent, maxWidth, minWidth, height, maxHeight, drag, children }) {
    const wContext = useContext(WindowContext);

    const trapRef = useRef(null);
    const dimRef = useRef(null);
    const [left, setLeft] = useState(null);
    const [top, setTop] = useState(null);
    const [dim, setDim] = useState(null);

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
        const elem = trapRef.current.querySelector('.tabbed.autofocus');
        if (elem) {
            elem.focus();
        } else {
            focusElem.start.focus();
        }
    }, []);

    useEffect(() => {
        if (drag) {
            const observer = new ResizeObserver(
                entries => {
                    const rect = dimRef.current.getBoundingClientRect();
                    const dim = entries[0].contentRect;

                    const spaceX = dim.width - rect.width;
                    const spaceY = dim.height - rect.height;

                    let newPosX = null;
                    let newPosY = null;
                    if (rect.x < 0 || dim.width < (rect.x + rect.width)) {
                        newPosX = spaceX < 0 ?
                            0 : Math.round((dim.width / 2) - (rect.width / 2));
                    }
                    if (rect.y < 0 || dim.height < (rect.y + rect.height)) {
                        newPosY = spaceY < 0 ?
                            0 : Math.round((dim.height / 2) - (rect.height / 2));
                    }

                    if (newPosX !== null) {
                        setLeft(newPosX);
                    }
                    if (newPosY !== null) {
                        setTop(newPosY);
                    }
                }
            );
            observer.observe(document.body);

            const rect = dimRef.current.getBoundingClientRect();
            setDim(rect);
            setLeft(rect.left);
            setTop(rect.top);

            return () => {
                observer.disconnect();
            };
        }
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

    const hDivCls = ['center-v center-h'];
    if (!full || (full === 'v')) {
        hDivCls.push('min-content-h');
    }
    if (!transparent) {
        hDivCls.push('block');
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
        minWidth,
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

    const vDivCls = ['stack-v full-h boxed modal-centered'];
    if (full && full !== 'h') {
        vDivCls.push('full-v');
    }
    if (transparent) {
        vDivCls.push('shadow');
    }

    const hotKeys = {};
    if (closeable) {
        hotKeys.close = close
    }

    const overlayCls = ['fixed pos-0'];
    if (!transparent) {
        overlayCls.push('modal-overlay');
    }

    const nameAttr = {};
    if (drag) {
        nameAttr.cursor = 'grab';
        nameAttr.onMouseDown = e => {
            const rect = dimRef.current.getBoundingClientRect();
            const dim = document.body.getBoundingClientRect();

            const anchorPos = {x: e.clientX, y: e.clientY};
            let lastPosX = anchorPos.x;
            let lastPosY = anchorPos.y;
            const minLeft = -rect.width / 2;
            const maxLeft = Math.max(dim.width - (rect.width / 2), 0);
            const minTop = 0;
            const maxTop = Math.max(dim.height - (rect.height / 2), 0);
            const offX = lastPosX - rect.x;
            const offY = lastPosY - rect.y;
            wContext.startExclusiveMode('modal-drag', 'grab');
            wContext.addEventListener('mousemove', e => {
                const relPos = {x: e.clientX - anchorPos.x, y: e.clientY - anchorPos.y};
                if (relPos.x !== lastPosX || relPos.y !== lastPosY) {
                    lastPosX = relPos.x;
                    setLeft(Math.min(Math.max(e.clientX - offX, minLeft), maxLeft));
                    lastPosY = relPos.y;
                    setTop(Math.min(Math.max(e.clientY - offY, minTop), maxTop));
                }
            });
            wContext.addEventListener('mouseup', () => {
                wContext.endExclusiveMode('modal-drag')
            }, {once: true});
            e.stopPropagation();
            e.preventDefault();
        };
    }

    if (dim !== null) {
        vDivStyle.left = left;
        vDivStyle.top = top;
        vDivStyle.position = 'fixed';
        vDivStyle.width = dim.width;
        vDivStyle.maxWidth = null;
        vDivStyle.minWidth = null;
        vDivStyle.height = dim.height;
        vDivStyle.maxHeight = null;
        vDivStyle.minHeight = null;
    }

    let elem = <Block ref={trapRef} area={1} hotKeys={hotKeys} full className={overlayCls.join(' ')} onClick={onClick} zIndex={zIndex - 1}>
        <div className="center-v center-h full-h editor-bounds">
            <div className="center-h block" style={parentDivStyle}>
                <div className={hDivCls.join(' ')} style={hDivStyle}>
                    <div ref={dimRef} className={vDivCls.join(' ')} style={vDivStyle}>
                        <Stack gaps full="h" { ...nameAttr } padded>
                            <Block center="v" shorten full="h">{name}</Block>
                            {closeable ? <Button icon="close" onClick={e => close()} /> : ''}
                        </Stack>
                        <div className="border-div-v"></div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    </Block>;

    if (wContext.isStyleLocked()) {
        elem = <ThemeFreeze blockRef={trapRef}>{elem}</ThemeFreeze>
    }

    return (
        <Portal id="modals-container">
            {elem}
        </Portal>
    );
};

function NameDialog({ close, save, max, reserved = [], ...props }) {
    const [name, setName] = useState(props.name || '');
    const matching = props.match ? props.match : () => true;
    const match = value => !reserved.includes(value) && matching(value);
    return (
        <OkCancelForm full="h" submit padded cancel={close} save={() => save(name)}>
            <Block full="h" padded>
                <PropertyGrid full="h">
                    <InputProp full="h" autoFocus name="Name:" value={name} set={setName} match={match} max={max} required />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function Icon({ name, width, height, className, size = 18 }) {
    const style = {
        width: width || size,
        height: height || size
    };
    const cls = ['min-content-h center-h'];
    if (className) {
        cls.push(className);
    }
    return (
        <div style={style} className={cls.join(' ')} key={1} dangerouslySetInnerHTML={{ __html: '<i class="material-icons center-h min-content-h" style="font-size: ' + size + 'px; display: block">' + name + '</i>' }} />
    );
}

function CellMarker({ dir = DIR.ALL, type, posX, posY, sizeX = 1, sizeY = 1, highlight, onClick, onResize, onMove, onMouseDown, zoom = 1, border = 0, width = 1, height = 1, moveCursor, ...props }) {
    if (posX === null || posY === null) {
        return '';
    }
    sizeX = sizeX * zoom;
    sizeY = sizeY * zoom;

    const hasResize = onResize && !onClick;
    const hasMove = !!onMove;

    const overhang = 8;

    const offset = {
        top: border + (sizeY + border) * posY  - overhang,
        left: border + (sizeX + border) * posX - overhang,
        width: 'min-content',
        height: 'min-content'
    };
    if (type === 'row-gap') {
        const baseline = Math.round(border / 2) + posY * (sizeY + border) - overhang;
        offset.top =  baseline - overhang - border;
        offset.left = -overhang;
    } else if (type === 'column-gap') {
        const baseline = Math.round(border / 2) + posX * (sizeX + border) - overhang;
        offset.left =  baseline - overhang - border;
        offset.top = -overhang;
    }
    const centerStyle = {
        width: (type === 'column-gap' ? 2 * overhang  : sizeX * width + (width - 1) * border),
        height: (type === 'row-gap' ? 2 * overhang : sizeY * height + (height - 1) * border)
    };

    const markerCls = 'marker-cell' + (highlight ? '-highlight' : '');
    const cls = ['marker-grid'];

    const clsCenter = [];
    if (['rows', 'columns', 'row-gap', 'column-gap'].indexOf(type) !== -1) {
        clsCenter.push(markerCls);
    }
    let centerClickHandler = null;
/*
    if (pointer) {
        clsCenter.push('cursor-' + pointer);
    }

 */
    if (hasMove) {
        centerStyle.cursor = moveCursor ? moveCursor : 'move';
        centerClickHandler = e => {
            onMove(e);
        }
    }

    const clsRight = [];
    let rightClickHandler = null;
    if (DIR.RIGHT & dir) {
        clsRight.push(markerCls);
        if (hasResize) {
            clsRight.push('cursor-hresize');
            rightClickHandler  = e => {
                onResize(e, 'x', false);
            };
        }
    }
    const clsTopLeft = [];
    let topLeftClickHandler = null;
    if ((DIR.LEFT & dir) && (DIR.TOP & dir)) {
        clsTopLeft.push(markerCls);
        if (hasResize) {
            clsTopLeft.push('cursor-nwseresize');
            topLeftClickHandler  = e => {
                onResize(e, 'xy', true, true);
            };
        }
    }
    const clsTopRight = [];
    let topRightClickHandler = null;
    if ((DIR.RIGHT & dir) && (DIR.TOP & dir)) {
        clsTopRight.push(markerCls);
        if (hasResize) {
            clsTopRight.push('cursor-neswresize');
            topRightClickHandler  = e => {
                onResize(e, 'xy', false, true);
            };
        }
    }
    const clsLeft = [];
    let leftClickHandler = null;
    if (DIR.LEFT & dir) {
        clsLeft.push(markerCls);
        if (hasResize) {
            clsLeft.push('cursor-hresize');
            leftClickHandler  = e => {
                onResize(e, 'x', true);
            };
        }
    }
    const clsTop = [];
    let topClickHandler = null;
    if (DIR.TOP & dir) {
        clsTop.push(markerCls);
        if (hasResize) {
            clsTop.push('cursor-vresize');
            topClickHandler  = e => {
                onResize(e, 'y', null, true);
            };
        }
    }
    const clsBottom = [];
    let bottomClickHandler = null;
    if (DIR.BOTTOM & dir) {
        clsBottom.push(markerCls);
        if (hasResize) {
            clsBottom.push('cursor-vresize');
            bottomClickHandler  = e => {
                onResize(e, 'y', null, false);
            };
        }
    }
    const clsBottomLeft = [];
    let bottomLeftClickHandler = null;
    if ((DIR.LEFT & dir) && (DIR.BOTTOM & dir)) {
        clsBottomLeft.push(markerCls);
        if (hasResize) {
            clsBottomLeft.push('cursor-neswresize');
            bottomLeftClickHandler  = e => {
                onResize(e, 'xy', true, false);
            };
        }
    }
    const clsBottomRight = [];
    let bottomRightClickHandler = null;
    if ((DIR.RIGHT & dir) && (DIR.BOTTOM & dir)) {
        clsBottomRight.push(markerCls);
        if (hasResize) {
            clsBottomRight.push('cursor-nwseresize');
            bottomRightClickHandler  = e => {
                onResize(e, 'xy', false, false);
            };
        }
    }

    if (props.blink) {
        cls.push('blink');
    }
    cls.push('all-events');
    const divAttr = {
        style: offset,
        className: cls.join(' ')
    };
    if (props.dblClick) {
        divAttr.onDoubleClick = props.dblClick;
    } else if (onClick) {
        divAttr.onClick = onClick;
    } else if (onMouseDown) {
        divAttr.onMouseDown = onMouseDown;
    }
    let matrix = '';

    return (
        <div {...divAttr}>
            <div className={clsTopLeft.join(' ')} onMouseDown={topLeftClickHandler}></div>
            <div className={clsTop.join(' ')} onMouseDown={topClickHandler}></div>
            <div className={clsTopRight.join(' ')} onMouseDown={topRightClickHandler}></div>

            <div className={clsLeft.join(' ')} onMouseDown={leftClickHandler}></div>
            <div className={clsCenter.join(' ')} onMouseDown={centerClickHandler} style={centerStyle}>{matrix}</div>
            <div className={clsRight.join(' ')} onMouseDown={rightClickHandler}></div>

            <div className={clsBottomLeft.join(' ')} onMouseDown={bottomLeftClickHandler}></div>
            <div className={clsBottom.join(' ')} onMouseDown={bottomClickHandler}></div>
            <div className={clsBottomRight.join(' ')} onMouseDown={bottomRightClickHandler}></div>
        </div>
    )
}


function getCssConstProp(prop) {
    let i = 0;
    const iMax = prop.length;
    let result = '--';
    while (i < iMax) {
        const char = prop[i];
        const lc = char.toLowerCase();
        if (lc !== char) {
            result += '-';
        }
        result +=  lc;
        i++;
    }
    return result;
}

const CssContext = React.createContext();

function CssCtx({ children }) {
    const [updates, setUpdates] = useState(0);
    const updatesRef = useRef(null);
    updatesRef.current = updates;
    const cssPropUpdate = useRef(null);

    const type2props = useMemo(() => {
        return {
            px: [
                'defaultPadding',
                'boxBorderWidth',
                'maxWidth',
                'maxHeight',

                'buttonBorderRadius'
            ],
            color: [
                'boxBorderColor',
                'toolbarBgColor',

                'inputBgColor',
                'inputColor',
                'inputBorderColor',

                'editorBgColor',
                'editorColor',
                'buttonBgColor',
                'buttonColor',
                'buttonBorderColor'
            ],
            string: [
                'buttonFontFamily',
                'buttonBorderStyle'
            ],
            url: ['linkResources']
        }
    }, []);

    const value = useMemo(() => {
        const style = getComputedStyle(document.body);
        const values = {};

        for(let prop of type2props.px) {
            const constProp = getCssConstProp(prop);
            const value = parseInt(style.getPropertyValue(constProp), 10);
            values[prop] = value;
        }
        for(let prop of type2props.color) {
            const constProp = getCssConstProp(prop);
            const value = style.getPropertyValue(constProp).trim();
            values[prop] = value;
        }
        for(let prop of type2props.url) {
            const constProp = getCssConstProp(prop);
            const value = style.getPropertyValue(constProp).trim();
            values[prop] = value.substr(1, value.length - 2);
        }
        for (let prop of type2props.string) {
            const constProp = getCssConstProp(prop);
            const value = style.getPropertyValue(constProp).trim();
            values[prop] = value;
        }

        cssPropUpdate.current = (css, prop, value) => {
            const constProp = getCssConstProp(prop);
            if (type2props.px.includes(prop)) {
                value = value + 'px';
            }
            css.setProperty(constProp, value);
        };
        const setStyles = (style, props = null) => {
            let pxProps = type2props.px;
            let colProps = type2props.color;
            if (props) {
                pxProps = pxProps.filter(prop => props.includes(prop));
                colProps = colProps.filter(prop => props.includes(prop));
            }

            for(let prop of pxProps) {
                const constProp = getCssConstProp(prop);
                style.setProperty(constProp, values[prop] + 'px');
            }
            for(let prop of colProps) {
                const constProp = getCssConstProp(prop);
                style.setProperty(constProp, values[prop])
            }
        };

        const setStyleToValues = (style, values) => {
            for (let [key, value] of Object.entries(values)) {
                cssPropUpdate.current(style, key, value);
            }
        };
        return {
            values,
            update: () => setUpdates(updatesRef.current + 1),
            cssPropUpdate,
            setStyles,
            setStyleToValues
        };
    }, [updates]);

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

function useUpdateOnEntityIndexChanges(entityIndex) {
    const update = useComponentUpdate();

    useEffect(
        () => {
            entityIndex.addListener(update);
            return () => {
                entityIndex.removeListener(update);
            }
        },
        [entityIndex]
    );
    return update;
}

export {
    AvailContext,
    AvailContextProvider,
    Canvas,
    EditorSection,
    Section,
    Toolbar,
    ToolGroup,
    WindowContext,
    WindowCtx,
    ScrollArea,
    BackgroundCtx,
    BackgroundControl,
    SideTabs,
    SideTab,
    CssCtx,
    CssContext,
    Scrollbar,
    Portal,
    EditorContext,
    EditorCtx,
    UndoRedoButtons,
    OkCancelForm,
    Ruler,
    Icon,
    CellMarker,

    EntityStack,
    EntityStackSections,
    ActionBarContent,

    NameDialog,

    PropertyGrid,
    ValueProp,

    useModal,
    useComponentUpdate,
    useUpdateOnEntityIndexChanges,
    useMounted,
    useFocusKeyBindings,
    useRefocus
}