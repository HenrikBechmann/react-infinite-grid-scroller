// Viewport.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide viewport data to its children (scrollblock and cradle) through the
    ViewportContext object, and act as the visible screen portal of the list being shown.
    If Viewport is resized, it notifies the Cradle to reconfigure.
*/

    // const scrollTrackerArgs = useMemo(() => {
    //     if (!['repositioningContinuation','repositioningRender','finishreposition'].includes(cradleState)) {
    //         return null
    //     }
    //     if (scrollAxisReferencePosition != scrollIndexRef.current) {
    //         scrollIndexRef.current = scrollAxisReferencePosition
    //         const { repositioningIndexCallback } = serviceHandler.callbacks
    //         repositioningIndexCallback && repositioningIndexCallback(scrollAxisReferenceIndex);
    //     }
        
    //     if (!useScrollTracker) return null
    //     const trackerargs = {
    //         top:viewportDimensions.top + 3,
    //         left:viewportDimensions.left + 3,
    //         scrollAxisReferenceIndex,
    //         scrollAxisReferencePosition,
    //         listsize,
    //         styles,
    //     }
    //     return trackerargs
    // },
    //     [
    //         cradleState, 
    //         viewportDimensions, 
    //         scrollAxisReferenceIndex,
    //         scrollAxisReferencePosition, 
    //         listsize,
    //         styles,
    //         useScrollTracker,
    //     ]
    // )



        // {(['repositioningContinuation','repositioningRender'].includes(cradleState))?
        //     (useScrollTracker?<ScrollTracker 
        //         top = { scrollTrackerArgs.top } 
        //         left = { scrollTrackerArgs.left } 
        //         offset = { scrollTrackerArgs.scrollAxisReferencePosition } 
        //         index = { scrollTrackerArgs.scrollAxisReferenceIndex }
        //         listsize = { scrollTrackerArgs.listsize }
        //         styles = { scrollTrackerArgs.styles }
        //     />:null):

import React, {

    useState, 
    useRef, 
    useEffect, 
    useLayoutEffect, 
    useMemo, 
    useCallback, 

} from 'react'

export const ViewportContext = React.createContext(null) // for children

const Viewport = ({

    children, 
    gridSpecs,
    styles,
    scrollerID,
    VIEWPORT_RESIZE_TIMEOUT,
    
}) => {

    // -----------------------[ initialize ]------------------

    const {

        orientation,
        // gap,
        // padding,
        // cellHeight,
        // cellWidth,
        // layout,

    } = gridSpecs

    const [viewportState,setViewportState] = useState('setup') // setup, resizing, resized, ready

    const viewportStateRef = useRef(null) // for useCallback -> resizeCallback scope
    viewportStateRef.current = viewportState

    const isMountedRef = useRef(true)

    const viewportElementRef = useRef(null)

    // ViewportContextPropertiesRef is passed as a resizing interrupt (through context) to children
    const ViewportContextPropertiesRef = useRef(
        {
            isResizing:false, 
            viewportDimensions:null,
            elementRef:null
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

            ViewportContextPropertiesRef.current.isResizing = isResizingRef.current = true 

            // new object creation triggers a realtime interrupt message to cradle through context
            ViewportContextPropertiesRef.current = {...ViewportContextPropertiesRef.current}

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

    // update ViewportContextPropertiesRef; add viewport dimensions
    ViewportContextPropertiesRef.current = useMemo(() => {

        if (viewportState == 'setup') return ViewportContextPropertiesRef.current

        const {top, right, bottom, left} = viewportElementRef.current.getBoundingClientRect()
        const width = (right - left)
        const height = (bottom - top)

        // this is a dimension update procedure for resize. 
        // See also interrupthandler.tsx cradleIntersectionObserverCallback for cradle intersection update
        const localViewportData = {
            viewportDimensions:{top,right, bottom, left, width, height},
            elementRef:viewportElementRef,
            isResizing:isResizingRef.current,
        }

        // trigger context change with new object
        const viewportdataobject = {...ViewportContextPropertiesRef.current, ...localViewportData}

        return  viewportdataobject

    },[orientation, isResizingRef.current, viewportState])

    // --------------------[ state processing ]---------------------------
    
    useLayoutEffect(()=>{
        switch (viewportState) {

            case 'resized':
            case 'setup': {
                setViewportState('ready')
                break
            }

        }
    },[viewportState])

    // ----------------------[ render ]--------------------------------

    return <ViewportContext.Provider value = { ViewportContextPropertiesRef.current }>
        <div 
            data-type = 'viewport'
            data-scrollerid = { scrollerID }
            style = { divlinerstyleRef.current }
            ref = { viewportElementRef }
        >
            { (viewportState != 'setup') && children }
        </div>
    </ViewportContext.Provider>
    
} // Viewport

export default Viewport
