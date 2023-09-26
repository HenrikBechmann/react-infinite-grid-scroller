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

    // console.log('isOver, canDrop',targetData.isOver, targetData.canDrop)

    useEffect(()=>{

        const viewportElement = viewportElementRef.current

        if (targetData.isOver && targetData.canDrop) {
            viewportElement.classList.add('rigs-viewport-highlight')
        } else {
            viewportElement.classList.remove('rigs-viewport-highlight')
        }

    },[targetData.isOver, targetData.canDrop])

    useEffect(()=>{

        targetConnector(viewportElementRef.current)

    },[])

    const enhancedProps = {...props,viewportElementRef}

    return <Viewport {...enhancedProps}/>

}

export default DndViewport