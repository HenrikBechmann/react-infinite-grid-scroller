// DndCellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {
    useRef, 
    useEffect, 
    useContext,
    useState,
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
        [dndCellFrameState, setDndCellFrameState] = useState('ready'),

        { prescribedDropEffect:dropEffect } = masterDndContext,

        calculatedDropEffect = dropEffect 
            || (masterDndContext.altKey
                ?'copy'
                :null) 
            || 'move',

        { scrollerPropertiesRef } = cradleContext,
        { orientation, scrollerID, virtualListProps} = scrollerPropertiesRef.current,
        {crosscount } = virtualListProps,

        frameRef = useRef(null),

        contentHolderElementRef = useRef(null)

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

    // console.log('DndCellFrame canDrop',targetData.canDrop)

    const 
        cellCanDropRef = useRef(false),

        sourceIndex = targetData.sourceItem?.index,
        sourceScrollerID = targetData.sourceItem?.scrollerID,

        isLocation = (scrollerID !== sourceScrollerID) 
            || (sourceIndex !== index) 
            || ((sourceIndex === index) 
                && (calculatedDropEffect == 'copy')),

        highlightClassname = 'rigs-target-highlight'

    // console.log('DndCellFrame: index, isLocation, targetData.isOver, targetData.canDrop, calculatedDropEffect\n',
    //     index, isLocation, targetData.isOver, targetData.canDrop, calculatedDropEffect)

    if (isLocation 
        && targetData.isOver 
        && targetData.canDrop 
        && !contentHolderElementRef.current?.classList.contains(highlightClassname)) {

        cellCanDropRef.current = true
        contentHolderElementRef.current.classList.add(highlightClassname)
        masterDndContext.dropCount++

    } else if (!isLocation 
        && (sourceIndex === index) 
        && contentHolderElementRef.current?.classList.contains(highlightClassname)) {

        contentHolderElementRef.current.classList.remove(highlightClassname)
        masterDndContext.dropCount--

    } else if (isLocation 
        && !targetData.isOver 
        && contentHolderElementRef.current?.classList.contains(highlightClassname)) {

        masterDndContext.dropCount--
        contentHolderElementRef.current.classList.remove(highlightClassname)
        cellCanDropRef.current = false

    }

    const showDndDisplaceIcon = 
        (isLocation 
        && targetData.isOver 
        && targetData.canDrop)

    useEffect(()=>{

        targetConnector(frameRef.current)

        return () => {
            
            if (cellCanDropRef.current) masterDndContext.dropCount--

            updateDragLayerIcon()

        }

    },[])

    const updateDragLayerIcon = () => {

        const canDoDrop = !!masterDndContext.dropCount

        if (masterDndContext.dragContext.canDrop !== canDoDrop) {
            masterDndContext.dragContext.canDrop = canDoDrop
            masterDndContext.setDragBarState && masterDndContext.setDragBarState('updateicon')
        }

    }

    updateDragLayerIcon()

    const isDndEnabledRef = useRef(true)

    useEffect(() => {

        const isDndEnabled = scrollerDndContext.dndOptions.enabled

        if (isDndEnabledRef.current !== isDndEnabled) {
            isDndEnabledRef.current = isDndEnabled
        }

    },[masterDndContext.installed, masterDndContext.enabled, scrollerDndContext.dndOptions.enabled])

    useEffect(()=>{

        if (dndCellFrameState == 'refresh') {
            setDndCellFrameState('ready')
        }

    },[dndCellFrameState])

    const enhancedProps = {
        ...props, 
        isDndEnabled:isDndEnabledRef.current, 
        frameRef, 
        masterDndContext, 
        showDndDisplaceIcon, 
        setDndCellFrameState,
        contentHolderElementRef,
    }

    return <CellFrame {...enhancedProps}/>

}

export default DndCellFrame