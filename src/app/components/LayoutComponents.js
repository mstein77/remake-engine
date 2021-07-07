import React, {Fragment, useState, useRef, useEffect, useContext} from "react";
import {d} from '../helper/helper';
import {Portal, WindowContext} from "./BasicComponents"

const DIR = {
    TOP: 1,
    BOTTOM: 2,
    LEFT: 4,
    RIGHT: 8,
    ALL: 15
};

/**
 * @module LayoutComponents
 */

function useHotKeys(elemRef, hotKeys, area = null, link = null) {
    const wContext = useContext(WindowContext);
    const isHot = !!(area || (hotKeys && Object.keys(hotKeys).length > 0));
    useEffect(
    () => {
        if (!isHot) {
            return;
        }
        wContext.addElemKeyBinding(elemRef.current, hotKeys, area, link);
        return () => {
            wContext.deleteElemKeyBindings(elemRef.current)
        }
    });
    return isHot
}

const handleLeftRightClick = (leftHandler, rightHandler) => {
    return e => {
        if (leftHandler && e.button === 0) {
            leftHandler(e);
        } else if (rightHandler && e.button === 2) {
            rightHandler(e);
            e.preventDefault();
            e.stopPropagation();
        }
    }
};

function useGetLayoutProps({className, padded, border, zIndex, cursor, tab, onLeftClick, onRightClick,  ...props}) {
    const dimCls = [];
    if (className) {
        dimCls.push(className);
    }
    if (padded) {
        if (padded === 'h') {
            dimCls.push('padded-h')
        } else if (typeof padded === 'number') {
            dimCls.push('border-box');
            let i = 1;
            while (i < 16) {
                if ((padded & i)) {
                    dimCls.push('padded-' + i);
                }
                i = i << 1
            }
        } else if (padded === '1') {
            dimCls.push('padded-p')
        } else {
            dimCls.push('padded' + (padded === 'v' ? '-v' : ''))
        }
    }
    if (border) {
        dimCls.push((border !== true ? 'thin-' : '') + 'boxed');
        if (typeof border === 'number') {
            let i = 1;
            while (i < 16) {
                if (!(border & i)) {
                    dimCls.push('no-border-' + i);
                }
                i = i << 1;
            }
        }
    }

    const dimAttr = {};
    if (onLeftClick || onRightClick) {
        if (props.onMouseDown) {
            throw Error('onMouseDown cannot be used with onLeftClick/onRightCLick at the same time!');
        }
        dimAttr.onMouseDown = handleLeftRightClick(onLeftClick, onRightClick);
    }

    for(let prop of Object.keys(props)) {
        if (!prop.startsWith('on')) continue;
        const handler = props[prop];
        if (handler) {
            dimAttr[prop] = handler;
        }
    }
    const dimStyle = {};
    for (let prop of ['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight']) {
        let value = props[prop];
        if (!value) continue;

        if (typeof value === 'string' && value.match(/^\d+$/)) {
            value = parseInt(value, 10);
        }
        dimStyle[prop] = value;
    }
    if (zIndex !== undefined) {
        dimStyle.zIndex = zIndex;
    }
    if (cursor) {
        dimStyle.cursor = cursor;
    }
    if (tab) {
        dimAttr.tabIndex = 0;
        dimCls.push('tabbed');
    } else if (tab === false) {
        dimAttr.tabIndex = -1;
    }

    return {
        dimCls,
        dimAttr,
        dimStyle
    }
}


/**
 *
 *
 * @param children
 * @returns {*}
 * @constructor
 */
function Tooltip({ children }) {
    const divRef = useRef(null);
    const [ absLeft, setAbsLeft ] = useState(null);
    const [ absTop, setAbsTop ] = useState(null);
    const [ rect, setRect ] = useState(null);

    useEffect(() => {
        if (!divRef.current) return;

        let span = divRef.current.previousSibling;
        let baseRect = null;
        if (!span || span.tagName !== 'SPAN') {
            span = null;
        } else {
            baseRect = span.getBoundingClientRect()
        }
        const rect = divRef.current.getBoundingClientRect();
        const out = {
            top: rect.top < 0,
            left: rect.left < 0,
            bottom: rect.bottom > window.innerHeight,
            right: rect.right > window.innerWidth
        };
        if (out.right) {
            setAbsLeft(window.innerWidth - rect.right)
        } else if (out.left) {
            setAbsLeft(-rect.left)
        }
        if (out.bottom) {
            setAbsTop(-(rect.height + (baseRect ? baseRect.height : 0)));
        } else if (out.top) {
            setAbsTop(-rect.top);
        }
        setRect(rect);
    }, []);

    const style = {
        zIndex: 10000
    };
    if (absLeft) {
        style.marginLeft = absLeft;
    }
    if (absTop) {
        style.marginTop = absTop;
    }
    const portalStyle = {};
    if (rect) {
        portalStyle.top = rect.top;
        portalStyle.left = rect.left;
    }

    // TODO: find a better solution without 2 divs
    return (
        <>
            <div ref={divRef} style={style} className="tooltip invisible font-small fixed padded thin-boxed wrap-normal">
                {children}
            </div>
            <Portal id="modals-container">
                <div style={portalStyle} className="fixed tooltip font-small padded thin-boxed wrap-normal">{children}</div>
            </Portal>
        </>
    );
}

