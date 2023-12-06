import React, {useContext, useMemo} from "react"
import { Block, Stack } from "../components/LayoutComponents"
import { CheckboxProp, TupleProp, NumberProp, SelectProp, PropSection } from "../components/FormComponents"
import { d } from "helper/helper"
import {Section, EditorSection, PropertyGrid, useComponentUpdate, EditorContext } from "../components/BasicComponents"
import { useExportModal } from "../components/EditorComponents"

function GameProps({ model, fieldProps, update }) {
    const eContext = useContext(EditorContext)
    const gpuOptions = []
    for (let value of fieldProps.gpu.values) {
        gpuOptions.push({id: value, name: value})
    }
    const orientationOptions = []
    for (let value of fieldProps.screenOrientation.values) {
        orientationOptions.push({id: value, name: value})
    }
    const propSetter = prop => value => {
        const old = model[prop]
        eContext.doAction(
            () => {
                model[prop] = value
                update()
            },
            () => {
                model[prop] = old
                update()
            }
        )
    }
    return (
        <Section inner name="Properties" full>
            <Block padded full="h" scroll>
                <PropertyGrid padded>
                    <PropSection name="Appearance" />

                    <TupleProp
                        name="Size" undo="position" x={model.width} y={model.height} min={fieldProps.dim.min} max={fieldProps.dim.max} setX={propSetter('width')} setY={propSetter('height')} />
                    <CheckboxProp
                        name="Pixelated" value={model.pixelated} set={propSetter('pixelated')} />
                    <SelectProp
                        name="GPU" value={model.gpu} options={gpuOptions} set={propSetter('gpu')} />
                    <SelectProp
                        name="Screen orientation" value={model.screenOrientation} options={orientationOptions} set={propSetter('screenOrientation')} />
                    <CheckboxProp
                        name="Show FPS" value={model.showFps} set={propSetter('showFps')} />
                    <CheckboxProp
                        name=" - by user" value={model.showFpsByUser} set={propSetter('showFpsByUser')} />

                    <PropSection name="Zoom" />

                    <NumberProp
                        name="Zoom" value={model.zoom} set={propSetter('zoom')} min={model.minZoom} max={model.maxZoom}  />
                    <NumberProp
                        name="Min zoom" value={model.minZoom} set={propSetter('minZoom')} min={fieldProps.zoom.min} max={fieldProps.zoom.max} />
                    <NumberProp
                        name="Max zoom" value={model.maxZoom} set={propSetter('maxZoom')} min={fieldProps.zoom.min} max={fieldProps.zoom.max} />
                    <CheckboxProp
                        name="Auto zoom" value={model.autoZoom} set={propSetter('autoZoom')} />
                    <CheckboxProp
                        name=" - by user" value={model.autoZoomByUser} set={propSetter('autoZoomByUser')} />
                    <CheckboxProp
                        name="Step zoom" value={model.stepZoom} set={propSetter('stepZoom')} />
                    <CheckboxProp
                        name=" - by user" value={model.stepZoomByUser} set={propSetter('stepZoomByUser')} />
                    <CheckboxProp
                        name="Restrict by window" value={model.restrictZoomByWindow} set={propSetter('restrictZoomByWindow')} />

                </PropertyGrid>
            </Block>
        </Section>
    )
}

function GamePropsEditor({ game, resource }) {
    const update = useComponentUpdate()
    const model = useMemo(
        () => {
            return game.gameProps.getClone()
        },
        [game.gameProps]
    )
    const { storeModel, deployModel, openExportModal, Modals } = useExportModal(
        { name: 'BackgroundPane', model, update, resource, screenResource: false })
    const fieldProps = useMemo(
        () => game.gameProps.config.getFieldProps(),
        [game]
    )
    return (
        <EditorSection
            id="gamePropsEditor" area={1} link={3} full name="Game"
            sub={model.id} warn={model.hasAutoId() ? `This pane has an automatically created ID. It's recommended to assign your own unique id to prevent problems with conflicting auto-generated IDs!` : ''}
            confirm

            actions={
                eContextRef => {
                    return {
                        revert: () => d('REVERT!'),
                        save: {
                            can: () => !eContextRef.current.hasStorePos(),
                            exec: () => storeModel(eContextRef)
                        },
                        deploy: {
                            can: () => !IS_DIST && eContextRef.current.hasStorePos(),
                            exec: () => deployModel()
                        },
                        export: () =>  openExportModal()
                    }
                }
            }>
            <GameProps update={update} model={model} fieldProps={fieldProps} />
            <Modals />
        </EditorSection>
    )
}

export {
    GamePropsEditor
}