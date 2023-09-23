// DndDragBar.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {

    useState, 
    useRef, 
    useEffect, 
    // useLayoutEffect, 
    // useMemo, 
    // useCallback,
    useContext,
    CSSProperties,

} from 'react'

import { 
    // useDrag, 
    useDragLayer, 
    // useDrop, 
    // DragSourceMonitor, 
    DragLayerMonitor, 
    // DropTargetMonitor
} from 'react-dnd'

import { MasterDndContext, GenericObject } from '../InfiniteGridScroller'

import moveicon from "../../assets/move_item_FILL0_wght400_GRAD0_opsz24.png"
import copyicon from "../../assets/content_copy_FILL0_wght400_GRAD0_opsz24.png"
import dragicon from "../../assets/drag_indicator_FILL0_wght400_GRAD0_opsz24.png"
import dropicon from "../../assets/task_alt_FILL0_wght400_GRAD0_opsz24.png"
import nodropicon from "../../assets/block_FILL0_wght400_GRAD0_opsz24.png"

// drag continues here
const DndDragBar = (props) => {

    const [dragState, setDragBarState] = useState('ready')

    const 
        masterDndContext = useContext(MasterDndContext),
        canDrop = masterDndContext.dragData.canDrop,
        {itemID, index, dndOptions, dragData, scrollerID} = props,

        dragText = dndOptions.dragText || `Dragging itemID ${itemID}, index ${index}`

    if ((scrollerID == masterDndContext.scrollerID) && !masterDndContext.setDragBarState) {

        masterDndContext.setDragBarState = setDragBarState
        
    }


    const dragBarData = useDragLayer(
        (monitor: DragLayerMonitor) => {
            return {
                isDragging: monitor.isDragging(),
                currentOffset: monitor.getSourceClientOffset(),
                item: monitor.getItem()
            }
        })

    const {isDragging, currentOffset, item} = dragBarData

    if (!isDragging && dragData.isDragging) {
        dragData.isDragging = false
        dragData.itemID = null
        dragData.index = null
        dragData.dndOptions = {} as GenericObject
    }


    const candropicon = 
        canDrop?
            dropicon:
            nodropicon

    useEffect (()=>{

        switch (dragState) {
            case 'updateicon':
                setDragBarState('ready')
        }

    },[dragState])

    // static
    const dragiconholderstylesRef = useRef<CSSProperties>(
        {
            float:'left',
            top:0,
            left:0,
            border:'gray solid 1px',
            borderRadius:'5px',
            margin:'3px',
        })

    // static
    const modeiconholderstylesRef = useRef<CSSProperties>(
        {
            position:'absolute',
            bottom:'-12px',
            opacity:'!important 1',
            right:0,
            backgroundColor:'whitesmoke',
            border:'gray solid 1px',
            borderRadius:'3px',
            padding:'2px',
            margin:'3px',
            height:'20px',
            width:'20px'
        })

    // static
    const candropiconholderstylesRef = useRef<CSSProperties>(
        {
            position:'absolute',
            top:'-12px',
            opacity:'!important 1',
            right:0,
            backgroundColor:'whitesmoke',
            border:'gray solid 1px',
            borderRadius:'3px',
            padding:'2px',
            margin:'3px',
            height:'20px',
            width:'20px'
        })

    // static
    const iconstylesRef = useRef<CSSProperties>(
        {
            opacity:0.75
        })

    // dynamic
    let dragbarstyles
    if (isDragging) {dragbarstyles = 
        {
            zIndex:10,
            position: 'fixed',
            top: 0,
            left: 0,
            transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
            pointerEvents: 'none', 
            paddingRight: '20px', // avoid icons
            backgroundColor:'whitesmoke',
            width: '200px',
            fontSize:'.75em',
            border: '1px solid black',
            borderRadius:'5px',
        } as CSSProperties}

    return (isDragging && currentOffset
        ?<div data-type = 'dragbar' style={dragbarstyles}>

            <div style = {candropiconholderstylesRef.current}>
                <img style = {iconstylesRef.current} src={candropicon} />
            </div>

            <div style = {dragiconholderstylesRef.current}>
                <img style = {iconstylesRef.current} src={dragicon} />
            </div>

                {dragText}
                
            <div style = {modeiconholderstylesRef.current}>
                <img style = {iconstylesRef.current} src={moveicon} />
            </div>
        </div>

        : null

    )

}
export default DndDragBar
