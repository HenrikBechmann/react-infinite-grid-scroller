// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback} from 'react'

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

    const [viewportstate,setViewportState] = useState('setup')

    // console.log('running scrollerID viewportstate',scrollerID,viewportstate)

    const viewportstateRef = useRef(null) // for useCallback -> resizeCallback
    viewportstateRef.current = viewportstate
    const isMountedRef = useRef(true) // monitor for unmounted

    useEffect(() => {

        // unmount
        return () => {isMountedRef.current = false}

    },[])

    const divlinerstyleRef = useRef(null)

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

    const viewportdivRef = useRef(null)

    // viewportDataRef is passed as context to children
    const viewportDataRef = useRef({portal:null, isResizing:false}) //, isReparenting: false})

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

    // used by resizeObserver; generates interrupt
    const resizeCallback = useCallback((entries)=>{

        if (viewportstateRef.current == 'setup') {

            return

        }

        const target = entries[0].target

        if (!target.dataset.initialized) {

            // console.log('initializing target', target.dataset)
            target.dataset.initialized = true

            return

        }

        if (!isResizingRef.current) { // generate interrupt response
            viewportDataRef.current.isResizing = isResizingRef.current = true 
            // new object creation triggers a realtime message to cradle through context
            viewportDataRef.current = Object.assign({},viewportDataRef.current) 

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

    // ----------------------------------[ calculate ]--------------------------------

    // calculated values
    divlinerstyleRef.current = useMemo(() => {

        // TODO: gap
        let mincrosslength = calcMinViewportCrossLength(orientation, cellWidth, cellHeight, padding)
        let styles = Object.assign({},divlinerstyleRef.current) // avoid readonly

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
            // case 'reparenting':
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
            { (viewportstate != 'setup') && children }
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
