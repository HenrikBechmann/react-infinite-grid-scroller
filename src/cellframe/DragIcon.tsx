// DragIcon.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {
    useRef, 
    useEffect, 
    useContext,
} from 'react'

import type { CSSProperties } from 'react'

import { 
    useDrag, 
    DragSourceMonitor, 
} from 'react-dnd'

import { getEmptyImage } from 'react-dnd-html5-backend'

import { ViewportContext } from '../Viewport'

import { ScrollerDndContext } from '../InfiniteGridScroller'

import dragicon from "../../assets/drag_indicator_FILL0_wght400_GRAD0_opsz24.png"
// drag starts here
const DragIcon = props => {

    const { itemID, index, profile, contentholderRef, scrollerID} = props

    let { masterDndContext } = props

    const scrollerDndContext = useContext(ScrollerDndContext)

    masterDndContext = masterDndContext ?? {} 

    const {dragData} = masterDndContext || {}

    let {dndDragIconStyles, dndOptions} = props

    dndDragIconStyles = dndDragIconStyles ?? {}
    dndOptions = dndOptions ?? {}

    const [ sourceData, sourceConnector, previewConnector ] = useDrag(() => {

        return {
            type:(dndOptions.type || 'Cell'), // must be defined

            item:{ 
                scrollerID,
                itemID, 
                index,
                profile,
            },

        collect: (monitor:DragSourceMonitor) => {

            return {
                item:monitor.getItem(),
                isDragging:!!monitor.isDragging(),
            }

        },

        end:(item, monitor)=>{

            // console.log('DragIcon: endDrag item', item)

        },

        // canDrag:true,

    }},[itemID, dndOptions])

    const 
        { isDragging } = sourceData,
        classname = 'rigs-source-highlight'

    if (isDragging && !dragData.isDragging) {
        Object.assign(dragData,
            {
                isDragging,
                scrollerID,
                itemID,
                index,
                dndOptions,
                sourceCacheAPI:scrollerDndContext.cacheAPI,
                sourceStateHandler:scrollerDndContext.stateHandler,
                sourceServiceHandler:scrollerDndContext.serviceHandler,
            }
        )
        masterDndContext.setViewportState('startdragbar')
    }

    // TODO: use element.classList instead
    if (isDragging && !contentholderRef.current.classList.contains(classname)) {
        contentholderRef.current.classList.add(classname)
    }
    if (!isDragging && contentholderRef.current.classList.contains(classname)) {
        contentholderRef.current.classList.remove(classname)
    }

    useEffect(()=>{

        previewConnector(getEmptyImage(),{ captureDraggingState: true })

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

        <img style = {iconstylesRef.current} src={dragicon} />

    </div>
}

export default DragIcon