import React, { useMemo, useEffect, useRef, useState, Fragment, useContext, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import { d, Storage, clamp, isEventInRect, getCanvasForBitmap, getCanvasForDim, getUniqueName, hex2rgb, rgb2hex } from "../helper/helper"
import { DIR, Block, Stack, Grid, Overlays, Overlay } from "./LayoutComponents";
import { Button, Color, OkCancelForm } from "./FormComponents";
import { CellValue } from "../classes/Grid";
import { CellSelection } from "../classes/CellProvider";
import { ImageIndex, ColorIndex } from "../classes/EntityIndex";
import {Content} from "./BaseComponents";

const defaultValues = {
    config: {
        maxWidthPx: 1600,
        noMaxWidth: false,
        maxHeightPx: 1200,
        noMaxHeight: true,
        tooltips: true,
        uiAnimations: true,
        maxHistory: 10
    },
    theme: {
        defaultPaddingPx: 9,
        boxBorderWidthPx: 1,
        maxWidthPx: 1200,
        maxHeightPx: 1200,
        boxBorderRgb: "#2b7797",
        lessPerc: 50,
        morePerc: 150,
        disabledPerc: 45,

        inputBgRgb: "#b0aec1",
        inputRgb: "#29292e",
        inputBorderRgb: "#a8a8a8",
        inputBstyle: "solid",
        inputBorderWidthPx: 1,
        inputPaddingPx: 5,
        inputMinPaddingPx: 1,
        inputBorderRadiusPx: 4,

        fontSizeSmallPx: 11,
        fontSizeMediumPx: 12,
        fontSizeBigPx: 14,

        monoFont: '"Lucida Console", Courier, monospace',

        checkBoxType: 0,
        hoverChangeType: -1,
        hoverIntensityFloat: 0.25,

        editorBgRgb: "#080808",
        editorRgb: "#9aa0a2",

        primaryBgRgb: "#080808",
        primaryRgb: "#9aa0a2",
        secondaryBgRgb: "#2f304b",
        secondaryRgb: "#9aa0a2",
        ghostBgRgb: "#181818",

        // header
        headerType: 0,  // window | floating
        headerBgType: 0, // primary | color | gradient
        headerBgRgb: "#86a096",
        headerBgGrad: 'linear-gradient(90deg, #030024ff 0%, #080842ff 51%, #05d2feff 100%)',

        // title
        titleBgType: 0, // primary | color | gradient
        titleBgRgb: "#662341",
        titleBgGrad: 'linear-gradient(90deg, #030024ff 0%, #080842ff 51%, #05d2feff 100%)',
        titleVertBgGrad: 'linear-gradient(180deg, #030024ff 0%, #080842ff 51%, #05d2feff 100%)',

        overlayBgRgba: "#000000a3",

        focusBgRgba: '#FFFFDFCC',
        focusWidthPx: 1,

        buttonBgRgb: "#1e42ae",
        buttonRgb: "#b0d5e8",
        buttonBorderRgb: "#347f66",
        buttonBstyle: "solid",
        buttonBorderWidthPx: 1,
        buttonMinPaddingPx: 3,
        buttonPaddingPx: 5,
        buttonBorderRadiusPx: 4,

        activeRgb: '#fafbff',
        activeBgRgb: '#5baa2b',
        activeBorderRgb: '#D0D0F0',
        warningBgRgb: '#987672',
        warningRgb: '#000000',
        warningBorderRgb: '#000000',
        errorBgRgb: '#AA0020',
        errorRgb: '#E0E0A0',
        cursorBgRgba: '#58585888',

        markerWidthMinPx: 1,
        markerWidthMaxPx: 8,
        markerOpacityMinPerc: 20,
        markerOpacityMaxPerc: 70,
        markerInvertMaxPerc: 50,

        linkResourcesUrls: "https://fonts.googleapis.com/icon?family=Material+Icons https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i",
        buttonFont: "Monospace",
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

function JsonView({ json, defaultJson = {}, skipKeys = [], trim, ...props }) {
    const base = { ...defaultJson, ...json };
    for (let key of skipKeys) {
        delete base[key];
    }
    let jsonString = JSON.stringify(base, null, 2);
    if (jsonString === '{}') {
        jsonString = '{\n}';
    }
    const lines = jsonString.split("\n");

    let defJsonString = JSON.stringify(defaultJson, null, 2);
    if (defJsonString === '{}') {
        defJsonString = '{\n}';
    }
    const defLines = defJsonString.split("\n");
    const render = line => {
        if (trim && line.match(/^[ ]+\"[^"]*\"\:/)) {
            return line.replace(/\"/, '').replace(/\"/, '');
        }
        return line
    };

    return (
        <Block border="1" scroll { ...props }>
            <pre className="scroll padded-h">
            {
                lines.map(
                    (line, index) =>
                        <span key={index} className={defLines.includes(line) || defLines.includes(line + ',') ? 'less' : ''}>{render(line)}{"\n"}</span>)
            }
            </pre>
        </Block>
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

function CanvasCircleMarker({ size, rangeX = null, rangeY = null, x, setX, y, setY, setXY, readOnly, tab = true, children }) {

    const wContext = useContext(WindowContext);
    const [rect, setRect] = useState(null);

    const divRef = useRef(null);
    const handleRef = useRef(null);
    const propsRef = useRef(null);

    const width = rect ? rect.width : 0;
    const height = rect ? rect.height : 0;

    propsRef.current = {x, y, width, height};

    size += 4;
    const halfSize = size >> 1;

    const distX = width / rangeX;
    const distY = height / rangeY;
    const pixelX = width ? rangeX / width : 0;
    const pixelY = height ? rangeY / height : 0;

    const posX = Math.round(distX * x);
    const posY = Math.round(distY * y);

    useEffect(() => {
        setRect(divRef.current.getBoundingClientRect());
    }, []);

    if (readOnly) {
        tab = false;
    }
    const setAndMove = readOnly ? null : e => {
        const currRect = divRef.current.getBoundingClientRect();
        const offX = e.clientX - currRect.x;
        const offY = e.clientY - currRect.y;

        const off = {
            x: clamp(0, offX * pixelX, rangeX - 1),
            y: clamp(0, offY * pixelY, rangeY - 1)
        };
        setRect(currRect);
        setX(off.x);
        setY(off.y);
        startMove(e, off);
    }

    const startMove = readOnly ? null : (e, off = null) => {
        const anchor = {x: e.clientX, y: e.clientY};

        const startX = off ? off.x : x;
        const startY = off ? off.y : y;
        let lastX = startX;
        let lastY = startY;
        wContext.startExclusiveMode('drag-circle', 'none');
        wContext.addEventListener('mousemove', e => {
            const newX = clamp(0, Math.round(startX + pixelX * (e.clientX - anchor.x)), rangeX - 1);
            const newY = clamp(0, Math.round(startY + pixelY * (e.clientY - anchor.y)), rangeY - 1);

            if (newX === lastX && newY === lastY) return;
            lastX = newX;
            lastY = newY;
            if (setXY) {
                setXY(newX, newY)
            } else {
                setX(newX);
                setY(newY)
            }
        });
        wContext.addEventListener('mouseup', e => {
            wContext.endExclusiveMode('drag-circle', {once: true});
            if (!readOnly && handleRef.current) {
                handleRef.current.focus()
            }
        })
    }

    const onKeyDown = readOnly ? null : e => {
        const shift = e.shiftKey;
        let newX = propsRef.current.x;
        let newY = propsRef.current.y;
        if (e.key === 'ArrowLeft') {
            newX -= (shift ? 10 : 1) * pixelX;
        }
        if (e.key === 'ArrowRight') {
            newX += (shift ? 10 : 1) * pixelX;
        }
        if (e.key === 'ArrowUp') {
            newY -= (shift ? 10 : 1) * pixelY;
        }
        if (e.key === 'ArrowDown') {
            newY += (shift ? 10 : 1) * pixelY;
        }
        newX = clamp(0, newX, rangeX - 1);
        newY = clamp(0, newY, rangeY - 1);
        if (newX !== propsRef.current.x) {
            setX(newX)
        }
        if (newY !== propsRef.current.y) {
            setY(newY)
        }
    };

    return (
        <Overlays width={width + size} height={height + size}
            originX={halfSize} originY={halfSize}
        >
            <Overlay width={width} height={height}>
                <Block ref={divRef} onLeftClick={setAndMove}>
                    {children}
                </Block>
            </Overlay>

            <Overlay width={size} height={size}
                left={-halfSize + posX} top={-halfSize + posY}
            >
                <Block ref={handleRef} tab={tab} cursor={readOnly ? false : 'grab'} onLeftClick={startMove} className="circle-border" width={size - 4} height={size - 4} onKeyDown={onKeyDown} />
            </Overlay>
        </Overlays>
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
    const elem = (
        <div className={cls.join(' ')} style={{ width, height }}>
            {!plain && <CanvasBackground />}
            <canvas className="absolute" width={width} height={height} ref={canvasRef} />
        </div>
    );
    if (!border) return elem;

    return (
        <Block border={border}>
            {elem}
        </Block>
    )
}

function Toolbar({ children, minHeight }) {
    return (
        <Stack full="h" minHeight={minHeight} wrap gaps centerItems className="secondary-bg secondary-color">
            {children}
        </Stack>
    )
}

const EditorContext = React.createContext();

function EditorCtx({ id, children }) {
    const wContext = useContext(WindowContext);
    const cache = usePageCache(id);

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
        id,
        cache,
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
            <Button icon="undo" help="Undo" action="undo" onClick={hotKeys.undo} />
            <Button icon="redo" help="Redo" action="redo" onClick={hotKeys.redo} />
        </Stack>

    )
}

function EditorSection({ id, ...props }) {
    return (
        <EditorCtx id={id}>
            <EditorSectionInner id={id} { ...props } />
        </EditorCtx>
    )
}

function EditorSectionInner({ id, name, sub, details, actions = [], area, link, confirm, children, ...props }) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);
    const eContextRef = useRef(null);
    eContextRef.current = eContext;

    const { headerType, headerBgType } = useCssProps('headerType', 'headerBgType');

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
        buttons.push(
            <Button key={action} padded="h" name={action} onClick={op} />
        );
    }
    const header = (
        <Stack full="h" key="eh" className={headerBgType === 0 ? '' : (headerBgType === 2 ? "header-gradient-bg" : "header-bg")}>
            <TitleBlocks title={name} sub={sub} details={details} />
            <Block center="v"><UndoRedoButtons hotKeys={hotKeys} /></Block>
            <Stack center="v" padded="h" gaps="1">
                {buttons}
            </Stack>
        </Stack>
    );
    return (
        <SectionFrame
            id={id}
            header={header}
            hotKeys={hotKeys}
            link={link}
            area={area}
            float={headerType === 1}
            name={name} {...props}>
            {children}
        </SectionFrame>
    );
}

function FontMetrics() {
    const cssContext = useContext(CssContext);

    const divRef = useRef(null);
    const observerRef = useRef(null);
    const update = useComponentUpdate();

    useEffect(() => {
        const observer = new ResizeObserver(update);
        observerRef.current = observer;
        observer.observe(divRef.current);
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        }
    }, []);

    useEffect(() => {
        const heights = [];
        for(let node of divRef.current.getElementsByClassName('fm')) {
            heights.push(node.getBoundingClientRect().height);
        }
        let i = 0;
        const changes = {};
        let hasChanges = false;
        for (let item of Object.keys(metrics)) {
            const curr = cssContext.getValue(item);
            const height = heights[i];
            if (curr !== height) {
                hasChanges = true;
                changes[item] = height
            }
            i++;
        }
        if (hasChanges) {
            cssContext.setValues(changes);
        }
    });

    const divs = [];
    for(let [name, css] of Object.entries(metrics)) {
        divs.push(
            <div key={name} className={'fm ' + css}>T</div>
        );
    }
    return (
        <Block ref={divRef} className="fixed" zIndex={-1000}>
            <Stack vertical className="transparent-color">
                {divs}
            </Stack>
        </Block>
    )
}

function SectionFrame({ id, header, name, children, float, hotKeys, area, link, inner, rev, maxSize, minSize, center, centerItems, indented, scroll, full, collapse, ...props }) {
    const wContext = useContext(WindowContext);
    const update = useComponentUpdate();

    const { titleBgType } = useCssProps('titleBgType');
    const contentRef = useRef(null);

    const [ collapsed, setCollapsed ] = useCachedState(
    inner ? 'page' : null,
        id,
        props.collapsed === true,
        'bool'
    );
    const collapseH = collapse === 'h';
    const minDefault = collapseH ? 100 : 25;
    if (!minSize || minSize < minDefault) {
        minSize = minDefault;
    }
    const [ size, setSize ] = useCachedState(
        'page',
        id ? id + '.size' : null,
        props.size && Math.max(props.size, minSize),
        'number'
    );

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
    const parentCls = [
        float ? 'editor-bg editor-color' : 'primary-bg primary-color',
        'stack' + (!collapseH && rev ? ' rev-cols' : '')
    ];
    const relAttr = {
        hotKeys,
        area,
        link,
        className: parentCls.join(' '),
        ...dimProps
    };
    const parentAttr = {
        full: parentFull,
        center,
        scroll,
        indented
    };
    if (collapsedByH) {
        relAttr.width = 'min-content';
    } else if (collapsed) {
        relAttr.minHeight = false;
        relAttr.height = 'min-content';
    }
    const headerAttr = {
        full: collapsedByH ? 'v' : 'h',
        vertical: collapsedByH
    };
    if (titleBgType !== 0 && inner) {
        const gradDir = collapsedByH ? '-90' : '';
        headerAttr.className = 'title-' + (titleBgType === 2 ? 'gradient-bg' + gradDir : 'bg');
    }
    const contentAttr = { centerItems, ...contProps };

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
    }, [collapsed, float]);

    let items;
    let contentElem = '';
    if (!collapsed) {
        const cursor = (collapseH ? 'col' : 'row') +'-resize';
        const attr = {};
        if (size) {
            if (collapseH) {
                relAttr.width = size + offsetRef.current;
            } else if (offsetRef.current) {
                relAttr.height = size + offsetRef.current;
                if (relAttr.maxHeight) {
                    relAttr.maxHeight = 'max(' + (minSize + offsetRef.current) + 'px, ' + relAttr.maxHeight +  ')';
                }
            }
            attr.ref = contentRef;
        }
        contentElem = (
            <Block key="a" { ...attr } full={collapseH ? parentAttr.full : true} { ...contentAttr }>
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

                let elem = e.target.classList && e.target.classList.contains('tabbed') ?
                    e.target : e.target.querySelector('.tabbed');
                if (elem === null) {
                    elem = e.target;
                    do {
                        elem = elem.parentNode;

                        if (!elem) break
                    } while (
                        !(elem.classList && elem.classList.contains('tabbed'))
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

            const hStackAttr = {
                [sizeProp]: 4
            };

            const handleElem = (
                <Block onKeyDown={handleKey} tab padded="1" key="t" full={collapseH ? 'v' : 'h'} onMouseDown={onMouseDown} { ...handleAttr } cursor={cursor} className="primary-bg">
                    <Stack center vertical={collapseH} gaps="1" className="hover-change overflow" { ...hStackAttr }>
                        <Block full={collapseH ? 'h' : 'v'} className={'button-bg overflow hover-change ' + handleCls}></Block>
                        <Block full={collapseH ? 'h' : 'v'} className={'button-bg overflow hover-change ' + handleCls}></Block>
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
            <Block key="c" className="more" verticalText={collapsedByH} full={(!collapsed && collapseH && rev) ? 'h' : false}  center={collapsedByH ? 'h' : 'v'}  shorten padded={collapsedByH ? 'v' : 'h'}>
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
        const button = <Block key="b" center={collapsedByH ? 'h' : false}><Button icon={dir} onClick={toggleCollapse} /></Block>;

        if (collapseH && rev && !collapsed) {
            items.push(button);
        } else {
            items.unshift(button);
        }
    }
    const headerElem = (
        <Stack key="h" padded={!header} { ...headerAttr }>
            {items}
        </Stack>
    );

    items = [];
    const innerAttr = float ? { ...parentAttr } : { ...parentAttr, ...relAttr };
    if (!float) {
        items.push(headerElem);
    } else {
        relAttr.full = true;
        innerAttr.full = true;
    }
    items.push(contentElem);

    const stack = (
        <Stack vertical { ...innerAttr } borders border={inner ? (collapseH ? (rev ? DIR.LEFT : DIR.RIGHT) : false) : true}>
            {items}
        </Stack>
    );
    if (!float) return stack;

    return (
        <Stack vertical { ...relAttr }>
            {headerElem}
            {stack}
        </Stack>
    )
}

function Separator() {
    return (
        <Block>
            <Block width={1} height={20} className="separator-h less"></Block>
        </Block>
    )
}

function TitleBlocks({title, sub, details}) {
    const detailBlocks = [];
    if (details) {
        for (let [name, value] of Object.entries(details)) {
            detailBlocks.push(
                <Stack key={name} gaps center="v" padded={DIR.RIGHT}>
                    <Block center="v" className="small less">{name}</Block>
                    <Block center="v" className="medium">{value}</Block>
                </Stack>
            );
        }
    }
    return (
        <Stack wrap gaps full="h">
            <Block center="v" className="big more">{title}</Block>
            {sub &&
                <Block center="v" className="medium">{sub}</Block>
            }
            {details && <Separator />}
            {details && detailBlocks}
        </Stack>
    )
}

function Section({ ...props }) {
    return (
        <SectionFrame { ...props } />
    )
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
            <Block shorten className="small">
                {name}
            </Block>
            <Block full="h">
                {children}
            </Block>
        </>
    )
}

function ScrollArea({ children, x, setX, maxX, pageX, y, setY, maxY, pageY, auto, gaps }) {
    const { defaultPaddingPx } = useCssProps('defaultPaddingPx');

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
        <Grid full gaps={gaps ? defaultPaddingPx : null} columns={columns.join(' ')} rows={rows.join(' ')}>
            <Block key="a" full onWheel={onWheel}>{children}</Block>
            {scrollbarY && <Scrollbar key="b" vertical pos={y} max={maxY} page={pageY} set={setY} />}
            {scrollbarX && <Scrollbar key="c" pos={x} max={maxX} page={pageX} set={setX} />}
        </Grid>
    )
}

const iconPropsScrollbar = {size: 14};

function Scrollbar({ pos, page, max, auto, vertical, size, set }) {
    const wContext = useContext(WindowContext);
    const [ clicked, setClicked ] = useState(false);
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
    const oppDirKey = vertical ? 'h' : 'v';
    const cursor = (vertical ? 'ns' : 'ew') + '-resize';
    const arrows = vertical ? ['drop_up', 'drop_down'] : ['left', 'right'];

    const dimMin = {
        [axisKey]: minPerc + '%',
        [oppAxisKey]: space,
        className: 'ghost-bg'
    };
    const dimMax = {
        [axisKey]: maxPerc + '%',
        [oppAxisKey]: space,
        className: 'ghost-bg'
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

        wContext.startExclusiveMode('scroll-handle', cursor);
        wContext.addEventListener('mousemove', e => {
            const relPos = getOffset(e[client]);
            if (relPos !== lastPos) {
                lastPos = relPos;
                set(pos + relPos);
            }
        });
        wContext.addEventListener('mouseup', () => {
            setClicked(false);
            wContext.endExclusiveMode('scroll-handle')
        }, {once: true});

        setClicked(true);
        e.preventDefault();
    };

    const changePos = (e, value) => {
        const newPos = clamp(0, pos + value, maxSteps);
        if (newPos === pos) return;

        set(newPos)
    }

    const dim = {[oppAxisKey]: space};
    if (size) {
        dim[axisKey] = size;
    } else {
        dim[axisKey] = 'calc(100% - 6px)';
    }
    const handleCls = ['scrollbar-handle hover-change'];
    if (clicked) {
        handleCls.push('clicked');
    }
    return (
        <Stack vertical={vertical} full={dirKey} className="scrollbar-div secondary-bg">
            <Button
                vertical={!vertical} icon={'arrow_' + arrows[0]} full={oppDirKey}
                onClick={e => changePos(e, -1)} disabled={pos === 0} border={false}
                iconProps={iconPropsScrollbar} tab={false} radius={false} centerItems className="button-border-1 border-outset button-border-color"
            />
            <Block full={dirKey} { ...dim } ref={divRef}>
                <Stack full={dirKey} vertical={vertical}>
                    <Block cursor="pointer" onMouseDown={e => changePos(e, -page)} {...dimMin} />
                    <Block cursor={cursor} width={vertical ? 13 : false} full={vertical ? 'v' : true} onMouseDown={onMouseDown} className={handleCls.join(' ')}/>
                    <Block cursor="pointer" onMouseDown={e => changePos(e, page)} {...dimMax} />
                </Stack>
            </Block>
            <Button
                vertical={!vertical} icon={'arrow_' + arrows[1]}  full={oppDirKey}
                onClick={e => changePos(e, 1)} disabled={pos === maxSteps} border={false}
                iconProps={iconPropsScrollbar} tab={false} radius={false} centerItems className="button-border-1 border-outset button-border-color"
            />
        </Stack>
    );
}

const WindowContext = React.createContext();

function buildHueMaskCanvas() {
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

function buildHueColorsCanvas() {
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
                ctx.fillRect(0, height - y, 15, 1);
                rgb[key] += steps;
                y++;
            }
            rgb[key] = 255;
        } else {
            while (rgb[key] >= 0) {
                ctx.fillStyle = rgb2hex(rgb);
                ctx.fillRect(0, height - y, 15, 1);
                rgb[key] -= steps;
                y++;
            }
            rgb[key] = 0;
        }
    }
    return canvas;
}

