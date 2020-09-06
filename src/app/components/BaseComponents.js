import React, {useState, useRef, useEffect, useContext, useMemo, Fragment} from "react";
import ReactDOM from 'react-dom';
import {d} from '../helper/helper';

const GlobalContext = React.createContext();

function Color(props) {
    return (
        <div>
            <input
                type="color"
                value={props.value}
                onChange={(e) => { props.set(e.target.value); }}
            />
        </div>
    );
}

function ColorProp(props) {
    const {name, ...colorProps} = props;
    return (
        <PropLabel name={name}>
            <Color {...colorProps} />
        </PropLabel>
    );
}

function Range(props) {
    return (
        <Stack alignItems="center">
            <Content>
                <kbd>{props.min}</kbd>
            </Content>
            <Content>
                <input
                    type="range"
                    onChange={e => props.set(e.target.value)}
                    min={props.min}
                    max={props.max}
                    step={props.step ? props.step : 0.01}
                    value={props.value}
                />
            </Content>
            <Content>
                <kbd>{props.max}</kbd>
            </Content>
            <Content>
                <TextField size={String(props.max).length + 3} readOnly value={props.value} />
            </Content>
        </Stack>
    );
}

function RangeProp(props) {
    const {name, ...rangeProps} = props;
    return (
        <PropLabel name={name}>
            <Range {...rangeProps} />
        </PropLabel>
    )
}

function SwitchButton(props) {
    const cls = ['switch-div switch-button' + (props.enabled ? '-enabled' : '')];
    const style = useStyleProps(props);
    if (props.disabled) {
        style.opacity = '0.5';
    }
    let children = props.children;
    if (props.material) {
        children = <i className="material-icons md-18 center-h">{props.children}</i>;
    }
    return (
        <div style={style} onClick={() => {props.switch(!props.enabled)}} className={cls.join(' ')}>
            {children}
        </div>
    );
}

function Radio(props) {
    const buttons = [];
    const disabled = props.disabled ? props.disabled : [];
    for (let key in props.options) {
        const name = props.options[key];
        buttons.push(
            <SwitchButton
                key={key}
                enabled={props.value == key}
                disabled={disabled.indexOf(key) !== -1}
                material={props.material}
                switch={() => {disabled.indexOf(key) === -1 && props.set(key)}}
            >
                {name}
            </SwitchButton>
        );
    }
    return (
        <Stack>
            {buttons}
        </Stack>
    )
}

function RadioProp(props) {
    const {name, ...radioProps} = props;

    return (
        <PropLabel name={name}>
            <Radio {...radioProps} />
        </PropLabel>
    )
}

function Checkbox(props) {
    const name = props.name ? <div>{props.name}</div> : '';
    return (
        <div className="stack-h">
            {name}
            <div><input onChange={(e) => {
                props.set(e.target.checked);
            }} type="checkbox" checked={!!props.value} /></div>
        </div>
    );
}

function CheckboxProp(props) {
    const {name, ...checkboxProps} = props;
    return (
        <PropLabel name={name}>
            <Checkbox {...checkboxProps} />
        </PropLabel>
    )
}

function TextField(props) {
    const attr = {
    };
    if (!props.readOnly) {
        attr.onChange = e => props.set(e.target.value);
    } else {
        attr.readOnly = true;
    }
    if (props.size) {
        attr.size = props.size
    }
    if (props.className) {
        attr.className = props.className;
    }
    if (props.onClick) {
        attr.onClick = props.onClick;
    }
    return (
        <input type="text"
               value={props.value}
               {...attr}
        />
    );
}

function PropLabel(props) {
    return (
        <Fragment>
            <Content>
                {props.name}
            </Content>
            <Content>
                {props.children}
            </Content>
        </Fragment>
    )
}

function FullProp(props) {
    const items = [];
    if (props.name) {
        items.push(<div key="0" style={{gridColumn: 'span 2'}}>{props.name}</div>);
    }
    items.push(<div key="1" style={{gridColumn: 'span 2'}}>{props.children}</div>);
    return (
        <Fragment>
            {items}
        </Fragment>
    )
}

function TextFieldProp(props) {
    const {name, ...fieldProps} = props;
    return (
        <PropLabel name={name}>
            <TextField {...fieldProps} />
        </PropLabel>
    );
}

function TextArea(props) {
    const style = useStyleProps(props);
    return (
        <textarea style={style} wrap={props.wrap} rows={props.rows} cols={props.cols} readOnly={props.readOnly} value={props.value} onChange={e => props.set(e.target.value)}></textarea>
    )
}

