import React, {Component} from "react";
import "./App.css";

import "./Grid.css";
import "./IntToggler.css";

class Grid extends Component{

    constructor(props) {
        super(props);
        const viewCols = this.props.columns;
        const viewRows = this.props.rows;
        if (this.props.wrap === true) {
            this.props.cellProvider.setWrap(viewCols);
        }
        const cols = this.props.cellProvider.getColumns();
        const rows = this.props.cellProvider.getRows();
        this.state = {
            raster: props.raster,
            size: this.props.cellProvider.getCellSize(),
            zoom: this.props.zoom !== undefined ? this.props.zoom : 1,
            markerX: null,
            markerY: null,
            offX: 0,
            offY: 0,
            width: 0,
            mode: this.props.mode !== undefined ? this.props.mode : 'overwrite',
            fixed: this.props.cellProvider.isFixed(),
            maxX: Math.max(cols - viewCols, 0),
            maxY: Math.max(rows - viewRows, 0),
            cols: cols,
            rows: rows
        };
        this.clickStatus = null;


        this.trackMouse = function (e) {
            let target = e.target;
            while (!target.classList.contains('grid-overlay')) {
                target = target.parentElement;
            }

            const rect = target.getBoundingClientRect();

            const offset = {
                x: this.getRasterPosForOffset(e.clientX - rect.left, this.props.columns - 1),
                y: this.getRasterPosForOffset(e.clientY - rect.top, this.props.rows - 1)
            };

            if ((this.state.markerX !== offset.x) || (this.state.markerY !== offset.y)) {
                this.setState({
                    markerX: offset.x,
                    markerY: offset.y
                });
                if (this.props.markerCallback !== undefined) {
                    const obj = this.props.cellProvider.getCellInfo(this.state.offX + offset.x, this.state.offY + offset.y);
                    this.props.markerCallback(obj);
                }
                if (this.clickStatus === 'overwrite') {
                    const selected = this.props.selection.get();
                    this.props.cellProvider.setCellValue(offset.x, offset.y, selected);
                    this.renderCanvas();

                }
            }
        };

        this.mouseUp = function (e) {
            this.clickStatus = null;
        };

        this.mouseClick = function (e) {
            if (this.state.markerX === null || this.state.markerY === null) {
                return;
            }
            if (this.state.mode === 'overwrite') {
                const selected = this.props.selection.get();
                this.props.cellProvider.setCellValue(this.state.offX + this.state.markerX, this.state.offY + this.state.markerY, selected);
                this.renderCanvas();
                this.clickStatus = 'overwrite';
            } else if (this.state.mode === 'select') {
                const selected = this.props.cellProvider.getCellInfo(this.state.offX + this.state.markerX, this.state.offY + this.state.markerY);
                this.props.selection.set(selected);
            }
        };

        this.updateOffsetX = (value) => {
            const newValue = this.state.offX + value;
            this.setOffsetX(newValue);
        };

        this.setOffsetX = (newValue) => {
            if (newValue < 0) {
                return;
            } else if (newValue <= this.state.maxX) {
                this.setState({
                    offX: newValue
                });
            }
        };

        this.setOffsetY = (newValue) => {
            if (newValue < 0) {
                return;
            } else if (newValue <= this.state.maxY) {
                this.setState({
                    offY: newValue
                });
            }
        };

        this.updateOffsetY = (value) => {
            const newValue = this.state.offY + value;
            if (newValue < 0) {
                return;
            } else if (newValue <= this.state.maxY) {
                this.setState({
                    offY: newValue
                });
            }
        };

        this.updateRaster = (value) => {
            const newValue = this.state.raster + value;
            if (newValue < 0) {
                return;
            }
            this.updateSize({
                raster: newValue
            });
        };

        this.updateZoom = (value) => {
            const newValue = this.state.zoom + value;
            if (newValue < 1) {
                return;
            }
            this.updateSize({
                zoom: newValue
            });
        };
    }

