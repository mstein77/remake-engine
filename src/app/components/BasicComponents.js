import React, { useMemo, useEffect, useRef, useState, Fragment, useContext, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { d, Storage, getCanvasForBitmap, getCanvasForDim, getUniqueName, hex2rgb, rgb2hex } from "../helper/helper"
import { DIR, Block, Stack, Grid } from "./LayoutComponents";
import { Button, Number, Color, OkCancelForm, ColorPicker } from "./FormComponents";
import { CellValue } from "../classes/Grid";
import { CellSelection } from "../classes/CellProvider";
import { ImageIndex } from "../classes/EntityIndex";

const defaultValues = {
    config: {
        maxWidthPx: 1600,
        noMaxWidth: false,
        maxHeightPx: 1200,
        noMaxHeight: true,
        uiAnimations: true,
        maxHistory: 10
    },
    theme: {
        defaultPaddingPx: 9,
        boxBorderWidthPx: 1,
        maxWidthPx: 1200,
        maxHeightPx: 1200,
        buttonBorderRadiusPx: 4,
        boxBorderRgb: "#2b7797",
        toolbarBgRgb: "#2f304b",
        inputBgRgb: "#b0aec1",
        inputRgb: "#29292e",
        inputBorderRgb: "#a8a8a8",
        editorBgRgb: "#080808",
        editorRgb: "#9aa0a2",
        buttonBgRgb: "#1e42ae",
        buttonRgb: "#b0d5e8",
        buttonBorderRgb: "#347f66",
        buttonBorderWidthPx: 1,
        buttonPaddingPx: 3,
        errorBgRgb: '#AA0020',
        errorRgb: '#E0E0A0',
        linkResourcesUrls: "https://fonts.googleapis.com/icon?family=Material+Icons https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i",
        buttonFont: "Monospace",
        buttonBstyle: "solid",
        fontUrl: "https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i"
    },
    mapping: {
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
};

const BackgroundContext = React.createContext();

function CenterInfo({ icon, iconSize, children }) {
    const elem = (
        <Block padded center="v" full="h" wrap className="less text-center ">
            {children}
        </Block>
    );
    if (!icon) return elem;

    return (
        <Stack full>
            <Block padded center="v">
                <Icon name={icon} size={iconSize} />
            </Block>
            {elem}
        </Stack>
    )
}

function LoadingIndicator({msg = 'please wait...'}) {
    return (
        <Stack center>
            <Block padded center="v">
                <Icon name="refresh" className="icon-rotate" />
            </Block>
            <Block full centerItems className="less">{msg}</Block>
        </Stack>
    );
}

function Ruler({ }) {
    return (
        <Stack full="h" className="less">
            <Block height={3}></Block>
            <Block height={3} full="h" border={DIR.TOP}></Block>
        </Stack>
    )
}

function BackgroundCtx({ children }) {
    const [ color, setColor ] = useState('#20222288');

    const value = {
        color,
        setColor,
        css: color
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
        <Color name="Background:" value={bContext.color} alpha set={bContext.setColor} />
    )
}

function Canvas({ id, width, height, smoothing, render, plain, border, className }) {
    const eContext = useContext(EditorContext);
    const isMounted = useMounted();
    const canvasRef = useRef(null);

    useEffect(() => {
        const doRender = () => {
            if (!canvasRef.current || !render) {
                return;
            }
            const ctx = canvasRef.current.getContext('2d');
            ctx.imageSmoothingEnabled = smoothing ? true : false;
            render(ctx)
        };
        if (eContext && id) {
            eContext.setRenderGrid(id, () => {
                if (isMounted.current) {
                    doRender();
                }
            });
        }
        doRender();
    });

    useEffect(() => {
        if (id && eContext) {
            return () => {
                eContext.unsetRenderGrid(id)
            };
        }
    }, []);

    if (height === 0 || width === 0) return '';

    const cls = ['relative content-box'];
    if (className) {
        cls.push(className);
    }
    if (border) {
        cls.push('outline' + (border !== true ? '-1' : ''));
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

    const [ lastMode, setLastMode ] = useState(null);
    const [ lastModeParams, setLastModeParams ] = useState({});

    const [ past, setPast ] = useState([]);
    const [ future, setFuture ] = useState([]);
    const [ storePos, setStorePos ] = useState(0);
    const [ historyPos, setHistoryPos ] = useState(0);
    const [ targetCellValue, setTargetCellValue ] = useState(CellValue.raw);
    const [ hasSelection, setHasSelection ] = useState(false);
    const [ selection, setSelectionRaw ] = useState(new CellSelection());

    const setSelection = selection => {
        setTargetCellValue(selection.getCellValue());
        setSelectionRaw(selection);
    };

    const propsRef = useRef(null);
    propsRef.current = {
        mode: lastMode,
        modeParams: lastModeParams,
        past,
        future,
        storePos,
        historyPos,
        targetCellValue,
        hasSelection,
        selection
    };
    const setter = useMemo(
    () => {
            const renderGrids = {};
            let gridActions = {};
            let select = {
                has: false,
                get: null
            };
            let lastId = null;

            return {
                setMode: (mode, params = {}) => {
                    d('SETTING MODE', mode, params);
                    setLastMode(mode);
                    setLastModeParams(params);
                },
                setGridActions: actions => gridActions = actions,
                getGridAction: name => {
                    return gridActions[name];
                },
                getGridActions: () => gridActions,
                doGridAction: (name, data) => {
                    d('DO ACTION', name);
                    const action = gridActions[name];
                    if (!action || (action.can && !action.can())) return;
                    return action.exec(data)
                },

                setRenderGrid: (id, update) => {
                    renderGrids[id] = update;
                },
                unsetRenderGrid: id => {
                    delete renderGrids[id]
                },
                renderGrid: id => {
                    const doRender = renderGrids[id];
                    if (doRender) {
                        requestAnimationFrame(() => {
                            doRender()
                        })
                    }
                },

                // selection
                select,
                setHasSelection,
                getSelection: () => {
                    if (select.get) {
                        return select.get();
                    }
                    return null;
                },
                setSelection,
                setTargetCellValue: targetCellValue => {
                    setTargetCellValue(CellValue[targetCellValue])
                },

                doAction: (doAction, undoAction, uid = null) => {
                    let action;
                    const { past, historyPos } = propsRef.current;

                    if (uid !== null && uid === lastId) {
                        action = past[past.length - 1];
                        action.doAction = doAction;
                    } else {
                        lastId = uid;
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
                    const { past, future, historyPos } = propsRef.current;
                    lastId = null;
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
                    const { past, future, historyPos } = propsRef.current;
                    lastId = null;
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
                hasFuture: () => propsRef.current.future.length > 0,
                hasPast: () => propsRef.current.past.length > 0,
                hasStorePos: () => propsRef.current.historyPos === propsRef.current.storePos,
                updateRestorePos: () => setStorePos(propsRef.current.historyPos),
                clear: () => {
                    lastId = null;
                    setPast([]);
                    setFuture([]);
                    setHistoryPos(0);
                    setStorePos(-1)
                }
            }

        }, []
    );

    // TODO: this might not work correctly
    useEffect(() => {
        wContext.registerEditor(id, setter.clear);
        return () => {
            wContext.unregisterEditor(id)
        }
    },[]);
    return (
        <EditorContext.Provider value={{ ...setter, ...propsRef.current }}>
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

function EditorSectionInner({ name, actions = [], area, tree, link, confirm, children, ...props }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);
    const eContextRef = useRef(null);
    eContextRef.current = eContext;

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

    const actionHotKeys = useMemo(() => {
        return actions(eContextRef);
    }, []);

    useEffect(() => {
        if (!confirm) return;
        wContext.setConfirmExit(() => !eContextRef.current.hasStorePos());
        return () => {
            wContext.setConfirmExit(null);
        }
    }, []);

    const buttons = [];
    for (let [action, op] of Object.entries(actionHotKeys)) {
        buttons.push(<Button key={action} padded="h" name={action} onClick={op} />);
    }

    const header = (
        <Stack full="h" key="eh">
            <Stack full="h" gaps>
                <Block center="v" padded xshorten>{name}</Block>
                {tree &&
                    <>
                        <Block className="control-bg" center="v" padded>From:</Block>
                        <Block center="v" padded className="less">{tree[0].source}</Block>
                        <Block className="control-bg" center="v" padded>Resources:</Block>
                        <Block center="v" padded className="less">{tree.length}</Block>
                        <Block full="h"> </Block>
                    </>
                }
            </Stack>
            <Block center="v"><UndoRedoButtons hotKeys={hotKeys} /></Block>
            <Stack center="v" padded="h" gaps="1">
                {buttons}
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
                let newSize = size;
                if (e.key === 'Arrow' + decKey) {
                    newSize = Math.max(minSize, size - (e.shiftKey ? 10 : 1));
                } else if (e.key === 'Arrow' + incKey) {
                    newSize = size + (e.shiftKey ? 10 : 1);
                    if (maxSize) {
                        newSize = Math.min(maxSize, newSize);
                    }
                }
                if (size !== newSize) {
                    setSize(newSize);
                }
            };

            const handleElem = (
                <Block onKeyDown={handleKey} padded="1" key="t" full={collapseH ? 'v' : 'h'} onMouseDown={onMouseDown} {...handleAttr} cursor={cursor}>
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

function Section({ ...props }) {
    return (
        <SectionFrame {...props} />
    )
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

function ScrollArea({ children, x, setX, maxX, pageX, y, setY, maxY, pageY, auto, gaps }) {
    const cssContext = useContext(CssContext);

    const scrollbarX = x !== undefined && (!auto || (x > 0 || maxX > pageX));
    const scrollbarY = y !== undefined && (!auto || (y > 0 || maxY > pageY));

    const columns = ['*'];
    const rows = ['*'];
    let onWheel = null;
    if (scrollbarX || scrollbarY) {
        if (scrollbarX) {
            rows.push('-');
        }
        if (scrollbarY) {
            columns.push('-');
        }
        const sensitivity = 0.25;
        onWheel = e => {
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
    }
    return (
        <Grid full gaps={gaps ? cssContext.getValue('defaultPaddingPx') : null} columns={columns.join(' ')} rows={rows.join(' ')}>
            <Block key="a" full onWheel={onWheel}>{children}</Block>
            {scrollbarY && <Scrollbar key="b" vertical pos={y} max={maxY} page={pageY} set={setY} />}
            {scrollbarX && <Scrollbar key="c" pos={x} max={maxX} page={pageX} set={setX} />}
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
        [oppAxisKey]: space,
        className: 'scrollbar-space'
    };
    const dimMax = {
        [axisKey]: maxPerc + '%',
        [oppAxisKey]: space,
        className: 'scrollbar-space'
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
                <Block width={vertical ? 13 : false} full={vertical ? 'v' : true} onMouseDown={onMouseDown} className={handleCls.join(' ')}/>
                <Block onMouseDown={nextPage} {...dimMax} />
            </Stack>
        </Block>
    );
}

const WindowContext = React.createContext();

function buildColorMaskCanvas() {
    const size = 192;
    const canvas = getCanvasForDim(size, size);
    const ctx = canvas.getContext('2d');

    const whiteCanvas = getCanvasForDim(size, size);
    const whiteCtx = whiteCanvas.getContext('2d');
    const grdWhite = ctx.createLinearGradient(0, 0, size - 1, 0);
    grdWhite.addColorStop(0, "#FFFFFFFF");
    grdWhite.addColorStop(1, "#FFFFFF00");
    whiteCtx.fillStyle = grdWhite;
    whiteCtx.fillRect(0, 0, size, size);
    ctx.drawImage(whiteCanvas, 0, 0, size, size);

    const blackCanvas = getCanvasForDim(size, size);
    const blackCtx = blackCanvas.getContext('2d');
    const grdBlack = ctx.createLinearGradient(0, 0, 0, size - 1);
    grdBlack.addColorStop(0, "#00000000");
    grdBlack.addColorStop(1, "#000000FF");
    blackCtx.fillStyle = grdBlack;
    blackCtx.fillRect(0, 0, size, size);
    ctx.drawImage(blackCanvas, 0, 0, size, size);

    return canvas
}

function buildBaseColorCanvas() {
    const height = 192;
    const canvas = getCanvasForDim(15, height);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 15, height);

    const rgb = hex2rgb('#FF0000');
    const parts = [
        ['g', true],    // #0 ->   0: FF0000 ... 255: FFFF00
        ['r', false],   // #1 -> 256: FEFF00 ...    : 00FF00
        ['b', true],    // #2 ->    : 00FF01 ...    : 00FFFF
        ['g', false],   // #3 ->    : 00FEFF ...    : 0000FF
        ['r', true],    // #4 ->    : 0100FF ...    : FF00FF
        ['b', false]    // #5 ->    : FF00FE ...    : FF0001
    ];
    const steps = 8;
    let y = 0;
    for (let [key, up] of parts) {
        if (up) {
            while (rgb[key] <= 255) {
                ctx.fillStyle = rgb2hex(rgb);
                ctx.fillRect(0, y, 15, 1);
                rgb[key] += steps;
                y++;
            }
            rgb[key] = 255;
        } else {
            while (rgb[key] >= 0) {
                ctx.fillStyle = rgb2hex(rgb);
                ctx.fillRect(0, y, 15, 1);
                rgb[key] -= steps;
                y++;
            }
            rgb[key] = 0;
        }
    }
    return canvas;
}

function ModalColorPicker({}) {
    const wContext = useContext(WindowContext);
    const PickerModal = useModal();

    useEffect(() =>{
        wContext.register('openColorPickerModal', PickerModal.open)
    }, []);

    return (
        <PickerModal.content name="Change color" drag transparent>
            <BackgroundCtx>
                <EditorCtx>
                    <ColorPicker { ...PickerModal.props } />
                </EditorCtx>
            </BackgroundCtx>
        </PickerModal.content>
    )
}

/**
 * registry
 *  - used to store values/methods from children
 */
function WindowCtx({ imageResources, filters, children, game }) {
    const cssContext = useContext(CssContext);

    const [ storage ] = useState(() => {
        return new Storage(localStorage, 'remake-engine.editor.');
    });

    const setterRef = useRef();

    const defaultEditorConfig = defaultValues.config;
    const defaultTheme = defaultValues.theme;
    const defaultMapping = defaultValues.mapping;

    // the registry is used for storing values which are either expensive to calculate
    // or come from child components
    const registryRef = useRef();
    const registry = (key = null) => key ? registryRef.current[key] : registryRef.current;
    if (!registry()) {
        const defaults = {
            config: [
                {
                    name: 'Defaults',
                    values: defaultEditorConfig
                }
            ],
            theme: [
                {
                    name: 'Defaults',
                    values: defaultTheme
                }
            ],
            mapping: [
                {
                    name: 'Defaults',
                    values: defaultMapping
                }
            ]
        };

        const action2hotKey = storage.getDefaultedJson('hotkeys', defaultMapping);
        const hotKey2action = {};
        for (let [action, key] of Object.entries(action2hotKey)) {
            if (key !== null) {
                hotKey2action[key] = action;
            }
        }

        const syncLinks = currLinks => {
            const links = registry('links');
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

        registryRef.current = {
            lastTarget: null,
            mode: null,
            confirm: null,
            settings: null,
            modalStack: [],
            focusStack: {
                elem: {},
                zIndex: null
            },
            listeners: {},
            editors: {},
            styleLock: {
                state: 'unlocked',
                style: null
            },
            defaults,
            editorConfig: storage.getDefaultedJson('config', defaultEditorConfig),
            theme: storage.getDefaultedJson('theme', defaultTheme),
            hotKeyActions: {
                action2hotKey,
                hotKey2action
            },
            elemKeyBindings: [],
            links: {
                defaults: [],
                backups: []
            }
        };

        const resourceLoader = game.getResourceLoader();

        const register = (key, value) => {
            registryRef.current[key] = value
        };

        const endExclusiveMode = id => {
            const { mode, listeners, setFixCursor } = registry();
            if (!id || mode !== id) {
                return;
            }
            if (listeners) {
                for (let type of Object.keys(listeners)) {
                    removeEventListener(type)
                }
            }
            register('mode', null);
            setFixCursor(null);
        };

        const removeEventListener = type => {
            const { listeners } = registry();

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

        const getModalLevel = () => registry('modalStack').length;

        const getHotKeyArea = area => {
            const { elemKeyBindings } = registry();

            const currLevel = getModalLevel();
            for (let item of elemKeyBindings) {
                if (currLevel === item[3] && item[2] == area) {
                    return item[0];
                }
            }
            return null;
        };

        const getHandlerForAction = (action, elem, followLinks = true, passed = false) => {
            const { elemKeyBindings } = registry();

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

        const setStyleLock = state => {
            const { styleLock, theme, links } = registry();

            if (state === 'locked') {
                styleLock.state = 'locked';
                styleLock.style = cssContext.getValues();
                links.backups = theme.linkResourcesUrls.split(' ')
            } else if (state === 'saved') {
                styleLock.state = 'saved';
            } else if (state === 'unlocked') {
                if (styleLock.state !== 'saved') {
                    cssContext.setValues(styleLock.style);
                }
                styleLock.style = null;
                links.backups = [];
                styleLock.state = 'unlocked';
            }
        };

        const getFilteredCanvasData = (filter, canvas) => {
            if (!filter) {
                return getCanvasForBitmap(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height))
            }
            const result = filters.getCanvasWithFiltersApplied(filter, {elem: canvas, ctx: canvas.getContext('2d')}, 0, 0, canvas.width, canvas.height);
            return result[0].elem
        };

        const imageIndex  = new ImageIndex({});
        for (let resource of imageResources) {
            imageIndex.setEntityObject({value: resource.name, image: resource.bitmap});
        }

        // let's initialize the context with ref-values and methods here...
        setterRef.current = {
            // overwrite registry key with new value
            register,
            registry,
            game,
            filters,
            resourceLoader,

            getNewImageResource: (template, width, height) => {
                return (
                    resourceLoader.makeImageResource(
                        getCanvasForDim(width, height),
                        getUniqueName(template, resourceLoader.getAllResourceIds('image'))
                    )
                )
            },
            // TODO kill this
            storeScreenResource: resourceLoader.storeScreenResouce,

            setConfirmExit: confirm => register('confirm', confirm),
            needsConfirmation: () => {
                const confirm = registry('confirm');
                return confirm && confirm()
            },

            getLastTarget: () => registry('lastTarget'),
            editorConfig: registry('editorConfig'),
            theme: registry('theme'),

            startExclusiveMode: (id, cursor = 'auto') => {
                const { mode, setFixCursor } = registry();
                if (mode !== null) {
                    endExclusiveMode(mode);
                }
                register('mode', id);
                setFixCursor(cursor)
            },
            isInExclusiveMode: () => registry('mode') !== null,
            endExclusiveMode,

            addEventListener: (type, listener, options = false) => {
                const { mode, listeners } = registry();

                if (!mode) throw Error(`No call of start exclusive mode before addEventListener`);

                const handler = (event, ...params) => {
                    let result = false;
                    try {
                        result = listener(event, ...params);
                    } catch (e) {
                        console.error(`An error occured in the event handler "${type}": ${e}`);
                        endExclusiveMode(mode); // problems? get from registry
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
            },
            removeEventListener,

            getModalLevel,
            openModal: () => {
                const { modalStack, focusStack, lastTarget } = registry();

                let zIndex = 10000;
                const len = modalStack.length;
                if (len > 0) {
                    zIndex = modalStack[len - 1] + 10;
                }
                modalStack.push(zIndex);
                focusStack.zIndex = zIndex;
                focusStack.elem[zIndex] = {top: null, start: null, lastTarget };
                return zIndex;
            },
            closeModal: zIndex => {
                const { modalStack, focusStack } = registry();

                const index = modalStack.indexOf(zIndex);
                if (index === -1) {
                    return;
                }
                modalStack.splice(index, 1);
                register('lastTarget', focusStack.elem[zIndex].lastTarget);
                delete focusStack.elem[zIndex];
                focusStack.zIndex = modalStack.length ? modalStack[modalStack.length - 1] : null;
            },

            registerEditor: (id, clear) => registry('editors')[id] = clear,
            unregisterEditor: id => delete registry('editors')[id],
            clearEditor: id => registry('editors')[id] && registry('editors')[id](),

            addElemKeyBinding: (elem, action2handlers = {}, area = null, link = null) => {
                if (elem === null) {
                    return;
                }
                if (!link) {
                    link = []
                } else if (!Array.isArray(link)) {
                    link = [link];
                }
                registry('elemKeyBindings').push([elem, action2handlers, area, getModalLevel(), link]);
            },
            deleteElemKeyBindings: elem => {
                const { elemKeyBindings } = registry();

                let index = 0;
                for (let item of elemKeyBindings) {
                    if (item[0] === elem) {
                        elemKeyBindings.splice(index, 1);
                        break;
                    }
                    index++;
                }
            },
            getHotKeyArea,
            focusHotKeyArea: area => {
                let elem = getHotKeyArea(area);
                if (elem) {
                    elem = elem.querySelector('.tabbed');
                    if (elem) {
                        elem.focus();
                        register('lastTarget', elem);
                        return true;
                    }
                }
                return false;
            },

            getHandlerForActionKey: (actionKey, elem) => {
                const { elemKeyBindings, hotKeyActions } = registry();
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
            },

            hotKeyActions: registry('hotKeyActions'),

            clearAllSettings: () => {
                const keys = storage.getKeys();
                for(let key of keys) {
                    if (!key.startsWith('presets.')) {
                        storage.deleteJson(key);
                    }
                }
            },
            openSettings: () => {
                const { settings, editorConfig, theme, hotKeyActions } = registry();

                setStyleLock('locked');
                settings.open({
                    defaults: {
                        mapping: defaultMapping,
                        theme: defaultTheme,
                        config: defaultEditorConfig
                    },
                    cleanUp: () => {
                        setStyleLock('unlocked');
                        syncLinks(theme.linkResourcesUrls);
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
                        settings.close()
                    }
                });
            },

            setStyleLock,
            getLockedStyles: () => registry('styleLock').style,
            isStyleLocked: () => registry('styleLock').state !== 'unlocked',

            syncLinks,

            defaults,
            storage,

            focusStack: registry('focusStack'),
            imageIndex,

            openColorPickerModal: props => registry().openColorPickerModal(props),

            getFilteredCanvasData,
            getFilteredImageData: (filter, imageData) => {
                if (!filter) {
                    return getCanvasForBitmap(imageData).getContext('2d').getImageData(0, 0, imageData.width, imageData.height)
                }
                const result = getFilteredCanvasData(filter, getCanvasForBitmap(imageData));
                const ctx = result.getContext('2d');
                return ctx.getImageData(0, 0, result.width, result.height);
            },

            getBaseColorCanvas: () => {
                let canvas = registry('baseColorCanvas');
                if (!canvas) {
                    canvas = buildBaseColorCanvas();
                    register('baseColorCanvas', canvas);
                }
                return canvas;
            },
            getColorMaskCanvas: () => {
                let canvas = registry('colorMaskCanvas');
                if (!canvas) {
                    canvas = buildColorMaskCanvas();
                    register('colorMaskCanvas', canvas);
                }
                return canvas;
            }
        }
    }

    // components init and clean-up
    useEffect(() => {
        const { theme, links, editorConfig } = registry();
        const { syncLinks } = setterRef.current;

        const leaveHandler = e => {
            const confirm = registry('confirm');
            if (confirm && confirm()) {
                const confirmationMessage = 'You have unsaved changes, are you sure that you want to leave?';
                e.returnValue = confirmationMessage;
                return confirmationMessage;
            }
        };
        const contextMenuHandler = e => {
            e.preventDefault();
            e.stopPropagation();
        };
        window.addEventListener('contextmenu', contextMenuHandler, {capture: false});
        window.addEventListener('beforeunload', leaveHandler);

        const elems = document.querySelectorAll('link');
        d('???', elems);
        for (let elem of elems) {
            links.defaults.push(d(elem.href));
        }

        cssContext.init(editorConfig, theme);
        syncLinks(theme.linkResourcesUrls);

        return () => {
            syncLinks('');
            window.removeEventListener('beforeunload', leaveHandler);
            window.removeEventListener('contextmenu', contextMenuHandler, {capture: false})
        }
    }, []);

    return (
        <WindowContext.Provider value={setterRef.current}>
            {cssContext.ready &&
                <>
                    <ModalColorPicker key="cp" />
                    <FixCursorArea key="em" />
                    {children}
                </>
            }
        </WindowContext.Provider>
    )
}

function FixCursorArea() {
    const wContext = useContext(WindowContext);
    const [ fixCursor, setFixCursor ] = useState(null);

    useEffect(() => {
        wContext.register('setFixCursor', setFixCursor);
    }, []);

    const style = {
        cursor: (fixCursor ? fixCursor : 'auto'),
        zIndex: 999999
    };
    if (fixCursor === null) {
        style.display = 'none'
    }
    return (
        <div key="fc" style={style} className={'fixed pos-0 transparent full-h full-v'} />
    );
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

function ButtonStack({ items, onClick }) {
    const tabs = [];
    for(let item of items) {
        tabs.push(
            <Button key={item} full onClick={() => onClick(item)} name={item} rev icon="keyboard_arrow_right" />
        );
    }
    return (
        <Block scroll padded="h" full="h">
            <Stack indented vertical gaps full="h">{tabs}</Stack>
        </Block>
    )
}


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
            <Button key={item} full padded="h" current={active} value={item} onClick={setActive} name={item} rev icon="keyboard_arrow_right" />
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
    const content = function ({full, width, maxWidth, minWidth, height, maxHeight, minHeight, transparent, drag, ...props}) {
        const title = propsRef.current && propsRef.current.title ? propsRef.current.title : props.name;
        const dimProps = {full, width, height, maxWidth, minWidth, maxHeight, minHeight};
        dimProps.zIndex = isOpen;
        return (
            <>
                {isOpen && <Modal close={close} name={title} drag={drag} transparent={transparent} closeable={props.closeable} {...dimProps}>{props.children}</Modal>}
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
 */
const Modal = function ({ name, close, closeable = true, zIndex = 0, full, width, transparent, maxWidth, minWidth, height, maxHeight, drag, children }) {
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
        requestAnimationFrame(() => {
            const elem = trapRef.current ? trapRef.current.querySelector('.tabbed.autofocus') : null;
            if (elem) {
                elem.focus()
            } else {
                focusElem.start.focus()
            }

        });
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
            wContext.startExclusiveMode('modal-drag', 'grabbing');
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
        elem = <ThemeFreeze blockRef={trapRef} values={wContext.getLockedStyles()}>{elem}</ThemeFreeze>
    }

    return (
        <Portal id="modals-container">
            {elem}
        </Portal>
    );
};

function Icon({ name, width, height, center = 'h', className, rotate, size = 18 }) {
    const style = {
        width: width || size,
        height: height || size
    };
    const cls = ['min-content-h'];
    if (center === true || center === 'h') {
        cls.push('center-h');
    }
    if (center === true || center === 'v') {
        cls.push('center-v');
    }
    if (className) {
        cls.push(className);
    }
    return (
        <div style={style} className={cls.join(' ')} dangerouslySetInnerHTML={
            {
                __html: !name ? '' :
                    '<i class="material-icons center-h min-content-h" style="font-size: ' + size + 'px; display: block; ' + (rotate ? 'transform: rotate(' + rotate + 'deg)' : '')  + ' ">' + name + '</i>'
            }
        } />
    );
}

function Kbd({ value = '', length = null, className }) {
    const cls = [];
    if (className) {
        cls.push(className);
    }
    value = '' + value;
    if (length !== null) {
        value = value.padStart(length, ' ')
    }
    value = value.replaceAll(' ', '&nbsp;');
    return (
        <kbd className={cls.join(' ')} dangerouslySetInnerHTML={{ __html: value}}></kbd>
    )
}

function ThemeFreeze({ blockRef, values, children }) {
    const cssContext = useContext(CssContext);

    return (
        <CssCtx parent={cssContext} values={values} bindRef={blockRef}>
            {children}
        </CssCtx>
    )
}

const CssContext = React.createContext();

const cssConstTypes = [
    'rgb', 'rgba', 'px', 'urls', 'url', 'font', 'bstyle', 'float', 'perc'
];

function CssCtx({ parent, bindRef, children, ...props }) {

    const [ ready, setReady ] = useState(!!parent);

    const registryRef = useRef(null);
    const registry = (key = null) => key === null ? registryRef.current : registryRef.current[key];
    const register = (key, value) => registryRef.current[key] = value;

    if (!registry()) {

        // extract css relevant keys from defaults
        const key2type = {};
        const key2const = {};
        const regexpCamelCaseLast = /([A-Z][a-z]*)$/;

        const extractKeys2types = obj => {
            for (let key of Object.keys(obj)) {
                const match = key.match(regexpCamelCaseLast);
                if (match.length < 2) continue;

                const type = match[1].toLowerCase();
                if (!type || !cssConstTypes.includes(type)) continue;

                key2type[key] = type;

                const parts = [];
                let i = 0;
                let currPart = '';
                while (i < key.length) {
                    let char = key[i];
                    if (char >= 'A' && char <= 'Z') {
                        parts.push(currPart);
                        currPart = '';
                        char = char.toLowerCase()
                    }
                    currPart += char;
                    i++
                }
                if (currPart !== '') {
                    parts.push(currPart)
                }
                const constName = '--' + parts.join('-');
                key2const[key] = constName;
            }
        };
        extractKeys2types(defaultValues.config);
        extractKeys2types(defaultValues.theme);

        const getConstValues = (source, target = null) => {
            const result = target ? target : {};
            for (let [key, value] of Object.entries(source)) {
                if (result[key] === undefined && key2type[key]) {
                    result[key] = value
                }
            }
            return result
        };

        const setStyleProp = (style, key, value) => {
            const type = key2type[key];
            if (!type) return;

            if (type === 'px' && !(value === 'none' && (key.startsWith('max') || key.startsWith('end')))) {
                value += 'px';
            }
            style.setProperty(key2const[key], value);
        };

        const setValue = (name, value) => {
            if (parent) {
                return parent.setValue(name, value)
            }
            setStyleProp(bindRef ? bindRef.current.style : document.body.style, name, value);
            registry('values')[name] = value
        };

        const applyTo = node => {
            const { values } = registry();
            const style = node.style;

            for (let [key, value] of Object.entries(values)) {
                setStyleProp(style, key, value)
            }
        };

        const api = {

            init: (config, theme) => {
                const values = getConstValues(config);
                getConstValues(theme, values);

                register('values', values);

                const body = registry('body');
                const bodyStyle = document.body.style;
                for(let key of Object.keys(key2type)) {
                    const prop = key2const[key];
                    const value = bodyStyle.getPropertyValue(prop);
                    body[prop] = value !== undefined ? value : null;
                }

                applyTo(!bindRef ? document.body : bindRef.current);
                setReady(true)
            },

            getValues: () => {
                return { ...registry('values') }
            },

            getValue: name => registry('values')[name],

            setValue,

            setValues: values => {
                for (let [key, value] of Object.entries(values)) {
                    setValue(key, value);
                }
            },

            applyTo
        };

        registryRef.current = {
            api,
            body: {}
        };

        if (parent && props.values) {
            register('values', props.values);
        }
    }

    useEffect(() => {
        if (bindRef && bindRef.current) {
            registry('api').applyTo(bindRef.current)
        }
        if (parent) return;

        return () => {
            const props = registry('body');
            const bodyStyle = document.body.style;
            for (let [prop, value] of Object.entries(props)) {
                if (value === null) {
                    bodyStyle.removeProperty(prop)
                } else {
                    bodyStyle.setProperty(prop, value)
                }
            }
        }
    }, []);

    return (
        <CssContext.Provider value={ { ...registry('api'), ready } }>
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

function useUpdateOnEntityIndexChanges(entityIndex, callback) {
    const update = useComponentUpdate();

    useEffect(
        () => {
            const callbackAndUpdate = !callback ? update : () => {
                callback();
                update()
            };
            entityIndex.addListener(callbackAndUpdate);
            return () => {
                entityIndex.removeListener(callbackAndUpdate);
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
    ButtonStack,
    CenterInfo,
    ActionBarContent,
    Kbd,
    LoadingIndicator,

    PropertyGrid,
    ValueProp,

    useModal,
    useComponentUpdate,
    useUpdateOnEntityIndexChanges,
    useMounted,
    useFocusKeyBindings,
    useRefocus
}