function IntField(props) {
    const attr = {};
    if (props.readOnly) {
        attr.readOnly = 'readOnly';
    }
    if (props.size) {
        attr.size = props.size;
    } else if (props.max !== undefined) {
        attr.size = ('' + props.max).length;
    } else {
        attr.size = 3;
    }
    const step = props.step || 1;

    const value = props.value !== undefined ? props.value : 0;
    attr.value = value;
    attr.type = 'text';
    attr.onChange = (e) => {
        props.set(e.target.value);
    };

    const incValue = () => {
        props.set(parseInt(value, 10) + step);
    };

    const decValue = () => {
        props.set(parseInt(value, 10) - step);
    };

    let buttonPrev = '';
    let buttonNext = '';
    if (props.buttons) {
        const nextAttr = {
            onClick: incValue
        };
        if (props.readOnly || (props.max !== undefined && parseInt(value, 10) + step > parseInt(props.max, 10))) {
            nextAttr.disabled = 'disabled';
        }
        const prevAttr = {
            onClick: decValue
        };
        if (props.readOnly || (props.min !== undefined && parseInt(value, 10) - step < parseInt(props.min, 10))) {
            prevAttr.disabled = 'disabled';
        }
        buttonPrev =
            <React.Fragment>
                <button {...prevAttr}>-</button>
            </React.Fragment>;

        buttonNext =
            <React.Fragment>
                <button {...nextAttr}>+</button>
            </React.Fragment>;
    }

    const name = props.name ? <div>{props.name}</div> : '';

    return (
        <React.Fragment>
            {name}
            <Stack fit fullHeight align="center" alignItems="center">
                {buttonPrev}
                <input {...attr} />
                {buttonNext}
            </Stack>
        </React.Fragment>
    );
}

function Int(props) {
    return (
        <Stack>
            <IntField {...props} />
        </Stack>
    );
}

function IntProp(props) {
    const {name, ...intProps} = props;
    return (
        <PropLabel name={name}>
            <Int {...intProps} />
        </PropLabel>
    );
}

function Dim(props) {
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
        name: '/',
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
        <Stack fit>
            <IntField {...xAttr} />
            <IntField {...yAttr} />
        </Stack>
    );
}

function DimProp(props) {
    const {name, ...dimProps} = props;
    return (
        <PropLabel name={name}>
            <Dim {...dimProps} />
        </PropLabel>
    )
}

function useStyleProps(props) {
    const {width, minWidth, maxWidth, height, minHeight, maxHeight, zIndex} = props;
    return {width, minWidth, maxWidth, height, minHeight, maxHeight, zIndex};
}

function useDimProps(props, style = {}) {
    if (props.width) {
        style.width = props.width;
    }
    if (props.minWidth) {
        style.minWidth = props.minWidth;
    }
    if (props.maxWidth) {
        style.maxWidth = props.maxWidth;
    }
    if (props.height) {
        style.height = props.height;
    }
    if (props.minHeight) {
        style.minHeight = props.minHeight;
    }
    if (props.maxHeight) {
        style.maxHeight = props.maxHeight;
    }
    if (props.zIndex) {
        style.zIndex = props.zIndex;
    }
    return style;
}

/**
 *   -------------------------------------------
 *     Layout Components
 *   -------------------------------------------
 */

function Content(props) {
    const cls = [];
    const style = useDimProps(props);
    if (props.flex) {
        cls.push('flex');
    }
    if (props.padded) {
        cls.push('padded');
    }
    if (props.scroll) {
        cls.push('overflow-auto');
    } else if (!props.raw) {
        cls.push('overflow-hidden')
    }
    if (props.boxed) {
        cls.push('boxed');
    }
    if (props.fullHeight) {
        cls.push(props.boxed ? 'full-boxed-v' :  'full-v');
    }
    if (props.className) {
        cls.push(props.className);
    }

    const attr = {};
    if (style) {
        attr.style = style;
    }
    if (props.click) {
        attr.onClick = props.click;
    }
    if (props.doubleClick) {
        attr.onDoubleClick = props.doubleClick;
    }
    if (props.onDragStart) {
        attr.onDragStart = props.onDragStart;
        attr.draggable = true;
        cls.push('cursor-move');
    }
    if (props.onDrop) {
        attr.onDrop = props.onDrop;
        attr.onDragOver = (e) => {
            e.preventDefault();
        };
        if (props.onDragEnd) {
            attr.onDragEnd = props.onDragEnd;
        }
    }
    if (cls.length) {
        attr.className = cls.join(' ');
    }
    return (
        <div {...attr}>{props.children}</div>
    );
}

