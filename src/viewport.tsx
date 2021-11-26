// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useMemo, useCallback, useContext} from 'react'

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

    console.log('running scrollerID viewportstate',scrollerID,viewportstate)

    const viewportstateRef = useRef(null)
    viewportstateRef.current = viewportstate
    const isMounted = useRef(true)

    useEffect(() => {

        return () => {isMounted.current = false}

    },[])

    const divlinerstyleRef = useRef(null)

    const viewportdivRef = useRef(null)

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
         }, styles?.viewport)

    },[styles?.viewport])

    const viewportDataRef = useRef({portal:null, isResizing:false, isReparenting: false})
    const viewportClientRectRef = useRef({top:0,right:0,bottom:0,left:0})

    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const resizeObserverRef = useRef(null);

    useEffect(()=>{

        // initialize
        resizeObserverRef.current = new ResizeObserverClass(resizeCallback)
        resizeObserverRef.current.observe(viewportdivRef.current)

        // unmount
        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    useEffect(()=>{

        if (scrollerID == 0) return
        let parentscrollerid
        let portalindex
        let element = viewportdivRef.current
        while (element) {
            if (element.dataset && (element.dataset.type == 'portalcontainer')) {
                portalindex = parseInt(element.dataset.index)
                parentscrollerid = parseInt(element.dataset.scrollerid)
                viewportDataRef.current.portal = portalManager.getPortal(parentscrollerid, portalindex)
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

    if (viewportDataRef.current.portal?.reparenting && !viewportDataRef.current.isReparenting) {
        viewportDataRef.current.isReparenting = true

        // console.log('in viewport, setting isReparenting', scrollerID, viewportstateRef.current, viewportDataRef.current)
        setViewportState('reparenting')
    }

    // ----------------------------------[ calculate ]--------------------------------

    // calculated values
    divlinerstyleRef.current = useMemo(() => {
        let mincrosslength = calcMinViewportCrossLength(orientation, cellWidth, cellHeight, padding)
        let styles = divlinerstyleRef.current
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

        if (viewportstateRef.current == 'setup') return viewportDataRef.current

        viewportClientRectRef.current = viewportdivRef.current.getBoundingClientRect()

        let {top, right, bottom, left} = viewportClientRectRef.current
        console.log('orientation, isResizingRef.current, viewportstate',orientation, isResizingRef.current, viewportstateRef.current)
        console.log('getting scrollerID, viewport top, right, bottom, left, width, height',
                scrollerID,top, right, bottom, left, right - left, bottom - top )
        let width, height, localViewportData
        width = (right - left)
        height = (bottom - top)
        localViewportData = {
            viewportDimensions:{top,right, bottom, left, width, height},
            elementref:viewportdivRef,
            isResizing:isResizingRef.current,
        }
        return Object.assign({},viewportDataRef.current, localViewportData)

    },[orientation, isResizingRef.current, viewportstateRef.current])

    // --------------------[ state processing ]---------------------------
    useEffect(()=>{
        switch (viewportstateRef.current) {
            case 'reparenting':
            case 'setup':
            case 'resized': {
                setViewportState('render')
                break
            }
        }
    },[viewportstateRef.current])

    // useEffect(() => {

    //     if (viewportstateRef.current == 'reparenting') {

    //         setViewportState('render')

    //     }

    // },[viewportstateRef.current])

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
