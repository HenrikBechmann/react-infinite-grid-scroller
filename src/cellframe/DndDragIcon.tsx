// DndDragIcon.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

/*

    The role of DradIcon is to show the user where to start dragging, and to initiate the drag process.
    Once started, the source CellFrame content is highlighted

*/

import React, {
    useRef, 
    useEffect, 
    useContext,
    useMemo,
} from 'react'

import type { CSSProperties } from 'react'

import { 
    useDrag, 
    DragSourceMonitor, 
} from 'react-dnd'

import { getEmptyImage } from 'react-dnd-html5-backend'

import { MasterDndContext, ScrollerDndContext } from '../InfiniteGridScroller'

import dragicon from "../../assets/drag_indicator_FILL0_wght400_GRAD0_opsz24.png"
// drag starts here
const DndDragIcon = props => {

    const { 
        itemID, 
        index, 
        profile, 
        contentHolderElementRef, 
        scrollerID, 
        setDndCellFrameState
    } = props
    let 
        {
            dndDragIconStyles, // user styles
            dndOptions
        } = props

    const 
        scrollerDndContext = useContext(ScrollerDndContext),
        masterDndContext = useContext(MasterDndContext),
        { dragContext } = masterDndContext || {}

    dndDragIconStyles = dndDragIconStyles ?? {}
    dndOptions = dndOptions ?? {}

    const dropEffect = scrollerDndContext.dndOptions?.dropEffect

    const options = useMemo(()=>{

        const computedOptions = 
            dropEffect
                ? {dropEffect}
                : {} // must be no property: undefined existing dropEffect property value interpreted as 'copy' on Chrome Mac

        return computedOptions

    },[dropEffect])

    // preview connector is neutralized in favout of a custom DragLayer (see DndDragBar)
    // sourceConnector is connected to the dragicon div below
    const [ sourceData, sourceConnector, previewConnector ] = useDrag(() => {

        return {

            type:(dndOptions.type || '-x-x-x-'), // must be defined

            options,

            item:{ 
                scrollerID,
                index,
                itemID,
                profile,
                dndOptions,
                dropEffect:options.dropEffect,
            },

            collect: (monitor:DragSourceMonitor) => {
                return {
                    isDragging:!!monitor.isDragging(),
                }
            },

        }
    },[itemID, dndOptions, options])

    const 
        { isDragging } = sourceData,
        classname = 'rigs-source-highlight'

    if (isDragging && !dragContext.isDragging) {
        Object.assign(dragContext,
            {
                isDragging,
                scrollerID,
                itemID,
                index,
                dndOptions,
                scrollerDndOptions:scrollerDndContext.dndOptions,
                scrollerProfile:scrollerDndContext.profile,
                sourceCacheAPI:scrollerDndContext.cacheAPI,
                sourceStateHandler:scrollerDndContext.stateHandler,
                sourceServiceHandler:scrollerDndContext.serviceHandler,
                setDndCellFrameState,

            }
        )
        masterDndContext.prescribedDropEffect = options.dropEffect
        masterDndContext.setRigsDndState('startdragbar')
    }

    if (isDragging && !contentHolderElementRef.current.classList.contains(classname)) {
        contentHolderElementRef.current.classList.add(classname)
    }
    if (!isDragging && contentHolderElementRef.current.classList.contains(classname)) {
        contentHolderElementRef.current.classList.remove(classname)
    }

    useEffect(()=>{

        previewConnector(getEmptyImage(),{ captureDraggingState: true })

        return () => {
            masterDndContext.dragContext.setDndCellFrameState = null
        }

    },[])

    const iconstylesRef = useRef<CSSProperties>(
        {
            margin:'3px',
            opacity:0.6
        })

    const dragiconstylesRef = useRef<CSSProperties>(
        {...{
            position:'absolute',
            zIndex:'3',
            top:0,
            left:0,
            opacity:0.8,
            height:'32px',
            width:'32px',
        },...dndDragIconStyles})

    return <div data-type = 'dragicon' ref = { sourceConnector } style = {dragiconstylesRef.current}>

        <img draggable = {false} style = {iconstylesRef.current} src={dragicon} />

    </div>
}

    // return <div data-type = 'dragicon' ref = { sourceConnector } style = {dragiconstylesRef.current}>

    //     <img draggable = {false} style = {iconstylesRef.current} src={dragicon} />

    // </div>

export default DndDragIcon