function Stack(props) {
    const dir = props.vertical ? 'v' : 'h';

    const cls = ['stack-' + dir];
    if (props.className) {
        cls.push(props.className);
    }
    if (!props.noGap) {
        cls.push('inner-' + (props.border ? 'border' : 'space') + '-' + dir);
    }
    if (props.fit) {
        cls.push('fit-content-' + dir);
    }
    if ((props.fullHeight || (props.vertical && !props.fullHeight)) && !(props.vertical && props.fit)) {
        cls.push('full-v');
    }

    const style = useDimProps(props);
    if (props.align === 'center') {
        style.justifyContent = 'center';
    } else if (props.align === 'end') {
        style.justifyContent = 'flex-end';
    }

    if (props.alignItems === 'center') {
        style.alignItems = 'center';
    } else if (props.alignItems === 'end') {
        style.alignItems = 'flex-end';
    }
    if (props.wrap) {
        cls.push('wrap');
    }

    return (
        <div className={cls.join(' ')} style={style}>
            {props.children}
        </div>
    );
}

function Centered(props) {
    const {children, contentProps} = props;
    return (
        <Stack vertical fullHeight alignItems="center" align="center">
            <Content {...contentProps}>{children}</Content>
        </Stack>
    );
}

function Toolbar(props) {
    const toolbar = (
        <div className="toolbar-div">
            {props.children}
        </div>
    );
    if (props.end) {
        return (
            <Stack noGap>
                {toolbar}
                <div className="toolbar-div flex from-end">
                    {props.end}
                </div>
            </Stack>
        )
    }
    return toolbar;
}

function Tabs(props) {
    const tabs = [];
    const contents = [];
    const [active, setActiveTab] = useState(props.active !== undefined ? props.active : 0);
    const maxTabs = props.maxTabs !== undefined ? props.maxTabs : null;
    const [tabPos, setTabPos] = useState(0);
    let tabNo = 0;

    const dir = props.vertical ? 'v' : 'h';
    const oppDir = dir === 'v' ? 'h' : 'v';

    const getTabFromChild = (no, child, isActive) => {
        const cls = [
            'stack-' + dir + ' inner-space-' + dir + ' padded'
        ];
        if (props.vertical) {
            cls.push('no-border-' + (props.reverse ? 'left' : 'right'));
        } else {
            cls.push('no-border-' + (props.reverse ? 'top' : 'bottom'));
        }
        if (isActive) {
            cls.push('tab-active boxed title-area-active');
        } else {
            cls.push('sub-boxed title-area-inactive');
        }
        let close = '';
        if (props.closeCallback !== undefined) {
            const closeHandler = (e) => {
                props.closeCallback(no);
                e.stopPropagation();
            };
            close = <div className="action-box" onClick={closeHandler}><i className="material-icons md-18">close</i></div>;
        }

        const itemCls = ['nowrap'];
        if (props.vertical) {
            itemCls.push('text-v');
        }

        return (
            <div key={no} className={cls.join(' ')} onClick={() => setActiveTab(no)}>
                <div className={itemCls.join(' ')}>{child.props.name}</div>
                {close}
            </div>);
    };

    const getContentFromChild = (no, child, isActive) => {
        const childCls = [];
        childCls.push('content-area');
        if (!isActive) {
            childCls.push('hidden');
        }
        return(
            <div key={tabNo} className={childCls.join(' ')}>{child}</div>
        );
    };

    let hasActive = false;
    let lastChild = null;
    for (let child of props.children) {
        if (child.type.name !== 'Tab') {
            continue;
        }
        lastChild = child;
        const isActive = (tabNo === active);
        if (isActive) {
            hasActive = true;
        }
        if (maxTabs === null || (tabNo >= tabPos && tabNo < (tabPos + maxTabs))) {
            tabs.push(getTabFromChild(tabNo, child, isActive));
        }
        contents.push(getContentFromChild(tabNo, child, isActive));
        tabNo++;
    }
    if (!hasActive && lastChild !== null) {
        tabNo--;
        if (maxTabs === null || (tabNo >= tabPos && tabNo < (tabPos + maxTabs))) {
            tabs[tabs.length - 1] = getTabFromChild(tabNo, lastChild, true);
        }
        contents[contents.length - 1] = getContentFromChild(tabNo, lastChild, true);
    }

    const contentCls = [
        'content-area flex boxed'
    ];

    let navPre = '';
    let navNext = '';
    if (maxTabs !== null && contents.length > maxTabs) {
        const preCls = [
            'sub-boxed title-area-inactive padded no-border-bottom'
        ];
        if (props.vertical) {
            preCls.push('text-v');
        }
        if (tabPos === 0) {
            preCls.push('inactive');
        }
        navPre = <div className={preCls.join(' ')} onClick={() => {setTabPos(tabPos - 1)}}>&lt;</div>;

        const nextCls = [
            'sub-boxed title-area-inactive padded no-border-bottom'
        ];
        if (tabPos + maxTabs >= contentCls.length) {
            nextCls.push('inactive');
        }
        if (props.vertical) {
            nextCls.push('text-v');
        }
        navNext = <div className={nextCls.join(' ')} onClick={() => {setTabPos(tabPos + 1)}}>&gt;</div>;
    }

    const tabsCls = [
        'stack-' + dir + ' inner-space-' + dir + ' items-bottom'
    ];
    if (props.fromEnd) {
        tabsCls.push('from-end');
    }

    const cls = ['stack-' + oppDir];
    if (props.reverse) {
        cls.push('reverse-' + oppDir);
    }
    cls.push('full-v');

    const style = {};
    if (props.height) {
        style.height = props.height;
    }

    return (
        <div style={style} className={cls.join(' ')}>
            <div className={tabsCls.join(' ')}>
                {navPre}
                {tabs}
                {navNext}
            </div>

            <div className={contentCls.join(' ')}>
                {contents}
            </div>
        </div>
    )
}