/**
 * The basic layout component which can either hold text, a block element, or another layout component.
 * The default behaviour is different from a div:
 *  - the container will only use as much space as required horizontally
 *  - text wrapping is disabled
 *  - overflow is hidden
 *
 * The assigned space is the maximum space which is made available for this component by the parent
 *  - if the required size of the component is bigger than the assigned space it's overflowing and will
 *    use one of the strategies (scroll, wrap, hide, shorten)
 *  - if the component's required size is smaller the the available size, we have a gap
 *  - if the component's full property is set, then the component uses all available space in that dim
 *  - if the parent has no size given at all, the assigned space will be the minimum of assigned space
 *    of the parent and required min-size of the component
 *    In case of a relative size of the component, the assigned space will be the one of the first
 *    ancestor with an assigned space
 *
 *  [parent:320]  => fix available size of 320
 *    [width:200] => gaps of 120
 *
 *  [parent:320]
 *    [full] => width: 320
 *
 *  [parent:320]
 *    [parent]  <= width: 160
 *       [50%] => width: 160
 *
 *  A stack's required size will be the maximum of it's assigned space and the min-size of it's components
 *  when one of it's children have a flex prop set.
 *  If the min-size is smaller than the assigned space, the space will be added to the assigned space of the
 *  flex children. In the other case when no explicit min-size was set on the flex component, the assigned
 *  size will be the max(0, stack.assigned-space - SUM(min-size-children)) [EXAMPLE]
 *
 *  The assigned size in the opp-axis of the stack children, will be the maximum required size of its
 *  children for all children.
 *
 *  UNCLEAR:
 *   - A relative size in the children should (???) refer to the required size of the stack or the max of
 *     the assigned and the required size?
 *   - What does a explicit or relative size on a stack component mean? Normally it should overwrite the
 *     assigned space, which would mean a gaps if the size is smaller than the old assigned space or an
 *     overflow if the new assigned space is greater than the old
 *   - A full prop on a stack will set the required size of the stack to the assigned size???
 *
 * Center cases:
 *   default => keine auswirkung
 *   full => stack mit 100% child centered
 *   dim=X => stack mit dim X
 *
 *
 *
 *
 * @function
 * @param {object} [props={}]
 * @param {Object|Array} [props.children] - Child components
 * @param {string} [props.className] - Additional CSS classes for this container
 * @param {boolean|string} [props.full] - Extend component to all available space in horizontal ('h'), vertical ('v') or both dimensions (true)
 * @param {boolean|string} [props.center] - Center container of this component horizontally ('h'), vertically ('v') or in both directions (true)
 * @param {boolean|string} [props.centerItems] - Center children of this component horizontally ('h'), vertically ('v') or in both directions (true)
 * @param {boolean|number} [props.border] - Draws a full (true) or a 1 pixel (1) border around this component
 * @param {boolean} [props.scroll] - Show vertical and/or horizontal scrollbar when content overflows
 * @param {boolean} [props.padded] - Use default padding for the content
 * @param {boolean} [props.wrap] - Enables word wrapping for the content
 * @param {boolean} [props.shorten] - Enables the shortening of text and shows a tooltip on mouse-over (only works when props.wrap is not set)
 * @param {function} [props.click] - ClickHandler which is invoked when the left mouse button is onClicked on this component
 * @param {string|number} [props.width] - A CSS width for this component
 * @param {string|number} [props.minWidth] - A CSS min-width for this component
 * @param {string|number} [props.maxWidth] - A CSS max-width for this component
 * @param {string|number} [props.height] - A CSS height for this component
 * @param {string|number} [props.minHeight] - A CSS min-height for this component
 * @param {string|number} [props.maxHeight] - A CSS max-height for this component
 *
 * @param {object} [ref] A React reference to which this component should be bound
 */
