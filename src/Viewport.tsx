// viewport.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useContext} from 'react'

export const ViewportInterrupt = React.createContext(null) // for children

import { ResizeObserver as ResizeObserverPollyfill } from '@juggle/resize-observer'

const ResizeObserver = window['ResizeObserver'] || ResizeObserverPollyfill

const Viewport = ({
    children, 
    gridSpecs,
    styles,
    scrollerID,
    scrollerProperties,
    VIEWPORT_RESIZE_TIMEOUT,
}) => {

    // -----------------------[ initialize ]------------------

    const {
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
    } = gridSpecs

    const [viewportState,setViewportState] = useState('setup') // setup, resizing, resized, ready

    // console.log('==> RUNNING Viewport','-'+scrollerID+'-', viewportState)
    // console.log('performance.memory',performance['memory'])

    const viewportStateRef = useRef(null) // for useCallback -> resizeCallback scope
    viewportStateRef.current = viewportState

    const isMountedRef = useRef(true) // monitor for unmounted

    useEffect(() => {

        const abortController = new AbortController()
        // unmount
        return () => {

            isMountedRef.current = false
            abortController.abort()  // defensive
        }

    },[])

    const viewportElementRef = useRef(null)

    // viewportInterruptPropertiesRef is passed as a resizing interrupt (through context) to children
    // initialize
    const viewportInterruptPropertiesRef = useRef(
        {
            isReparentingRef:scrollerProperties?.isReparentingRef, 
            isResizing:false, 
            // index:null,
            viewportDimensions:null,
            elementRef:null
        }
    )

    // --------------------[ resizer setup ]-----------------------

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

        if ((!isMountedRef.current) || (!viewportElementRef.current)) return

        if (viewportStateRef.current == 'setup') return

        const target = entries[0].target

        if (!target.dataset.initialized) {

            target.dataset.initialized = 'true'

            // embedded lists need resizing event for init with up to date viewport dimensions
            if (!scrollerProperties) {

                return
                
            }
        }

        // generate interrupt response, if initiating resize
        if (!isResizingRef.current) {

            viewportInterruptPropertiesRef.current.isResizing = isResizingRef.current = true 
            // new object creation triggers a realtime interrupt message to cradle through context
            viewportInterruptPropertiesRef.current = Object.assign({},viewportInterruptPropertiesRef.current) 

            if (isMountedRef.current) setViewportState('resizing')

        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {

            isResizingRef.current = false
            if (isMountedRef.current) {
                setViewportState('resized')
            }

        },VIEWPORT_RESIZE_TIMEOUT)

    },[])

    // ----------------------------------[ calculate config values ]--------------------------------

    const divlinerstyleRef = useRef(null)

    // initialize with inherited styles
    divlinerstyleRef.current = useMemo(() => {

        return Object.assign(
        {
            position:'absolute',
            top:0,
            right:0,
            bottom:0,
            left:0,
            overflow:'auto',
            backgroundColor:'red',
        }, styles.viewport)

    },[styles.viewport])

    // // update with config values
    // divlinerstyleRef.current = useMemo(() => {

    //     let mincrosslength = calcMinViewportCrossLength(orientation, cellWidth, cellHeight, gap, padding)
    //     let styles = Object.assign({},divlinerstyleRef.current) // avoid readonly

    //     if (orientation == 'vertical') {
    //         styles.minWidth = mincrosslength + 'px'
    //         styles.minHeight = 'auto'
    //     } else {
    //         styles.minWidth = 'auto'
    //         styles.minHeight = mincrosslength + 'px'
    //     }

    //     return styles

    // },[orientation, cellWidth, cellHeight, gap, padding])

    // update viewportInterruptPropertiesRef; add viewport dimensions
    viewportInterruptPropertiesRef.current = useMemo(() => {

        if (viewportState == 'setup') return viewportInterruptPropertiesRef.current

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

        // console.log('viewport new localViewportData', '-'+scrollerID+'-',localViewportData)

        // trigger context change with new object
        const viewportdataobject = Object.assign({},viewportInterruptPropertiesRef.current, localViewportData) 

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

    return <ViewportInterrupt.Provider value = { viewportInterruptPropertiesRef.current }>
        <div 
            data-type = 'viewport'
            data-scrollerid = {scrollerID}
            style = {divlinerstyleRef.current}
            ref = {viewportElementRef}
        >
            { (viewportState != 'setup') && children }
        </div>
    </ViewportInterrupt.Provider>
    
} // Viewport

// establish minimum width/height for the viewport -- approximately one item
// gap only applies with multi-width items, therefore not used in calculations
const calcMinViewportCrossLength = (orientation, cellWidth, cellHeight, gap, padding) => {

    let crosslength, cellLength
    
    if (orientation == 'vertical') {
        cellLength = cellWidth 
    } else {
        cellLength = cellHeight
    }
    crosslength = cellLength + (padding * 2)

    return crosslength

}

export default Viewport
