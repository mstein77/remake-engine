import React, {Component, useState} from "react";
import ReactDOM from 'react-dom';
import './components/base.css';

function Canvas(props) {
    const style = {border: '1px solid gray', backgroundColor: 'black'};
    return (
        <canvas width={props.width} height={props.height} style={style}></canvas>
    );
}

class AutoCanvas extends React.Component {

    constructor(props) {
        super(props);
        this.divRef = React.createRef();
        this.canvasRef = React.createRef();
        this.state = {
            width: null,
            height: null
        };
    }

    render() {
        const canvas = (this.state.width && this.state.height) ?
            <div className="rel-canvas"><canvas ref={this.canvasRef} width={this.state.width} height={this.state.height} /></div> : '';

        return(
            <div ref={this.divRef} className="full-v stack-h centered items-centered">
                {canvas}
            </div>
        );
    }

    updateSize() {
        const sizes = this.props.getCanvasSizeForDim(this.divRef.current.offsetWidth, this.divRef.current.offsetHeight);
        this.setState(
            {width: sizes.width, height: sizes.height}
        );
        this.props.setViewDim(sizes.cellsX, sizes.cellsY);
    }

    getSnapshotBeforeUpdate() {
        return this.props.getCanvasSizeForDim(this.divRef.current.offsetWidth, this.divRef.current.offsetHeight);
    }

    componentDidUpdate(a, b, snapshot) {
        if (snapshot !== null) {
            if (snapshot.width !== this.state.width || snapshot.height !== this.state.height) {
                this.updateSize();
                return;
            }
        }
        this.props.redrawCanvas(this.canvasRef.current);
    }

    componentDidMount() {
        this.updateSize();
        const resizeObserver = new ResizeObserver(entries => {
            this.updateSize();
        });
        resizeObserver.observe(this.divRef.current);
    }
}