function Tab(props) {
    return (
        <Fragment>{props.children}</Fragment>
    );
}

function TabAccordion(props) {
    const [active, setActive] = useState(props.active !== undefined ? props.active : 0);
    const items = [];
    let current = 0;
    for (let child of props.children) {
        const isActive = (current === active);
        const cls = ['padded'];
        cls.push('title-area-' + (isActive ? 'active' : 'inactive'));
        const itemNo = current;

        items.push(
            <div key={current} onClick={() => {setActive(itemNo)}} className={cls.join(' ')}>{child.props.name}</div>
        );
        if (isActive) {
            items.push(<div key="-1" className="flex">{child}</div>);
        }
        current++;
    }
    const cls = [
        'stack-v inner-border-v boxed full-v'
    ];
    return (
        <div className={cls.join(' ')}>
            {items}
        </div>
    );
}

function Select(props) {
    const options = [];
    let active = null;
    let index = 0;
    for (let item of props.options) {
        options.push(
            <option key={item.id} value={item.id}>
                {item.name}
            </option>
        );
        if (item.id == props.value) {
            active = index;
        }
        index++;
    }
    const prev = props.buttons ? <button disabled={options.length < 2} onClick={
        () => {
            props.set(options[active === 0 ? options.length - 1 : active - 1].key)
        }
    }>-</button> : '';
    const next = props.buttons ? <button disabled={options.length < 2} onClick={
        () => {
            props.set(options[active === options.length - 1 ? 0 : active + 1].key)
        }
    }>+</button> : '';

    return (
        <Stack>
            {prev}
            <select value={props.value} onChange={(e) => {props.set(e.target.value)}}>
                {options}
            </select>
            {next}
        </Stack>
    );
}

function SelectProp(props) {
    const {name, ...selectProps} = props;
    return (
        <PropLabel name={name}>
            <Select {...selectProps} />
        </PropLabel>
    );
}

function Grid(props) {
    const style = {
        display: 'grid',
        gridTemplateColumns: props.columns
    };
    if (props.gap) {
        style.gridGap = props.gap;
    }
    return (
        <div style={style}>
            {props.children}
        </div>
    );
}

function PropertyGrid(props) {
    return (
        <Grid gap={5} columns="min-content auto" {...props} />
    );
}

function LabelAndSubInfo(props) {
    return <Fragment>
        <div>{props.name}</div>
        <div className="sub-info">{props.children}</div>
    </Fragment>
}

