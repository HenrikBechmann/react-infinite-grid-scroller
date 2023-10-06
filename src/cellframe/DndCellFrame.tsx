// DndCellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {
    useRef, 
    useEffect, 
    useContext,
} from 'react'

import { 
    useDrop, 
    DropTargetMonitor
} from 'react-dnd'

import { CellFrame } from '../CellFrame'
import { CradleContext } from '../Cradle'
import { MasterDndContext, ScrollerDndContext } from '../InfiniteGridScroller'

// HoC for DnD functionality; requires targetConnector
const DndCellFrame = (props) => {

    const 
        {itemID, index} = props,
        cradleContext = useContext(CradleContext),
        masterDndContext = useContext(MasterDndContext),
        scrollerDndContext = useContext(ScrollerDndContext),
        { scrollerPropertiesRef } = cradleContext,
        { orientation, scrollerID, virtualListProps} = scrollerPropertiesRef.current,
        {crosscount } = virtualListProps,

        frameRef = useRef(null)

    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept,
        drop:(item, monitor) => {
            return {
                dataType:'cellframe',
                target:{
                    scrollerID,
                    itemID,
                    index,
                }
            }
        },
        collect:(monitor:DropTargetMonitor) => {
            return {
                sourceItem:monitor.getItem() as any,
                isOver:monitor.isOver(),
                canDrop:monitor.canDrop(),
            }
        },
    })

    const cellCanDropRef = useRef(false)

    const 
        sourceIndex = targetData.sourceItem?.index,
        sourceScrollerID = targetData.sourceItem?.scrollerID,

        isLocation = (scrollerID !== sourceScrollerID) || (sourceIndex !== index),

        highlightClassname = 'rigs-target-highlight'

    if (isLocation && targetData.isOver && targetData.canDrop && !frameRef.current?.classList.contains(highlightClassname)) {

        cellCanDropRef.current = true
        frameRef.current.classList.add(highlightClassname)
        masterDndContext.dropCount++

    } else if (isLocation && !targetData.isOver && frameRef.current?.classList.contains(highlightClassname)) {

        masterDndContext.dropCount--
        frameRef.current.classList.remove(highlightClassname)
        cellCanDropRef.current = false

    }

    const showDirectionIcon = (isLocation && targetData.isOver && targetData.canDrop)

    useEffect(()=>{

        return () => {
            
            if (cellCanDropRef.current) masterDndContext.dropCount--

            updateDragLayerIcon()

        }

    },[])

    const updateDragLayerIcon = () => {

        const canDoDrop = !!masterDndContext.dropCount

        if (masterDndContext.dragData.canDrop !== canDoDrop) {
            masterDndContext.dragData.canDrop = canDoDrop
            masterDndContext.setDragBarState && masterDndContext.setDragBarState('updateicon')
        }

    }

    updateDragLayerIcon()

    const isDndRef = useRef(true)

    useEffect (() => {

        const isDnd = (masterDndContext.installed && 
            (masterDndContext.enabled || scrollerDndContext.dndOptions.enabled))

        if (isDndRef.current !== isDnd) {
            isDndRef.current = isDnd
        }

    },[masterDndContext.installed, masterDndContext.enabled, scrollerDndContext.dndOptions.enabled])

    const enhancedProps = {...props, isDnd:isDndRef.current, targetConnector, frameRef, masterDndContext, showDirectionIcon  }

    return <CellFrame {...enhancedProps}/>

}

export default DndCellFrame