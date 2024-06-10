// DndCellFrame.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

/*

    DndCellFrame's role is to detect a drop (and delegate to DndCradle), and present highlights in relation to potential 
    drop locations, and indicate whether the DragIcon or DisplaceIcon should be shown

*/

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
                ? 'copy'
                : null) 
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
                itemType:monitor.getItemType() as any
            }
        },
    })

    const 
        cellCanDropRef = useRef(false),

        sourceIndex = targetData.sourceItem?.index,
        sourceScrollerID = targetData.sourceItem?.scrollerID,

        isLocation = (scrollerID !== sourceScrollerID) 
            || (sourceIndex !== index) 
            || ((sourceIndex === index) 
                && (calculatedDropEffect == 'copy')),

        highlightClassname = 'rigs-target-highlight'

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

    const isNativeType = ['__NATIVE_FILE__','__NATIVE_URL__','__NATIVE_TEXT__'].includes(targetData.itemType)

    const showDndDisplaceIcon = 
        (isLocation
        && !isNativeType
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
            masterDndContext.dragContext.canDrop = canDoDrop;
            (!isNativeType) && masterDndContext.setDragBarState && masterDndContext.setDragBarState('updateicon')
        }

    }

    useEffect(()=>{

        updateDragLayerIcon()

    })

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