import React, {Fragment, useState, useRef, useEffect, useContext, useMemo} from "react";
import {d} from '../helper/helper';

function Content({children, className, flex, thin, center, full, shorten, scroll, boxed, padded, wrap, ...props}) {
    const cls = ['content'];
    if (className) {
        cls.push(className);
    }
    if (flex) {
        cls.push('flex');
    }
    if (!wrap) {
        cls.push('nowrap' + (shorten ? '-shorten' : ''));
    } else {
        cls.push('wrap-normal');
    }
    if (padded) {
        if (padded === 'h') {
            cls.push('padded-h');
        } else {
            cls.push('padded' + (padded === 'v' ? '-v' : ''));
        }
    }
    if (boxed) {
        cls.push((thin ? 'thin-' : '') + 'boxed');
    }
    const style = {};
    for (let prop of ['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight']) {
        const value = props[prop];
        if (value) {
            style[prop] = value;
        }
    }

    let stretchH = false;
    if (full) {
        if (full !== 'h') {
            cls.push('full-v');
        }
        if (full !== 'v') {
            cls.push('full-h');
            stretchH = true;
        }
    }

    if (scroll) {
        cls.push('scroll');
        cls.push('max-v');
    }
    if (scroll || shorten) {
        cls.push('max-h');
    }
    if (!style.width && !stretchH) {
        cls.push('min-content-h');
    }

    const div = (
        <div style={style} className={cls.join(' ')}>{children}</div>
    );

    if (!center) {
        return div;
    }
    const stackCls = 'stack-' + (center === 'v' ? 'v full-v' : 'h' + (center !== 'h' ? ' flex-item-centered full-v' : '')) + ' flex-items-centered';
    return (
        <div className={stackCls}>
            {div}
        </div>
    )
}

function Stack({children, className, vertical, flex, wrap, gap, thin, border, padded, boxed, scroll, full, centerAll, ...props}) {
    const cls = [];
    if (className) {
        cls.push(className);
    }
    const axis = vertical ? 'v' : 'h';
    cls.push('stack-' + axis);
    if (flex) {
        cls.push('flex');
    }
    const style = {};
    for (let prop of ['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight']) {
        const value = props[prop];
        if (value) {
            style[prop] = value;
        }
    }
    if (gap) {
        if (wrap) {
            cls.push('flow-padding');
            if (centerAll) {
                cls.push('center-items');
            }
        } else {
            cls.push('inner-space-' + axis);
        }
    } else if (border) {
        cls.push('inner-border-' + axis);
    }
    if (full) {
        if (full !== 'h') {
            cls.push('full-v');
        }
        if (full !== 'v') {
            cls.push('full-h');
        }
    }
    if (boxed) {
        cls.push((thin ? 'thin-' : '') + 'boxed');
    }
    if (wrap) {
        cls.push('wrap');
    }
    if (padded) {
        if (padded === 'h') {
            cls.push('padded-h');
        } else {
            cls.push('padded' + (padded === 'v' ? '-v' : ''));
        }
    }
    if (scroll) {
        cls.push('scroll');
    }
    cls.push('max-h');
    cls.push('max-v');
    if (!style.width) {
        cls.push('min-content-h');
    }
    return (
        <div style={style} className={cls.join(' ')}>{children}</div>
    )
}

function Grid({children, columns, rows, gap, full, centerAll, className, ...props}) {
    const cls = ['grid'];
    if (className) {
        cls.push(className);
    }
    const style = {};
    for (let prop of ['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight']) {
        const value = props[prop];
        if (value) {
            style[prop] = value;
        }
    }
    if (gap) {
        cls.push('grid-gap');
    }
    if (centerAll) {
        cls.push('grid-cells-centered');
    }
    if (full) {
        if (full !== 'h') {
            cls.push('full-v');
        }
        if (full !== 'v') {
            cls.push('full-h');
        }
    }

    if (columns) {
        style.gridTemplateColumns = columns;
    }
    if (rows) {
        style.gridTemplateRows = rows;
    }
    return (
        <div className={cls.join(' ')} style={style}>
            {children}
        </div>
    )
}

function Overlays({width, maxWidth, height, scroll, children}) {
    const cls = ['overlays'];
    const style = {
        width,
        maxWidth,
        height
    };
    if (scroll) {
        cls.push('scroll');
        cls.push('max-v');
        cls.push('max-h');
    }
    return (
        <div style={style} className={cls.join(' ')}>{children}</div>
    )
}

function Overlay({width, height, children}) {
    const cls = ['overlay'];
    const style = {
        width,
        height
    };
    return (
        <div style={style} className={cls.join(' ')}>{children}</div>
    )
}

function Canvas() {
    return (
        <div></div>
    )
}

export {
    Content,
    Stack,
    Grid,
    Overlays,
    Overlay,
    Canvas
}