// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle), 
    and act as the visible portal of the list being shown
*/

import React, {useState, useRef, useEffect, useMemo, useCallback, useContext} from 'react'

export const ViewportContext = React.createContext(null)

import useIsMounted from 'react-is-mounted-hook'

// import ResizeObserverPolyfill from 'resize-observer-polyfill'

import { ResizeObserver } from '@juggle/resize-observer'

import { PortalContext } from './portalmanager'

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
    const contentmanager = useContext(PortalContext)
    const [portstate,setPortState] = useState('prepare')
    const portstateRef = useRef(null)
    portstateRef.current = portstate
    let isMounted = useIsMounted()
    // data heap
    const timeoutidRef = useRef(null)
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
        // WebkitOverflowScrolling:'touch',
        backgroundColor:'red',
    } as React.CSSProperties,styles?.viewport))
    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const viewportDataRef = useRef(null)

    const resizeObserverRef = useRef(null)
    const portalRef = useRef(null)

    // initialize
    useEffect(()=>{

        resizeObserverRef.current = new LocalResizeObserver(resizeCallback)
        resizeObserverRef.current.observe(viewportdivRef.current)

        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    useEffect(()=>{

        if (scrollerID == 0 || !viewportdivRef.current) return
        let parentscrollerid
        let parentindex
        let el = viewportdivRef.current
        while (el) {
            // console.log('dataset',el.dataset, el)
            if (el.dataset && (el.dataset.type == 'portalcontainer')) {
                parentindex = parseInt(el.dataset.index)
                parentscrollerid = parseInt(el.dataset.scrollerid)
                break
            } else {
                el = el.parentElement
            }
        } 

        if (!el) {
            console.log('ERROR: parent portalcontainer not found')
            return
        }
        portalRef.current = contentmanager.getPortalListItem(parentscrollerid, parentindex)
        // console.log('viewport of scrollerID has parentscrollerid and parentindex for portal', 
        //     scrollerID, parentscrollerid, parentindex,portalRef.current)
        // portalIndexRef.current = el.dataset.index

    },[viewportdivRef.current])

    const resizeCallback = useCallback((entries)=>{

        if (portstateRef.current == 'prepare') return

        // console.log('checking portal reparenting',portalRef.current)
        if (portalRef.current && portalRef.current.reparenting) {
            // console.log('returning from viewport resizeCallback')
            return
        }

        let target = entries[0].target

        if (!target.dataset.initialized) {
            target.dataset.initialized = true
            return
        }

        if (!isResizingRef.current) {
            isResizingRef.current = true 
                // below is a realtime message to cradle.onScroll
                // to stop updating the referenceIndexData, and to the item observer to stop
                // triggering responses (anticipating reset of cradle content based on resize)
            viewportDataRef.current.isResizing = true
            // isMounted = useIsMounted()
            if (isMounted()) setPortState('resizing')
        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {

            isResizingRef.current = false
            // isMounted = useIsMounted()
            if (isMounted()) setPortState('resize')

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

    },[orientation, cellWidth, cellHeight, padding]) // TODO: gap?

    let viewportClientRect
    if (viewportdivRef.current) {
        viewportClientRect = viewportdivRef.current.getBoundingClientRect()
    } else {
        viewportClientRect = {}
    }
    let {top, right, bottom, left} = viewportClientRect

    // set context data for children
    viewportDataRef.current = useMemo(() => {
        let width, height, localViewportData
        if (!(top === undefined)) { //proxy
            width = (right - left)
            height = (bottom - top)
            localViewportData = {
                viewportDimensions:{top,right, bottom, left, width, height},
                elementref:viewportdivRef,
                isResizing:isResizingRef.current,
            }
        }
        return localViewportData

    },[orientation, top, right, bottom, left, isResizingRef.current])

    // --------------------[ state processing ]---------------------------
    useEffect(()=>{
        switch (portstate) {
            case 'prepare':
            case 'resize': {
                setPortState('render')
                break
            }
        }
    },[portstate])

    // ----------------------[ render ]--------------------------------
    // console.log('scrollerID, viewportDataRef.current',scrollerID, viewportDataRef.current)
    return <ViewportContext.Provider value = { viewportDataRef.current }>
        <div 
            data-type = 'viewport'
            data-masterscrollerid = {scrollerID}
            style = {divlinerstyleRef.current}
            ref = {viewportdivRef}
        >
            { (portstate != 'prepare')?children:null }
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