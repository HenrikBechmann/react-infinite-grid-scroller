// DndViewport.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    The role of DndViewport is to calculate whether DndScrollTabs should be shown (isOver && canDrop viewport)
    Obtain dnd targetConnector (viewportFrameElementRef.current) from Viewport

*/

import React, {useEffect, useContext, useRef, useState } from 'react'

import { useDrop, DropTargetMonitor} from 'react-dnd'

import { ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import { Viewport } from '../Viewport'

// HoC for DnD functionality
const DndViewport = (props) => {

    const [ dndViewportState, setDndViewportState] = useState('ready')

    const { scrollerID } = props

    const scrollerDndContext = useContext(ScrollerDndContext)

    const viewportFrameElementRef = useRef(null)

    const showScrollTabsRef = useRef(false)

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

        const viewportElement = viewportFrameElementRef.current

        if (targetData.isOver && targetData.canDrop) {
            viewportElement.classList.add('rigs-viewport-highlight')
            showScrollTabsRef.current = true
        } else {
            viewportElement.classList.remove('rigs-viewport-highlight')
            showScrollTabsRef.current = false
        }
        if (!targetData.isOver && targetData.canDrop) {
            viewportElement.classList.add('rigs-viewport-candrop')
        } else {
            viewportElement.classList.remove('rigs-viewport-candrop')
        }
        setDndViewportState('updatehighlight')

    },[targetData.isOver, targetData.canDrop])

    useEffect(()=>{

        targetConnector(viewportFrameElementRef.current)

    },[])

    useEffect(()=>{
        switch (dndViewportState) {
            case 'updatehighlight':{

                setDndViewportState('ready')
                break
            }
        }

    },[dndViewportState])

    const enhancedProps = {...props,viewportFrameElementRef, showScrollTabs:showScrollTabsRef.current}

    return <Viewport {...enhancedProps}/>

}

export default DndViewport