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

    console.log('running scrollerID viewportstate',scrollerID,viewportstate)

    const viewportstateRef = useRef(null) // for useCallback
    viewportstateRef.current = viewportstate
    const isMountedRef = useRef(true)

    useEffect(() => {

        return () => {isMountedRef.current = false}

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

    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const resizeObserverRef = useRef(null);

    // set up resizeObserver
    useEffect(()=>{

        // initialize
        resizeObserverRef.current = new ResizeObserverClass(resizeCallback)
        resizeObserverRef.current.observe(viewportdivRef.current)

        // unmount
        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    // get portal for non-root viewports
    useEffect(()=>{

        if (scrollerID == 0) return // root

        let parentscrollerid, portalindex
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

    // for resizeObserver
    const resizeCallback = useCallback((entries)=>{

        if (viewportstateRef.current == 'setup') return

        // console.log('calling resizeCallback',viewportstateRef.current)

        const target = entries[0].target

        if (!target.dataset.initialized) {
            // console.log('initializing target', target.dataset)
            target.dataset.initialized = true
            return
        }

        if (!isResizingRef.current) {
            viewportDataRef.current.isResizing = isResizingRef.current = true 
            viewportDataRef.current = Object.assign({},viewportDataRef.current) // trigger child render
            // TODO: trace this:!
            // below is a realtime message to cradle.onScroll
            // to stop updating the referenceIndexData, and to the item observer to stop
            // triggering responses (anticipating reset of cradle content based on resize)
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

    if (viewportDataRef.current.portal?.reparenting && !viewportDataRef.current.isReparenting) {
        viewportDataRef.current.isReparenting = true

        // console.log('in viewport, setting isReparenting', scrollerID, viewportstateRef.current, viewportDataRef.current)
        setViewportState('reparenting')
    }

    // ----------------------------------[ calculate ]--------------------------------

    // calculated values
    divlinerstyleRef.current = useMemo(() => {

        // TODO: gap
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

        if (viewportstate == 'setup') return viewportDataRef.current

        const {top, right, bottom, left} = viewportdivRef.current.getBoundingClientRect() // viewportclientrect
        const width = (right - left)
        const height = (bottom - top)

        const localViewportData = {
            viewportDimensions:{top,right, bottom, left, width, height},
            elementref:viewportdivRef,
            isResizing:isResizingRef.current,
        }

        return Object.assign({},viewportDataRef.current, localViewportData) // TODO: find alternate way to signal a change

    },[orientation, isResizingRef.current, viewportstate])

    // --------------------[ state processing ]---------------------------
    useLayoutEffect(()=>{
        switch (viewportstate) {
            case 'reparenting':
            case 'resized':
            case 'setup': {
                setViewportState('render')
                break
            }
        }
    },[viewportstate])

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