const Block = React.forwardRef(({ children, center, centerItems, hotKeys, area, tab, full, shorten, scroll, wrap, zIndex, verticalText, ...props }, ref) => {
    const divRef = useRef(null);
    const [start, setStart] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const timeRef = useRef(null);
    timeRef.current = start;

    const fullH = full && full !== 'v';
    const fullV = full && full !== 'h';
    const isMinH = !props.width && !fullH;
    const isMinV = !props.height && !fullV;

    const parentCls = [];
    const childCls = [];

    const {dimCls, dimAttr, dimStyle} = useGetLayoutProps(props);
    dimCls.push('block');
    if (ref) {
        dimAttr['ref'] = ref;
    } else {
        dimAttr['ref'] = divRef;
        ref = divRef;
    }
    useHotKeys(ref, hotKeys, area);

    if (isMinH) {
        dimCls.push('min-content-h');
    } else if (fullH) {
        dimCls.push('full-h');
    }
    if (fullV) {
        dimCls.push('full-v');
    }
    if (center) {
        if (center !== 'v' /* && !fullH */) {
            dimCls.push('center-h');
        }
        if (center !== 'h' /* && !fullV */) {
//            parentCls.push('full-v center-v');
            parentCls.push('center-v');
            if (dimStyle.height) {
                dimStyle.minHeight = dimStyle.height;
            }
        }
    }
    if (verticalText) {
        dimCls.push('text-vertical');
    }
    if (tab) {
        dimAttr.tabIndex = 0;
        dimCls.push('tabbed');
    }

    if (centerItems) {
        let childFull = false;
        let childRel = false;
        if (typeof children === 'object' && !Array.isArray(children) && children.props) {
            const cProps = children.props;
            if (cProps.full) {
                childFull = cProps.full;
            }
            if (cProps.width && typeof cProps.width === 'string' && cProps.width.indexOf('%') !== -1) {
                childRel = 'h';
            }
            if (cProps.height && typeof cProps.height === 'string' && cProps.height.indexOf('%') !== -1) {
                childRel = childRel ? true : 'v';
            }
        }
        let width = '';
        if (childRel && centerItems === 'h') {
            dimCls.push('center-child-h full-h');
            width = false;
        } else if (centerItems !== 'v' && !isMinH) {
            childCls.push('center' + (childRel ? '-child' : '') + '-h');
            if (!(childFull || childRel)) {
                width = 'min-content-h';
            } else {
                if (childFull !== 'v') {
                    childCls.push('full-h');
                }
            }
            if (center && centerItems === 'h') {
                childCls.push('full-v');
            }
        }

        if (centerItems !== 'h' && !isMinV) {
            dimCls.push('center-v');
            if (dimStyle.height) {
                dimStyle.minHeight = dimStyle.height
            }
            if ((childFull && childFull !== 'h') || (childRel && childRel !== 'h')) {
//                childCls.push('full-v center-v');
                childCls.push('center-v');
                if (childFull !== 'v' || childRel !== 'v') {
                    childCls.push('full-h center-' + (centerItems !== 'v' ? 'child-' : '') + 'h');
                }
            } else if (isMinH) {
                width = 'min-content-h';
            }
        }
        if (width !== false) {
            childCls.push(width);
        }
    }

    let doShorten = false;
    if (!wrap) {
        doShorten = shorten;
        dimCls.push('nowrap' + (shorten ? '-shorten' : ''));
    } else {
        dimCls.push('wrap-normal');
    }
    let childText = '';
    if (doShorten) {
        const dimProp = verticalText ? 'Height' : 'Width';
        const mouseOver = () => {
            if (!ref) return;

            const elem = ref.current;
            if (elem['offset' + dimProp] >= elem['scroll' + dimProp]) {
                return;
            }
            const time = Date.now();
            setStart(time);
            setTimeout(() => {
                if (time === timeRef.current) {
                    setShowTooltip(true);
                }
            }, 1000);
        };

        const mouseLeave = () => {
            setShowTooltip(false);
            setStart(null);
        };
        children = <span onMouseOver={mouseOver} onMouseLeave={mouseLeave}>{children}</span>;
        if (ref.current) {
            childText = ref.current.textContent;
        }
    }
    if (showTooltip) {
        dimCls.push('tooltip-parent');
    }
    const parentStyle = {};
    if (scroll) {
        parentCls.push('scroll max-v max-h');
        if (!isMinH && !dimStyle.width) {
            parentCls.push('full-h');
        }
        if (!isMinV) {
            if (dimStyle.maxHeight) {
                parentStyle.maxHeight = dimStyle.maxHeight;
                dimStyle.maxHeight = null;
            } else {
                parentCls.push('full-v');
            }
        }
    }
    if (shorten) {
        dimCls.push('max-h');
    }
    if (childCls.length) {
        children = <div className={childCls.join(' ')}>{children}</div>
    }
    const dimDiv = (
        <div {...dimAttr}  className={dimCls.join(' ')} style={dimStyle}>
            {children}
            {showTooltip && <Tooltip>{childText}</Tooltip>}
        </div>
    );

    if (!parentCls.length) {
        return dimDiv;
    }
    parentCls.push('parent block');
    if (doShorten || (!isMinH && !dimStyle.width)) {
        // TODO: this class could already be available
        parentCls.push('full-h');
        if (doShorten) {
            parentCls.push('block');
        }
    }
    return (
        <div className={parentCls.join(' ')} style={parentStyle}>
            {dimDiv}
        </div>
    );
});