function ItemsStack(props) {
    const [collapsed, setCollapsed] = useState(props.collapsed === true);
    const [dragIndex, setDragIndex] = useState(null);
    const dimProps = useDimProps(props);

    const active = (props.active === null || props.active >= props.items.length) ? null : props.active;
    const toggleCollapse = () => {setCollapsed(!collapsed)};

    const itemElems = [];
    for(let i = 0; i < props.items.length; i++) {
        const index = i;
        const item = props.items[i];
        const attr = {};
        if (props.ordered) {
            if (i === props.active) {
                attr.onDragEnd = () => setDragIndex(null);
                attr.onDragStart = () => setDragIndex(index);
            }
            attr.onDrop = () => {
                if (dragIndex === index) return;
                const swapped = [...props.items];
                [swapped[index], swapped[dragIndex]] = [swapped[dragIndex], swapped[index]];
                props.setItems(swapped);
                props.setActive(index);
            };
        }
        itemElems.push(
            <Fragment key={'i' + i}>
                <Content padded><kbd>#{i+1}</kbd></Content>
                <Content {...attr} click={() => props.setActive(index)} doubleClick={toggleCollapse}>
                    <Stack className={'title-area-' + (i === props.active ? 'active' : 'inactive')}>
                        <Content flex padded>{props.getName(item)}</Content>
                    </Stack>
                </Content>
            </Fragment>
        );
    }

    let assignContent = props.assignable ?
        <Stack vertical fullHeight border>
            <Toolbar>
                <Content padded>Assigneable:</Content>
            </Toolbar>
            <Content scroll>
                <Grid columns="auto min-content" gap={2}>
                    {props.assignable.map(
                        e =>
                            <Fragment key={e.name}>
                                <Content
                                    key={e.name}
                                    click={() => {
                                        props.setItems([...props.items, e.item]);
                                        props.setActive(props.items.length);
                                    }}
                                    padded
                                >
                                    {e.name}
                                </Content>
                                <Content padded><i className="material-icons md-18">keyboard_arrow_right</i></Content>
                            </Fragment>
                    )}
                </Grid>
            </Content>
        </Stack> : '';

    let itemsContent = props.items.length === 0 ?
        <Stack flex vertical fullHeight alignItems="center" align="center">
            <Content padded>
                {props.empty}
            </Content>
        </Stack>
        : (
            <Content flex scroll>
                <Stack vertical fullHeight border>
                    <Grid columns="min-content auto" gap={2}>
                        {itemElems}
                    </Grid>
                    <Content flex></Content>
                </Stack>
            </Content>
        );

    const addItem = props.new ? props.new : () => {
        const newItems = [...props.items];
        newItems.push(props.getNewItem());
        props.setItems(newItems);
        props.setActive(newItems.length - 1);
    };

    return (
        <Stack fullHeight border>
            {assignContent}
            <Stack vertical border fullHeight {...dimProps}>
                <Toolbar end={<ActionBox material click={toggleCollapse}>{'keyboard_arrow_' + (collapsed ? 'right' : 'left')}</ActionBox>}>
                    <Stack>
                        {(props.new || props.getNewItem) && <ActionBox
                            material
                            disabled={props.max && props.items.length === props.max}
                            click={addItem}>add</ActionBox>}

                        {props.getClone && <ActionBox
                            material
                            disabled={(props.max && props.items.length === props.max) || active === null}
                            click={() => {
                                if (props.items.length > 0) {
                                    const newItems = props.items.concat();
                                    newItems.splice(props.active + 1, 0, props.getClone(props.items[props.active]));
                                    props.setItems(newItems);
                                    props.setActive(props.active + 1);
                                }
                            }}>content_copy</ActionBox>}

                        <ActionBox
                            material
                            disabled={props.items.length === 0 || active === null || props.min && props.items.length === props.min}
                            click={() => {
                                const newItems = [...props.items];
                                newItems.splice(props.active, 1);
                                if (props.cleanUp) {
                                    props.cleanUp(props.items[props.active], props.active);
                                }
                                props.setItems(newItems);
                                props.setActive(
                                    newItems.length === 0 ? null :
                                    Math.min(props.active, newItems.length - 1)
                                );
                            }}>delete</ActionBox>

                        {props.ordered && <ActionBox
                            material
                            disabled={props.items.length <= 1 || active === null}
                            click={() => {
                                if (props.active > 0) {
                                    const newItems = [];
                                    for (let i = 0; i < (props.active - 1); i++) {
                                        newItems.push(props.items[i]);
                                    }
                                    newItems.push(props.items[props.active]);
                                    newItems.push(props.items[props.active - 1]);
                                    for (let i = props.active + 1; i < props.items.length; i++) {
                                        newItems.push(props.items[i]);
                                    }
                                    props.setItems(newItems);
                                    props.setActive(props.active - 1);
                                }
                            }}>keyboard_arrow_up</ActionBox>}

                        {props.ordered && <ActionBox
                            material
                            disabled={props.items.length <= 1 || active === null}
                            click={() => {
                                if (props.active < props.items.length - 1) {
                                    const newItems = [];
                                    for (let i = 0; i < props.active; i++) {
                                        newItems.push(props.items[i]);
                                    }
                                    newItems.push(props.items[props.active + 1]);
                                    newItems.push(props.items[props.active]);
                                    for (let i = props.active + 2; i < props.items.length; i++) {
                                        newItems.push(props.items[i]);
                                    }
                                    props.setItems(newItems);
                                    props.setActive(props.active + 1);
                                }
                            }}>keyboard_arrow_down</ActionBox>}

                    </Stack>
                </Toolbar>
                {itemsContent}
            </Stack>

            {!collapsed && active !== null && props.items.length !== 0 && (
                <Stack vertical border fullHeight>
                    <Toolbar>
                        <Content>Properties Item # {props.active + 1}</Content>
                    </Toolbar>

                    <Content padded flex scroll>
                        {props.getProperties(props.active)}
                    </Content>
                </Stack>
            )}
        </Stack>
    );
}