/**
 * registry
 *  - used to store values/methods from children
 */
function WindowCtx({ imageResources, filters, children, game }) {
    const cssContext = useContext(CssContext);

    const gameId = game.getId();

    const [ storage ] = useState(() => {
        return new Storage(localStorage, 'remake-engine.editor.');
    });

    const doPersistCache = force => {
        if (force === true || document.visibilityState === 'hidden') {
            const cache = registry('cache');
            storage.storeJson('cache.global', cache.global);
            storage.storeJson('cache.game.' + gameId, cache.game);
            for (let [id, values] of Object.entries(cache.page)) {
                storage.storeJson('cache.page.' + id, values)
            }
        }
    };

    useEffect(() => {
        document.addEventListener('visibilitychange', doPersistCache);

        return () => {
            document.removeEventListener('visibilitychange', doPersistCache);
            doPersistCache(true)
        }
    }, []);

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

        const getCacheProps = id => {
            const rawCache = storage.getDefaultedJson('cache.' + id, {});
            const cache = {};
            for (let [prop, value] of Object.entries(rawCache)) {
                const index = prop.lastIndexOf('_');
                if (index !== -1) {
                    let type = prop.substr(index + 1);
                    switch(type) {
                        case 'bool':
                            type = 'boolean';
                        case 'number':
                        case 'boolean':
                        case 'string':
                            if (index === 0 || (typeof value !== type)) continue;
                            break;
                    }
                }
                cache[prop] = value;
            }
            return cache;
        }

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

        const gameCache = getCacheProps('game.' + gameId);

        registryRef.current = {
            lastTarget: null,
            mode: null,
            confirm: null,
            settings: null,
            tooltipTimer: null,
            modalStack: [],
            modalIds: [],
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
            },

            cache: {
                global: getCacheProps('global'),
                game: gameCache,
                page: {}
            },

            lastColorsIndex: new ColorIndex({colors: (gameCache.lastColors ? gameCache.lastColors.split(' ') : [])})
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

        const clearTooltipTimer = () => {
            const lastId = registry('tooltipTimer');
            if (!lastId) return;
            clearTimeout(lastId)
        }

        // let's initialize the context with ref-values and methods here...
        setterRef.current = {
            clearAllCaches: () => {
                const cache = registry('cache');
                storage.deleteJson('cache.global');
                cache.global = {};

                const gameIds = Object.keys(cache.game);
                for (let id of gameIds) {
                    storage.deleteJson('cache.game.' + id);
                }
                cache.game = {};

                const pageKeys = Object.keys(cache.page);
                for (let key of pageKeys) {
                    storage.deleteJson('cache.page.' + key);
                }
                cache.page = {};
            },

            // overwrite registry key with new value
            register,
            registry,
            game,
            filters,
            resourceLoader,

            startTooltipTimer: propsRef => {
                clearTooltipTimer();
                if (propsRef.current.showTooltip === false) {
                    registry().tooltipTimer = setTimeout(
                        () => {
                            if (propsRef.current.showTooltip === false) {
                                propsRef.current.setShowTooltip(true)
                            }
                        },
                        1000
                    );
                }
            },
            clearTooltipTimer,

            lastColorsIndex: registry('lastColorsIndex'),

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

            cache: registry('cache'),
            loadPageCache: id => {
                const cache = registry('cache');
                if (!cache.page[id]) {
                    cache.page[id] = getCacheProps('page.' + id)
                }
                return cache.page[id]
            },

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

            pushModalId: id => registry('modalIds').push(id),
            popModalId: () => registry('modalIds').pop(),
            getCurrModalCache: () => {
                const modalIds = registry('modalIds');
                if (!modalIds.length) return {};

                const id = modalIds[modalIds.length - 1];
                const cache = registry('cache').page[id];
                return cache
            },
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
                focusStack.elem[zIndex] = {
                    top: null, start: null, setShadow: null,
                    lastFocus: document.activeElement,
                    lastTarget
                };
                return zIndex;
            },
            closeModal: zIndex => {
                const { modalStack, focusStack } = registry();

                const index = modalStack.indexOf(zIndex);
                if (index === -1) {
                    return;
                }
                modalStack.splice(index, 1);
                const { lastTarget, lastFocus } = focusStack.elem[zIndex];

                register('lastTarget', lastTarget);
                if (lastFocus) {
                    requestAnimationFrame(() => lastFocus.focus());
                }

                delete focusStack.elem[zIndex];
                focusStack.zIndex = modalStack.length ? modalStack[modalStack.length - 1] : null;
                if (focusStack.zIndex) {
                    const old = focusStack.elem[focusStack.zIndex];
                    if (old && old.setShadow) {
                        old.setShadow()
                    }
                }
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
                    const areaElem = elem;
                    elem = elem.querySelector('.tabbed');
                    if (elem) {
                        const { markFocusArea } = registry();
                        const rectElem = areaElem.parentNode && areaElem.parentNode.classList.contains('parent') ? areaElem.parentNode : areaElem;
                        markFocusArea(rectElem.getBoundingClientRect());
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

            getFilteredCanvasData,
            getFilteredImageData: (filter, imageData) => {
                if (!filter) {
                    return getCanvasForBitmap(imageData).getContext('2d').getImageData(0, 0, imageData.width, imageData.height)
                }
                const result = getFilteredCanvasData(filter, getCanvasForBitmap(imageData));
                const ctx = result.getContext('2d');
                return ctx.getImageData(0, 0, result.width, result.height);
            },

            getHueColorsCanvas: () => {
                let canvas = registry('hueColorsCanvas');
                if (!canvas) {
                    canvas = buildHueColorsCanvas();
                    register('hueColorsCanvas', canvas);
                }
                return canvas;
            },
            getHueMaskCanvas: () => {
                let canvas = registry('hueMaskCanvas');
                if (!canvas) {
                    canvas = buildHueMaskCanvas();
                    register('hueMaskCanvas', canvas);
                }
                return canvas;
            },

            addLastColor: value => {
                value = value.substr(0, 7);
                const index = registry('lastColorsIndex');
                if (index.hasPropValue('value', value)) return;

                const len = index.getLength();
                index.setEntityObject({index: 0, value});
                if (len >= 10) {
                    index.deleteEntity(len);
                }
                gameCache.lastColors = index.getPropValues('value').join(' ')
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
        for (let elem of elems) {
            links.defaults.push(elem.href);
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
                    <FixCursorArea key="em" />
                    <AreaMarker key="am" />
                    {children}
                </>
            }
        </WindowContext.Provider>
    )
}

function AreaMarker() {
    const wContext = useContext(WindowContext);

    const update = useComponentUpdate();
    const [ active, setActive ] = useState(0);
    const styleRef = useRef({zIndex: 100000});
    const timerRef = useRef(null);
    const divRef = useRef();

    useEffect(() => {
        wContext.register('markFocusArea', rect => {
            styleRef.current.width = rect.width;
            styleRef.current.height = rect.height;
            styleRef.current.left = rect.x;
            styleRef.current.top = rect.y;
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }
            timerRef.current = setTimeout(
                () => {
                    timerRef.current = null;
                    setActive(false)
                },
                1000
            );
            setActive(true);
            update()
        });
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        }
    }, []);

    if (!active) return '';

    return (
        <div ref={divRef} style={{ ...styleRef.current }} className="transparent fixed border-box blink area-flicker" />
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
        <div key="fc" style={style} className="fixed pos-0 transparent full-h full-v" />
    )
}

