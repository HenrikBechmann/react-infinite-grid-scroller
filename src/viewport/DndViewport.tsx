// DndViewport.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useEffect, useContext, useRef, useState } from 'react'

import { useDrop, DropTargetMonitor} from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import { Viewport } from '../Viewport'

// HoC for DnD functionality
const DndViewport = (props) => {

    const [ dndViewportState, setDndViewportState] = useState('ready')
    const { scrollerID } = props
    const scrollerDndContext = useContext(ScrollerDndContext)

    const viewportElementRef = useRef(null)

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

    // console.log('isOver, canDrop',targetData.isOver, targetData.canDrop)

    useEffect(()=>{

        const viewportElement = viewportElementRef.current

        if (targetData.isOver && targetData.canDrop) {
            viewportElement.classList.add('rigs-viewport-highlight')
            showScrollTabsRef.current = true
            setDndViewportState('updatehighlight')
        } else {
            viewportElement.classList.remove('rigs-viewport-highlight')
            showScrollTabsRef.current = false
            setDndViewportState('updatehighlight')
        }

    },[targetData.isOver, targetData.canDrop])

    useEffect(()=>{

        targetConnector(viewportElementRef.current)

    },[])

    useEffect(()=>{
        switch (dndViewportState) {
            case 'updatehighlight':{

                setDndViewportState('ready')
                break
            }
        }

    },[dndViewportState])

    const enhancedProps = {...props,viewportElementRef, showScrollTabs:showScrollTabsRef.current}

    return <Viewport {...enhancedProps}/>

}

export default DndViewport