function FileDropZone(props) {

    const [error, setError] = useState('');
    const dragEnterRef = useRef(null);
    const dropzoneRef = useRef(null);

    useEffect(() => {
        const handlePaste = (event) => {
            let items = (event.clipboardData  || event.originalEvent.clipboardData).items;
            handleImages(items);
            event.stopPropagation();
            event.preventDefault();
        };
        window.addEventListener('paste', handlePaste, {capture: false});
        return () => {
            window.removeEventListener('paste', handlePaste, {capture: false});
        }
    }, []);

    const handleImages = (items) => {
        const matches = [];
        const invTypes = new Map();
        for(let item of items) {
            if (props.type && item.type.startsWith(props.type + '/')) {
                matches.push(item);
            } else {
                invTypes.set('"' + item.type + '"', null);
            }
        }
        if (matches.length === 0) {
            if (invTypes.size > 0) {
                setError('The given types ' + [...invTypes.keys()].join(', ') + ' are not supported!');
            } else {
                setError('No content found!');
            }
            return;
        } else if (matches.length > 1) {
            setError('Multiple files not allowed!');
            return;
        }
        const file = matches[0];

        const reader = new FileReader();
        reader.onloadend = () => {
            props.save(reader.result, file.name);
            setError('');
        };
        reader.readAsDataURL(file.getAsFile ? file.getAsFile() : file);
    };

    const handleDrop = (e) => {
        handleImages(e.dataTransfer.files);
        e.stopPropagation();
        e.preventDefault();
    };
    const handleDragOver = (e) => {
        e.stopPropagation();
        e.preventDefault();
    };
    const handleDragEnter = (e) => {
        if (dropzoneRef.current) {
            dropzoneRef.current.classList.toggle('blink', true);
            dragEnterRef.current = e.target;
        }
        e.stopPropagation();
        e.preventDefault();
    };
    const handleDragLeave = (e) => {
        if (dropzoneRef.current && dragEnterRef.current === e.target) {
            dropzoneRef.current.classList.toggle('blink', false);
        }
        e.preventDefault();
    };
    const handleFileSelection = (e) => {
        e.preventDefault();
        handleImages(e.target.files);
    };

    const accept = props.type ? props.type + '/*' : '*';

    return (
        <div
            ref={dropzoneRef}
             onDrop={handleDrop}
             onDragOver={handleDragOver}
             onDragEnter={handleDragEnter}
             onDragLeave={handleDragLeave}>
            <Stack fullHeight vertical align="center" alignItems="center">
                <Content padded>
                    No image given. Please insert image by one of the following options:
                    <ul>
                        <li>Drag'n Drop an image from your desktop here<br /><br /></li>
                      <li>Copy image to clipboard and paste it here<br /><br /></li>
                        <li><input onChange={handleFileSelection} type="file" accept={accept} /></li>
                    </ul>
                    {error && <Content boxed padded>Reading content failed: {error}</Content>}
                </Content>
            </Stack>
        </div>
    );
}

function Portal(props) {
    const domElem = document.getElementById(props.id);

    if (!domElem) {
        return '';
    }
    return ReactDOM.createPortal(
        props.children,
        domElem
    );
}

const Modal = React.memo((props) => {
    useKeyListener(27, () => {props.hide(); return true}, () => props.closeable);

    const styleProps = useStyleProps(props);
    const click = props.closeable ?
        (e) => {
            let target = e.target;
            while(target.classList !== undefined) {
                if (target.classList.contains('modal-centered')) {
                    return;
                }
                target = target.parentNode;
            }
            props.hide();
        } : null;

    return (
        <Portal id="modals-container">
            <Content className="modal-overlay" click={click} zIndex={styleProps.zIndex - 1}>
                <Stack align="center" fit={props.fit} vertical border {...styleProps} className="modal-centered boxed">

                    <Content padded className="title-area-active">
                        <Stack alignItems="center">
                            <Content flex>{props.name}</Content>
                            <Stack fit><ActionBox material click={(e) => {
                                props.hide();
                                e.stopPropagation();
                            }}>close</ActionBox></Stack>
                        </Stack>
                    </Content>

                    <Content flex raw={props.fit} className="content-area">
                        {props.children}
                    </Content>
                </Stack>
            </Content>
        </Portal>
    );
});

