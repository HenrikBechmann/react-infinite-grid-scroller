// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle), 
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useMemo, useCallback, useContext} from 'react'

export const ViewportContext = React.createContext(null)

import useIsMounted from 'react-is-mounted-hook'

import { ResizeObserver } from '@juggle/resize-observer'

import { PortalManager } from './portalmanager'

const LocalResizeObserver = window['ResizeObserver'] || ResizeObserver

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
    const portalManager = useContext(PortalManager)

    // setup -> render; resizing -> resized -> render
    const [viewportstate,setViewportState] = useState('setup')

    const viewportstateRef = useRef(null)
    viewportstateRef.current = viewportstate
    let isMounted = useIsMounted()

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
    const viewportDataRef = useRef({portalitem:null, isResizing:false})
    const viewportClientRectRef = useRef({top:0,right:0,bottom:0,left:0})

    const resizeObserverRef = useRef(null);

    // console.log('RUNNING viewport scrollerID, viewportstate',
    //     scrollerID,viewportstate)

    useEffect(()=>{

        // initialize
        resizeObserverRef.current = new LocalResizeObserver(resizeCallback)
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
                viewportDataRef.current.portalitem = portalManager.getPortalListItem(parentscrollerid, portalindex)
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

        // if (viewportDataRef.current.portalitem?.reparenting) return

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
            if (isMounted()) setViewportState('resizing')
        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {
            isResizingRef.current = false
            if (isMounted()) {
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
    },[viewportstate]);

    // ----------------------[ render ]--------------------------------

    return <ViewportContext.Provider value = { viewportDataRef.current }>
        <div 
            data-type = 'viewport'
            data-scrollerid = {scrollerID}
            style = {divlinerstyleRef.current}
            ref = {viewportdivRef}
        >
            { (viewportstate != 'setup') && children }
        </div>
    </ViewportContext.Provider>
    
} // Viewport

// establish minimum width/height for the viewport -- approximately one item
const calcMinViewportCrossLength = (orientation, cellWidth, cellHeight, padding) => {
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