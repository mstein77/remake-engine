import React, {useState, useRef, useEffect, useContext, useMemo, Fragment} from "react";
import ReactDOM from 'react-dom';
import {mat4} from 'gl-matrix';
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
    if (props.onClick) {
        attr.onClick = props.onClick;
    }
    const cls = [];
    if (props.invalid) {
        cls.push('invalid');
    }
    if (props.className) {
        cls.push(props.className);
    }
    return (
        <input
            type="text"
            value={props.value}
            {...attr}
            className={cls.join(' ')}
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
        cls.push((props.thin ? 'thin-' : '') + 'boxed');
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
        <Title>{props.name}</Title>
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
                                if (props.deleteActiveItem) {
                                    d('DEL OK');
                                    props.deleteActiveItem();
                                } else {
                                    d('DEL WRONG');
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
                                }
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

function ActionFrame(props) {
    return (
        <Content boxed thin flex={props.flex}>
            <Stack vertical noGap>
                <Content className="bottom-dashed">
                    <Stack className="full-v">
                        <Content fullHeight className="boxed-bg"><Content padded><kbd>{props.type}</kbd></Content></Content>
                        <Content padded className="head">{props.name}</Content>
                        {props.sub ?
                            <Fragment>
                                {Object.entries(props.sub).map(item => (
                                    <Fragment key={item[0]}>
                                        <Content fullHeight className="boxed-bg less"><Content padded>{item[0]}</Content></Content>
                                        <Content padded className="head less"><kbd>{item[1]}</kbd></Content>
                                    </Fragment>))
                                }
                                <Content fullHeight className="boxed-lg less"></Content>
                            </Fragment>
                            : ''
                        }
                        <Content flex></Content>
                        <Content padded>{props.actions}</Content>
                    </Stack>
                </Content>
                <Content flex padded>{props.children}</Content>
            </Stack>
        </Content>
    )
}

function Scene3d(props) {

    /*
      TODO:
       * second plane + texture
       - animation
       - border
     */

    const canvasRef = useRef(null);
    const [xRotation, setXRotation] = useState(0.0);
    const [yRotation, setYRotation] = useState(0.5);
    const [zRotation, setZRotation] = useState(0.0);
    const [xDist, setXDist] = useState(-2.0);
    const [yDist, setYDist] = useState(-0.0);
    const [zDist, setZDist] = useState(-3.0);
    const [info, setInfo] = useState(null);
    const paneAspectRatio = props.paneDim.x / props.paneDim.y;

    const loadShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occured compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };



    const initShaderProgram = gl => {
        // Der Vertex-Shader bekommt 2 parameter aus Buffern:

        //   - vertexPosition :vec4 = [float, float, float, float]
        //     Der Buffer der an dieses Attribut gebunden wird, hat allerdings nur 3 Komponenten
        //       => d.h. wohl dass die letzte Komponente 0 ist?
        /*
                    const numComponents = 3;
                    const type = gl.FLOAT;
                    const normalize = false;
                    const stride = 0;
                    const offset = 0;
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
                    gl.vertexAttribPointer(
                        programInfo.attribLocations.vertexPosition,
                        numComponents = 3
                        type = gl.FLOAT
                        normalize = false
                        stride = 0
                        offset = 0
                    );
        */

        //   - textureCoord :vec2 = [float, float]
        //
        /*
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
                    gl.vertexAttribPointer(
                        programInfo.attribLocations.textureCoord,
                        numComponents = 2
                        type = gl.FLOAT
                        normalize = false
                        stride = 0
                        offset = 0
                    );
                    gl.enableVertexAttribArray(
                        programInfo.attribLocations.textureCoord
                    );

            Ablauf:

            1. Ausgangspunkt ist ein Vector3 auf Achsen von -1...1
            2. Dieser Vector wird über die ModelViewMatrix
                 a) skaliert
                 b) rotiert
                 c) translated
            3. Über die Projection-Matrix perspektivisch verzerrt (Kamera)

            Die TextureCoord die reinkommt wird nur an den Shader durchgereicht

         */

        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
        
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
        
            varying highp vec2 vTextureCoord;
        
            void main(void) {
              gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
              vTextureCoord = aTextureCoord;
            }        
          `;


        const fsSource = `
            precision mediump float;
            varying highp vec2 vTextureCoord;
        
            uniform sampler2D uSampler;
        
            void main(void) {
              vec4 texColor = texture2D(uSampler, vTextureCoord);
              if (texColor.a < 0.1)
                 discard;
              gl_FragColor = texColor;
            }
          `;
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('UNABLE TO INITIALIZE THE SHADER PROGRAM: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram
    };

    const getPlainTexture = (gl) => {
        const colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, colorTexture);
        const pixel = new Uint8Array([0, 0, 0, 255]);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return colorTexture;
    };

    const loadTexture = (gl, url) => {
        const textures = [
            getPlainTexture(gl),
            getPlainTexture(gl)
        ];
/*
            gl.createTexture();


        gl.bindTexture(gl.TEXTURE_2D, texture);
*/
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;

 /*
        const pixel = new Uint8ClampedArray([0, 0, 255, 255]);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
   */
        const image = new Image();
        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, textures[0]);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        };
        image.src = url;

        return textures;
    };

    const initBuffer = gl => {
        // Create a buffer for the cube's vertex positions.

        const positionBuffer = gl.createBuffer();

        // Select the positionBuffer as the one to apply buffer
        // operations to from here out.

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Now create an array of positions for the cube.

        //

        const positions = [
            // first face
            paneAspectRatio,  1.0,  0.0,
            -paneAspectRatio,  1.0,  0.0,
            -paneAspectRatio, -1.0,  0.0,
            paneAspectRatio, -1.0,  0.0,

            // second face
            paneAspectRatio,  1.0,  -1.5,
            -paneAspectRatio,  1.0,  -1.5,
            -paneAspectRatio, -1.0,  -1.5,
            paneAspectRatio, -1.0,  -1.5,

        ];

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Now set up the texture coordinates for the faces.

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

        const textureCoordinates = [
            // first
            1.0,  0.0,
            0.0,  0.0,
            0.0,  1.0,
            1.0,  1.0,

            // second
            1.0,  0.0,
            0.0,  0.0,
            0.0,  1.0,
            1.0,  1.0,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
            gl.STATIC_DRAW);

        // Build the element array buffer; this specifies the indices
        // into the vertex arrays for each face's vertices.

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // This array defines each face as two triangles, using the
        // indices into the vertex array to specify each triangle's
        // position.

        const indices = [
            0,  2,  3,      0,  1,  2,    // front

            4,  6,  7,      4,  5,  6
        ];

        // Now send the element array to GL

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            textureCoord: textureCoordBuffer,
            indices: indexBuffer,
        };
    };

    const drawScene = (gl, programInfo) => {
        const buffers = programInfo.buffers;
        const textures = programInfo.textures;
        // draw scene
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        // wie darf man die Tiefe hier interpretieren?
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const fieldOfView = 45 * Math.PI / 180;
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();

        mat4.perspective(
            projectionMatrix,
            fieldOfView,
            aspect,
            zNear,
            zFar
        );

        const modelViewMatrix = mat4.create();

        mat4.rotate(modelViewMatrix,  // destination matrix
            modelViewMatrix,  // matrix to rotate
            xRotation,     // amount to rotate in radians
            [-1, 0, 0]);       // axis to rotate around (Z)

        mat4.rotate(modelViewMatrix,  // destination matrix
            modelViewMatrix,  // matrix to rotate
            yRotation,// amount to rotate in radians
            [0, -1, 0]);       // axis to rotate around (X)

        mat4.rotate(modelViewMatrix,  // destination matrix
            modelViewMatrix,  // matrix to rotate
            zRotation,     // amount to rotate in radians
            [0, 0, -1]);       // axis to rotate around (Z)

        mat4.translate(modelViewMatrix,     // destination matrix
            modelViewMatrix,     // matrix to translate
            [xDist, yDist, zDist]);  // amount to translate



        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            gl.enableVertexAttribArray(
                programInfo.attribLocations.vertexPosition
            );
        }

        {
            const numComponents = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
            gl.vertexAttribPointer(
                programInfo.attribLocations.textureCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset
            );
            gl.enableVertexAttribArray(
                programInfo.attribLocations.textureCoord
            );
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        gl.useProgram(programInfo.program);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix
        );
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[0]);

        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

        {
            const vertexCount = 6;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textures[0]);

        gl.uniform1i(programInfo.uniformLocations.uSampler, 1);

        {
            const vertexCount = 6;
            const type = gl.UNSIGNED_SHORT;
            const offset = 12;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }

    };


    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        const gl = canvasRef.current.getContext('webgl');

        if (!gl) {
            d('COULD NOT GET GL CONTEXT!');
            return;
        }

        if (info === null) {
            const shaderProgram = initShaderProgram(gl);
            const programInfo = {
                program: shaderProgram,
                attribLocations: {
                    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                    textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord')
                },
                uniformLocations: {
                    projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                    modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                    uSampler: gl.getUniformLocation(shaderProgram, 'uSampler')
                },
                buffers: initBuffer(gl),
                textures: loadTexture(gl, props.preview)
            };
            setInfo(programInfo);
            return;
        }

        drawScene(gl, info);
    });

    return (
        <Stack vertical>
            <canvas ref={canvasRef} width={props.width} height={props.height} />
            <Content>
                <PropertyGrid>
                    <RangeProp min={-1.0} max={1.0} step={0.01} name="xRotation" value={xRotation} set={setXRotation} />
                    <RangeProp min={-1.0} max={1.0} step={0.01} name="yRotation" value={yRotation} set={setYRotation} />
                    <RangeProp min={-1.0} max={1.0} step={0.01} name="zRotation" value={zRotation} set={setZRotation} />
                    <RangeProp min={-30.0} max={10.0} step={0.1} name="xDist" value={xDist} set={setXDist} />
                    <RangeProp min={-30.0} max={10.0} step={0.1} name="yDist" value={yDist} set={setYDist} />
                    <RangeProp min={-30.0} max={10.0} step={0.1} name="zDist" value={zDist} set={setZDist} />
                </PropertyGrid>
            </Content>
        </Stack>
    )
};

function Tooltip(props) {
    if (!props.active) {
        return '';
    }
    return (
        <div className="tooltip padded">{props.children}</div>
    );
}

function Title(props) {
    const divRef = useRef(null);
    const [start, setStart] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const timeRef = useRef(null);
    timeRef.current = start;

    const checkEnter = e => {
        const elem = divRef.current;
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

    const checkLeave = e => {
        setShowTooltip(false);
        setStart(null);
    };
    return (
        <div style={{flex: 1, minWidth: 0, position: 'relative'}}>
            <div ref={divRef} onMouseOver={checkEnter} onMouseLeave={checkLeave} className="nowrap ellipsis overflow-hidden">{props.children}</div>
            <Tooltip active={showTooltip}>{props.children}</Tooltip>
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
            <Title>{props.name}</Title>
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

function Spacer(props) {
    return <div style={{height: 5}}></div>
}

function Page(props) {
    const context = useContext(GlobalContext);

    const [open, setOpen] = useState(false);
    const resources = [];

    const typeToIcon = {
        image: 'image',
        audio: 'audiotrack',
        json: 'code'
    };

    if (props.resources) {
        for (let resource of props.resources) {
            const source = context.resourceLoader.getResourceSource(resource.type + ':' + resource.id);
            resources.push(
                <Content className="thin-boxed"
                    key={resource.type + ':' + resource.id}>
                    <Stack border>
                        <Content padded>
                            <Stack>
                                <Content><i className="material-icons md-18">{typeToIcon[resource.type]}</i></Content>
                                <Content><kbd>{source.toUpperCase()}</kbd></Content>
                            </Stack>
                        </Content>
                        <Content padded>
                            <kbd style={{fontWeight: 'bold'}}>{resource.id}</kbd>
                        </Content>
                    </Stack>
                </Content>
            );
            if (!open) {
                break;
            }
        }
    }

    return (
        <Content maxHeight="100vh">
            <Stack vertical fullHeight>
                <Content>
                    <Stack>
                        <Content flex>{props.cancel ? (<button onClick={props.cancel}> &lt; Back</button>) : ''}</Content>
                        <Content><button onClick={props.play}>Play</button></Content>
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
        update: (state = {}) => {
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



function useUniqueResourceId(resourceLoader, type) {
    const ids = resourceLoader.getAllResourceIds(type);
    const suffix = type === 'image' ? '.png' : '';
    return (baseId, modelIds) => {
        const hasId = id => {
            return (modelIds.indexOf(id) !== -1 || ids.indexOf(id) !== -1)
        };

        if (!hasId(baseId + suffix)) {
            return baseId + suffix;
        }
        let no = 2;
        while(hasId(baseId + no + suffix)) {
            no++;
        }
        return baseId + no + suffix;
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
    Title,
    Scene3d,
    PropertyGrid,
    PropLabel,
    FullProp,
    Centered,
    Spacer,
    ActionFrame,
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