function getFlatChildren(children, result = []) {
    if (children) {
        for(let child of children) {
            if (!child) continue; // TODO check === '' || child === null || child === undefined) continue;

            if (typeof child.type === 'symbol' && child.type.description === 'react.fragment') {
                getFlatChildren(child.props.children, result);
            } else {
                result.push(child);
            }
        }
    }
    return result;
}

/**
 * @function
 * @param {object} [props={}]
 * @param {Object|Array} [props.children] - Child layout components
 * @param {string} [props.className] - Additional CSS classes for this container
 * @param {boolean} [props.flex] - Makes the component flexible if it's parent is a stack component (=flex box container)
 * @param {boolean|string} [props.full] - Extend component to all available space in horizontal ('h'), vertical ('v') or both dimensions (true)
 * @param {boolean|string} [props.center] - Center children of this component horizontally ('h'), vertically ('v') or in both directions (true)
 * @param {boolean|number} [props.border] - Draws a full (true) or a 1 pixel (1) border around this component
 * @param {boolean} [props.padded] - Use default padding for the block
 * @param {boolean} [props.vertical]
 * @param {boolean} [props.gaps]
 * @param {boolean} [props.centerItems]
 * @param {boolean} [props.wrap] - Enables word wrapping for the block
 * @param {string|number} [props.width] - A CSS width for this component
 * @param {string|number} [props.minWidth] - A CSS min-width for this component
 * @param {string|number} [props.maxWidth] - A CSS max-width for this component
 * @param {string|number} [props.height] - A CSS height for this component
 * @param {string|number} [props.minHeight] - A CSS min-height for this component
 * @param {string|number} [props.maxHeight] - A CSS max-height for this component
 */
function Stack({children, vertical, wrap, gaps, indented, borders, scroll, full, hotKeys, area, link, center, centerItems, ...props}) {
    const parentCls = ['bounds'];
    const parentAttr = {};
    const parentRef = useRef(null);

    if (useHotKeys(parentRef, hotKeys, area, link)) {
        parentAttr.ref = parentRef;
    }
    const {dimCls, dimAttr, dimStyle} = useGetLayoutProps(props);

    const axis = vertical ? 'v' : 'h';
    let hasFullV = axis === 'h';
    let hasFullH = false;
    dimCls.push('block stack-' + axis);
    if (typeof dimStyle.width === 'number') {
        parentCls.push('fix-h');
    }
    if (typeof dimStyle.height === 'number') {
        parentCls.push('fix-v');
    }
    const style = {};
    const parentStyle = {};
    for (let prop of ['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight']) {
        const value = dimStyle[prop];
        if (value) {
            if (!['minWidth', 'maxWidth', 'minHeight', 'maxHeight'].includes(prop)) {
                parentStyle[prop] = value;
            }
            if (typeof value === 'string' && value.indexOf('%') !== -1 && value !== '100%') {
                parentStyle[prop] = value;
                style[prop] = '100%';
            }
            if (['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight'].includes(prop) && (typeof value !== 'string' || value.match(/^\d+$/))) {
                style[prop] = value;
            }
        }
    }
    if (gaps) {
        if (wrap) {
            dimCls.push('flow-padding' + (gaps === '1' ? '-1' : ''));
            if (centerItems) {
                dimCls.push('center-items');
            }
        } else {
            dimCls.push('inner-space-' + axis + (gaps === '1' ? '-1' : ''));
        }
    }
    if (borders && children) {
        children = getFlatChildren(children);
        if (children.length > 1) {
            const items = [];
            const borderWidth = borders === '1' ? '1-' : '';
            for (let item of children) {
                if (item !== '') {
                    items.push(
                        items.length ?
                            <Fragment key={'_' + items.length}>
                                <div className={'borders-' + borderWidth + axis}></div>
                                {item}
                            </Fragment> :
                            item
                    );
                }
            }
            children = items;
        }
    }
    if (full) {
        if (full !== 'h') {
            dimCls.push('full-v');
            hasFullV = true;
        }
        if (full !== 'v') {
            dimCls.push('full-h');
            parentCls.push('full-h');
            hasFullH = true;
        }
    }
    if (hasFullV && !wrap) {
        // TODO: modal title cell bigger than flex cell
        if (full !== 'h') {
            parentCls.push('full-v');
        }
    }
    if (wrap) {
        dimCls.push('wrap');
    }
    if (center) {
        if (center !== 'v') {
            dimCls.push('center-h');
            parentCls.push('center-h');
        }
        if (center !== 'h') {
//            parentCls.push('full-v center-v');
            parentCls.push('center-v');
            if (style.height) {
                style.minHeight = style.height;
            }
        }
    }
    if (scroll) {
        parentCls.push('scroll');
    }
    dimCls.push('max-v');

    if (indented) {
        parentCls.push(indented === '1' ? 'padded-1' : 'indented');
    }

    if (!style.width) {
        dimCls.push('min-content-h')
    }
    if (hasFullH) {
        dimCls.push('max-h');
    }
    if (center) {
        if (parentStyle.width && center !== 'v') {
            parentStyle.width = false;
        }
        if (parentStyle.height && center !== 'h') {
            parentStyle.height = false;
        }
    } else if (axis === 'h') {
        dimCls.push('no-inline');
    }
    if (dimStyle.cursor) {
        parentStyle.cursor = dimStyle.cursor
    }

    return (
        <div { ...parentAttr } className={parentCls.join(' ')} style={parentStyle}>
            <div style={style} className={dimCls.join(' ')} {...dimAttr}>{children}</div>
        </div>
    )
}