    renderCanvas() {
        const ctx = this.ctx;
        const rasterColor = [150, 150, 150, 255];
        const lineWidth = this.state.width;
        const cellProvider = this.props.cellProvider;
        const cellSize = this.state.size;
        const that = this;

        function setColor(data, pos, color) {
            data[pos] = color[0];
            data[pos + 1] = color[1];
            data[pos + 2] = color[2];
            data[pos + 3] = color[3]
        }

        function putCellImage(target, targetPos, x, y, zoom) {
            const cellImage = cellProvider.getCellImageData(that.state.offX + x, that.state.offY + y);
            if (cellImage === null) {
                return;
            }
            let sourceStart = 0;
            for(let y = 0; y < cellImage.height; y++) {

                for (let w = 0; w < zoom; w++) {
                    let sourcePos = sourceStart;
                    let pos = targetPos;
                    for(let x = 0; x < cellImage.width; x++) {
                        for (let z = 0; z < zoom; z++) {
                            target.data[pos] = cellImage.data[sourcePos];
                            target.data[pos + 1] = cellImage.data[sourcePos + 1];
                            target.data[pos + 2] = cellImage.data[sourcePos + 2];
                            target.data[pos + 3] = cellImage.data[sourcePos + 3];
                            pos += 4;
                        }
                        sourcePos += 4;
                    }
                    targetPos += lineWidth << 2;
                }
                sourceStart += cellImage.width << 2;
            }
        }

        ctx.clearRect(0,0, this.state.width, this.state.height);

        const cellDist = this.state.zoom * this.state.size + this.state.raster;

        if (this.state.raster > 0) {
            ctx.fillStyle = 'rgb(' + rasterColor[0] + ',' + rasterColor[1] + ',' + rasterColor[2] + ')';

            let pos = 0;
            while (pos < this.state.height) {
                ctx.fillRect(0, pos, this.state.width, this.state.raster);
                pos += cellDist;
            }

            pos = 0;
            while (pos < this.state.width) {
                ctx.fillRect(pos, 0, this.state.raster, this.state.height);
                pos += cellDist;
            }
        }

        const renderData = ctx.getImageData(0, 0, this.state.width, this.state.height);
        let startX = this.state.raster << 2;
        let startY = startX;
        let pos = 0;
        pos += startY * this.state.width;
        pos += startX;
        for (let y = 0; y < this.props.rows; y++) {
            let linePos = pos;
            for (let x = 0; x < this.props.columns; x++) {
                putCellImage(renderData, linePos, x, y, this.state.zoom);
                linePos += cellDist << 2;
            }
            pos += (cellDist * this.state.width) << 2;
        }
        ctx.putImageData(renderData, 0, 0);
    }

    componentDidMount() {
        this.ctx = this.refs.canvas.getContext('2d');
        this.updateSize();
    }

    componentDidUpdate() {
        this.renderCanvas();
    }

    updateSize(add = {}) {
        const raster = (add.raster !== undefined) ? add.raster : this.state.raster;
        const zoom = (add.zoom !== undefined) ? add.zoom : this.state.zoom;
        const columns = (add.cols !== undefined) ? add.cols : this.state.cols;
        const rows = (add.rows !== undefined) ? add.rows : this.state.rows;
        const newProps = Object.assign({
            width: this.props.columns * this.state.size * zoom + (this.props.columns + 1) * raster,
            height: this.props.rows * this.state.size * zoom + (this.props.rows + 1) * raster,
            maxX: Math.max(0, columns - this.props.columns),
            maxY: Math.max(0, rows - this.props.rows)
        }, add);
        this.setState(newProps);
    }

    appendRows(value) {
        this.props.cellProvider.appendRows(value);
        this.updateSize({rows: this.props.cellProvider.getRows()});
        if (value > 0) {
            this.setState({
                offY: this.state.maxY + value
            });
        }
    }

    deleteRows(value) {
        this.props.cellProvider.deleteRows(value);
        this.updateSize({rows: this.props.cellProvider.getRows()});
    }

    appendColumns(value) {
        this.props.cellProvider.appendColumns(value);
        const cols = this.props.cellProvider.getColumns();
        this.updateSize({cols});
        if (value > 0) {
            if (this.props.columns < cols) {
                this.setState({
                    offX: this.state.maxX + value
                });
            }
        }
    }

    deleteColumns(value) {
        this.props.cellProvider.deleteColumns(value);
        this.updateSize({cols: this.props.cellProvider.getColumns()});
    }

    getRasterPosForOffset(value, max) {
        if (value < this.state.raster) {
            return null;
        }
        const pos = Math.floor((value - this.state.raster) / (this.state.zoom * this.state.size + this.state.raster));
        if (pos < 0 || pos > max) {
            return null;
        }
        return pos;
    }

