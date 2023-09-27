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
    useDragLayer, 
    DragLayerMonitor, 
} from 'react-dnd'

import DndViewport from './Viewport/DndViewport'

import DndDragBar from './Viewport/DndDragBar'
import DndScrollTab from './Viewport/DndScrollTab'

import { MasterDndContext } from './InfiniteGridScroller'

// popup position tracker for repositioning
import ScrollTracker from './Viewport/ScrollTracker'

export const ViewportContext = React.createContext(null) // for children

const ViewportController = (props) => {

    const masterDndContext = useContext(MasterDndContext)

    const viewportFrameElementRef = useRef(null)

    if (masterDndContext.installed) {

        return <DndViewport {...props}/>

    } else {

        const enhancedProps = {...props,viewportFrameElementRef}

        return <Viewport {...enhancedProps} />

    }

}

export default ViewportController

export const Viewport = ({

    children, 
    gridSpecs,
    styles,
    scrollerID,
    VIEWPORT_RESIZE_TIMEOUT,
    useScrollTracker,
    viewportFrameElementRef,
    showScrollTabs,

}) => {

    // -----------------------[ initialize ]------------------

    const masterDndContext = useContext(MasterDndContext)

    const { dragData } = masterDndContext

    const {

        orientation,

    } = gridSpecs

    const [viewportState,setViewportState] = useState('setup') // setup, resizing, resized, ready
    
    if (masterDndContext.installed && (scrollerID === masterDndContext.scrollerID) && !masterDndContext.setViewportState) {
        masterDndContext.setViewportState = setViewportState

    }

    const viewportStateRef = useRef(null) // for useCallback -> resizeCallback scope
    viewportStateRef.current = viewportState

    const isMountedRef = useRef(true)

    const viewportElementRef = useRef(null)
    // const viewportFrameElementRef = useRef(null)

    const scrollTrackerAPIRef = useRef(null)

    // viewportContextRef is passed as a resizing interrupt (through context) to children
    const viewportContextRef = useRef(
        {

            isResizing:false, 
            // viewportDimensions:null,
            elementRef:null,
            frameElementRef:null,
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

            viewportContextRef.current.isResizing = isResizingRef.current = true 

            // new object creation triggers a realtime interrupt message to cradle through context
            viewportContextRef.current = {...viewportContextRef.current}

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
    const divframestyleRef = useRef<CSSProperties>({
        position:'absolute',
        inset:'0',
    })
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

    // update viewportContextRef
    viewportContextRef.current = useMemo(() => {

        if (viewportState == 'setup') return viewportContextRef.current

        const localViewportData = {
            elementRef:viewportElementRef,
            frameElementRef:viewportFrameElementRef,
            isResizing:isResizingRef.current,
        }

        // trigger context change with new object
        const viewportdataobject = {...viewportContextRef.current, ...localViewportData}

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

    return <ViewportContext.Provider value = { viewportContextRef.current }>

        { (masterDndContext.installed && dragData.isDragging && (scrollerID === masterDndContext.scrollerID)) && <DndDragBar 
            itemID = {dragData.itemID} 
            index = {dragData.index} 
            dndOptions = {dragData.dndOptions}
            dragData = { dragData }
            scrollerID = { scrollerID }
        />
        }
        <div ref = {viewportFrameElementRef} data-type = 'viewport-frame' style = {divframestyleRef.current}>
        {showScrollTabs && <DndScrollTab />}
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
        </div>
    </ViewportContext.Provider>
    
} // Viewport
