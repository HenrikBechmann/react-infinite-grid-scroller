// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle), 
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useContext} from 'react'

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

    // setup -> calculate -> render; resizing -> resized -> render
    const [viewportstate,setViewportState] = useState('setup')
    console.log('RUNNING viewport scrollerID, viewportstate',scrollerID,viewportstate)

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
        // WebkitOverflowScrolling:'touch',
        backgroundColor:'red',
    } as React.CSSProperties,styles?.viewport))
    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const viewportDataRef = useRef({portalitem:null, isResizing:false})

    const resizeObserverRef = useRef(null)
    // const parentPortalRef = useRef(null)

    // initialize
    useLayoutEffect(()=>{

        // console.log('resizeObserver setup viewportstateRef.current, viewportdivRef.current',viewportstateRef.current, viewportdivRef.current)
        resizeObserverRef.current = new LocalResizeObserver(resizeCallback)
        resizeObserverRef.current.observe(viewportdivRef.current)

        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    useLayoutEffect(()=>{

        if (scrollerID == 0 || !viewportdivRef.current) return
        let parentscrollerid
        let parentindex
        let el = viewportdivRef.current
        while (el) {
            if (el.dataset && (el.dataset.type == 'portalcontainer')) {
                parentindex = parseInt(el.dataset.index)
                parentscrollerid = parseInt(el.dataset.scrollerid)
                viewportDataRef.current.portalitem = portalManager.getPortalListItem(parentscrollerid, parentindex)
                // console.log('viewport scrollerID, parentscrollerid, viewportstateRef.current, viewportdivRef.current',
                //     scrollerID, parentscrollerid, viewportstateRef.current, viewportdivRef.current)
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

        // console.log('resizeCallback viewportstateRef.current',viewportstateRef.current)

        if (viewportstateRef.current == 'setup') return
        let portalitem = viewportDataRef.current.portalitem

        if (portalitem && portalitem.reparenting) return

        let target = entries[0].target

        if (!target.dataset.initialized) {
            target.dataset.initialized = true
            return
        }

        if (!isResizingRef.current) {
            viewportDataRef.current.isResizing = isResizingRef.current = true 
                // below is a realtime message to cradle.onScroll
                // to stop updating the referenceIndexData, and to the item observer to stop
                // triggering responses (anticipating reset of cradle content based on resize)
            if (isMounted()) setViewportState('resizing')
        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {

            isResizingRef.current = false
            if (isMounted()) setViewportState('resized')

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
        // console.log('viewportliner styles',styles)
        return styles

    },[orientation, cellWidth, cellHeight, padding]) // TODO: gap?

    let viewportClientRectRef = useRef({top:0,right:0,bottom:0,left:0})

    useLayoutEffect(()=> {
        if (viewportstate != 'calculate') return

        viewportClientRectRef.current = viewportdivRef.current.getBoundingClientRect()
        
    },[viewportstate])

    let {top, right, bottom, left} = viewportClientRectRef.current

    // set context data for children
    viewportDataRef.current = useMemo(() => {

        let width, height, localViewportData
        width = (right - left)
        height = (bottom - top)
        localViewportData = {
            viewportDimensions:{top,right, bottom, left, width, height},
            elementref:viewportdivRef,
            isResizing:isResizingRef.current,
        }
        return Object.assign(viewportDataRef.current, localViewportData)

    },[orientation, top, right, bottom, left, isResizingRef.current, viewportstate])

    // --------------------[ state processing ]---------------------------
    useLayoutEffect(()=>{
        switch (viewportstate) {
            case 'setup':
                setViewportState('calculate')
                break
            case 'calculate':
            case 'resized': {
                // console.log('set viewportstate to render from',viewportstate)
                setViewportState('render')
                break
            }
        }
    },[viewportstate]);

    // ----------------------[ render ]--------------------------------
    // viewportstate == 'render' && console.log('rendering scrollerID, viewportstate viewportDataRef.current, divlinerstyleRef.current, children',
    //     scrollerID, viewportstate, viewportDataRef.current, divlinerstyleRef.current, children)
    return <ViewportContext.Provider value = { viewportDataRef.current }>
        <div 
            data-type = 'viewport'
            data-scrollerid = {scrollerID}
            style = {divlinerstyleRef.current}
            ref = {viewportdivRef}
        >
            { ((viewportstate != 'setup') && (viewportstate != 'calculate'))?children:null }
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