    render() {
        const posX = this.state.maxX > 0 ? <IntToggler name="X" value={this.state.offX} max={this.state.maxX} update={this.updateOffsetX} /> : '';
        const posY = this.state.maxY > 0 ? <IntToggler name="Y" value={this.state.offY} max={this.state.maxY} update={this.updateOffsetY} /> : '';
        const sliderX = this.state.maxX > 0 ? <Slider max={this.state.maxX} value={this.state.offX} min={0} update={this.setOffsetX} /> : '';
        const sliderY = this.state.maxY > 0 ? <Slider vertical={true} max={this.state.maxY} value={this.state.offY} min={0} update={this.setOffsetY} /> : '';

        const topBorder = !this.state.fixed && this.state.offY === 0 ? <div><button onClick={() => this.appendRows(-1)}>+</button><button onClick={() => this.deleteRows(-1)}>-</button></div> : <div></div>;
        const leftBorder = !this.state.fixed && this.state.offX === 0 ? <div><button onClick={() => this.appendColumns(-1)}>+</button> <button onClick={() => this.deleteColumns(-1)}>-</button></div> : <div></div>;
        const rightBorder = !this.state.fixed && this.state.offX === this.state.maxX ? <div className="grid-border-right"><button onClick={() => this.appendColumns(1)}>+</button> <button onClick={() => this.deleteColumns(1)}>-</button></div> : <div className="grid-border-right"></div>;
        const bottomBorder = !this.state.fixed && this.state.offY === this.state.maxY ? <div><button onClick={() => this.appendRows(1)}>+</button><button onClick={() => this.deleteRows(1)}>-</button></div> : <div></div>;

        const marker = (this.state.mode !== 'show' && this.state.markerY !== null && this.state.markerX !== null) ? <div className="grid-cell-marker" style={{
            width: this.state.size * this.state.zoom,
            height: this.state.size * this.state.zoom,
            top: this.state.raster + (this.state.size * this.state.zoom + this.state.raster) * this.state.markerY - 4,
            left: this.state.raster + (this.state.size * this.state.zoom + this.state.raster) * this.state.markerX - 4
        }}></div> : '';

        return(
            <div className="Grid">
                <div>
                    <div style={{display: 'flex'}}>
                        {posX}
                        {posY}
                        <div className="section"><div className="section-title">Size:</div> <div><kbd className="section-value">{this.state.cols} x {this.state.rows}</kbd></div></div>
                        <IntToggler name="Grid" max={9} value={this.state.raster} update={this.updateRaster} />
                        <IntToggler name="Zoom" max={16} value={this.state.zoom} update={this.updateZoom} />
                    </div>
                    <div className="grid-table" style={{maxWidth: (this.state.width + 75)}}>
                        <div>
                            <div></div>
                            {topBorder}
                            <div className="grid-border-right"></div>
                        </div>
                        <div>
                            {leftBorder}
                            <div className="grid-container" style={{height: this.state.height}}>
                                <canvas className="grid-canvas grid-overlay" width={this.state.width} height={this.state.height} ref="canvas"></canvas>
                                <div className="grid-overlay" style={{height: this.state.height, width: this.state.width}}
                                    onMouseMove={(e) => {this.trackMouse(e)}}
                                     onMouseLeave={(e) => {this.setState({markerX: null, markerY: null})}}
                                     onMouseDown={(e) => {this.mouseClick(e)}}
                                     onMouseUp={(e) => {this.mouseUp(e)}}
                                >
                                    {marker}
                                </div>
                            </div>
                            {rightBorder}
                            <div className="grid-slider-right">{sliderY}</div>
                        </div>
                        <div>
                            <div></div>
                            {bottomBorder}
                            <div className="grid-border-right"></div>
                        </div>
                        <div>
                            <div></div>
                            <div>{sliderX}</div>
                            <div className="grid-border-right"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

class IntToggler extends Component {

    constructor(props) {
        super(props);
        const max = '' + (this.props.max !== undefined ? this.props.max : 0);
        this.state = {
            max
        };
    }

    render() {
        return (
            <div className="IntToggler">
                <div className="section-title">{this.props.name}</div>
                <input type="text" readOnly={true} maxLength={this.props.max} value={this.props.value} className="section-value" />
                <div>
                    <button onClick={() => this.props.update(1)}>+</button>
                </div>
                <div>
                    <button onClick={() => this.props.update(-1)}>-</button>
                </div>
            </div>
        );
    }
}

class Slider extends Component {

    setValue(e) {
        const value = parseInt(e.target.value);
        this.props.update(value)
    }

    render() {
        const style = {};
        if (this.props.vertical === true) {
            style.transform = 'rotate(90deg)';
            style.transformOrigin = 'bottom right';
            style.height = '100%';
        } else {
            style.width = '100%';
        }

        return (
            <div className="slider">
                <input type="range" style={style} value={this.props.value} min={this.props.min} max={this.props.max} step="1" onChange={(e) => this.setValue(e)} />
            </div>
        );
    }
}

class Section extends Component {
    render() {
        const style = {};
        if (this.props.width !== undefined) {
            style.width = this.props.width;
            style.flexGrow = 0;
        } else {
            style.flexGrow = 1;
        }

        return (
            <div className="section-div" style={style}>
                <div>{this.props.name}</div>
                <div>
                    {this.props.children}
                </div>
            </div>
        );
    }
}

class MarkerInfoSection extends Component {

    render() {
        let indexInfo = '';
        let aliasInfo = '';
        let eventInfo = '';
        if (this.props.markerInfo !== null) {
            if (this.props.markerInfo.index !== undefined) {
                indexInfo = <li>Index: <b>{this.props.markerInfo.index}</b></li>
            }
            if (this.props.markerInfo.alias !== undefined) {
                aliasInfo = <li>Alias: <b>{this.props.markerInfo.alias}</b></li>
            }
            if (this.props.markerInfo.events !== undefined) {
                eventInfo = <li>Events: <ul>{this.props.markerInfo.events.map((elem, key) => <li key={key}>{elem}</li>)}</ul></li>
            }
        };

        return <Section name="Marker Info" width={200}>
            <Grid mode="show" columns={16} rows={16} raster={0}  zoom={8} fixed={true} cellProvider={this.props.cellProvider}></Grid>
            <ul>
                {indexInfo}
                {aliasInfo}
                {eventInfo}
            </ul>
        </Section>
    }
}

class EditorActionSection extends Component {

    render() {
        return (
            <Section name="Selection" width={200}>
                <Grid mode="show" columns={16} rows={16} raster={0}  zoom={8} fixed={true} cellProvider={this.props.cellProvider}></Grid>
                <button>Edit</button>
                <button onClick={() => this.props.exportMap()}>Export</button>
                <ul>
                    <li>Index: <b>{this.props.selectedInfo}</b></li>
                </ul>
            </Section>
        );
    }
}

class CellSelection {
    constructor(value) {
        if (this.value !== undefined) {
            this.value = value;
        }
        this.callback = null;
    }

    set(value) {
        this.value = value;
        if (this.callback !== null) {
            this.callback(value);
        }
    }
    setChangeCallback(callback) {
        this.callback = callback;
    }

    get() {
        if (this.value === undefined) {
            return null;
        }
        return this.value;
    }
}

class App extends Component{

    constructor(props) {
        super(props);
        this.state = {updates: 0, markerInfo: '', selectedInfo: ''};

        this.exportMap = () => {
            console.log(this.props.cellProvider[0].exportCells());
        };

        this.selection = new CellSelection(0);
        this.selection.setChangeCallback((info) => {
            this.props.cellProvider[3].setIndex(info.index !== undefined ? info.index : info);
            this.setState({
                selectedInfo: info
            });
        });

        this.updateMarkerInfo = (info) => {
            this.props.cellProvider[1].setIndex(info !== null && info.index !== undefined ? info.index : info);
            this.setState({
                markerInfo: info
            });
        };
    }

    render() {
        const mapGrid = <Grid mode="overwrite" selection={this.selection} columns={40} rows={13} raster={1} cellProvider={this.props.cellProvider[0]} markerCallback={this.updateMarkerInfo}></Grid>;
        return(
            <div className="App">
                <div style={{display: 'flex'}}>
                    <EditorActionSection exportMap={this.exportMap} selectedInfo={this.state.selectedInfo} selection={this.selection} cellProvider={this.props.cellProvider[3]} />
                    <Section name="Map">{mapGrid}</Section>
                    <MarkerInfoSection markerInfo={this.state.markerInfo} cellProvider={this.props.cellProvider[1]} />
                </div>
                <Grid mode="select" selection={this.selection} wrap={true} columns={40} rows={5} raster={1} cellProvider={this.props.cellProvider[2]} />
            </div>
        );
    }
}

export default App;