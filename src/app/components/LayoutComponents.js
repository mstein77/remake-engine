import React, {Fragment, useState, useRef, useEffect, useContext, useMemo} from "react";
import {d} from '../helper/helper';

/**
 * @module LayoutComponents
 */

/**
 *
 * @todo tooltips on the right side might be too small because of
 * wrapping
 *
 * @param children
 * @returns {*}
 * @constructor
 */
function Tooltip({ children }) {
    const divRef = useRef(null);
    const [ absLeft, setAbsLeft ] = useState(null);
    const [ absTop, setAbsTop ] = useState(null);

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
    }, []);

    const style = {};
    if (absLeft) {
        style.marginLeft = absLeft;
    }
    if (absTop) {
        style.marginTop = absTop;
    }
    return (
        <div ref={divRef} style={style} className="tooltip padded thin-boxed wrap-normal">{children}</div>
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
 *    [width:200] => gap of 120
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
 *     assigned space, which would mean a gap if the size is smaller than the old assigned space or an
 *     overflow if the new assigned space is greater than the old
 *   - A full prop on a stack will set the required size of the stack to the assigned size???
 *
 * @function
 * @param {object} [props={}]
 * @param {Object|Array} [props.children] - Child components
 * @param {string} [props.className] - Additional CSS classes for this container
 * @param {boolean} [props.flex] - Makes the component flexible if it's parent is a stack component (=flex box container)
 * @param {boolean|string} [props.full] - Extend component to all available space in horizontal ('h'), vertical ('v') or both dimensions (true)
 * @param {boolean|string} [props.center] - Center children of this component horizontally ('h'), vertically ('v') or in both directions (true)
 * @param {boolean|number} [props.boxed] - Draws a full (true) or a 1 pixel (1) border around this component
 * @param {boolean} [props.scroll] - Show vertical and/or horizontal scrollbar when content overflows
 * @param {boolean} [props.padded] - Use default padding for the content
 * @param {boolean} [props.wrap] - Enables word wrapping for the content
 * @param {boolean} [props.shorten] - Enables the shortening of text and shows a tooltip on mouse-over (only works when props.wrap is not set)
 * @param {function} [props.click] - ClickHandler which is invoked when the left mouse button is clicked on this component
 * @param {string|number} [props.width] - A CSS width for this component
 * @param {string|number} [props.minWidth] - A CSS min-width for this component
 * @param {string|number} [props.maxWidth] - A CSS max-width for this component
 * @param {string|number} [props.height] - A CSS height for this component
 * @param {string|number} [props.minHeight] - A CSS min-height for this component
 * @param {string|number} [props.maxHeight] - A CSS max-height for this component
 *
 * @param {object} [ref] A React reference to which this component should be bound
 */
const Content = React.forwardRef(({children, className, flex, center, full, shorten, scroll, boxed, padded, wrap, click, mouseDown, wheel, ...props}, ref) => {
    const divRef = useRef(null);
    const [start, setStart] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const timeRef = useRef(null);
    timeRef.current = start;

    const cls = ['content'];
    const attr = {};

    if (click) {
        attr['onClick'] = click;
    }
    if (mouseDown) {
        attr['onMouseDown'] = mouseDown;
    }
    if (wheel) {
        attr['onWheel'] = wheel;
    }
    if (ref) {
        attr['ref'] = ref;
    } else {
        attr['ref'] = divRef;
        ref = divRef;
    }
    if (className) {
        cls.push(className);
    }
    if (!center && flex) {
        cls.push('flex');
    }
    let doShorten = false;
    if (!wrap) {
        doShorten = shorten;
        cls.push('nowrap' + (shorten ? '-shorten' : ''));
    } else {
        cls.push('wrap-normal');
    }
    let childText = '';
    if (doShorten) {
        const mouseOver = () => {
            if (!ref) return;

            const elem = ref.current;
            if (elem.offsetWidth >= elem.scrollWidth) {
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
        cls.push('tooltip-parent');
    }
    if (padded) {
        if (padded === 'h') {
            cls.push('padded-h');
        } else {
            cls.push('padded' + (padded === 'v' ? '-v' : ''));
        }
    }
    if (boxed) {
        cls.push((boxed == 1 ? 'thin-' : '') + 'boxed');
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
        <div style={style} {...attr} className={cls.join(' ')}>
            {children}
            {showTooltip && <Tooltip>{childText}</Tooltip>}
        </div>
    );

    if (!center) {
        return div;
    }
    const stackCls = ['stack-' + (center === 'v' ? 'v' : 'h') + ' flex-items-centered full-h'];
    if (flex) {
        stackCls.push('flex');
    }
    if (center !== 'v') {
        stackCls.push('max-h');
    }
    if (center !== 'h') {
        stackCls.push('full-v max-v');
        if (center !== 'h') {
            stackCls.push('flex-item-centered');
        }
    }

    return (
        <div className={stackCls.join(' ')}>
            {div}
        </div>
    )
});

/**
 * @function
 * @param {object} [props={}]
 * @param {Object|Array} [props.children] - Child layout components
 * @param {string} [props.className] - Additional CSS classes for this container
 * @param {boolean} [props.flex] - Makes the component flexible if it's parent is a stack component (=flex box container)
 * @param {boolean|string} [props.full] - Extend component to all available space in horizontal ('h'), vertical ('v') or both dimensions (true)
 * @param {boolean|string} [props.center] - Center children of this component horizontally ('h'), vertically ('v') or in both directions (true)
 * @param {boolean|number} [props.boxed] - Draws a full (true) or a 1 pixel (1) border around this component
 * @param {boolean} [props.padded] - Use default padding for the content
 * @param {boolean} [props.vertical]
 * @param {boolean} [props.gap]
 * @param {boolean} [props.centerAll]
 * @param {boolean} [props.wrap] - Enables word wrapping for the content
 * @param {string|number} [props.width] - A CSS width for this component
 * @param {string|number} [props.minWidth] - A CSS min-width for this component
 * @param {string|number} [props.maxWidth] - A CSS max-width for this component
 * @param {string|number} [props.height] - A CSS height for this component
 * @param {string|number} [props.minHeight] - A CSS min-height for this component
 * @param {string|number} [props.maxHeight] - A CSS max-height for this component
 */
function Stack({children, className, vertical, flex, wrap, gap, thin, border, padded, boxed, scroll, full, centerAll, ...props}) {
    const cls = [];
    const bCls = ['bounds'];
    if (className) {
        cls.push(className);
    }
    const axis = vertical ? 'v' : 'h';
    let hasFullV = axis === 'h';
    cls.push('stack-' + axis);
    if (flex) {
        bCls.push('flex');
    }
    const style = {};
    const bStyle = {};
    for (let prop of ['width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight']) {
        const value = props[prop];
        if (value) {
            bStyle[prop] = value;
            if (typeof value === 'string' && value.endsWith('%') && value !== '100%') {
                style[prop] = '100%';
            }
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
            hasFullV = true;
        }
        if (full !== 'v') {
            cls.push('full-h');
            bCls.push('full-h');
        }
    }
    if (hasFullV && !wrap) {
        bCls.push('full-v');
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
        bCls.push('scroll');
    }
    cls.push('max-h');
    cls.push('max-v');

    if (!style.width) {
        cls.push('min-content-h');
    }
    return (
        <div className={bCls.join(' ')} style={bStyle}>
            <div style={style} className={cls.join(' ')}>{children}</div>
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

function Grid({children, columns, rows, gap, flex, full, centerAll, className, ...props}) {
    const cls = ['grid'];
    const bCls = ['max-h max-v content'];
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
            bCls.push('full-v');
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
    if (flex) {
        bCls.push('flex');
    }
    return (
        <div className={bCls.join(' ')}>
            <div className={cls.join(' ')} style={style}>
                {children}
            </div>
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