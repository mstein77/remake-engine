import React, {useMemo, useState} from "react";
import {FilterIndex} from "../classes/EntityIndex";
import {
    ButtonStack, Canvas,
    CenterInfo,
    OkCancelForm,
    PropertyGrid,
    Section, Toolbar,
    useUpdateOnEntityIndexChanges
} from "./BasicComponents";
import { d, rgb2hex, getCanvasForBitmap } from "../helper/helper";
import {ColorProp} from "./BaseComponents";
import {Color, InputProp, Number, NumberProp} from "./FormComponents";
import {Block, Stack} from "./LayoutComponents";
import {EntityStackSections} from "./EntityComponents";

function NameDialog({ close, save, max, reserved = [], ...props }) {
    const [name, setName] = useState(props.name || '');
    const matching = props.match ? props.match : () => true;
    const match = value => !reserved.includes(value) && matching(value);
    return (
        <OkCancelForm full="h" submit padded cancel={close} save={() => save(name)}>
            <Block full="h" padded>
                <PropertyGrid full="h">
                    <InputProp full="h" autoFocus name="Name:" value={name} set={setName} match={match} max={max} required />
                </PropertyGrid>
            </Block>
        </OkCancelForm>
    )
}

function FiltersModal({ save, close, model, images, filters = '', type = 'canvas', ...props }) {
    const [zoom, setZoom] = useState(1);
    const [background, setBackground] = useState(props.background ? props.background :'#000000');

    const [index, setIndex] = useState(0);
    const inputData = useMemo(() => {
        const data = [];
        for (let image of images) {
            if (type === 'imageData') {
                data.push(getCanvasForBitmap(image));
            } else {
                data.push(image);
            }
        }
        return data
    }, [images]);

    const currImage = inputData[index];

    const filterDefinitions = useMemo(() => {
        return {
            "clear-y": {
                "type": 0,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 4,
                        "key": "pixels",
                        "default": 0
                    }
                ],
                "params": [
                    null
                ]
            },
            "flip-x": {
                "type": 0,
                "minParams": 0,
                "paramDefs": [],
                "params": []
            },
            "flip-y": {
                "type": 0,
                "minParams": 0,
                "paramDefs": [],
                "params": []
            },
            "flip-xy": {
                "type": 0,
                "minParams": 0,
                "paramDefs": [],
                "params": []
            },
            "shift-y": {
                "type": 0,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 4,
                        "key": "pixels",
                        "default": 0
                    }
                ],
                "params": [
                    null
                ]
            },
            "shift-x": {
                "type": 0,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 4,
                        "key": "pixels",
                        "default": 0
                    }
                ],
                "params": [
                    null
                ]
            },
            "monochrome": {
                "type": 1,
                "minParams": 1,
                "paramDefs": [
                    {
                        "type": 2,
                        "key": "color",
                        "default": "#ffffff"
                    }
                ],
                "params": [
                    null
                ]
            },
            "opacity": {
                "type": 1,
                "minParams": 1,
                "paramDefs": [
                    {
                        "key": "opacity",
                        "type": 1,
                        "min": 0,
                        "max": 1,
                        "default": 1
                    }
                ],
                "params": [
                    null
                ]
            },
            "color-replace": {
                "type": 1,
                "minParams": 1,
                "paramDefs": [
                    {
                        "key": "replace",
                        "type": 3
                    }
                ],
                "params": [
                    null
                ]
            }
        }
    });

    const filterIndex = useMemo(() => {
        const index =  new FilterIndex(model);
        const filterExpressions = filters.split('|');
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
//                    params[i](values[i], item);
                    // TODO: validation?
                    item[name] = values[i];
                }
            }
            index.setEntityObject({value: name, params: { ...item }});
        }
        return index;
    }, [model]);

    const [activeFilter, setActiveFilter] = useState(filterIndex.getLength() ? 0 : null);

    useUpdateOnEntityIndexChanges(filterIndex);

    const render = ctx => {
        ctx.drawImage(
            currImage,
            0,
            0,
            currImage.width,
            currImage.height,
            0,
            0,
            currImage.width * zoom,
            currImage.height * zoom
        );
    };

    const addFilter = value => {
        const defs = filterDefinitions[value].paramDefs;
        const params = {};
        for (let param of defs) {
            params[param.key] = param.default;
        }
        filterIndex.setEntityObject({value, params});
        setActiveFilter(filterIndex.getLength() - 1);
    };

    const getItemProperties = () => {
        const params = (activeFilter === null || activeFilter === undefined) ? null : filterIndex.getEntityPropValue(activeFilter, 'params');
        if (!params) {
            return (
                <CenterInfo>No filter selected</CenterInfo>
            )
        }
        const paramDefs = filterDefinitions[filterIndex.getEntityValue(activeFilter)].paramDefs;
        const inputs = [];
        for (let def of paramDefs) {
            switch(def.type) {
                case 2:
                    const colorValue = rgb2hex(params[def.key]);
                    inputs.push(
                        <ColorProp
                            name={def.key + ':'}
                            key={def.key}
                            value={colorValue}
                            set={value => {
                                const newParams = { ...params, [def.key]: value };
                                filterIndex.setEntityPropValue(activeFilter, 'params', newParams);
                                filterIndex.notify()
                            }}
                        />
                    );
                    break;

                case 1:
                    inputs.push(
                        <NumberProp
                            key={def.key}
                            slider="h"
                            name={def.key + ':'}
                            min={def.min}
                            max={def.max}
                            decimals={2}
                            step={def.step}
                            value={params[def.key]}
                            set={value => {
                                const newParams = { ...params, [def.key]: value };
                                filterIndex.setEntityPropValue(activeFilter, 'params', newParams);
                                filterIndex.notify()
                            }}
                        />
                    );
                    break;

                case 4:
                    inputs.push(
                        <NumberProp
                            key={def.key}
                            name={def.key + ':'}
                            set={
                                value => {
                                    const newParams = { ...params, [def.key]: value };
                                    filterIndex.setEntityPropValue(activeFilter, 'params', newParams);
                                    filterIndex.notify()
                                }
                            }
                            value={params[def.key]}
                        />
                    );
                    break;

                default:
                    d('???', def);
                    break;
            }
        }
        return (
            <Block padded full="h">
                <PropertyGrid>
                    {inputs}
                </PropertyGrid>
            </Block>
        );
    };

    const saveFilters = () => {
        const assigned = filterIndex.getEntityObjects();
        const values = [];
        for (let filter of assigned) {
            let expr = filter.value;
            const paramDefs = filterDefinitions[expr].paramDefs;
            if (paramDefs.length > 0) {
                expr += '(';
                const params = [];
                for (let def of paramDefs) {
                    const rawValue = filter.params[def.key];
                    params.push(def.type === 2 ? rgb2hex(rawValue) : rawValue);
                }
                expr += params.join(',') + ')';
            }
            values.push(expr);
        }
        save(values.join('|'));
    };

    return (
        <OkCancelForm full save={saveFilters} cancel={close}>
            <Stack full>
                <Section inner full="v" inner collapse="h" size={170} name="Filters">
                    <ButtonStack items={Object.keys(filterDefinitions).sort()} onClick={addFilter} />
                </Section>
                <EntityStackSections
                    sectionProps={{inner: true, name: 'Pipeline', size: 170, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    detailProps={{inner: true, name: 'Filter Properties', size: 200, maxWidth: '33%', collapse: 'h', full: 'v'}}
                    entityIndex={filterIndex}
                    clone del order
                    emptyText="Add new filter from the left side"
                    active={activeFilter} setActive={setActiveFilter}
                >
                    {getItemProperties()}
                </EntityStackSections>
                <Section inner full name="Preview">
                    <Stack vertical full>
                        <Toolbar>
                            <Number name="Zoom:" value={zoom} set={setZoom} min={1} max={9} />
                            <Color name="Background:" value={background} set={setBackground} />
                        </Toolbar>
                        <Block full centerItems>
                            <Canvas
                                width={currImage.width * zoom}
                                height={currImage.height * zoom}
                                render={render}
                            />
                        </Block>
                    </Stack>
                </Section>
            </Stack>
        </OkCancelForm>
    )
}

export {
    FiltersModal,
    NameDialog
}