function Stack(props) {
    const dir = (props.dir === 'x') ? 'h' : 'v';
    const cls = ['stack-' + dir];
    cls.push('inner-' + (props.border ? 'border' : 'space') + '-' + dir);
    if (props.full) {
        cls.push('full-v');
    }
    if (props.center) {
        cls.push('items-centered');
    }

    return (
        <div className={cls.join(' ')}>
            {props.children}
        </div>
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

function Toolbar(props) {
    return (
        <div className="toolbar-div">
            {props.children}
        </div>
    );
}

function IntField(props) {
    const attr = {};
    if (props.readOnly) {
        attr.readOnly = 'readOnly';
    }
    if (props.size) {
        attr.size = props.size;
    }

    const value = props.value !== undefined ? props.value : 0;
    attr.value = value;
    attr.type = 'text';
    attr.onChange = (e) => {
        props.set(e.target.value);
    };

    const incValue = () => {
        props.set(parseInt(value, 10) + 1);
    };

    const decValue = () => {
        props.set(parseInt(value, 10) - 1);
    };

    let buttonPrev = '';
    let buttonNext = '';
    if (props.buttons) {
        const nextAttr = {
            onClick: incValue
        };
        if (props.max !== undefined && parseInt(value, 10) >= parseInt(props.max, 10)) {
            nextAttr.disabled = 'disabled';
        }
        const prevAttr = {
            onClick: decValue
        };
        if (props.min !== undefined && parseInt(value, 10) <= parseInt(props.min, 10)) {
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

    return (
        <React.Fragment>
            <div>{props.name}</div>
            <div className="stack-h items-centered">
                {buttonPrev}
                <input {...attr} />
                {buttonNext}
            </div>
        </React.Fragment>
    );
}

function Int(props) {
    return (
        <Stack dir="x">
            <IntField {...props} />
        </Stack>
    );
}

function Dim(props) {
    const maxX = props.max !== undefined ? props.max : props.maxX;
    const maxY = props.max !== undefined ? props.max : props.maxY;
    const minX = props.min !== undefined ? props.min : props.minX;
    const minY = props.min !== undefined ? props.min : props.minY;
    const sizeX = props.size !== undefined ? props.size : props.sizeX;
    const sizeY = props.size !== undefined ? props.size : props.sizeY;

    const xAttr = {
        name: props.name,
        value: props.x,
        min: minX,
        max: maxX,
        size: sizeX,
        set: props.setX,
        readOnly: props.readOnly,
        buttons: props.buttons
    };
    const yAttr = {
        name: 'x',
        value: props.y,
        min: minY,
        max: maxY,
        size: sizeY,
        set: props.setY,
        readOnly: props.readOnly,
        buttons: props.buttons
    };

    return (
        <Stack dir="x" center>
            <IntField {...xAttr} />
            <IntField {...yAttr} />
        </Stack>
    );
}

function Tab(props) {
    return (
        <React.Fragment>{props.children}</React.Fragment>
    );
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

    return (
        <div className={cls.join(' ')}>
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

class Section extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            collapsed: false,
            collapse: (props.collapse && ['h', 'v'].indexOf(props.collapse) !== -1 ? props.collapse : null)
        };
        this.toggleCollapse = this.toggleCollapse.bind(this);
    }

    toggleCollapse(e) {
        this.setState({collapsed: !this.state.collapsed});
    };

    render() {
        const props = this.props;
        const cls = [
            'section-div boxed stack-v inner-border-v'
        ];
        if (props.flex) {
            cls.push('flex');
        }
        if (this.state.collapsed && props.collapse !== null) {
            cls.push('collapsed-' + props.collapse);
        }

        const actions = [];
        if (props.collapse) {
            const icon = this.state.collapsed ? 'call_made' : 'call_received';
            actions.push(<div key="collapse-h" className="action-box action-collapse-h" onClick={this.toggleCollapse}><i className="material-icons md-18">{icon}</i></div>);
            if (!this.state.collapsed) {
                // additional actions
            }
        }
        const actionsDiv = actions.length > 0 ?
            <div className="section-actions stack-h inner-space-h">{actions}</div> : '';

        const contentDiv = this.state.collapsed ?
            '' :
            <div className="content-area flex">
                {props.children}
            </div>;

        const titleCls = [
            'title-area-active stack-h inner-space-h items-centered'
        ];
        if (!(this.state.collapsed && props.collapse === 'h')) {
            titleCls.push('padded');
        }

        const nameCls = ['flex'];
        if (this.state.collapsed && props.collapse === 'h') {
            nameCls.push('text-v');
        }

        return (
            <div className={cls.join(' ')}>
                <div className={titleCls.join(' ')}>
                    <div className={nameCls.join(' ')}>{props.name}</div>
                    {actionsDiv}
                </div>
                {contentDiv}
            </div>
        );
    }
}

function closeModals(e) {
    ReactDOM.unmountComponentAtNode(document.getElementById('modals-container'));
}

function Modal(props) {

    const cls = [
        'modal-centered stack-v boxed inner-border-v'
    ];

    const modal = <div className={cls.join(' ')}>
        <div className="title-area-active padded stack-h inner-space-h">
            <div className="flex">{props.name}</div>
            <div className="action-box" onClick={(e) => {
                closeModals();
                e.stopPropagation();
            }}><i className="material-icons md-18">close</i></div>
        </div>
        <div className="content-area flex">{props.children}</div>
    </div>;

    if (props.closeable) {
        return (<div className="modal-click-area" onClick={(e) => {
            let target = e.target;
            while(target.classList !== undefined) {
                if (target.classList.contains('modal-centered')) {
                   return;
                }
                target = target.parentNode;
            }
            closeModals();
        }}>{modal}</div>);
    }

    return modal;
}

class MyApp extends Component {
    constructor(props) {
        super(props);
        this.openModal = this.openModal.bind(this);
    }

    openModal() {
        ReactDOM.render(<Modal name="My shiny first modal" closeable>
            <div className="padded">Here we go again...</div>
        </Modal>, document.getElementById('modals-container'));
    }

    render() {
        return (
            <Stack dir="y" full>
                <Stack dir="x" full>
                    <Section name="First and Last of us" collapse="h">
                        <div className="padded">
                            <Tabs reverse vertical xcloseCallback={(no) => {console.log(no)}}>
                                <Tab name="Tiles">
                                    <div className="padded">Here is Jericho!</div>
                                </Tab>
                                <Tab name="Brushes">Canansnasnasan</Tab>
                                <Tab name="Aliases">
                                    <div className="padded">Thailand rulez!</div>
                                </Tab>
                            </Tabs>
                        </div>
                    </Section>

                    <Section name="Second" flex>
                        <MapRaster size={32} zoom={1} border={1} cellsX={18} cellsY={10} />
                    </Section>

                    <Section name="Third" collapse="h">
                        <div className="padded">
                            <TabAccordion active={2}>
                                <Tab name="What the fuck?">Hey Chewie</Tab>
                                <Tab name="There it is">Guess who</Tab>
                                <Tab name="Bimmer"><div className="padded">Fuck you!</div></Tab>
                            </TabAccordion>
                        </div>
                    </Section>
                </Stack>


                <Section name="Fourth" collapse="v">
                    <div className="padded">
                        <button onClick={this.openModal}>Please open my modal!</button>
                    </div>
                </Section>
            </Stack>
        )
    }
}

function Raster(props) {

    const zoom = props.zoom || 1;
    const border = props.border || 0;
    const padding = props.padding || 0;
    const cellSize = zoom * props.size + border;

    const cellsX = props.cellsX || null;
    const cellsY = props.cellsY || null;

    const getCanvasSizeForDim = (width, height) => {
        // border + zoom
        const spaceX = width - (padding * 2) - border;
        const spaceY = height - (padding * 2) - border;

        let maxX = Math.floor(spaceX / cellSize);
        if (cellsX !== null) {
            maxX = Math.min(maxX, cellsX);
        }
        let maxY = Math.floor(spaceY / cellSize);

        if (cellsY !== null) {
            maxY = Math.min(maxY, cellsY);
        }
        return {
            width: maxX * cellSize + border,
            height: maxY * cellSize + border,
            cellsX: maxX,
            cellsY: maxY
        }
    };

    const drawRaster = (canvas) => {
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const spaceX = canvas.width - border;
        const spaceY = canvas.height - border;
        const cellsX = spaceX / cellSize;
        const cellsY = spaceY / cellSize;

        ctx.fillStyle = '#FFFFFF';

        let pos = 0;
        for (let x = 0; x <= cellsX; x++) {
            ctx.fillRect(pos, 0, border, canvas.height);
            pos += cellSize;
        }
        pos = 0;
        for (let y = 0; y <= cellsY; y++) {
            ctx.fillRect(0, pos, canvas.width, border);
            pos += cellSize;
        }
    };

    return (
        <AutoCanvas setViewDim={props.setViewDim} getCanvasSizeForDim={getCanvasSizeForDim} redrawCanvas={drawRaster} />
    );
}

function MapRaster(props) {
    const [zoom, setZoom] = useState(props.zoom || 1);
    const [border, setBorder] = useState(props.border || 0);
    const [cellsX, setCellsX] = useState(props.cellsX !== undefined ? props.cellsX : null);
    const [cellsY, setCellsY] = useState(props.cellsY !== undefined ? props.cellsY : null);
    const [viewX, setViewX] = useState(props.viewX !== undefined ? props.viewX : cellsX);
    const [viewY, setViewY] = useState(props.viewY !== undefined ? props.viewY : cellsY);

    const setViewDim = (cellsX, cellsY) => {
        setViewX(cellsX);
        setViewY(cellsY);
    };

    const sliderY = viewY < cellsY ? <div className="full-v"><input type="range" orient="vertical" className="full-v" /></div> : '';
    const sliderX = viewX < cellsX ? <div className="full-h"><input type="range" className="full-h" /></div> : '';

    return (
        <Stack dir="y" full border>
            <Toolbar>
                <Dim name="Size:" buttons x={cellsX} setX={setCellsX} y={cellsY} setY={setCellsY} size="3" min="1" readOnly />
                <Int name="Zoom:" readOnly min="1" max="3" set={setZoom} value={zoom} size="1" buttons />
                <Int name="Border:" readOnly min="0" max="5" set={setBorder} value={border} size="1" buttons />
            </Toolbar>
            <div className="padded flex">
                <div className="grid-3x3 full-v">
                    <div></div>
                    <div>
                        <Stack dir="x" center>
                            <button>-</button><button>+</button>
                        </Stack>
                    </div>
                    <div></div>

                    <div>
                        <Stack dir="x" center full>
                            <div><button>-</button><br /><button>+</button></div>
                        </Stack>
                    </div>
                    <Raster setViewDim={setViewDim} size={props.size} cellsX={cellsX} cellsY={cellsY} border={border} zoom={zoom} />
                    <div>
                        <Stack dir="x" center full>
                            <div><button>-</button><br /><button>+</button></div>
                            {sliderY}
                        </Stack>
                    </div>

                    <div></div>
                    <div>
                        <Stack dir="y" center>
                            <div><button>-</button><button>+</button></div>
                            {sliderX}
                        </Stack>
                    </div>
                    <div></div>
                </div>
            </div>
        </Stack>
    );
}


ReactDOM.render(<MyApp/>, document.getElementById('root'));

export default MyApp;