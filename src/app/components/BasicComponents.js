import React, {useMemo, useEffect, useRef, useState, Fragment, useContext, useLayoutEffect} from "react";
import {d} from "../helper/helper"
import {Content, Stack, Grid, Overlays, Overlay} from "./LayoutComponents";

function Background({width, height}) {
/*
    const context = useContext(BackgroundContext);
    const style = {
        width,
        height,
        top: 0,
        position: 'absolute'
    };
    const bgColor = context.bgColor + (Math.min(context.bgOpacity * 10, 255)).toString(16).padStart(2, '0');
    return (
        <div style={style} className="checkbg">
            <div style={{...style, backgroundColor: bgColor}} />
        </div>
    )

 */
    return '';
}

function Canvas({width, height, render, plain, className}) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current || !render) {
            return;
        }
        const ctx = canvasRef.current.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        render(ctx);
    });

    if (height === 0 || width === 0) return '';

    return (
        <div style={{position: 'relative', height, width}}>
            {!plain && <Background width={width} height={height} />}
            <canvas style={{top: 0, position: 'absolute'}} className={className} width={width} height={height} ref={canvasRef} />
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

function Button({name, icon, disabled, click}) {
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
        <Content className={cls.join(' ')} thin boxed>
            <Content center click={click} className={bCls.join(' ')}>
                {text}
            </Content>
        </Content>
    )
}

function PropertyGrid({propWidth = '-', valueWidth = '*', ...props}) {
    return (
        <Grid gap={5} columns={propWidth + " " + valueWidth} {...props} />
    );
}

function ValueProp({name, children}) {
    return (
        <PropLabel name={name}>
            {children}
        </PropLabel>
    )
}

function PropLabel({name, children}) {
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

function FlexCanvas({ render, size, viewX, viewY, width, setViewX, height, setViewY, border, zoom }) {
    const cellSize = size * zoom;

    const sizeChange = (curr, rect) => {
        let spaceY = (rect.height - curr.border);
        let newViewY = Math.min(height, Math.floor( spaceY / (curr.cellSize + curr.border)));

        let spaceX = (rect.width - curr.border);
        const newViewX = Math.min(width, Math.floor( spaceX / (curr.cellSize + curr.border)));

        if (curr.viewX !== newViewX) {
            setViewX(newViewX);
        }
        if (curr.viewY !== newViewY) {
            setViewY(newViewY);
        }
    };

    const dim = {
        width: border + (cellSize + border) * viewX,
        height: border + (cellSize + border) * viewY
    };

    const ref = useResize({viewX, viewY, zoom, border, cellSize}, [viewX, viewY, zoom, border], sizeChange);
    let elem = null;
    if (viewX > 0 && viewY > 0) {
        elem = <Canvas width={dim.width} height={dim.height} render={render} />
    } else {
        elem = <Content shorten className="small-font">No space to render!</Content>;
    }
    return (
        <Content ref={ref} full>
            <Content center full>
                {elem}
            </Content>
        </Content>
    );
}

function IntField({readOnly, name, size = 3, step = 1, value = 0, min, set, buttons, max}) {
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
        <Stack padded gap centerAll>
            <IntField {...props} />
        </Stack>
    );
}

function useResize(props, deps, checkSize) {
    const propsRef = useRef(null);
    const observerRef = useRef(null);
    const divRef = useRef(null);

    propsRef.current = props;

    useLayoutEffect(() => {
        const observer = new ResizeObserver(e => {
            if (!divRef.current) return;
            checkSize(propsRef.current, divRef.current.getBoundingClientRect());
        });
        observerRef.current = observer;
        observer.observe(divRef.current);
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        }
    }, []);

    useLayoutEffect(() => {
        checkSize(propsRef.current, divRef.current.getBoundingClientRect());
    }, deps);

    return divRef;
}

export {
    PropertyGrid,
    ValueProp,
    Section,
    Button,
    Canvas,
    Int,
    FlexCanvas
}