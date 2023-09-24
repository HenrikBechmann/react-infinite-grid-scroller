// DndViewport.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useEffect, useContext, useRef } from 'react'

import { useDrop, DropTargetMonitor} from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import { Viewport } from '../Viewport'

// HoC for DnD functionality
const DndViewport = (props) => {

    const { scrollerID } = props
    const scrollerDndContext = useContext(ScrollerDndContext)

    const viewportElementRef = useRef(null)

    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['Cell'],
        collect:(monitor:DropTargetMonitor) => {
            return {
                isOver:monitor.isOver(),
                canDrop:monitor.canDrop(),
            }
        },

    })

    useEffect(()=>{

        // console.log('DndViewport targetData.isOver, scrollerID',targetData.isOver, scrollerID)

    },[targetData.isOver])

    useEffect(()=>{

        targetConnector(viewportElementRef.current)

    },[])

    const enhancedProps = {...props,viewportElementRef}

    return <Viewport {...enhancedProps}/>

}

export default DndViewport