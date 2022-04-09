// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle),
    and act as the visible screen portal of the list being shown
*/

import React, {useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, useContext} from 'react'

export const ViewportContext = React.createContext(null) // for children

import { ResizeObserver } from '@juggle/resize-observer'

import { CradleContext } from './cradle'

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

    const [viewportState,setViewportState] = useState('setup');
    const viewportStateRef = useRef(null) // for useCallback -> resizeCallback
    viewportStateRef.current = viewportState

    // only available if viewport is a child of an infiniteScroller
    const parentCradlePropertiesRef = useContext(CradleContext);

    // if this is a child, get the parent portal manager
    const parentPortalManagerRef = useRef(parentCradlePropertiesRef?.current.portalManager);

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
         }, styles?.viewport)

    },[styles?.viewport])

    const viewportdivRef = useRef(null)

    // viewportPropertiesRef is passed as context to children
    const viewportPropertiesRef = useRef(
        {
            portal:null, 
            isResizing:false, 
            index:null
        }
    )

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

        if (viewportStateRef.current == 'setup') {

            return

        }

        const target = entries[0].target

        if (!target.dataset.initialized) {

            // console.log('initializing target', target.dataset)
            target.dataset.initialized = true

            return

        }

        if (!isResizingRef.current) { // generate interrupt response
            viewportPropertiesRef.current.isResizing = isResizingRef.current = true 
            // new object creation triggers a realtime message to cradle through context
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

    // get portal for non-root viewports
    useEffect(()=>{

        if (!parentPortalManagerRef.current) return // root

        const parentPortalManager = parentPortalManagerRef.current

        let portalindex
        let element = viewportdivRef.current

        while (element) {
            if (element.dataset && (element.dataset.type == 'portalcontainer')) {
                portalindex = parseInt(element.dataset.index)
                viewportPropertiesRef.current.portal = parentPortalManager.getPortal(portalindex)
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

    // ----------------------------------[ calculate ]--------------------------------

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

    // set context data for children
    viewportPropertiesRef.current = useMemo(() => {

        if (viewportState == 'setup') return viewportPropertiesRef.current

        const {top, right, bottom, left} = viewportdivRef.current.getBoundingClientRect()
        const width = (right - left)
        const height = (bottom - top)

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

    return <ViewportContext.Provider value = { viewportPropertiesRef.current }>
        <div 
            data-type = 'viewport'
            data-scrollerid = {scrollerID}
            style = {divlinerstyleRef.current}
            ref = {viewportdivRef}
        >
            { (viewportState != 'setup') && children }
        </div>
    </ViewportContext.Provider>
    
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