function MouseOverlay(props) {
    if (!props.active) {
        return '';
    }
    const cls = ['cursor-' + props.cursor + ' fix-overlay'];
    return (
        <div className={cls.join(' ')}></div>
    );
}

function ActionBox(props) {
    const content = props.material ?
        <i className="material-icons md-18">{props.children}</i> : props.children;
    return (
        <div
            className="action-box"
            onClick={props.disabled ? null : props.click}>
            {content}
        </div>
    );
}

function Section(props) {
    const [collapsed, setCollapsed] = useState(false);

    const {width, minWidth, maxWidth, height, minHeight, maxHeight} = props;

    const dim = collapsed ? {} : {width, minWidth, maxWidth, height, minHeight, maxHeight};
    const collapse = (props.collapse ? props.vertical ? 'h' : 'v' : null);

    const toggleCollapse = (e) => {
        setCollapsed(!collapsed);
    };
    const actions = [];
    if (collapse) {
        const icon = collapsed ? 'call_made' : 'call_received';
        actions.push(
            <ActionBox key="0" material click={toggleCollapse}>{icon}</ActionBox>
        );
        if (!collapsed) {
            // additional actions
        }
    }
    const actionsDiv = actions.length > 0 ?
        <Stack key="actions" fit alignItems="centered">{actions}</Stack> : '';

    const nameCls = [];
    if (collapsed && collapse === 'h') {
        nameCls.push('text-v');
    }

    const boxed = collapsed || !props.raw;
    const contentCls = [];
    if (!props.raw) {
        contentCls.push('content-area');
    }
    const isVCollapse = collapsed && props.vertical;

    const nameDiv = (
        <Content key="name" flex className={nameCls.join(' ')}>
            {props.name}
        </Content>
    );
    let headItems = isVCollapse ? [actionsDiv, nameDiv] : [nameDiv, actionsDiv];

    return (
        <Content flex={props.flex} fullHeight={isVCollapse} boxed={boxed} {...dim}>
            <Stack vertical={!isVCollapse} border noGap={props.raw} fit={collapsed} fullHeight={!collapsed || isVCollapse}>
                <Content padded className="title-area-active">
                    <Stack vertical={collapsed && props.vertical} alignItems="center">
                        {headItems}
                    </Stack>
                </Content>
                {
                    !collapsed && (
                        <Content flex scroll className={contentCls.join(' ')}>
                            {props.children}
                        </Content>
                    )
                }
            </Stack>
        </Content>
    );
}

function Page(props) {

    const resources = [];
    const typeToIcon = {
        image: 'image',
        audio: 'audiotrack',
        json: 'code'
    };
    if (props.resources) {
        for (let resource of props.resources) {
            resources.push(
                <Content className="thin-boxed"
                    key={resource.type + ':' + resource.id}>
                    <Stack border>
                        <Content padded>
                            <Stack>
                                <Content><i className="material-icons md-18">{typeToIcon[resource.type]}</i></Content>
                                <Content><kbd>{resource.source.toUpperCase()}</kbd></Content>
                            </Stack>
                        </Content>
                        <Content padded>
                            <kbd style={{fontWeight: 'bold'}}>{resource.id}</kbd>
                        </Content>
                    </Stack>
                </Content>
            );
        }
    }

    return (
        <Content maxHeight="100vh">
            <Stack vertical fullHeight>
                <Content>
                    <Stack className="head">
                        <Content flex padded>
                            <Stack flex>
                                <Content>
                                    {props.title} &gt;
                                </Content>
                                <Stack flex wrap>
                                    {resources}
                                </Stack>
                            </Stack>
                        </Content>

                        <Content padded>
                            {props.actions}
                        </Content>
                    </Stack>
                </Content>

                <Content flex>
                    {props.children}
                </Content>
            </Stack>
        </Content>
    );
}

class GlobalCtx extends React.Component {

    constructor(props) {
        super(props);
        const style = getComputedStyle(document.body);
        const getNumFromPx = (value) => {
            return parseInt(value, 10);
        };

        this.modalStack = [];

        this.state = {
            game: props.game,
            resourceLoader: props.game.getResourceLoader(),
            dirty: false,
            setDirty: () => {
                if (this.state.dirty === false) {
                    this.setState({dirty: true});
                }
            },
            contentTextColor: style.getPropertyValue('--content-text-color'),
            defaultPadding: getNumFromPx(style.getPropertyValue('--default-padding')),
            markerWidth: getNumFromPx(style.getPropertyValue('--marker-width')),
            bgColor: '#666677',
            filters: props.filters,
            imageResources: {current: props.imageResources},
            setBgColor: (bgColor) => {
                this.setState({bgColor});
            },
            bgOpacity: 10,
            setBgOpacity: (bgOpacity) => {
                this.setState({bgOpacity});
            },
            openModal: () => {
                let zIndex = 10000;
                const len = this.modalStack.length;
                if (len > 0) {
                    zIndex = this.modalStack[len - 1] + 10;
                }
                this.modalStack.push(zIndex);
                return zIndex;
            },
            closeModal: (zIndex) => {
                const index = this.modalStack.indexOf(zIndex);
                if (index === -1) {
                    return;
                }
                this.modalStack.splice(index, 1);
            }
        };
    }