const AvailContext = React.createContext();

function AvailContextProvider({ children }) {
    const [ width, setWidth ] = useState(0);
    const [ height, setHeight] = useState(0);
    const propsRef = useRef(null);
    const observerRef = useRef(null);
    const divRef = useRef(null);

    propsRef.current = { width, height };

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

    const cls = ['bounds overlay'];
    const style = {};
    if (width === 0) {
        cls.push('full-h')
    } else {
        style.width = width
    }
    if (height === 0) {
        cls.push('full-v')
    } else {
        style.height = height
    }

    return (
        <div ref={divRef} className="full-v full-h overlays">
            <AvailContext.Provider value={value}>
                <div className={cls.join(' ')} style={style}>
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
            <Separator />
        </>
    );
}

const TabContext = React.createContext();

function ButtonStack({ items, onClick }) {
    const tabs = [];
    for(let item of items) {
        tabs.push(
            <Button key={item} full="h" padded="h" onClick={() => onClick(item)} name={item}><Icon name="keyboard_arrow_right" /></Button>
        );
    }
    return (
        <Block scroll padded="h" full="h">
            <Stack indented vertical gaps full="h">{tabs}</Stack>
        </Block>
    )
}


function SideTabs({ vertical, rev, icon = 'keyboard_arrow_right', children, ...props }) {

    const [ ready, setReady ] = useState(false);

    const tabsRef = useRef(null);
    const refocus = useRefocus(tabsRef);

    let [ active, setActiveRaw ] = useState(props.active !== undefined ? props.active : null);
    if (props.setActive) {
        active = props.active;
        setActiveRaw = props.setActive
    }
    const setActive = value => {
        refocus();
        setActiveRaw(value);
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

    const ctx = {
        active,
        setActive,
        add: name => {
            if (!items.current.includes(name)) {
                items.current.push(name);
                requestAnimationFrame(
                    () => setReady(true)
                );
            }
        },
        ready
    };
    const tabElems = [];
    for(let item of items.current) {
        tabElems.push(
            <Button key={item} full="h" padded="h" current={active} value={item} onClick={({value}) => setActive(value)} name={item}>{icon ? <Icon name={icon} /> : ''}</Button>
        );
    }

    const stackItems = [];
    stackItems.push(
        <Block ref={tabsRef} scroll padded="h" key="a">
            <Stack indented vertical={!vertical} gaps {...attr}>{tabElems}</Stack>
        </Block>
    );
    stackItems.push(
        <Block full key="b">
            <TabContext.Provider value={ctx}>
                {children}
            </TabContext.Provider>
        </Block>
    );
    if (rev) {
        stackItems.reverse()
    }
    return (
        <Stack vertical={vertical} scroll full borders>
            {stackItems}
        </Stack>
    )
}

function SideTab({ name, active, children }) {
    const tabContext = useContext(TabContext);

    useEffect(() => {
        tabContext.add(name);
        if (active || tabContext.active === name) {
            tabContext.setActive(name);
        }
    }, []);

    if (!tabContext.ready || tabContext.active !== name) {
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
    const openedRef = useRef(0);
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
        openedRef.current++;
        propsRef.current = props;
        setIsOpen(context.openModal());
    };
    const content = function ({id, full, width, maxWidth, minWidth, height, maxHeight, minHeight, transparent, drag, ...props}) {
        const title = propsRef.current && propsRef.current.title ? propsRef.current.title : props.name;
        const dimProps = {full, width, height, maxWidth, minWidth, maxHeight, minHeight};
        dimProps.zIndex = isOpen;
        if (!id && propsRef.current && propsRef.current.id) {
            id = propsRef.current.id
        }
        return (
            <>
                {isOpen && <Modal id={id} key={openedRef.current} close={close} name={title} drag={drag} transparent={transparent} closeable={props.closeable} {...dimProps}>{props.children}</Modal>}
            </>
        );
    };
    return {
        content,
        open,
        close,
        get props() {
            const props = propsRef.current === null ? {} : propsRef.current;
            return props.close ? props : { ...props, close };
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

function Modal({ ...props }) {
    const trapRef = useRef(null);
    const wContext = useContext(WindowContext);
    if (wContext.isStyleLocked()) {
        const lockedStyles = wContext.getLockedStyles();
        return (
            <Portal id="modals-container">
                <ThemeFreeze blockRef={trapRef} values={lockedStyles}>
                    <ModalInner trapRef={trapRef} lockedStyles={lockedStyles} { ...props } />
                </ThemeFreeze>
            </Portal>
        )
    }
    return (
        <Portal id="modals-container">
            <ModalInner trapRef={trapRef} { ...props } />
        </Portal>
    )
}

/**
 */
const ModalInner = function ({ id, name, trapRef, lockedStyles = null, close, closeable = true, zIndex = 0, full, width, transparent, maxWidth, minWidth, height, maxHeight, drag, children }) {
    const wContext = useContext(WindowContext);

//    const trapRef = useRef(null);
    const dimRef = useRef(null);
    const [ left, setLeft ] = useState(null);
    const [ top, setTop ] = useState(null);
    const [ dim, setDim ] = useState(null);
    const [ shadow, setShadow ] = useState(null);
    const mounted = useMounted();

    // const lockedStyles = wContext.isStyleLocked() ? wContext.getLockedStyles() : null;
    let { headerBgType } = useCssProps('headerBgType');
    if (lockedStyles) {
        headerBgType = lockedStyles.headerBgType
    }

    const enableShadow = () => {
        setTimeout(() => {
            if (mounted.current) {
                setShadow(true);
            }
        }, 100)
    }

    const cacheRef = useRef(false);
    if (id && !cacheRef.current) {
        wContext.pushModalId(id);
        wContext.loadPageCache(id);
        cacheRef.current = true
    }
    useEffect(() => {
        if (!id) return;
        return () => {
            wContext.popModalId(id)
        }
    });

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
            requestAnimationFrame(() => {
                const rect = dimRef.current.getBoundingClientRect();
                setDim(rect);
                setLeft(rect.left);
                setTop(rect.top)
            });
            return () => {
                observer.disconnect();
            };
        }
    }, []);

    useEffect(() => {
        if (transparent) {
            const focusElem = wContext.focusStack.elem[zIndex];
            if (focusElem) {
                focusElem.setShadow = enableShadow
            }
            enableShadow();
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

    const vDivCls = ['stack-v full-h boxed modal-centered primary-color primary-bg medium'];
    if (full && full !== 'h') {
        vDivCls.push('full-v');
    }
    const dimAttr = {};
    if (transparent && shadow !== null) {
        vDivCls.push((shadow ? '' : 'fix-') + 'shadow');
        const modalLevel = wContext.getModalLevel();
        dimAttr.onMouseEnter = e => setShadow(false);
        dimAttr.onMouseLeave = e => {
            if (wContext.getModalLevel() !== modalLevel) {
                setShadow(false);
                return;
            }
            const rect = dimRef.current.getBoundingClientRect();
            if (!isEventInRect(e, rect)) {
                setShadow(true);
            } else if (wContext.isInExclusiveMode()) {
                window.addEventListener('mouseup', e => {
                    if (!isEventInRect(e, rect)) {
                        setShadow(true)
                    }
                }, {once: true});
                setShadow(false);
            }
        }
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

    return (
        <Block ref={trapRef} area={1} onLeftClick={e => e.stopPropagation()} hotKeys={hotKeys} full className={overlayCls.join(' ')} onClick={onClick} zIndex={zIndex - 1}>
        <div className="center-v center-h full-h editor-bounds">
            <div className="center-h block" style={parentDivStyle}>
                <div className={hDivCls.join(' ')} style={hDivStyle}>
                    <div ref={dimRef} { ...dimAttr } className={vDivCls.join(' ')} style={vDivStyle}>
                        <Stack gaps full="h" className={headerBgType === 0 ? '' : (headerBgType === 2 ? 'header-gradient-bg' : 'header-bg')} { ...nameAttr } padded>
                            <Block center="v" shorten full="h" className="more big">{name}</Block>
                            {closeable ? <Button icon="close" onClick={e => close()} /> : ''}
                        </Stack>
                        <div className="border-div-v"></div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
        <Block width={0} height={0} tab onFocus={() => {
            const focusElem = wContext.focusStack.elem[zIndex];
            if (focusElem && focusElem.start) {
                focusElem.start.focus()
            }
        }} />
    </Block>);

    /*
    if (lockedStyles) {
        elem = <ThemeFreeze blockRef={trapRef} values={lockedStyles}>{elem}</ThemeFreeze>
    }

     */

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
    if (width && width < size) {
        size = width
    }
    if (height && height < size) {
        size = height
    }
    if (typeof size === 'number') {
        size += 'px';
    }
    const cls = ['min-content-h'];
    if (center) {
        if (center !== 'v') {
            cls.push('center-h');
        }
        if (center !== 'h') {
            cls.push('center-v');
        }
    }
    if (className) {
        cls.push(className);
    }
    return (
        <div style={style} className={cls.join(' ')} dangerouslySetInnerHTML={
            {
                __html: !name ? '' :
                    '<i class="material-icons center-h min-content-h" style="font-size: ' + size + '; display: block; ' + (rotate ? 'transform: rotate(' + rotate + 'deg)' : '')  + ' ">' + name + '</i>'
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

function Gradient({colors, vertical, plain}) {
    const aContext = useContext(AvailContext);
    const stops = colors.split(' ');
    const dist = 1 / (stops.length - 1);
    const render = ctx => {
        ctx.clearRect(0, 0, aContext.width, aContext.height);
        const grd = ctx.createLinearGradient(0, 0,
            vertical ? 0 : aContext.width,
            vertical ? aContext.height : 0
        );
        let pos = 0;
        for(let color of stops) {
            if (color.length > 9) d('FFF', colors);
            grd.addColorStop(pos, color);
            pos += dist
        }
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, aContext.width, aContext.height)
    }
    return (
        <Canvas plain={plain} width={aContext.width} height={aContext.height} render={render} />
    )
}

function GradientBox({ value, width, height, className }) {
    const boxStyle = {
        width,
        height
    };
    const bgStyle = {
        background: value
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
    'rgb', 'rgba', 'px', 'urls', 'url', 'font', 'bstyle', 'float', 'perc', 'grad', 'type'
];

const metrics = {
    fmDefaultSmall: 'small',
    fmDefaultMedium: 'medium',
    fmDefaultBig: 'big',
    fmMonoSmall: 'mono small',
    fmMonoMedium: 'mono medium',
    fmMonoBig: 'mono big',
    fmButton: 'button-font'
};
const metricKeys = Object.keys(metrics);

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
                if (match === null || match.length < 2) continue;

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
                const keyType = key2type[key];
                if (result[key] === undefined && keyType) {
                    let propValue = value;
                    switch(keyType) {
                        case 'perc':
                            if (typeof value === 'string') {
                                value = value.substr(0, value.length - 1);
                                propValue = parseInt(value, 10)
                            }
                            break;
                        case 'type':
                            propValue = parseInt(value, 10);
                            break
                    }
                    result[key] = propValue
                }
            }
            return result
        };

        const setStyleProp = (style, key, value) => {
            const type = key2type[key];
            if (!type) return;

            if (['type', 'perc'].includes(type) && typeof value === 'string') {
                value = parseInt(value, 10);
            }
            let cssValue = value;
            if (type === 'px' && !(value === 'none' && (key.startsWith('max') || key.startsWith('end')))) {
                cssValue += 'px';
            } else if (type === 'perc') {
                cssValue += '%';
            }
            style.setProperty(key2const[key], cssValue);
            return value
        };

        const setValue = (name, value, notify = true) => {
            if (!metricKeys.includes(name)) {
                if (parent) {
                    return parent.setValue(name, value, notify)
                }
                value = setStyleProp(bindRef ? bindRef.current.style : document.body.style, name, value);
            }
            registry('values')[name] = value;
            if (notify) {
                const watcher = registry('watcher')[name];
                if (!watcher) return;
                for (let watch of watcher) {
                    watch();
                }
            }
        };

        const applyTo = node => {
            const { values } = registry();
            const style = node.style;

            for (let [key, value] of Object.entries(values)) {
                if (!metricKeys.includes(key)) {
                    setStyleProp(style, key, value)
                }
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
                for (let key of metricKeys) {
                    values[key] = 10
                }
                setReady(true)
            },

            getValues: () => {
                return { ...registry('values') }
            },

            getValue: name => registry('values')[name],

            setValue,

            setValues: values => {
                for (let [key, value] of Object.entries(values)) {
                    setValue(key, value, false);
                }
                const watcher = registry('watcher');
                const notified = [];
                for (let values of Object.values(watcher)) {
                    for (let value of values) {
                        if (notified.includes(value)) continue;
                        value();
                        notified.push(value)
                    }
                }
            },

            watch: (prop, updater) => {
                const watcher = registry('watcher');
                if (!watcher[prop]) {
                    watcher[prop] = [];
                }
                if (!watcher[prop].includes(updater)) {
                    watcher[prop].push(updater);
                }
            },
            unwatch: (prop, updater) => {
                const watcher = registry('watcher');
                if (!watcher[prop]) return;
                const index = watcher[prop].indexOf(updater);
                if (index === -1) return;
                watcher[prop].splice(index, 1);
            },

            applyTo
        };

        registryRef.current = {
            api,
            body: {},
            watcher: {}
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
            {ready && <FontMetrics />}
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
                        item.handler(e);
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

function useRefocusFirst(ref) {
    return {
        canRefocus: () => {
            let elem = document.activeElement;
            if (!elem || !ref.current) return true;

            while (elem && elem !== ref.current) {
                if (!elem.parentNode) break;
                elem = elem.parentNode
            }
            return elem === ref.current
        },
        refocus: () => {
            requestAnimationFrame(() => {
                if (!ref.current) return;
                const elem = ref.current.querySelector('.tabbed');
                if (elem) {
                    elem.focus()
                }
            });
        }
    }
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

function useCallAfterwards() {
    const items = [];
    useEffect(() => {
        while (items.length) {
            const [setter, ...value] = items.pop();
            setter(...value)
        }
    });
    return (setter, ...value) => {
        items.push([setter, ...value]);
    }
}

function useCssProps( ...props ) {
    const cssContext = useContext(CssContext);
    const update = useComponentUpdate();

    useEffect(() => {
        for(let prop of props) {
            cssContext.watch(prop, update)
        }
        return () => {
            for (let prop of props) {
                cssContext.unwatch(prop, update)
            }
        }
    }, []);

    const values = {};
    for (let prop of props) {
        values[prop] = cssContext.getValue(prop)
    }
    return values;
}

function MinMaxCtx({ vertical, min, max, full, end, center, width, height, padded, border, children }) {
    const { defaultPaddingPx, boxBorderWidthPx } = useCssProps('defaultPaddingPx', 'boxBorderWidthPx');
    const add = {
        h: 0,
        v: 0
    }
    if (padded) {
        if (padded === '1') {
            add.h += 2;
            add.v += 2
        } else {
            if (typeof padded === 'number') {
                if (padded & DIR.LEFT) add.h++;
                if (padded & DIR.RIGHT) add.h++
                if (padded & DIR.TOP) add.v++;
                if (padded & DIR.BOTTOM) add.v++
            } else {
                if (padded !== 'v') add.h = 2;
                if (padded !== 'h') add.v = 2
            }
            add.h *= defaultPaddingPx;
            add.v *= defaultPaddingPx
        }
    }
    if (border) {
        if (border === '1') {
            add.h += 2;
            add.v += 2
        } else if (typeof border === 'number') {
            let h = 0;
            let v = 0;
            if (border & DIR.TOP) v++;
            if (border & DIR.BOTTOM) v++;
            if (border & DIR.LEFT) h++;
            if (border & DIR.RIGHT) h++;
            add.h += h * boxBorderWidthPx;
            add.v += v * boxBorderWidthPx
        } else {
            add.h += 2 * boxBorderWidthPx;
            add.v += 2 * boxBorderWidthPx
        }
    }
    if (width) width += add.h;
    if (height) height += add.v;

    const axisDir = vertical ? 'v' : 'h';
    full = full && full !== axisDir ? true : axisDir;
    const dimProps = { width, height, border, padded, full };
    const axisDim = vertical ? 'Height' : 'Width';
    if (min) {
        dimProps['min' + axisDim] = min + add[axisDir];
    }
    if (max) {
        dimProps['max' + axisDim] = max + add[axisDir];
    }
    if (end) {
        dimProps.className = 'margin-' + (vertical ? 'top' : 'left') + '-auto';
    } else if (center) {
        dimProps.className = 'margin-' + (vertical ? 'v' : 'h') + '-auto';
    }
    return (
        <Block { ...dimProps }>
            <AvailContextProvider>
                {children}
            </AvailContextProvider>
        </Block>
    )
}

function PropertyGrid({ labelProps = {}, children }) {
    labelProps = { width: '-', end: false, ...labelProps };
    if (typeof labelProps.width === 'number') {
        labelProps.width += 'px'
    }
    return (
        <Grid padded={DIR.TOP} scroll full="h" columns={labelProps.width + ' minmax(min-content, auto)'}>
            { children }
        </Grid>
    )
}

const HotKeySingleKeys = ['Escape'];
const HotKeySkipValues = ['Meta', 'Control', 'Alt', 'Shift'];

function HotKeyKeys({ hotKey, empty, className, padded = true }) {

    const keys = [];
    let elems = [];
    if (hotKey !== null) {
        const [hotPart, keyPart] = hotKey.split(' ');
        if (hotPart.startsWith('m')) {
            keys.push('CMD ⌘')
        } else if (hotPart.startsWith('c')) {
            keys.push('CTRL')
        } else if (hotPart.startsWith('a')) {
            keys.push('ALT');
        }
        if (keys.length > 0) {
            if (hotPart.indexOf('i') !== -1) {
                keys.push('SHIFT');
            }
            if (keyPart) {
                keys.push(keyPart);
            }
        } else if (HotKeySingleKeys.includes(hotPart)) {
            keys.push(hotPart);
        }
    }
    const cls = [];
    if (keys.length) {
        if (className) {
            cls.push(className);
        }
        for(let key of keys) {
            if (elems.length) {
                elems.push(<Block center="v" key={'_' + elems.length}><Icon name="add" size={12} className="less" /></Block>);
            }
            elems.push(<Block key={key} padded={padded} border="1"><kbd>{key}</kbd></Block>);

        }
        return (
            <Stack className={cls.join(' ')} center="v" gaps="1">{elems}</Stack>
        )
    }
    return (
        <Block centerItems full className="less">{empty}</Block>
    )
}

function usePageCache(id) {
    const wContext = useContext(WindowContext);
    const cacheRef = useRef(null);
    if (!id) {
        return {}
    }
    if (!cacheRef.current) {
        cacheRef.current = wContext.loadPageCache(id);
    }
    return cacheRef.current;
}

function useCachedState(level, id, value, type) {
    const wContext = useContext(WindowContext);
    const eContext = useContext(EditorContext);
    let cache = null;
    let pre = value;

    if (level && id) {
        if (id && type) {
            id += '_' + type
        }
        if (level === 'page') {
            if (wContext.getModalLevel() > 0) {
                cache = wContext.getCurrModalCache()
            } else if (eContext) {
                cache = eContext.cache
            }
        } else {
            cache = wContext.cache[level]
        }
        if (cache) {
            if (cache[id] === undefined) {
                cache[id] = value
            }
            pre = cache[id]
        }
    }
    const [ cacheValue, setCacheValue ] = useState(pre);

    return [
        cacheValue,
        cache !== null ?
            newValue => {
                cache[id] = newValue;
                setCacheValue(newValue);
            } : setCacheValue
    ]
}

function useDebugMount(name) {
    useEffect(() => {
        if (!name) return;
        d('MOUNTING', name);
        return () => {
            d('UNMOUNTING', name);
        }
    }, []);
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
    Gradient,
    LoadingIndicator,
    MinMaxCtx,
    PropertyGrid,
    ValueProp,
    CanvasCircleMarker,
    ColorBox,
    GradientBox,
    HotKeyKeys,
    HotKeySingleKeys,
    HotKeySkipValues,
    FontMetrics,
    JsonView,

    useModal,
    useComponentUpdate,
    useUpdateOnEntityIndexChanges,
    useMounted,
    useFocusKeyBindings,
    useRefocus,
    useRefocusFirst,
    useCallAfterwards,
    useCssProps,
    usePageCache,
    useCachedState,
    useDebugMount
}