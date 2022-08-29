// Viewport.tsx
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

    const viewportStateRef = useRef(null) // for useCallback -> resizeCallback scope
    viewportStateRef.current = viewportState

    const isMountedRef = useRef(true) // monitor for unmounted

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

    useEffect(()=>{

        const abortController = new AbortController()

        return () => {
            abortController.abort() // defensive
        }

    },[])

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
            inset:0,
            overflow:'auto',
            // backgroundColor:'red',
        }, styles.viewport)

    },[styles.viewport])

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

export default Viewport