    render() {
        return (
            <GlobalContext.Provider value={this.state}>
                {this.props.children}
            </GlobalContext.Provider>
        );
    }
}

function useUpdates() {
    const [updates, setUpdates] = useState(0);
    const updatesRef = useRef(null);
    updatesRef.current = updates;
    return {
        count: updates,
        update: () => {
            setUpdates(updatesRef.current + 1);
        }
    };
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

function useModal() {
    const context = useContext(GlobalContext);
    const [isActive, setIsActive] = useState(false);
    const paramsRef = useRef(null);
    const hide = () => {
        paramsRef.current = null;
        context.closeModal(isActive);
        setIsActive(false);
    };
    const show = (modalParams) => {
        paramsRef.current = modalParams;
        setIsActive(context.openModal());
    };
    const render = (props) => {
        const title = paramsRef.current && paramsRef.current.title ? paramsRef.current.title : props.name;
        const styleProps = useStyleProps(props);
        styleProps.zIndex = isActive;
        return (
            <Fragment>
                {isActive && <Modal hide={hide} name={title} fit={props.fit} closeable={props.closeable} {...styleProps}>{props.children}</Modal>}
            </Fragment>
        );
    };
    return {
        render,
        show,
        hide,
        get params() {
            return paramsRef.current === null ? {} : paramsRef.current;
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

function useUniqueIds(prefix = '') {
    const uidRef = useRef(1);

    return items => {
        if (Array.isArray(items)) {
            for (let item of items) {
                if (!item.id) {
                    item.id = prefix + uidRef.current;
                    uidRef.current++;
                }
            }
        } else if (!items.id) {
            items.id = prefix + uidRef.current;
            uidRef.current++;
        }
        return items;
    }
}

function useUniqueResourceId(baseId, resources) {
    const ids = [];
    for (let resource of resources) {
        ids.push(resource.id);
    }
    // TODO wir sollten hier jetzt auch alle bekannten JSON ids
    // aus dem RL hinzufügen
    return () => {
        if (ids.indexOf(baseId) === -1) {
            return baseId;
        }
        let no = 2;
        while(ids.indexOf(baseId + no) !== -1) {
            no++;
        }
        return baseId + no;
    }
}

function useEntity(prefix, defaults = {}) {
    const entityRef = useRef(null);

    if (entityRef.current === null) {
        entityRef.current = {
            defaults,
            uid: 1,
            setDefaults: function(props) {
                this.defaults = {...this.defaults, ...props};
            },
            getNew: function(props = {}, overwrites = {}) {
                const id = prefix + '_' + this.uid;
                this.uid++;
                return {...this.defaults, ...props, ...overwrites, id}
            },
            id2Items: function(items) {
                const id2items = {};
                for (let item of items) {
                    id2items[item.id] = item;
                }
                return id2items;
            }
        };
        entityRef.current.getNew = entityRef.current.getNew.bind(entityRef.current);
        entityRef.current.setDefaults = entityRef.current.setDefaults.bind(entityRef.current);
    }
    return entityRef.current;
}

export {
    Section,
    Tab,
    Tabs,
    Dim,
    DimProp,
    Int,
    IntProp,
    IntField,
    TextField,
    TextFieldProp,
    TextArea,
    Checkbox,
    CheckboxProp,
    Toolbar,
    TabAccordion,
    Stack,
    Content,
    Page,
    Color,
    ColorProp,
    Radio,
    RadioProp,
    LabelAndSubInfo,
    ActionBox,
    ItemsStack,
    Select,
    SelectProp,
    Range,
    RangeProp,
    Grid,
    PropertyGrid,
    PropLabel,
    FullProp,
    Centered,
    SwitchButton,
    FileDropZone,
    GlobalContext,
    MouseOverlay,
    GlobalCtx,
    useUpdates,
    useMounted,
    useModal,
    useDimProps,
    useKeyListener,
    useEntity,
    useUniqueIds,
    useUniqueResourceId
}