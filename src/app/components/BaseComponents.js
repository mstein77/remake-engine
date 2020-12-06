import React, {useState, useRef, useEffect, useContext, useLayoutEffect, useMemo, Fragment} from "react";
import ReactDOM from 'react-dom';
import {mat4} from 'gl-matrix';
import {
    d,
    getEmptyImageData,
    drawCanvasToAvail,
    getCanvasForBitmap,
    Players,
    hex2rgb,
    rgb2hex,
    BitmapPlayer
} from '../helper/helper';
import {
    RasterOverlays,
    HRuler,
    VRuler,
    EditorContext,
    RasterScrollbar,
    BitmapEditor,
    useEditorContextPart, CursorArea, EditorCtx, BitmapSelector
} from "./Raster";
import {WrappingIndexGrid} from "../classes/Grid";
import {CellSelection, BitmapCellProvider} from "../classes/CellProvider";
import {AnimationIndex, ColorIndex, FrameIndex} from "../classes/EntityIndex";

const GlobalContext = React.createContext();
const BackgroundContext = React.createContext();
const CursorContext = React.createContext();

const TabContext = React.createContext();

class SideTabs extends React.Component {

    constructor(props) {
        super(props);
        this.items = [];
        this.state = {
            active: props.active || null,
            add: name => {
                if (!this.items.includes(name)) {
                    this.items.push(name);
                    this.setState({});
                }
            },
            setActive: active => this.setState({active})
        }
    }

    render() {
        return (
            <Stack fullHeight border>
                <Content padded>
                    <Stack vertical>{
                        this.items.map(
                            item =>
                                <Content key={item} padded>
                                    <Content className={item === this.state.active ? 'switch-button-enabled' : ''} thin boxed click={() => this.setState({active: item})} padded>
                                        <Stack>
                                            <Content>{' '}</Content>
                                            <Content flex>{item}</Content>
                                            <Content>{' '}</Content>
                                            <Content><kbd>{' > '}</kbd></Content>
                                        </Stack>
                                    </Content>
                                </Content>)
                    }</Stack>
                </Content>
                <Content flex>
                    <TabContext.Provider value={this.state}>
                        {this.props.children}
                    </TabContext.Provider>
                </Content>
            </Stack>
        )
    }
}

function SideTab({name, active, children}) {
    const tabContext = useContext(TabContext);
    useEffect(() => {
        tabContext.add(name);
        if (active) {
            tabContext.setActive(name);
        }
    }, []);
    if (tabContext.active !== name) {
        return '';
    }
    return (
        children
    )
}

