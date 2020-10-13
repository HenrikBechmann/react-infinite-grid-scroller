// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle), 
    and act as the visible portal of the list being shown
*/

import React, {useState, useRef, useEffect, useMemo, useCallback, useContext} from 'react'

export const ViewportContext = React.createContext(null)

import useIsMounted from 'react-is-mounted-hook'

import ResizeObserverPolyfill from 'resize-observer-polyfill'

import { ContentContext } from './contentmanager'

const LocalResizeObserver = window['ResizeObserver'] || ResizeObserverPolyfill

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
    const contentmanager = useContext(ContentContext)
    const [portstate,setPortState] = useState('prepare')
    const portstateRef = useRef(null)
    portstateRef.current = portstate
    const isMounted = useIsMounted()
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

    // initialize
    useEffect(()=>{

        resizeObserverRef.current = new LocalResizeObserver(resizeCallback)
        resizeObserverRef.current.observe(viewportdivRef.current)

        return () => {

            resizeObserverRef.current.disconnect()

        }

    },[])

    const resizeCallback = useCallback((entries)=>{

        if (portstateRef.current == 'prepare') return

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
            if (isMounted()) setPortState('resizing')
        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {

            isResizingRef.current = false
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
    console.log('scrollerID, viewportDataRef.current',scrollerID, viewportDataRef.current)
    return <ViewportContext.Provider value = { viewportDataRef.current }>
        <div 
            data-type = 'viewport'
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