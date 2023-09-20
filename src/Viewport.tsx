// Viewport.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide viewport data to its children (Scrollblock and Cradle) through the
    ViewportContext object, and act as the visible screen portal of the list being shown.
    If Viewport is resized, it notifies the Cradle to reconfigure.
*/

import React, {

    useState, 
    useRef, 
    useEffect, 
    useLayoutEffect, 
    useMemo, 
    useCallback,
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

import moveicon from "../assets/move_item_FILL0_wght400_GRAD0_opsz24.png"
import copyicon from "../assets/content_copy_FILL0_wght400_GRAD0_opsz24.png"
import dragicon from "../assets/drag_indicator_FILL0_wght400_GRAD0_opsz24.png"
import dropicon from "../assets/task_alt_FILL0_wght400_GRAD0_opsz24.png"
import nodropicon from "../assets/block_FILL0_wght400_GRAD0_opsz24.png"

import { MasterDndContext, GenericObject } from './InfiniteGridScroller'

// popup position tracker for repositioning
import ScrollTracker from './cradle/ScrollTracker'

export const ViewportContext = React.createContext(null) // for children

import scrollicon from "../keyboard_double_arrow_right_FILL0_wght400_GRAD0_opsz24.png"

// drag continues here
const DndDragBar = (props) => {

    const [dragState, setDragState] = useState('ready')

    const 
        masterDndContext = useContext(MasterDndContext),
        canDrop = masterDndContext.dragData.canDrop,
        {itemID, index, dndOptions, dragData, scrollerID} = props,

        dragText = dndOptions.dragText || `Dragging itemID ${itemID}, index ${index}`

    if ((scrollerID == masterDndContext.scrollerID) && !masterDndContext.setDragState) {
        masterDndContext.setDragState = setDragState
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

    const candropiconRef = useRef(null)

    candropiconRef.current = 
        canDrop?
            dropicon:
            nodropicon

    useEffect (()=>{

        switch (dragState) {
            case 'updateicon':
                setDragState('ready')
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
            // opacity:0.75,
            backgroundColor:'whitesmoke',
            width: '200px',
            fontSize:'.75em',
            border: '1px solid black',
            borderRadius:'5px',
        } as CSSProperties}

    return (isDragging && currentOffset
        ?<div data-type = 'dragbar' style={dragbarstyles}>

            <div style = {candropiconholderstylesRef.current}>
                <img style = {iconstylesRef.current} src={candropiconRef.current} />
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

const Viewport = ({

    children, 
    gridSpecs,
    styles,
    scrollerID,
    VIEWPORT_RESIZE_TIMEOUT,
    useScrollTracker,
    
}) => {

    // -----------------------[ initialize ]------------------

    const masterDndContext = useContext(MasterDndContext)

    const { dragData } = masterDndContext

    const {

        orientation,

    } = gridSpecs

    const [viewportState,setViewportState] = useState('setup') // setup, resizing, resized, ready

    if ((scrollerID == masterDndContext.scrollerID) && !masterDndContext.setViewportState) {
        masterDndContext.setViewportState = setViewportState
    }

    const viewportStateRef = useRef(null) // for useCallback -> resizeCallback scope
    viewportStateRef.current = viewportState

    const isMountedRef = useRef(true)

    const viewportElementRef = useRef(null)

    const scrollTrackerAPIRef = useRef(null)

    // viewportContextPropertiesRef is passed as a resizing interrupt (through context) to children
    const viewportContextPropertiesRef = useRef(
        {

            isResizing:false, 
            // viewportDimensions:null,
            elementRef:null,
            scrollTrackerAPIRef,

        }
    )

    // mark as unmounted
    useEffect(() =>{

        isMountedRef.current = true

        return () => {

            isMountedRef.current = false

        }
    },[])

    // --------------------[ viewport resizer interrupt ]-----------------------

    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const resizeObserverRef = useRef(null);    

    // set up resizeObserver
    useEffect(()=>{

        // initialize
        resizeObserverRef.current = new ResizeObserver(resizeCallback)
        resizeObserverRef.current.observe(viewportElementRef.current)

        // unmount
        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    // used by resizeObserver; generates interrupt
    const resizeCallback = useCallback((entries)=>{

        if (viewportStateRef.current == 'setup') return

        const target = entries[0].target

        // no need to trigger interrupt on first resize notification
        if (!target.dataset.initialized) {

            target.dataset.initialized = 'true'

                return
                
        }

        // generate interrupt response, if initiating resize
        if (!isResizingRef.current) {

            viewportContextPropertiesRef.current.isResizing = isResizingRef.current = true 

            // new object creation triggers a realtime interrupt message to cradle through context
            viewportContextPropertiesRef.current = {...viewportContextPropertiesRef.current}

            if (isMountedRef.current) setViewportState('resizing')

        }

        // finalize resizing after timeout
        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {

            isResizingRef.current = false
            if (isMountedRef.current) {
                setViewportState('resized')
            }

        },VIEWPORT_RESIZE_TIMEOUT)

    },[])

    // ----------------------------------[ calculate config values ]--------------------------------

    // styles
    const divlinerstyleRef = useRef(null)

    // initialize with inherited styles
    divlinerstyleRef.current = useMemo(() => {

        return {

            ...styles.viewport,
            position:'absolute',
            inset:0,
            overflow:'scroll',//'auto', 'scroll' for iOS Safari
            WebkitOverflowScrolling: 'touch',// for iOS Safari
            overflowAnchor:'none', // crucial!
            
        }

    },[styles.viewport])

    const divtrackerstyleRef = useRef(null)

    // initialize with inherited styles
    divtrackerstyleRef.current = useMemo(() => {

        return {

            // ...styles.viewport,
            position:'absolute',
            top:0,
            left:0
            
        }

    },[styles.viewport])

    // update viewportContextPropertiesRef
    viewportContextPropertiesRef.current = useMemo(() => {

        if (viewportState == 'setup') return viewportContextPropertiesRef.current

        const localViewportData = {
            elementRef:viewportElementRef,
            isResizing:isResizingRef.current,
        }

        // trigger context change with new object
        const viewportdataobject = {...viewportContextPropertiesRef.current, ...localViewportData}

        return  viewportdataobject

    },[orientation, isResizingRef.current, viewportState])

    // --------------------[ state processing ]---------------------------
    
    useLayoutEffect(()=>{
        switch (viewportState) {

            case 'resized':
            case 'startdragbar':
            case 'setup': {
                setViewportState('ready')
                break
            }

        }
    },[viewportState])

    // ----------------------[ render ]--------------------------------

    // console.log('dragData.isDragging, scrollerID, masterDndContext.scrollerID\n',
    //     dragData.isDragging, scrollerID, masterDndContext.scrollerID)

    return <ViewportContext.Provider value = { viewportContextPropertiesRef.current }>

        { (dragData.isDragging && (scrollerID === masterDndContext.scrollerID)) && <DndDragBar 
            itemID = {dragData.itemID} 
            index = {dragData.index} 
            dndOptions = {dragData.dndOptions}
            dragData = { dragData }
            scrollerID = { scrollerID }
        />
        }

        <div 
            data-type = 'viewport'
            data-scrollerid = { scrollerID }
            style = { divlinerstyleRef.current }
            ref = { viewportElementRef }
        >
            { (viewportState != 'setup') && children }
        </div>
        {useScrollTracker && <ScrollTracker 
            scrollTrackerAPIRef = {scrollTrackerAPIRef}
            styles = { styles.scrolltracker }
        />}
    </ViewportContext.Provider>
    
} // Viewport

export default Viewport