function getGridTemplateString(value) {
    const parts = value.split(' ');
    const newParts = [];
    for(let part of parts) {
        let elem = part;
        if (part.length === 1) {
            if (part === '*') {
                elem = 'auto';
            } else if (part === '-') {
                elem = 'min-content';
            } else if (part === '+') {
                elem = 'max-content'
            }
        }
        newParts.push(elem);
    }
    return newParts.join(' ');
}

function Grid({children, columns, rows, gaps, full, centerItems, className, ...props}) {
    const cls = ['grid'];
    const bCls = ['max-h block'];
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
    if (gaps) {
        cls.push('grid-gap');
    }
    if (centerItems) {
        cls.push('grid-cells-centered');
    }
    if (full) {
        if (full !== 'h') {
            cls.push('full-v');
            bCls.push('full-v max-v');
        }
        if (full !== 'v') {
            cls.push('full-h');
            bCls.push('full-h');
        }
    }

    if (columns) {
        style.gridTemplateColumns = getGridTemplateString(columns);
    }
    if (rows) {
        style.gridTemplateRows = getGridTemplateString(rows);
    }
    return (
        <div className={bCls.join(' ')}>
            <div className={cls.join(' ')} style={style}>
                {children}
            </div>
        </div>
    )
}

const OverlayContext = React.createContext();

function Overlays({ width, maxWidth, height, cursor, originX = 0, originY = 0, scroll, className, children }) {
    const cls = ['relative block'];
    if (className) {
        cls.push(className);
    }
    const style = {
        width: width + originX,
        maxWidth,
        height: height + originY
    };
    if (cursor) {
        style.cursor = cursor
    }
    if (scroll) {
        cls.push('scroll');
        cls.push('max-v');
        cls.push('max-h');
    }
    const overlay = {
        width,
        height,
        originX,
        originY
    };
    if (originX !== 0 || originY !== 0) {
        overlay.width -= originX;
        overlay.height -= originY;
        const originStyle = {marginLeft: originX, marginTop: originY};
        children = <div className="relative" style={originStyle}>{children}</div>;
    }
    return (
        <OverlayContext.Provider value={overlay}>
            <div style={style} className={cls.join(' ')}>{children}</div>
        </OverlayContext.Provider>
    )
}

const Overlay = React.forwardRef(({ width, height, top = 0, left = 0, className, children, ...props }, forwardRef) => {
    const cls = ['absolute'];
    if (className) {
        cls.push(className);
    }
    const style = {
        width,
        height,
        top,
        left
    };
    return (
        <div ref={forwardRef} style={style} className={cls.join(' ')} { ...props }>{children}</div>
    )
});

export {
    Block,
    Stack,
    Grid,
    Overlays,
    Overlay,
    OverlayContext,
    Tooltip,
    DIR,
    handleLeftRightClick
}