function Color({value, set}) {
    return (
        <div>
            <input
                type="color"
                value={value}
                onChange={e => {set(e.target.value)}}
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

function Range({value, set, min, max, step = 0.01}) {
    return (
        <Stack alignItems="center">
            <Content>
                <kbd>{min}</kbd>
            </Content>
            <Content>
                <input
                    type="range"
                    onChange={e => set(parseFloat(e.target.value))}
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                />
            </Content>
            <Content>
                <kbd>{max}</kbd>
            </Content>
            <Content>
                <TextField size={String(max).length + 3} readOnly value={value} />
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

function SwitchButton({enabled, children, material, disabled, ...props}) {
    const cls = ['switch-div switch-button' + (enabled ? '-enabled' : '')];
    const style = useStyleProps(props);
    if (disabled) {
        style.opacity = '0.5';
    }
    if (material) {
        children = <i className="material-icons md-18 center-h">{children}</i>;
    }
    return (
        <div style={style} onClick={() => {props.switch(!enabled)}} className={cls.join(' ')}>
            {children}
        </div>
    );
}

function Radio({disabled = [], options, value, set, material}) {
    const buttons = [];
    for (let key in options) {
        const name = options[key];
        buttons.push(
            <SwitchButton
                key={key}
                enabled={value == key}
                disabled={disabled.indexOf(key) !== -1}
                material={material}
                switch={() => {disabled.indexOf(key) === -1 && set(key)}}
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

function Checkbox({name, value, set}) {
    name = name ? <div>{name}</div> : '';
    return (
        <div className="stack-h">
            {name}
            <div><input onChange={(e) => {
                set(e.target.checked);
            }} type="checkbox" checked={!!value} /></div>
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

function TextField({readOnly, name, set, size, onClick, invalid, className, value}) {
    const attr = {
    };
    if (!readOnly) {
        attr.onChange = e => set(e.target.value);
    } else {
        attr.onChange = () => {};
        attr.readOnly = true;
    }
    if (size) {
        attr.size = size
    }
    if (onClick) {
        attr.onClick = onClick;
    }
    const cls = [];
    if (invalid) {
        cls.push('invalid');
    }
    if (className) {
        cls.push(className);
    }
    const input = <input
        type="text"
        value={value}
        {...attr}
        className={cls.join(' ')}
    />;
    if (!name) {
        return input;
    }
    return (
        <Stack>
            <Content>{name}</Content>
            <Content>{input}</Content>
        </Stack>
    )
}

function PropLabel({name, children}) {
    return (
        <>
            <Content>
                {name}
            </Content>
            <Content>
                {children}
            </Content>
        </>
    )
}

function FullProp({name, children}) {
    const items = [];
    if (name) {
        items.push(<div key="0" style={{gridColumn: 'span 2'}}>{name}</div>);
    }
    items.push(<div key="1" style={{gridColumn: 'span 2'}}>{children}</div>);
    return (
        <>
            {items}
        </>
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

function ValueProp({name, children}) {
    return (
        <PropLabel name={name}>
            <Title>{children}</Title>
        </PropLabel>
    )
}

function TextArea({wrap, rows, cols, invalid, readOnly, value, set, ...props}) {
    const style = useStyleProps(props);
    const cls = [];
    if (invalid) {
        cls.push('invalid');
    }
    return (
        <textarea className={cls.join(' ')} style={style} wrap={wrap} rows={rows} cols={cols} readOnly={readOnly} value={value} onChange={e => set(e.target.value)}></textarea>
    )
}

function TextAreaProp(props) {
    const {name, ...areaProps} = props;
    return (
        <PropLabel name={name}>
            <TextArea {...areaProps} />
        </PropLabel>
    )
}

function PositionPicker({entityIndex, position, entity, setPosition, setEntity}) {
    const EntityPickerModal = useModal();

    const pick = () => {
        EntityPickerModal.open({
            controls: true,
            entityIndex,
            select: index => {
                setEntity(index);
                EntityPickerModal.close();
            }
        });
    };
    const picker = <TextField onClick={pick} size={5} readOnly value={entity} />;

    return (
        <>
            <Stack noGap>
                <SwitchButton switch={value => value && setPosition('start')} enabled={position === 'start'}>Start</SwitchButton>
                <SwitchButton switch={value => value && setPosition('before')}  enabled={position === 'before'}>Before</SwitchButton>
                {position === 'before' && picker}
                <SwitchButton switch={value => value && setPosition('after')} enabled={position === 'after'}>After</SwitchButton>
                {position === 'after' && picker}
                <SwitchButton switch={value => value && setPosition('end')} enabled={position === 'end'}>End</SwitchButton>
            </Stack>

            <EntityPickerModal.content width={400} height={400}>
                <EditorCtx>
                    <EntityPicker {...EntityPickerModal.props} />
                </EditorCtx>
            </EntityPickerModal.content>
        </>
    )
}

function PositionPickerProp({name, ...props}) {
    return (
        <PropLabel name={name}>
            <PositionPicker {...props} />
        </PropLabel>
    )
}


function Bitmap({value, set, colors, empty, resizeable, entityIndex, editable, zoomOrAvail = 1}) {
    const context = useContext(GlobalContext);

    const EditBitmapModal = useModal();
    const ImportBitmapModal = useModal();
    const CopyBitmapModal = useModal();

    const edit = () => {
        EditBitmapModal.open({
            save: provider => {
                set(provider.getImageData());
                EditBitmapModal.close();
            },
            resize: resizeable,
            colors,
            image: value
        })
    };

    const importBitmap = () => {
        const selected = selection => {
            const provider = new BitmapCellProvider(1);
            provider.setMap(selection.getCells());
            set(provider.getImageData());
            ImportBitmapModal.close();
        };
        ImportBitmapModal.open({
            zoom: 1,
            border: 0,
            cancelHandler: ImportBitmapModal.close,
            saveHandler: selected,
            selection: {
                type: 'rect',
                width: entityIndex.hasEntityDim() ? 1 : entityIndex.getSizeX(),
                height: entityIndex.hasEntityDim() ? 1 : entityIndex.getSizeY(),
                fixed: !entityIndex.hasEntityDim(),
                multi: false,
                doubleClick: selected
            },
            bitmaps: context.imageResources
        });
    };

    const copy = () => {
        CopyBitmapModal.open({
            entityIndex,
            controls: true,
            select: index => {
                set(entityIndex.getEntityPropValue(index, 'image'));
                CopyBitmapModal.close();
            }
        });
    };

    const width = value ? (typeof zoomOrAvail === 'object' ? zoomOrAvail.width : zoomOrAvail * value.width) : 0;
    const height = value ? (typeof zoomOrAvail === 'object' ? zoomOrAvail.height : zoomOrAvail * value.height) : 0;

    const render = ctx => {
        ctx.clearRect(0, 0, width, height);
        drawCanvasToAvail(getCanvasForBitmap(value), ctx, 0, 0, {width, height});
    };
    return (
        <>
            <Stack vertical>
                {value && <Content className="min-content">
                    {editable &&
                        <Stack noGap>
                            <Button click={edit}>Edit</Button>
                            <Button click={importBitmap}>Import</Button>
                            {entityIndex && <Button click={copy}>Copy</Button>}
                            {empty && <Button click={() => set(null)}>Delete</Button>}
                        </Stack>
                    }
                    <Content padded>
                        <Content className="thin-boxed min-content" click={edit}>
                            <Canvas width={width} height={height} render={render} />
                        </Content>
                    </Content>
                </Content>}

                {!value && <Content><Button click={() => set(empty())}>Add</Button></Content>}
            </Stack>

            <EditBitmapModal.content closeable width="800" height="400">
                <EditorCtx>
                    <BitmapEditor {...EditBitmapModal.props} />
                </EditorCtx>
            </EditBitmapModal.content>

            <ImportBitmapModal.content closeable width="800" height="400">
                <EditorCtx>
                    <BitmapSelector {...ImportBitmapModal.props} />
                </EditorCtx>
            </ImportBitmapModal.content>

            {entityIndex &&
                <CopyBitmapModal.content closeable width="500" height="500">
                    <EntityPicker {...CopyBitmapModal.props} />
                </CopyBitmapModal.content>
            }
        </>
    )
}

function BitmapProp(props) {
    const {name, ...bitmapProps} = props;
    return (
        <PropLabel name={name}>
            <Bitmap {...bitmapProps} />
        </PropLabel>
    )
}

function Entity({entityIndex, readOnly, value, player, set, reset, zoomOrAvail = 1}) {
    const EntityPickerModal = useModal();

    const index = entityIndex.getEntityByPropValue('value', value);
    let width = null;
    let height = null;

    if (index !== null) {
        width = typeof zoomOrAvail === 'object' ? zoomOrAvail.width : zoomOrAvail * value.width;
        height = typeof zoomOrAvail === 'object' ? zoomOrAvail.height : zoomOrAvail * value.height;
    }

    const playerRef = useRef(null);
    const prePlayers = useMemo(() => {
        if (!player || !value) {
            return null;
        }
        const obj = new Players(entityIndex);
        obj.setIndices([index]);
        return obj;
    }, [value]);
    const players = useAnimationPlayers(entityIndex, player, 1, prePlayers);

    playerRef.current = players;

    const pick = () => {
        EntityPickerModal.open({
            entityIndex,
            player: true,
            controls: true,
            select: index => {
                set(entityIndex.getEntityPropValue(index, 'value'));
                EntityPickerModal.close();
            }
        });
    };

    const render = ctx => {
        entityIndex.drawEntity(ctx, index, 0, 0, zoomOrAvail, playerRef.current);
    };

    return (
        <>
            <Stack vertical>
                {!readOnly &&
                    <Content>
                        <Stack noGap>
                            <Content>
                                <Button click={pick}>Pick</Button>
                            </Content>
                            <Content click={pick}>
                                <TextField value={value} readOnly />
                            </Content>
                            {reset && <ActionBox material click={() => set('')}>delete</ActionBox>}
                        </Stack>
                    </Content>
                }
                <Content className="min-content">
                    {width !== null &&
                            <Content className="thin-boxed" click={pick}>
                                <Canvas width={width} height={height} render={render}/>
                            </Content>
                    }
                </Content>
            </Stack>

            <EntityPickerModal.content closeable width="800" height="400">
                <EditorCtx>
                    <EntityPicker {...EntityPickerModal.props} />
                </EditorCtx>
            </EntityPickerModal.content>
        </>
    )
}

function EntityProp(props) {
    const {name, ...entityProps} = props;
    return (
        <PropLabel name={name}>
            <Entity {...entityProps} />
        </PropLabel>
    )
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
            {name ? <div>{name}</div> : ''}
            <Stack fit fullHeight align="center" alignItems="center">
                {buttonPrev}
                <input {...attr} />
                {buttonNext}
            </Stack>
        </>
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
    const style = useDimProps(props, props.style ? props.style : {});
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
        <>{props.children}</>
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

function DivGrid({render, sizeX, sizeY, border, width, height}) {
    const cellSizeX = sizeX;
    const cellSizeY = sizeY;
    const rowStyle = useMemo(
        () => {
            return {width: cellSizeX, maxWidth: cellSizeX, height: cellSizeY, maxHeight: cellSizeY}
        },
        [cellSizeX, cellSizeY]
    );
    const gridStyle = useMemo(
        () => {
            return {
                padding: border + 'px'
            }
        },
        [border]
    );
    const columns = [];
    const gridRows = [];
    let i = 0;
    let first = true;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (first) {
                columns.push(cellSizeX + 'px');
            }
            gridRows.push(
                <div className="content-bg" key={i} style={rowStyle}>{render(x, y)}</div>);
            i++;
        }
        first = false;
    }

    return (
        <Content className="border-bg min-content" style={gridStyle}>
            <Grid gap={border} columns={columns.join(' ')}>
                {gridRows}
            </Grid>
        </Content>
    )
}

function Grid({columns, gap, children}) {
    const style = {
        display: 'grid',
        gridTemplateColumns: columns
    };
    if (gap) {
        style.gridGap = gap;
    }
    return (
        <div style={style}>
            {children}
        </div>
    );
}

function PropertyGrid(props) {
    return (
        <Grid gap={5} columns="min-content auto" {...props} />
    );
}

function LabelAndSubInfo(props) {
    return <>
        <Title>{props.name}</Title>
        <div className="sub-info">{props.children}</div>
    </>
}

function ItemsStack({hasProps = true, ...props}) {
    const [collapsed, setCollapsed] = useState(hasProps === false || props.collapsed === true);
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
                <Toolbar end={hasProps && <ActionBox material click={toggleCollapse}>{'keyboard_arrow_' + (collapsed ? 'right' : 'left')}</ActionBox>}>
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
                                    props.deleteActiveItem();
                                } else {
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
    useKeyListener(27, () => {props.close(); return true}, () => props.closeable);

    const styleProps = useStyleProps(props);
    const click = props.closeable ?
        e => {
            let target = e.target;
            while(target.classList !== undefined) {
                if (target.classList.contains('modal-centered')) {
                    return;
                }
                target = target.parentNode;
            }
            props.close();
            e.stopPropagation();
            e.preventDefault();
        } : null;

    return (
        <Portal id="modals-container">
            <Content className="modal-overlay" click={click} zIndex={styleProps.zIndex - 1}>
                <Stack align="center" fit={props.fit} vertical border {...styleProps} className="modal-centered boxed">

                    <Content padded className="title-area-active">
                        <Stack alignItems="center">
                            <Content flex>{props.name}</Content>
                            <Stack fit><ActionBox material click={(e) => {
                                props.close();
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

function ActionFrame({flex, name, fullHeight, sub, type, actions, children}) {
    return (
        <Content boxed thin flex={flex} fullHeight={fullHeight}>
            <Stack vertical noGap>
                <Content className="bottom-dashed">
                    <Stack className="full-v">
                        <Content fullHeight className="boxed-bg"><Content padded><kbd>{type}</kbd></Content></Content>
                        <Content padded className="head">{name}</Content>
                        {sub ?
                            <>
                                {Object.entries(sub).map(item => (
                                    <Fragment key={item[0]}>
                                        <Content fullHeight className="boxed-bg less"><Content padded>{item[0]}</Content></Content>
                                        <Content padded className="head less"><kbd>{item[1]}</kbd></Content>
                                    </Fragment>))
                                }
                                <Content fullHeight className="boxed-lg less"></Content>
                            </>
                            : ''
                        }
                        <Content flex></Content>
                        <Content padded>{actions}</Content>
                    </Stack>
                </Content>
                <Content flex padded>{children}</Content>
            </Stack>
        </Content>
    )
}

function GridCellSelector({gridProvider, cellType, zoom, border, doubleClick, width, height, pos, select, editorId}) {

    const eContext = useContext(EditorContext);

    const mounted = useMounted();

    const cellSize = cellType.getCellSize(0, 0, zoom, border);

    const windowEvents = eContext.getWindowEvents(editorId);
    const boundingRectRef = useRef(null);
    const [highlight, setHighlight] = useState(false);

    const mouseDown = (e, x, y) => {
        const index = gridProvider.getCellValue(x, y);
        if (index !== null) {
            setHighlight(true);
            select(index);
            windowEvents.addListener('mouseup', mouseUp, {capture: false});
        }
        e.stopPropagation();
        e.preventDefault();
    };

    const mouseUp = e => {
        if (mounted.current) {
            setHighlight(false);
        }
        windowEvents.removeListener('mouseup', mouseUp, {capture: false});
        e.stopPropagation();
        e.preventDefault();
    };

    return (
        <CursorArea
            boundingRectRef={boundingRectRef}
            cellProvider={gridProvider}
            mouseDown={mouseDown}
            doubleClick={doubleClick}
            mouseTrack={null}
            highlight={highlight}
            cursorWidth={1}
            cursorHeight={1}
            fixed={highlight}
            cursorType="rect"
            matrix={null}
            inclusion={false}
            width={width}
            height={height}
            zoom={1}
            border={border}
            valid={(x, y) => gridProvider.getCellValue(x, y) !== null}
            sizeX={cellSize.x}
            sizeY={cellSize.y}
            posX={0}
            posY={pos}
        />
    )
}

function EntityTextPicker({entityIndex, textSize, sizeX, sizeY, select, editorId, player, controls, base, ...props}) {
    const [pos, setPos] = useState(0);
    const [zoom, setZoom] = useState(props.zoom !== undefined ? props.zoom : 1);
    const [maxZoom, setMaxZoom] = useState(10);
    const [rulers, setRulers] = useState(false);
    const [border, setBorder] = useState(props.border !== undefined ? props.border :1);
    const [width, setWidth] = useState(1);
    const [height, setHeight] = useState(1);
    const [speed, setSpeed] = useState(0.5);
    const [filter, setFilterRaw] = useState('');

    const players = useAnimationPlayers(entityIndex, player, speed);

    const gridProvider = useMemo(() => {
        return new WrappingIndexGrid(entityIndex, base, players);
    }, [entityIndex]);

    const cellType = useMemo(() => {
        return new PictureAndTextCell(sizeX, sizeY, textSize);
    }, [sizeX, sizeY, textSize]);

    const render = (x, y) => {
        const index = gridProvider.getCellValue(x, y);
        if (index === null) {
            return '';
        }
        const textWidth = textSize + (zoom === 0 ? sizeX : 0);
        return (
            <Stack alignItems="center" align="center" vertical fullHeight>
                <Stack flex nogap>
                    {zoom > 0 &&
                        <Content className="min-content thin-boxed">
                            {
                                entityIndex.hasEntityImage(index) ?
                                    <Canvas width={sizeX * zoom} height={sizeY * zoom} render={ctx => gridProvider.index.drawEntity(ctx, index, 0, 0, {width: sizeX * zoom, height: sizeY * zoom})} /> :
                                    <Content width={sizeX * zoom} height={sizeY * zoom} />
                            }
                        </Content>
                    }
                    <Title width={textWidth} maxWidth={textWidth}>{entityIndex.getEntityValue(index)}</Title>
                </Stack>
            </Stack>
        )
    };

    const doubleClick = props.doubleClick ? (e, x, y) => {
        const index = gridProvider.getCellValue(x, y);
        if (index < entityIndex.getLength()) {
            props.doubleClick(index);
        }
    } : null;

    const setFilter = value => {
        gridProvider.setMatch(value);
        setFilterRaw(value);
        setPos(0);
    };

    if (players) {
        gridProvider.updatePlayers(pos, width, height);
    }

    if (zoom > maxZoom) {
        setZoom(maxZoom);
    }

    const cellSizeX = sizeX;
    const cellSizeY = sizeY;

    const content = gridProvider.getWidth() === 0 ?
        <Centered>No result...</Centered> :
        <CellGrid
            cellType={cellType}
            match={filter}
            posX={0}
            sizeX={cellSizeX}
            sizeY={cellSizeY}
            setPosX={() => {}}
            posY={pos}
            setPosY={setPos}
            zoom={zoom}
            maxZoom={maxZoom}
            setZoom={setZoom}
            setMaxZoom={setMaxZoom}
            border={border}
            setBorder={setBorder}
            rulers={rulers}
            render={render}
            setRulers={setRulers}
            width={width}
            setWidth={setWidth}
            height={height}
            setHeight={setHeight}
            editorId={editorId}
            gridProvider={gridProvider}
        >
            <GridCellSelector
                gridProvider={gridProvider}
                cellType={cellType}
                sizeX={cellSizeX}
                sizeY={cellSizeY}
                editorId={editorId}
                pos={pos}
                width={width}
                height={height}
                zoom={zoom}
                border={border}
                select={select}
                doubleClick={doubleClick}
            />
        </CellGrid>;

    return (
        <Stack vertical fullHeight border>
            {controls && <Toolbar>
                <Stack>
                    {props.filter &&
                        <Content>
                            <TextField name="Filter:" value={filter} set={setFilter} />
                        </Content>
                    }
                    <Content>
                        <Int name="Pos:" buttons min={0} max={gridProvider.getHeight() - height} value={pos} set={setPos} />
                    </Content>
                    <Content>
                        <Int name="Zoom:" buttons min={cellType.getMinZoom()} value={zoom} set={setZoom} max={maxZoom} />
                    </Content>
                    <Content>
                        <Int name="Border:" buttons min={0} value={border} set={setBorder} />
                    </Content>
                    <Content>
                        <Checkbox name="Rulers:" value={rulers} set={setRulers} />
                    </Content>
                </Stack>
            </Toolbar>}
            <div className="full-v flex">
                {content}
            </div>
        </Stack>
    )
}

function EntityPicker({entityIndex, player, controls, editorId, select, base = null, ...props}) {

    const [pos, setPos] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [maxZoom, setMaxZoom] = useState(10);
    const [rulers, setRulers] = useState(false);
    const [border, setBorder] = useState(1);
    const [width, setWidth] = useState(1);
    const [height, setHeight] = useState(1);
    const [speed, setSpeed] = useState(0.5);
    const [filter, setFilterRaw] = useState('');

    if (zoom > maxZoom) {
        setZoom(maxZoom);
    }

    const players = useAnimationPlayers(entityIndex, player, speed);

    const gridProvider = useMemo(() => {
        return new WrappingIndexGrid(entityIndex, base, players);
    }, [entityIndex]);

    const sizeX = gridProvider.getCellSizeX();
    const sizeY = gridProvider.getCellSizeY();
    const cellType = useMemo(() => {
        return new PictureCell(sizeX, sizeY)
    }, [sizeX, sizeY]);

    const doubleClick = props.doubleClick ? (e, x, y) => {
        const index = gridProvider.getCellValue(x, y);
        if (index < entityIndex.getLength()) {
            props.doubleClick(index);
        }
    } : null;

    const setFilter = value => {
        gridProvider.setMatch(value);
        setFilterRaw(value);
        setPos(0);
    };

    if (players) {
        gridProvider.updatePlayers(pos, width, height);
    }

    const content = gridProvider.getWidth() === 0 ?
        <Centered>No result...</Centered> :
        <CellGrid
            match={filter}
            cellType={cellType}
            posX={0}
            setPosX={() => {}}
            posY={pos}
            setPosY={setPos}
            zoom={zoom}
            maxZoom={maxZoom}
            setZoom={setZoom}
            setMaxZoom={setMaxZoom}
            border={border}
            setBorder={setBorder}
            rulers={rulers}
            setRulers={setRulers}
            width={width}
            setWidth={setWidth}
            height={height}
            setHeight={setHeight}
            editorId={editorId}
            gridProvider={gridProvider}
        >
            <GridCellSelector
                gridProvider={gridProvider}
                cellType={cellType}
                editorId={editorId}
                pos={pos}
                width={width}
                height={height}
                zoom={zoom}
                border={border}
                select={select}
                doubleClick={doubleClick}
            />
        </CellGrid>;

    return (
        <Stack vertical fullHeight border>
            {controls && <Toolbar>
                <Stack>
                    {props.filter &&
                        <Content>
                            <TextField name="Filter:" value={filter} set={setFilter} />
                        </Content>
                    }
                    <Content>
                        <Int name="Pos:" buttons min={0} max={gridProvider.getHeight() - height} value={pos} set={setPos} />
                    </Content>
                    <Content>
                        <Int name="Zoom:" buttons min={1} value={zoom} set={setZoom} max={maxZoom} />
                    </Content>
                    <Content>
                        <Int name="Border:" buttons min={0} value={border} set={setBorder} />
                    </Content>
                    <Content>
                        <Checkbox name="Rulers:" value={rulers} set={setRulers} />
                    </Content>
                </Stack>
            </Toolbar>}
            <div className="full-v flex">
                {content}
            </div>
        </Stack>
    )
}

function BackgroundControl() {
    const bgContext = useContext(BackgroundContext);
    return (
        <Stack>
            <Int name="Background:" min="0" max="26" set={bgContext.setBgOpacity} value={bgContext.bgOpacity} buttons />
            <Color value={bgContext.bgColor} set={bgContext.setBgColor} />
        </Stack>
    )
}

function Background({width, height}) {
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
}

function Button({children, click, disabled}) {
    const onClick = e => {click(); e.stopPropagation(); e.preventDefault()};
    return (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    );
}

function Canvas({width, height, render, background = true, className}) {
    const canvasRef = useRef(null);
    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        const ctx = canvasRef.current.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        render(ctx);
    });

    if (height === 0 || width === 0) return '';

    return (
        <div style={{position: 'relative', height, width}}>
            {background && <Background width={width} height={height} />}
            <canvas style={{top: 0, position: 'absolute'}} className={className} width={width} height={height} ref={canvasRef} />
        </div>
    )
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

function useAnimationPlayers(entityIndex, player, speed, prePlayers = null) {
    const context = useContext(GlobalContext);

    const mounted = useMounted();

    const players = useMemo(() => {
        if (!player) return null;

        if (prePlayers) {
            return prePlayers;
        }
        return new Players(entityIndex);
    }, [player, prePlayers]);

    if (players && players.getSpeed() != speed) {
        players.setSpeed(speed);
    }

    const update = useComponentUpdate();
    useEffect(() => {
        const compUpdate = () => {
            if (player) {
                players.clear();
            }
            update();
        };
        entityIndex.addListener(compUpdate);
        return () => {
            entityIndex.removeListener(compUpdate);
        }
    }, [prePlayers]);

    const frameRef = useRef(null);

    useEffect(() => {
        if (!players) {
            return;
        }
        const level = context.getModalLevel();

        const runAnimations = () => {
            frameRef.current = requestAnimationFrame(() => {
                if (!mounted.current) {
                    return;
                }
                if (level === context.getModalLevel()) {
                    if (players.nextStep()) {
                        update();
                    }
                }
                runAnimations();
            });
        };
        runAnimations();
        return () => {
            cancelAnimationFrame(frameRef.current);
            players.clear();
        };
    }, [players]);

    return players;
}

function EntityManager({newItem, player, fit, undoRedo, maxedZoom, importItems, startPos, doubleClick, rightClick, renderTitle, renderBottom, actions, titleHeight, bottomHeight, minWidth, empty, entityIndex, ...props}) {
    const [pos, setPos] = useState(startPos || 0);
    const [zoom, setZoom] = useState(2);
    const [page, setPage] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [marked, setMarked] = useState([]);
    const [filter, setFilterRaw] = useState('');
    const setFilter = value => {
        setPos(0);
        setFilterRaw(value);
    };

    if (minWidth === undefined) {
        minWidth = 50;
    }
    const sizeX = entityIndex.getSizeX();
    const sizeY = entityIndex.getSizeY();

    const players = useAnimationPlayers(entityIndex, player, speed);

    const propsRef = useRef(null);
    propsRef.current = {pos};

    if (!renderTitle) {
        renderTitle = value => <Title>{value}</Title>
    }

    const matcher = props.filter && filter ? filter : null;
    const view = entityIndex.getView(pos, page, matcher);
    const viewEnd = Math.max(view.count - page, 0);
    if (pos > viewEnd) {
        setPos(viewEnd);
    }

    let scroller = '';
    const hasScrollbar = page < view.count;
    let height = 5 * 3 + (titleHeight + 2 + 10) + zoom * sizeY;
    if (hasScrollbar) {
        height += 31;
        scroller = <RasterScrollbar auto pos={pos} set={setPos} page={page} min={0} max={view.count} />
    }

    const items = [];
    const style = {
        minWidth
    };

    const divRef = useResize({zoom, page, sizeY, hasScrollbar}, [zoom, hasScrollbar],
        (curr, rect) => {
            const padding = 5;
            const boxSize = curr.zoom * sizeY + 2;
            const itemSize =
                Math.max(minWidth, boxSize) + 2 + 3 * padding;
            const space = rect.width - 2 * padding;
            const newPage = Math.floor(space/itemSize);

            if (maxedZoom) {
                const spaceY =
                    rect.height - 4 * padding - titleHeight - 2 - (hasScrollbar ? 31 : 0) - (bottomHeight ? bottomHeight : 0);
                const maxZoom = Math.max(Math.floor(spaceY/sizeY), 1);
                if (maxZoom !== zoom) {
                    setZoom(maxZoom);
                }
            }

            if (newPage !== curr.page) {
                setPage(newPage);
            }
        }
    );


    const sensitivity = 0.25;
    const onWheel = e => {
        let deltaX = Math.round(e.deltaX * sensitivity);
        const newPos = Math.min(Math.max(propsRef.current.pos + deltaX, 0), max);
        if (newPos !== propsRef.current.pos) {
            setPos(newPos);
        }
        e.stopPropagation();
    };

    const toggleMarker = index => {
        const newMarked = marked.concat();
        const pos = marked.indexOf(index);
        if (pos !== -1) {
            newMarked.splice(pos, 1);
        } else {
            newMarked.push(index);
        }
        setMarked(newMarked);
    };

    const getDoubleClickAction = index => {
        if (!doubleClick) {
            return null;
        }
        return () => {
            doubleClick(index);
        };
    };
    const getRightClickAction = index => {
        if (!rightClick) {
            return null;
        }
        return () => {
            rightClick(index);
        };
    };

    let bottomItems = [];
    bottomItems.push(
        <Content key={'matching'}>Matching: {view.count} of {entityIndex.getLength()}</Content>
    );
    if (actions && marked.length > 0) {
        bottomItems.push(<Content key="info">Marked: {marked.length}</Content>);

        const bottomActions = [];
        bottomActions.push(<button key="all" onClick={() => {
            setMarked(view.matches);
        }}>All</button>);
        bottomActions.push(<button key="reverse" onClick={() => {
            const indices = [];
            for (let i = 0; i < view.matches.length; i++) {
                const index = view.matches[i];
                if (marked.indexOf(index) === -1) {
                    indices.push(index);
                }
            }
            setMarked(indices);
        }}>Reverse</button>);
        for (let action of actions) {
            if (action.isHidden !== undefined && action.isHidden({marked})) {
                continue;
            }
            bottomActions.push(
                <button key={action.name} onClick={(e) => {
                    action.doAction(marked);
                    setMarked([]);
                    e.preventDefault();
                    e.stopPropagation();
                }}>{action.name}</button>
            );
        }
        bottomActions.push(<button key="cancel" onClick={() => {setMarked([])}}>X</button>);
        bottomItems.push(
            <Stack fit key="actions">
                {bottomActions}
            </Stack>
        );
    }

    if (players) {
        players.setIndices(view.matches);
    }

    const bottomToolbar = bottomItems.length > 0 ? <Toolbar>{bottomItems}</Toolbar> : '';

    const availWidth = sizeX * zoom;
    const availHeight = sizeY * zoom;
    const avail = availHeight;
//    const avail = Math.min(availWidth, availHeight);

    const zoomOrAvail = maxedZoom ? {width: avail, height: avail} : zoom;

    for (let index of view.matches) {
        const cls = ['padded thin-boxed'];
        if (marked.indexOf(index) !== -1) {
            cls.push('marked-item');
        } else {
            cls.push('hover-item');
        }
        const click = actions ? () => {toggleMarker(index)} : null;
        items.push(
            <div key={index} className={cls.join(' ')}
                 style={style}
                 onDoubleClick={getDoubleClickAction(index)}
                 onContextMenu={getRightClickAction(index)}
                 onClick={click}
            >
                <Stack vertical>
                    <Content height={titleHeight}>{renderTitle(index)}</Content>
                    <Stack alignItems="center" align="center">
                        <div className="thin-boxed min-content">
                            {entityIndex.hasEntityImage(index) ?
                                <Canvas width={avail} height={avail} render={ctx => entityIndex.drawEntity(ctx, index, 0, 0, zoomOrAvail, players)}></Canvas> :
                                <Content width={avail} height={avail}></Content>
                            }
                        </div>
                    </Stack>
                    {renderBottom ? <Content height={bottomHeight}>{renderBottom(index)}</Content> : ''}
                </Stack>
            </div>
        );
    }

    const centerAttr = fit ? {style: {height}} : {style: {height: '100%'}};

    let content = items.length ?
            <Stack alignItems="center" vertical>
                <div className="rel-canvas" onWheel={onWheel}>
                    <Stack vertical>
                        <Stack padded>{items}</Stack>
                        {scroller}
                    </Stack>
                </div>
            </Stack> :
            <Centered {...centerAttr}>{empty}</Centered>;

    const topToolbar =
        <Toolbar>
            {
                undoRedo && <UndoRedoButtons />
            }
            {
                props.filter &&
                <TextField name="Filter:" value={filter} set={setFilter}/>
            }
            <Int name="Pos:" buttons min={0} max={viewEnd} value={pos} set={setPos} />
            {
                maxedZoom ? '' : <Int name="Zoom:" buttons min={1} value={zoom} set={setZoom} />
            }
            <BackgroundControl />
            {player ? <Range value={speed} step={0.01} set={value => setSpeed(parseFloat('' + value))} min={0.0} max={2.0} /> : ''}
        </Toolbar>;

    const controller =
        <Stack vertical fullHeight border>
            {topToolbar}
            <div className="padded" ref={divRef} {...centerAttr}>
                {content}
            </div>
            {bottomToolbar}
        </Stack>;

    if (!newItem) {
        return controller;
    }
    return (
        <Stack fullHeight border>
            <Toolbar padded>
                <Stack vertical>
                    {newItem && <ActionBox material click={newItem}>add</ActionBox>}
                    {importItems && <ActionBox material click={importItems}>playlist_add</ActionBox>}
                </Stack>
            </Toolbar>
            <Content flex>{controller}</Content>
        </Stack>
    )
}

function Scene3d(props) {

    /*
      TODO:
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

    let maxWidth = 0;
    let maxRatio = 0;
    for (let elem of props.elems) {
        if (elem.width > maxWidth) {
            maxWidth = elem.width;
            maxRatio = elem.height / maxWidth * elem.height;
        }
    }
    const normX = 1 / maxWidth;
    const normY = normX;
    // TODO normalize rects
    const paneAspectRatio = props.width / props.height;

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

    const getPlainTexture = (gl, color) => {
        const rgb = color ? hex2rgb(color) : {r: 0, g: 0, b: 0};
        const colorTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, colorTexture);
        const pixel = new Uint8Array([rgb.r, rgb.g, rgb.b, 255]);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return colorTexture;
    };

    const loadTextures = (gl) => {
        const textures = [];
        const iMax = props.elems.length;
        let i = 0;
        while (i < iMax) {
            textures.push(getPlainTexture(gl, props.elems[i].color));
            i++;
        }
        const level = 0;
        const internalFormat = gl.RGBA;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;

        i = 0;
        for (let elem of props.elems) {
            if (elem.texture) {
                const image = new Image();
                const index = i;
                image.onload = function () {
                    gl.bindTexture(gl.TEXTURE_2D, textures[index]);
                    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                };
                image.src = elem.texture;
            }
            i++;
        }
        return textures;
    };

    const initBuffer = gl => {
        // Create a buffer for the cube's vertex positions.
        const positionBuffer = gl.createBuffer();

        // Select the positionBuffer as the one to apply buffer
        // operations to from here out.

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Now create an array of positions for the cube.

        const positions = [];
        let i = props.elems.length;
        const zDist = 2/i;
        let z = 0;
        let j = 0;
        const textureCoordinates = [];
        const indices = [];
        while (i > 0) {
            const elem = props.elems[i - 1];

            positions.push(...[
                elem.width * normX,  elem.height * normY,  z,
                -elem.width * normX,  elem.height * normY,  z,
                -elem.width * normX, -elem.height * normY,  z,
                elem.width * normX, -elem.height * normY,  z,
            ]);
            textureCoordinates.push(...[
                1.0,  0.0,
                0.0,  0.0,
                0.0,  1.0,
                1.0,  1.0,
            ]);
            indices.push(...[
                j,  j+ 2,  j + 3,      j,  j + 1,  j + 2
            ]);
            i--;
            j += 4;
            z -= zDist;
        }

        // Now pass the list of positions into WebGL to build the
        // shape. We do this by creating a Float32Array from the
        // JavaScript array, then use it to fill the current buffer.

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        // Now set up the texture coordinates for the faces.

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
            gl.STATIC_DRAW);

        // Build the element array buffer; this specifies the indices
        // into the vertex arrays for each face's vertices.

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

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

        let i = props.elems.length;
        let j = 0;
        while (i > 0) {
            gl.bindTexture(gl.TEXTURE_2D, textures[j]);
            gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

            {
                const vertexCount = 6;
                const type = gl.UNSIGNED_SHORT;
                const offset = 12 * j;
                gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
                i--;
                j++;
            }
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
                textures: loadTextures(gl)
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
    const style = useDimProps(props, {flex: 1, minWidth: 0, position: 'relative'});

    return (
        <div style={style}>
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
                        <Content><button onClick={props.play}>Replay</button></Content>
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

class BackgroundCtx extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            bgColor: '#666677',
            setBgColor: bgColor => {
                this.setState({bgColor});
            },
            bgOpacity: 10,
            setBgOpacity: bgOpacity => {
                this.setState({bgOpacity});
            }
        }
    }

    render() {
        return (
            <BackgroundContext.Provider value={this.state}>
                {this.props.children}
            </BackgroundContext.Provider>
        );
    }
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
            getModalLevel: () => {
                return this.modalStack.length;
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
                <CursorCtx>
                    <BackgroundCtx>
                        {this.props.children}
                    </BackgroundCtx>
                </CursorCtx>
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
    const content = props => {
        const title = propsRef.current && propsRef.current.title ? propsRef.current.title : props.name;
        const styleProps = useStyleProps(props);
        styleProps.zIndex = isOpen;
        return (
            <>
                {isOpen && <Modal close={close} name={title} fit={props.fit} closeable={props.closeable} {...styleProps}>{props.children}</Modal>}
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

function CellGrid({children, cellType, editorId, rulers, gridProvider, posX, setPosX, posY, setPosY, width, setWidth, height,
                      match, setHeight, border, zoom, maxZoom, setMaxZoom, ...props}) {
    const context = useContext(GlobalContext);
    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'auto',
        gridRowGap: context.defaultPadding,
        gridColumnGap: context.defaultPadding
    };
    useEditorContextPart(editorId);

    const propsRef = useRef(null);
    const gridWidth = gridProvider.getWidth();
    const gridHeight = gridProvider.getHeight();

    const cellSize = cellType.getCellSize(0, 0, zoom, border);
    const dim = {width: Math.min(width, gridWidth) * cellSize.xPlusBorder + border, height: Math.min(height, gridHeight) * cellSize.yPlusBorder + border};

    // TODO calc
    const rulerPaddingX = rulers ? 20 : 0;
    const rulerPaddingY = rulers ? 12 : 0;
    const rulerSpaceX = rulers ? 38 : 0;
    const rulerSpaceY = rulers ? 22 : 0;
    const hasScrollingY = height < gridHeight;
    const hasScrollingX = width < gridWidth;

    const divRef = useResize({width, height, border, zoom, maxZoom, rulers, rulerSpaceX, rulerSpaceY, hasScrollingX, hasScrollingY}, [border, zoom, maxZoom, match, rulers, hasScrollingX, hasScrollingY], (curr, rect) => {
        const spaceX = rect.width - 2 * context.defaultPadding - (curr.rulers ? curr.rulerSpaceX * 2 : 0) - curr.border;
        const spaceY = rect.height - 2 * context.defaultPadding - (curr.rulers ? curr.rulerSpaceY * 2 : 0) - curr.border;
        const cellSize = cellType.getCellSize(spaceX, spaceY, curr.zoom, curr.border);
        if (cellSize.maxZoom < curr.zoom) {
            setMaxZoom(cellSize.maxZoom);
            return;
        }
        if (gridProvider.setWrapWidth) {
            gridProvider.setWrapWidth(cellSize.wrapWidth);
        }
        const newWidth = Math.min(cellSize.wrapWidth, gridProvider.getWidth());
        const newHeight = Math.min(Math.floor(spaceY / cellSize.yPlusBorder), gridProvider.getHeight());

        if (curr.width !== newWidth) setWidth(newWidth);
        if (curr.height !== newHeight) setHeight(newHeight);
        if (curr.maxZoom !== cellSize.maxZoom) setMaxZoom(cellSize.maxZoom);
    });
    const maxPosX = Math.max(0, gridProvider.getWidth() - width);
    const maxPosY = Math.max(0, gridProvider.getHeight() - height);

    propsRef.current = {posX, maxPosX, posY, maxPosY, width, height, maxZoom, border, zoom,
        dim, rulers};

    const render = useMemo(
    () => {
        return (
            cellType.hasText() ?
                (x, y) => {
                    return props.render(posX + x, posY + y);
                } :
                ctx => {
                    const {posX, posY, width, height, border, zoom, dim, maxPosX, maxPosY} = propsRef.current;
                    ctx.clearRect(0, 0, dim.width, dim.height);
                    gridProvider.drawGrid(ctx, Math.min(posX, maxPosX), Math.min(posY, maxPosY), width, height, border, zoom);
                }
            )
        },
        [gridProvider, props.render]
    );

    if (posX > maxPosX) {
        setPosX(maxPosX);
    }
    if (posY > maxPosY) {
        setPosY(maxPosY);
    }

    const style = {
        width: dim.width,
        height: dim.height
    };
    let topRuler = '';
    let leftRuler = '';

    if (rulers) {
        const rulerProps = {width, posX, border};
        const hProps = {...rulerProps, width: dim.width, height: rulerSpaceY, max: width, start: posX, cellSize: cellSize.x};
        topRuler =
            <HRuler
                digits={('' + gridProvider.getWidth()).length}
                {...hProps}
            />;
        const vProps = {...rulerProps, width: rulerSpaceX, height: dim.height, max: height, start: posY, cellsPerLine: gridProvider.setWrapWidth ? gridProvider.wrapWidth : null, cellSize: cellSize.y};
        leftRuler =
            <VRuler
                digits={('' + gridProvider.getHeight()).length}
                {...vProps}
            />;
        style.marginTop = -(rulerSpaceY >> 1);
    }

    const sensitivity = 0.25;
    const onWheel = e => {
        let deltaX = Math.round(e.deltaX * sensitivity);
        let deltaY = Math.round(e.deltaY * sensitivity);

        const newPosX = Math.min(Math.max(posX + deltaX, 0), maxPosX);
        const newPosY = Math.min(Math.max(posY + deltaY, 0), maxPosY);
        if (newPosX !== posX) {
            setPosX(newPosX);
        }
        if (newPosY !== posY) {
            setPosY(newPosY);
        }
        e.stopPropagation();
    };

    const firstCells = [
        <div key={1} onWheel={onWheel}>
            <div ref={divRef} className="full-v stack-h centered" style={{paddingLeft: rulerPaddingX, paddingTop: rulerPaddingY}}>
                <div className="stack-h centered items-centered">
                    <div className="rel-canvas marker-space" style={style}>
                        {cellType.hasText() ?
                            <DivGrid render={render} sizeX={cellSize.x} sizeY={cellSize.y} width={width} height={height} border={border} zoom={zoom} /> :
                            <Canvas render={render} width={dim.width} height={dim.height} />
                        }
                        {topRuler}
                        {leftRuler}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    ];

    if (hasScrollingY) {
        firstCells.push(<div key={2}><RasterScrollbar editorId={editorId} auto vertical set={setPosY} pos={posY} page={height} max={gridProvider.getHeight()} /></div>);
        gridStyle.gridTemplateColumns += ' 21px'
    }
    const secondCells = [];
    if (hasScrollingX) {
        secondCells.push(<div style={{height: 21}} key={3}><RasterScrollbar editorId={editorId} auto set={setPosX} pos={posX} page={width} max={gridProvider.getWidth()} /></div>);
        gridStyle.gridTemplateRows = 'auto 21px';
        if (hasScrollingY) {
            secondCells.push(<div key={4}></div>);
        }
    }
    return (
        <div style={gridStyle} className="full-v">
            {firstCells}
            {secondCells}
        </div>
    );
}

class PictureCell {

    constructor(sizeX, sizeY) {
        this.sizeX = sizeX;
        this.sizeY = sizeY;
    }

    hasText() {
        return false;
    }

    getMinZoom() {
        return 1;
    }

    getCellSize(spaceX, spaceY, zoom, border = 0) {
        const fixSpace = border;

        const maxZoom =
            Math.min(
                Math.floor((spaceX - fixSpace) / this.sizeX),
                Math.floor((spaceY - fixSpace) / this.sizeY),
            );

        const x = this.sizeX * zoom;
        const xPlusBorder = x + border;
        const y = this.sizeY * zoom;
        const wrapWidth = Math.floor(spaceX / xPlusBorder);
        return {
            x,
            xPlusBorder,
            y,
            yPlusBorder: y + border,
            maxZoom,
            wrapWidth
        };
    }
}

class PictureAndTextCell {

    constructor(sizeX, sizeY, textSize) {
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        this.textSize = textSize;
    }

    hasText() {
        return true;
    }

    getMinZoom() {
        return 0;
    }

    getCellSize(spaceX, spaceY, zoom, border = 0) {
        const fixSpaceX = 3 * 5 + this.textSize + (zoom === 0 ? this.sizeX : 0);
        const fixSpaceY = 2 * (5 + 1) + (zoom === 0 ? 15 : 0);
        const maxZoom =
            Math.max(
                Math.min(
                    Math.floor((spaceX - fixSpaceX - border) / this.sizeX),
                    Math.floor((spaceY - fixSpaceY - border) / this.sizeY)
                ),
                this.getMinZoom()
            );
        const x = fixSpaceX + this.sizeX * zoom;
        const xPlusBorder = x + border;
        const y = fixSpaceY + this.sizeY * zoom;
        const wrapWidth = Math.floor(spaceX / xPlusBorder);
        return {
            x,
            xPlusBorder,
            y,
            yPlusBorder: y + border,
            maxZoom,
            wrapWidth
        };
    }
}

class CursorCtx extends React.Component {

    constructor(props) {
        super(props);
        this.divRef = React.createRef(null);
        this.lastCursor = null;
        this.state = {
            setFixCursor: value => {
                if (value === null) {
                    this.divRef.current.classList.toggle('hidden', true);
                } else {
                    if (this.lastCursor) {
                        this.divRef.current.classList.remove(this.lastCursor);
                    }
                    value = 'cursor-' + value;
                    this.divRef.current.classList.toggle(value, true);
                    this.lastCursor = value;
                    this.divRef.current.classList.toggle('hidden', false);
                }
            }
        };
    }

    render() {
        return (
            <>
                <div className="hidden fix-overlay" ref={this.divRef}></div>
                <CursorContext.Provider value={this.state}>
                    {this.props.children}
                </CursorContext.Provider>
            </>
        )
    }
}

function FiltersSelector(props) {
    const context = useContext(GlobalContext);
    const [bgColor, setBgColor] = useState(props.bgColor ? props.bgColor : '#000000');
    const [previewIndex, setPreviewIndex] = useState(0);
    const filterDefinitions = context.filters.getFilters();
    const allFilters = useMemo(() => {
        const keys = Object.keys(filterDefinitions).sort();
        const items = [];
        for (let key of keys) {
            const item = {
                name: key
            };
            const filterDefinition = filterDefinitions[key];
            for (let def of filterDefinition.paramDefs) {
                item[def.key] = def.default;
            }
            items.push({name: key, item});
        }
        return items;
    }, []);

    const [active, setActive] = useState(0);
    const assignedFilters = [];
    const filterExpressions = props.filters.split('|');
    for (let expr of filterExpressions) {
        if (expr === '') {
            continue;
        }
        let name = expr;
        let item = {};
        if (expr.indexOf('(') !== -1 && expr.endsWith(')')) {
            const parts = expr.split('(', 2);
            name = parts[0];
            const values = parts[1].substr(0, parts[1].length - 1).split(',');
            const params = filterDefinitions[name].params;
            for (let i = 0; i < params.length; i++) {
                params[i](values[i], item);
            }
        }
        assignedFilters.push({name, ...item});
    }
    const previewRef = useRef(null);
    const [filters, setFilters] = useState(assignedFilters);

    useEffect(() => {
        if (!previewRef.current || !props.canvas) {
            return;
        }
        const ctx = previewRef.current.getContext('2d');
        const baseCanvas = Array.isArray(props.canvas) ? props.canvas[previewIndex].canvas : props.canvas;
        const width = baseCanvas.width;
        const height = baseCanvas.height;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        const currFilters = getFilterString();

        let filteredCanvas = baseCanvas;
        if (currFilters) {
            const transformed =
                context.filters.getCanvasWithFiltersApplied(
                    currFilters,
                    {elem: baseCanvas, ctx: baseCanvas.getContext('2d')}, 0, 0, width, height);
            filteredCanvas = transformed[0].elem;
        }
        ctx.drawImage(filteredCanvas, 0, 0, filteredCanvas.width, filteredCanvas.height);
    });

    let preview = null;
    if (props.canvas) {
        let imageCtrl = '';
        let previewCanvas = props.canvas;
        if (Array.isArray(props.canvas)) {
            const options = [];
            for (let i = 0; i < props.canvas.length; i++) {
                options.push({id: i, name: props.canvas[i].name});
            }
            if (options.length > 1) {
                imageCtrl = <Select options={options} value={previewIndex} buttons set={setPreviewIndex} />;
            }
            previewCanvas = props.canvas[0].canvas;
        }
        preview =
            <Stack vertical border fullHeight>
                <Toolbar>
                    <Content padded>Preview:</Content>
                    {imageCtrl}
                    {props.bgChange && <Color value={bgColor} set={setBgColor} />}
                </Toolbar>
                <Content scroll fullHeight><Centered><canvas className="thin-boxed" ref={previewRef} width={previewCanvas.width} height={previewCanvas.height} /></Centered></Content>
            </Stack>;
    }

    const getItemProperties = (index) => {
        const item = filters[index];
        const paramDefs = filterDefinitions[item.name].paramDefs;
        const inputs = [];
        for (let def of paramDefs) {
            switch(def.type) {
                case 2:
                    const colorValue = rgb2hex(item[def.key]);
                    inputs.push(
                        <ColorProp
                            name={def.key + ':'}
                            key={def.key}
                            value={colorValue}
                            set={(value) => {
                                const newFilters = [...filters];
                                newFilters[active][def.key] = value;
                                setFilters(newFilters);
                            }}
                        />
                    );
                    break;

                case 1:
                    inputs.push(
                        <RangeProp
                            key={def.key}
                            name={def.key + ':'}
                            min={def.min}
                            max={def.max}
                            step={def.step}
                            value={item[def.key]}
                            set={value => {
                                const newFilters = [...filters];
                                newFilters[active][def.key] = value;
                                setFilters(newFilters);
                            }}
                        />
                    );
                    break;

                case 4:
                    inputs.push(
                        <IntProp
                            key={def.key}
                            name={def.key + ':'}
                            buttons
                            set={
                                (value) => {
                                    const newFilters = [...filters];
                                    newFilters[active][def.key] = value;
                                    setFilters(newFilters);
                                }
                            }
                            value={item[def.key]}
                        />
                    );
                    break;

                default:
                    d('???', def);
                    break;
            }
        }
        return (
            <PropertyGrid>
                {inputs}
            </PropertyGrid>
        );
    };

    const getFilterString = () => {
        const values = [];
        for (let filter of filters) {
            let expr = filter.name;
            const paramDefs = filterDefinitions[filter.name].paramDefs;
            if (paramDefs.length > 0) {
                expr += '(';
                const params = [];
                for (let def of paramDefs) {
                    const rawValue = filter[def.key];
                    params.push(def.type === 2 ? rgb2hex(rawValue) : rawValue);
                }
                expr += params.join(',') + ')';
            }
            values.push(expr);
        }
        return values.join('|');
    };

    const currFilters = getFilterString();

    return (
        <Stack vertical border>
            <Stack fullHeight border>
                <ItemsStack
                    empty="Assign filters from the left side"
                    assignable={allFilters}
                    active={active}
                    setActive={setActive}
                    items={filters}
                    setItems={setFilters}
                    getProperties={getItemProperties}
                    getName={(item) => item.name}
                    ordered
                />
                {preview}
            </Stack>
            <Content padded>
                <Stack>
                    <button disabled={currFilters === props.filters} onClick={() => {
                        props.save(currFilters);
                    }}>Save</button>
                    <button onClick={props.cancel}>Cancel</button>
                </Stack>
            </Content>
        </Stack>
    )
}

function UndoRedoButtons() {
    const eContext = useContext(EditorContext);

    const undoAttr = {
        onClick: () => {
            eContext.undoAction()
        }
    };
    if (!eContext.hasPast()) {
        undoAttr.disabled = 'disabled'
    }
    const redoAttr = {
        onClick: () => {
            eContext.redoAction();
        }
    };
    if (!eContext.hasFuture()) {
        redoAttr.disabled = 'disabled'
    }
    return (
        <div>
            <button {...undoAttr}>Undo</button>
            <button {...redoAttr}>Redo</button>
        </div>

    )
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

const useAddIndexActions = (entityIndex, actions, result = []) => {
    const eContext = useContext(EditorContext);
    const context = useContext(GlobalContext);

    for (let action of actions) {
        switch(action) {
            case 'delete':
                result.push({
                    name: 'Delete',
                    doAction: indices => {
                        const undoItems = entityIndex.getEntityObjects(indices);
                        eContext.doAction(
                            () => {entityIndex.deleteEntities(indices)},
                            () => entityIndex.setEntityObjects(undoItems)
                        );
                    }
                });
                break;

            case 'swap':
                result.push({
                    name: 'Swap',
                    doAction: indices => {
                        const first = indices[0];
                        const second = indices[1];
                        const firstBitmap = entityIndex.getEntityPropValue(first, 'image');
                        const secondBitmap = entityIndex.getEntityPropValue(second, 'image');
                        eContext.doAction(
                            () => {
                                entityIndex.setEntityPropValue(first, 'image', secondBitmap);
                                entityIndex.setEntityPropValue(second, 'image', firstBitmap);
                            },
                            () => {
                                entityIndex.setEntityPropValue(first, 'image', firstBitmap);
                                entityIndex.setEntityPropValue(second, 'image', secondBitmap);
                            }
                        );
                    },
                    isHidden: props => props.marked.length !== 2
                });
                break;

            case 'clear':
                result.push({
                    name: 'Clear',
                    doAction: indices => {
                        const emptyBitmap = getEmptyImageData(entityIndex.getSizeX(), entityIndex.getSizeY());
                        const undoTiles = {};
                        for (let index of indices) {
                            undoTiles[index] = entityIndex.getEntityPropValue(index, 'image');
                        }
                        eContext.doAction(
                            () => {
                                for (let index of indices) {
                                    entityIndex.setEntityPropValue(index, 'image', emptyBitmap);
                                }
                            },
                            () => {
                                for (let [index, bitmap] of Object.entries(undoTiles)) {
                                    entityIndex.setEntityPropValue(index, 'image', bitmap);
                                }
                            }
                        );
                    },
                });
                break;

            case 'copy':
                result.push({
                    name: 'Copy',
                    doAction: indices => {
                        const bitmap = entityIndex.getEntityPropValue(indices[0], 'image');
                        const selection = new CellSelection('bitmap', [[bitmap]]);
                        eContext.setSelection(selection);
                    },
                    isHidden: props => props.marked.length !== 1
                });
                break;

            case 'paste':
                result.push({
                    name: 'Paste',
                    doAction: indices => {
                        const undoObjects = entityIndex.getEntityObjects(indices);
                        const pasteBitmap = eContext.selection.getCell();
                        eContext.doAction(
                            () => {
                                for (let index of indices) {
                                    entityIndex.setEntityPropValue(index, 'image', pasteBitmap);
                                }
                            },
                            () => {
                                entityIndex.setEntityObjects(undoObjects, true);
                            }
                        );
                    },
                    isHidden: () => {
                        if (!eContext.selection || !eContext.selection.isBitmap()) {
                            return true;
                        }
                        const cell = eContext.selection.getCell();
                        return (cell.width !== entityIndex.getSizeX() || cell.height !== entityIndex.getSizeY());
                    }
                });
                break;

            case 'apply':
                // TODO
                break;

            default:
                console.error(`No definition found for index action "${action}"!`);
        }
    }
    return result;
};

function SaveAndCancel({save, close, padded, canSave = true, children}) {
    return (
        <Stack vertical border>
            <Content  padded={padded}>{children}</Content>
            <Content padded>
                <Button disabled={!canSave} click={save}>OK</Button>
                <Button click={close}>Cancel</Button>
            </Content>
        </Stack>
    );
}

function DurationToggler({frame}) {
    const update = useComponentUpdate();
    return (
        <Stack>
            <Content>Duration: </Content>
            <Content>
                <Int buttons min={1} value={frame.duration} set={duration => {frame.duration = duration; update()}} />
            </Content>
        </Stack>
    );
}

function FrameManager({frameIndex, fixSize, width, height}) {
    const eContext = useContext(EditorContext);

    const NewFrameModal = useModal();
    const actions = useAddIndexActions(frameIndex, ['delete']);

    const addFrame = () => {
        NewFrameModal.open({
            select: index => {
                const sprite = frameIndex.index.getEntityValue(index);
                let undoIndex = null;
                eContext.doAction(
                    () => {
                        undoIndex = frameIndex.setEntityObject({value: {id: sprite, duration: 1, padding: {x: 0, y: 0}}});
                    },
                    () => {
                        frameIndex.deleteEntity(undoIndex);
                    }
                );
                NewFrameModal.close();
            }
        });
    };

    return (
        <>
            <EntityManager
                entityIndex={frameIndex}
                actions={actions}
                undoRedo
                titleHeight={20}
                bottomHeight={20}
                minWidth={100}
                filter
                maxedZoom
                newItem={addFrame}
                empty="No sprites defined. Add new one"
                renderTitle={index => {
                    const name = frameIndex.getEntityValue(index).id;
                    return <Title maxWidth={100}>#{index + 1} {name}</Title>
                }}
                renderBottom={index => {
                    const value = frameIndex.getEntityValue(index);
                    return (
                        <DurationToggler frame={value} />
                    )
                }}
            />

            <NewFrameModal.content name="Pick Sprite for frame" closeable width={600} height={500}>
                <EditorCtx>
                    <EntityPicker
                        filter
                        editorId="frameSprite"
                        base={
                            fixSize ? null :
                                index => (
                                    frameIndex.index.getEntityPropValue(index, 'width') === width &&
                                    frameIndex.index.getEntityPropValue(index, 'height') === height
                                )
                        }
                        entityIndex={frameIndex.index}
                        controls
                        {...NewFrameModal.props}
                    />
                </EditorCtx>
            </NewFrameModal.content>
        </>
    )
}

function AnimationForm({animation, spriteIndex, save, close, isValid}) {
    const update = useComponentUpdate();

    const animationIndex = useMemo(
        () => {
            const animationIndex = new AnimationIndex(spriteIndex, {animations: []});
            animationIndex.setEntityObject({...animation, index: 0});
            animationIndex.addListener(update);
            return animationIndex
        },
        [animation]
    );

    const width = animation.sizeX;
    const height = animation.sizeY;
    const frameIndex = useMemo(
        () => {
            return new FrameIndex(animation, spriteIndex, width, height)
        },
        [animation]
    );

    const name = animationIndex.getEntityValue(0);
    const canSave = () => name !== '' && isValid(name);

    return (
        <>
            <Stack vertical border fullHeight>
                <Content>
                    <AnimationProps canSave={canSave} animationIndex={animationIndex} />
                </Content>
                <Stack border flex>
                    <Content flex>
                        <EditorCtx>
                            <FrameManager fixSize={animationIndex.fixSize} width={width} height={height} frameIndex={frameIndex} />
                        </EditorCtx>
                    </Content>
                    <PreviewAnimation animationIndex={animationIndex} frameIndex={frameIndex} spriteIndex={spriteIndex} />
                </Stack>
                <Content padded>
                    <Stack>
                        <button disabled={!canSave()} onClick={e => save({
                            ...animationIndex.getEntityObject(0),
                            frames: [...frameIndex.getPropValues('value')]
                        })}>OK</button>
                        <button onClick={e => close()}>Cancel</button>
                    </Stack>
                </Content>
            </Stack>
        </>
    )
}

function AnimationFormNew({save, close, isValid, ...props}) {
    const [name, setName] = useState(props.name);
    const [width, setWidth] = useState(props.width);
    const [height, setHeight] = useState(props.height);

    const canSave = () => name !== '' && isValid(name);

    return (
        <Stack vertical border>
            <Content padded>
                <PropertyGrid>
                    <TextFieldProp invalid={!canSave()} name="Name" value={name} set={setName} />
                    <DimProp name="Size" x={width} setX={setWidth} y={height} setY={setHeight} min={1} max={32} buttons />
                </PropertyGrid>
            </Content>
            <Content padded>
                <Stack>
                    <button disabled={!canSave()} onClick={e => save({
                        value: name,
                        frames: [],
                        end: 0,
                        dir: 0,
                        synchronous: true,
                        sizeX: width,
                        sizeY: height
                    })}>OK</button>
                    <button onClick={e => close()}>Cancel</button>
                </Stack>
            </Content>
        </Stack>
    )
}

function AnimationProps({animationIndex, canSave}) {
    const animation = animationIndex.getEntityObject(0);
    const dirOptions = {
        0: 'Forward',
        1: 'Backward',
        2: 'Forward Backward',
        3: 'Backward Forward'
    };
    const endOptions = {
        0: 'Loop',
        1: 'Stop',
        2: 'Destroy'
    };
    const setProp = (prop, value) => {
        animationIndex.setEntityPropValue(0, prop, value);
    };

    return (
        <Content padded>
            <PropertyGrid>
                <TextFieldProp invalid={!canSave()} name="Name" value={animation.value} set={value => animationIndex.setEntityObject({...animationIndex.getEntityObject(0), value}, true)} />
                <RadioProp name="Direction" options={dirOptions} value={animation.dir} set={value => setProp( 'dir', parseInt('' + value, 10))}  />
                <RadioProp name="End" options={endOptions} value={animation.end} set={value => setProp( 'end', parseInt('' + value, 10))}  />
                <CheckboxProp name="Synchronous" value={animation.synchronous} set={value => setProp( 'synchronous', value)} />
            </PropertyGrid>
        </Content>
    )
}

function PlayerCanvas({player, width, height, spriteIndex}) {
    const context = useContext(GlobalContext);

    const update = useComponentUpdate();
    const mounted = useMounted();
    const lastRef = useRef(null);
    const lastPlayer = useRef(null);
    lastPlayer.current = player;

    useEffect(() => {
        const level = context.getModalLevel();

        const run = () => {
            lastRef.current = requestAnimationFrame(() => {
                if (lastPlayer.current !== player && !mounted.current) {
                    return;
                }
                if (!(player.isPaused() || level !== context.getModalLevel())) {
                    if (player.hasEnded()) {
                        player.reset();
                    } else {
                        player.nextStep();
                    }
                    if (player.isDirty()) {
                        update();
                    }
                }
                run();
            })
        };
        run();

        return () => {
            if (lastRef.current) {
                cancelAnimationFrame(lastRef.current);
            }
        }
    }, [player]);

    return (
        <Canvas width={width} height={height} render={ctx => {

            const frame = lastPlayer.current.getFrame();
            if (!frame) {
                return;
            }
            spriteIndex.drawEntity(ctx, spriteIndex.getEntityByPropValue('value', frame.id) , 0, 0, {width, height});
        }} />
    )
}

function PreviewAnimation({frameIndex, animationIndex}) {
    useUpdateOnEntityIndexChanges(frameIndex);

    const [stopped, setStopped] = useState(false);
    const [speed, setSpeed] = useState(0.1);

    const player = new BitmapPlayer();
    const frames = frameIndex.getPropValues('value');
    const dir = animationIndex.getEntityPropValue(0, 'dir');
    const end = animationIndex.getEntityPropValue(0, 'end');
    player.loadAnimation(frames, end, dir);
    player.setSpeed(speed);

    if (stopped) {
        player.pause();
    }

    const toggleStopped = () => {
        setStopped(!stopped)
    };

    return (
        <Section name="Preview">
            <Content>
                <Stack vertical>
                    <Centered flex>
                        <PlayerCanvas height={200} width={200} spriteIndex={animationIndex.index} player={player} />
                    </Centered>
                    <Content padded>
                        <Stack align="center">
                            <ActionBox click={toggleStopped} material>{stopped ? 'play_arrow' : 'stop'}</ActionBox>
                        </Stack>
                    </Content>
                    <Content padded><Range value={speed} set={value => setSpeed(value)} min={0.0} max={2.0} /></Content>
                </Stack>
            </Content>
        </Section>
    );
}

function AnimationManager({animationIndex, spriteIndex}) {
    const eContext = useContext(EditorContext);

    const NewAnimationModal = useModal();
    const EditAnimationModal = useModal();

    const actions = [];
    const addAnimation = () => {
        NewAnimationModal.open({
            name: '',
            width: animationIndex.fixSize ? animationIndex.getSizeX() : 16,
            height: animationIndex.fixSize ? animationIndex.getSizeY() : 16,
            isValid: value => !animationIndex.hasPropValue('value', value),
            save: newAnimation => {
                let index = null;
                eContext.doAction(
                    () => {
                        index = animationIndex.setEntityObject({...newAnimation});
                    },
                    () => {
                        animationIndex.deleteEntity(index);
                    }
                );
                NewAnimationModal.close();
            }
        });
    };

    const editAnimation = index => {
        const animation = animationIndex.getEntityObject(index);
        EditAnimationModal.open({
            name: animationIndex.getEntityValue(index),
            spriteIndex,
            animation,
            isValid: value => animation.value === value || !animationIndex.hasPropValue('value', value),
            save: newAnimation => {
                eContext.doAction(
                    () => {
                        animationIndex.setEntityObject({...newAnimation, index}, true);
                    },
                    () => {
                        animationIndex.setEntityObject(animation, true);
                    }
                );
                EditAnimationModal.close();
            }
        });
    };

    return (
        <>
            <EntityManager
                entityIndex={animationIndex}
                actions={actions}
                titleHeight={20}
                bottomHeight={20}
                minWidth={100}
                filter
                player
                maxedZoom
                newItem={addAnimation}
                empty="No animations defined. Add new one"
                doubleClick={editAnimation}
                renderTitle={index => {
                    const name = animationIndex.getEntityValue(index);
                    return <Title maxWidth={100}>{name}</Title>
                }}
                renderBottom={index => {
                    const frames = animationIndex.getEntityPropValue(index, 'frames').length;
                    return <kbd className="less">Frames: {frames}</kbd>
                }}
            />

            <EditAnimationModal.content name="Edit Animation" closeable width="1200" height="500">
                <AnimationForm {...EditAnimationModal.props} />
            </EditAnimationModal.content>

            <NewAnimationModal.content name="New Animation" closeable fit>
                <AnimationFormNew {...NewAnimationModal.props} />
            </NewAnimationModal.content>
        </>
    )
}

export {
    CellGrid,
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
    TextAreaProp,
    Checkbox,
    CheckboxProp,
    Toolbar,
    Stack,
    Content,
    Canvas,
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
    Bitmap,
    BitmapProp,
    PositionPickerProp,
    Entity,
    EntityProp,
    Grid,
    DivGrid,
    Title,
    Scene3d,
    PropertyGrid,
    PropLabel,
    FullProp,
    ValueProp,
    Centered,
    Spacer,
    Button,
    ActionFrame,
    SwitchButton,
    FileDropZone,
    EntityManager,
    EntityPicker,
    EntityTextPicker,
    AnimationManager,
    GlobalContext,
    CursorContext,
    BackgroundContext,
    MouseOverlay,
    GlobalCtx,
    BackgroundCtx,
    useUpdates,
    useMounted,
    useModal,
    useResize,
    useDimProps,
    useKeyListener,
    useEntity,
    useUniqueIds,
    useAddIndexActions,
    useUniqueResourceId,
    useComponentUpdate,
    useUpdateOnEntityIndexChanges,
    FiltersSelector,
    BackgroundControl,
    SaveAndCancel,
    SideTabs,
    SideTab,
    PictureCell
}