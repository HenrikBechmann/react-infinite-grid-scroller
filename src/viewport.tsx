// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useContext} from 'react'

export const ViewportContext = React.createContext(null)

import { ResizeObserver } from '@juggle/resize-observer'

import { portalManager } from './portalmanager'

const ResizeObserverClass = window['ResizeObserver'] || ResizeObserver

// control constant
const RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE = 250

const Viewport = ({
    children, 
    orientation, 
    cellWidth, 
    cellHeight, 
    gap, 
    padding, 
    functions, 
    styles,
    scrollerID,
}) => {

    // -----------------------[ initialize ]------------------

    // processing state
    // const portalManager = portalAgentInstance// useContext(PortalAgent)
    // setup -> render; resizing -> resized -> render
    const [viewportstate,setViewportState] = useState('setup')

    const viewportstateRef = useRef(null)
    viewportstateRef.current = viewportstate
    const isMounted = useRef(true)

    useLayoutEffect(() => {

        return () => {isMounted.current = false}

    },[])

    // data heap
    // const timeoutidRef = useRef(null)
    const viewportdivRef = useRef(undefined)
    const divlinerstyleRef = useRef(
        Object.assign({
        position:'absolute',
        // height:'100%',
        // width:'100%',
        top:0,
        right:0,
        bottom:0,
        left:0,
        overflow:'auto',
        backgroundColor:'red',
    } as React.CSSProperties,styles?.viewport))
    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const viewportDataRef = useRef({portal:null, isResizing:false, isReparenting: false})
    const viewportClientRectRef = useRef({top:0,right:0,bottom:0,left:0})

    const resizeObserverRef = useRef(null);

    if (viewportDataRef.current.portal?.reparenting && !viewportDataRef.current.isReparenting) {
        viewportDataRef.current.isReparenting = true

        // console.log('in viewport, setting isReparenting', scrollerID, viewportstateRef.current, viewportDataRef.current)
        setViewportState('reparenting')
    }

    useEffect(()=>{

        // initialize
        resizeObserverRef.current = new ResizeObserverClass(resizeCallback)
        resizeObserverRef.current.observe(viewportdivRef.current)

        // cleanup
        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    useEffect(()=>{

        if (scrollerID == 0) return
        let parentscrollerid
        let portalindex
        let el = viewportdivRef.current
        while (el) {
            if (el.dataset && (el.dataset.type == 'portalcontainer')) {
                portalindex = parseInt(el.dataset.index)
                parentscrollerid = parseInt(el.dataset.scrollerid)
                viewportDataRef.current.portal = portalManager.getPortal(parentscrollerid, portalindex)
                break
            } else {
                el = el.parentElement
            }
        } 

        if (!el) {
            console.log('ERROR: parent portalcontainer not found')
            return
        }

    },[])

    const resizeCallback = useCallback((entries)=>{

        if (viewportstateRef.current == 'setup') return

        let target = entries[0].target

        if (!target.dataset.initialized) {
            // console.log('initializing target', target.dataset)
            target.dataset.initialized = true
            return
        }

        if (!isResizingRef.current) {
            viewportDataRef.current.isResizing = isResizingRef.current = true 
            viewportDataRef.current = Object.assign({},viewportDataRef.current) // trigger child render
            // below is a realtime message to cradle.onScroll
            // to stop updating the referenceIndexData, and to the item observer to stop
            // triggering responses (anticipating reset of cradle content based on resize)
            if (isMounted.current) setViewportState('resizing')
        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {
            isResizingRef.current = false
            if (isMounted.current) {
                setViewportState('resized')
            }

        },RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE)

    },[])

    // ----------------------------------[ calculate ]--------------------------------

    // calculated values
    divlinerstyleRef.current = useMemo(() => {
        let mincrosslength = calcMinViewportCrossLength(orientation, cellWidth, cellHeight, padding)
        let styles = {...divlinerstyleRef.current} as React.CSSProperties
        if (orientation == 'vertical') {
            styles.minWidth = mincrosslength + 'px'
            styles.minHeight = 'auto'
        } else {
            styles.minWidth = 'auto'
            styles.minHeight = mincrosslength + 'px'
        }
        return styles

    },[orientation, cellWidth, cellHeight, padding])

    // set context data for children
    viewportDataRef.current = useMemo(() => {

        if (viewportstate == 'setup') return viewportDataRef.current

        viewportClientRectRef.current = viewportdivRef.current.getBoundingClientRect()

        let {top, right, bottom, left} = viewportClientRectRef.current
        // console.log('getting scrollerID, viewport dimensions',scrollerID,top, right, bottom, left )
        let width, height, localViewportData
        width = (right - left)
        height = (bottom - top)
        localViewportData = {
            viewportDimensions:{top,right, bottom, left, width, height},
            elementref:viewportdivRef,
            isResizing:isResizingRef.current,
        }
        return Object.assign({},viewportDataRef.current, localViewportData)

    },[orientation, isResizingRef.current, viewportstate])

    // --------------------[ state processing ]---------------------------
    useEffect(()=>{
        switch (viewportstate) {
            case 'setup':
            case 'resized': {
                setViewportState('render')
                break
            }
        }
    },[viewportstate])

    useEffect(() => {

        let viewportstate = viewportstateRef.current
        if (viewportstate == 'reparenting') {
            setViewportState('render')
        }

    },[viewportstateRef.current])

    // ----------------------[ render ]--------------------------------

    return <ViewportContext.Provider value = { viewportDataRef.current }>
        <div 
            data-type = 'viewport'
            data-scrollerid = {scrollerID}
            style = {divlinerstyleRef.current}
            ref = {viewportdivRef}
        >
            { ((viewportstate != 'setup') && (viewportstate != 'reparenting')) && children }
        </div>
    </ViewportContext.Provider>
    
} // Viewport

// establish minimum width/height for the viewport -- approximately one item
const calcMinViewportCrossLength = (orientation, cellWidth, cellHeight, padding) => {
    // console.log('calcMinViewportCrossLength parms',orientation, cellWidth, cellHeight, padding,)
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