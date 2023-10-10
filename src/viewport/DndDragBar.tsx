// DndDragBar.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    The role of DndDragBar is to show the user where the dragtarget is located
    and to reset masterDndContext.dragData if dragging stops

*/

import React, {

    useState, 
    useRef, 
    useEffect, 
    useContext,
    CSSProperties,
    KeyboardEvent,

} from 'react'

import { 
    useDragLayer, 
    DragLayerMonitor, 
} from 'react-dnd'

import { isMobile } from  '../InfiniteGridScroller/RigsDnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import dragicon from "../../assets/drag_indicator_FILL0_wght400_GRAD0_opsz24.png"
import dropicon from "../../assets/task_alt_FILL0_wght400_GRAD0_opsz24.png"
import nodropicon from "../../assets/block_FILL0_wght400_GRAD0_opsz24.png"
import moveicon from "../../assets/move_item_FILL0_wght400_GRAD0_opsz24.png"
import copyicon from "../../assets/content_copy_FILL0_wght400_GRAD0_opsz24.png"

// drag continues here
const DndDragBar = (props) => {

    const 
        { scrollerID} = props,
        masterDndContext = useContext(MasterDndContext),
        { dragData } = masterDndContext,
        { 
            canDrop,
            itemID,
            index,
            dndOptions,

        } = dragData,

        dragText = dndOptions.dragText || `Dragging itemID ${itemID}, index ${index}`,

        [dragState, setDragBarState] = useState('ready'),

        { computedDropEffect:dropEffect } = masterDndContext,

        currentDropEffect = dropEffect || (masterDndContext.altKey? 'copy': null) || 'move',

        dropEffectIcon = currentDropEffect == 'move'?moveicon:copyicon,

        altKeyRef = useRef(masterDndContext.altKey)

    const intervalIDRef = useRef(null)

    useEffect(()=>{

        if (isMobile) return

        intervalIDRef.current = setInterval(()=>{

            if (masterDndContext.altKey !== altKeyRef.current) {
                altKeyRef.current = masterDndContext.altKey
                setDragBarState('refresh')
            }

        },200)

        return () => {

            clearInterval(intervalIDRef.current)

        }

    },[])

    if ((scrollerID === masterDndContext.scrollerID) && !masterDndContext.setDragBarState) {

        masterDndContext.setDragBarState = setDragBarState
        
    }

    const dragBarData = useDragLayer(
        (monitor: DragLayerMonitor) => {
            return {
                isDragging: monitor.isDragging(),
                currentOffset: monitor.getSourceClientOffset(),
            }
        })

    const {isDragging, currentOffset} = dragBarData

    if (!isDragging && dragData.isDragging) {
        Object.assign(
            dragData,
            {
                isDragging:false,
                itemID:null,
                index:null,
                dndOptions:{} as GenericObject
            }
        )
    }

    const candropicon = 
        (canDrop || masterDndContext.onWhitespace)?
            dropicon:
            nodropicon

    useEffect (()=>{

        switch (dragState) {
            case 'refresh':
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
    if (isDragging) {
        dragbarstyles = {
            zIndex:10,
            position: 'fixed',
            top: 0,
            left: 0,
            transform:`translate(${currentOffset.x}px, ${currentOffset.y}px)`,
            pointerEvents: 'none', 
            paddingRight: '20px', // avoid icons
            backgroundColor:'whitesmoke',
            width: '200px',
            fontSize:'.75em',
            border: '1px solid black',
            borderRadius:'5px',
        } as CSSProperties
    }

    const handleKeyboardEvent = (e) => {

        if (masterDndContext.altKey !== e.altKey) masterDndContext.altKey = e.altKey
        // console.log('drag event altKey',e.altKey)

    };

    useEffect(()=>{

        if (isMobile) return

        // console.log('adding event listener')
        document.addEventListener('drag', handleKeyboardEvent)

        return () => {

            // console.log('removing event listener')
            document.removeEventListener('drag', handleKeyboardEvent)
            masterDndContext.altKey = null

        }

    },[])


    return (isDragging && currentOffset
        ?<div data-type = 'dragbar' onKeyDown={handleKeyboardEvent} style={dragbarstyles}>

            <div style = {candropiconholderstylesRef.current}>
                <img style = {iconstylesRef.current} src={candropicon} />
            </div>

            <div style = {dragiconholderstylesRef.current}>
                <img style = {iconstylesRef.current} src={dragicon} />
            </div>

                {dragText}
                
            <div style = {modeiconholderstylesRef.current}>
                <img style = {iconstylesRef.current} src={dropEffectIcon} />
            </div>
        </div>

        : null

    )

}
export default DndDragBar
