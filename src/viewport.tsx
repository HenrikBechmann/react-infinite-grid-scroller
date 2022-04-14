// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useContext} from 'react'

export const ViewportInterrupt = React.createContext(null) // for children

import { ResizeObserver as ResizeObserverPollyfill } from '@juggle/resize-observer'
// import InterruptHandler from './cradle/interrupthandler'

import { CradleContext as ParentCradleContext } from './cradle'

const ResizeObserver = window['ResizeObserver'] || ResizeObserverPollyfill

// control constant
const RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE = 250

const Viewport = ({
    children, 
    cellWidth, 
    cellHeight, 
    gap, 
    padding, 
    orientation, 
    styles,
    scrollerID,
}) => {

    // -----------------------[ initialize ]------------------

    const [viewportState,setViewportState] = useState('setup');
    const viewportStateRef = useRef(null) // for useCallback -> resizeCallback scope
    viewportStateRef.current = viewportState

    // only available if viewport is a child of an infiniteScroller
    const parentCradlePropertiesRef = useContext(ParentCradleContext);

    // if this is a scroller child, get the parent portal handler
    const parentPortalHandlerRef = useRef(parentCradlePropertiesRef?.current.portalHandler);

    const isMountedRef = useRef(true) // monitor for unmounted

    useEffect(() => {

        // unmount
        return () => {isMountedRef.current = false}

    },[])

    const divlinerstyleRef = useRef(null)

    // integrate inherited styles
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

    const viewportdivRef = useRef(null)

    // viewportPropertiesRef is passed as an interrupt context to children
    const viewportPropertiesRef = useRef(
        {
            portal:null, 
            isResizing:false, 
            index:null
        }
    )

    // --------------------[ resizer setup ]-----------------------

    // useEffect(() => {

    //     let observer = interruptHandler.cradleResize.createObserver()
    //     let cradleElements = cradleHandler.elements
    //     observer.observe(cradleElements.headRef.current)
    //     observer.observe(cradleElements.tailRef.current)

    //     return () => {

    //         observer.disconnect()

    //     }

    // },[])


    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const resizeObserverRef = useRef(null);

    // set up resizeObserver
    useEffect(()=>{

        // initialize
        resizeObserverRef.current = new ResizeObserver(resizeCallback)
        resizeObserverRef.current.observe(viewportdivRef.current)

        // unmount
        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    // used by resizeObserver; generates interrupt
    const resizeCallback = useCallback((entries)=>{

        if (viewportStateRef.current == 'setup') {

            return

        }

        const target = entries[0].target

        // first register shouldn't generate interrupt
        if (!target.dataset.initialized) {

            // console.log('initializing target', target.dataset)
            target.dataset.initialized = true

            return

        }

        // generate interrupt response, if initiating resize
        if (!isResizingRef.current) {
            viewportPropertiesRef.current.isResizing = isResizingRef.current = true 
            // new object creation triggers a realtime interrupt message to cradle through context
            viewportPropertiesRef.current = Object.assign({},viewportPropertiesRef.current) 

            if (isMountedRef.current) setViewportState('resizing')

        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {

            isResizingRef.current = false
            if (isMountedRef.current) {
                setViewportState('resized')
            }

        },RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE)

    },[])

    // -------------------[ set portal for non-root viewports ]-------------

    useEffect(()=>{

        if (!parentPortalHandlerRef.current) return // root viewport has no portal

        const parentPortalHandler = parentPortalHandlerRef.current

        let portalindex
        let element = viewportdivRef.current

        while (element) {
            if (element.dataset && (element.dataset.type == 'portalcontainer')) {
                portalindex = parseInt(element.dataset.index)
                viewportPropertiesRef.current.portal = parentPortalHandler.getPortal(portalindex)
                viewportPropertiesRef.current.index = portalindex
                break
            } else {
                element = element.parentElement
            }
        } 

        if (!element) {
            console.log('ERROR: parent portalcontainer not found')
            return
        }

    },[])

    // ----------------------------------[ calculate config ]--------------------------------

    // calculated values
    divlinerstyleRef.current = useMemo(() => {

        // TODO: gap
        let mincrosslength = calcMinViewportCrossLength(orientation, cellWidth, cellHeight, gap, padding)
        let styles = Object.assign({},divlinerstyleRef.current) // avoid readonly

        if (orientation == 'vertical') {
            styles.minWidth = mincrosslength + 'px'
            styles.minHeight = 'auto'
        } else {
            styles.minWidth = 'auto'
            styles.minHeight = mincrosslength + 'px'
        }

        return styles

    },[orientation, cellWidth, cellHeight, gap, padding])

    // measure viewport dimensions for children
    // TODO: should dimensions be updated during resize or only after resize?
    viewportPropertiesRef.current = useMemo(() => {

        if (viewportState == 'setup') return viewportPropertiesRef.current

        const {top, right, bottom, left} = viewportdivRef.current.getBoundingClientRect()
        const width = (right - left)
        const height = (bottom - top)

        // TODO this is a duplicate setting procedure with interrupthandler.tsx cradleIntersectionObserverCallback
        const localViewportData = {
            viewportDimensions:{top,right, bottom, left, width, height},
            elementref:viewportdivRef,
            isResizing:isResizingRef.current,
        }

        // trigger context change with new object
        const viewportdataobject = Object.assign({},viewportPropertiesRef.current, localViewportData) 

        return  viewportdataobject

    },[orientation, isResizingRef.current, viewportState])

    // --------------------[ state processing ]---------------------------
    
    useLayoutEffect(()=>{
        switch (viewportState) {

            case 'resized':
            case 'setup': {
                setViewportState('render')
                break
            }

        }
    },[viewportState])

    // ----------------------[ render ]--------------------------------

    return <ViewportInterrupt.Provider value = { viewportPropertiesRef.current }>
        <div 
            data-type = 'viewport'
            data-scrollerid = {scrollerID}
            style = {divlinerstyleRef.current}
            ref = {viewportdivRef}
        >
            { (viewportState != 'setup') && children }
        </div>
    </ViewportInterrupt.Provider>
    
} // Viewport

// establish minimum width/height for the viewport -- approximately one item
// gap only applies with multi-width items, therefore not used in calculations
const calcMinViewportCrossLength = (orientation, cellWidth, cellHeight, gap, padding) => {
    // console.log('calcMinViewportCrossLength parms',orientation, cellWidth, cellHeight, padding,)
    let crosslength, cellLength
    if (orientation == 'vertical') {
        cellLength = cellWidth //+ gap
    } else {
        cellLength = cellHeight // + gap
    }
    crosslength = cellLength + (padding * 2)
    return crosslength
}

export default Viewport
