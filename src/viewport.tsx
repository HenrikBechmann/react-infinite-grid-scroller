// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (scrollblock and cradle), 
    and act as the visible portal of the list being shown
*/

import React, {useState, useRef, useEffect, useMemo, useCallback} from 'react'

export const ViewportContext = React.createContext(null)

import useIsMounted from 'react-is-mounted-hook'

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
}) => {

    // -----------------------[ initialize ]------------------

    // processing state
    const [portstate,setPortState] = useState('prepare')
    const isMounted = useIsMounted()
    // data heap
    const timeoutidRef = useRef(null)
    const viewportdivRef = useRef(undefined)
    const resizeScrollPosRef = useRef({top:0,left:0})
    const divlinerstyleRef = useRef(
        Object.assign({
        position:'absolute',
        top:0,
        right:0,
        bottom:0,
        left:0,
        overflow:'auto',
        backgroundColor:'red',
    } as React.CSSProperties,styles?.viewport))
    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)
    const viewportDataRef = useRef(null)

    // initialize
    useEffect(()=>{

        window.addEventListener('resize',onResize)

        return () => {
            window.removeEventListener('resize',onResize)
        }

    },[])

    // event listener callback
    const onResize = useCallback(() => {

        if (!isResizingRef.current) {
            isResizingRef.current = true 
                // below is a realtime message to cradle.onScroll
                // to stop updating the referenceIndexData, and to the item observer to stop
                // triggering responses (anticipating reset of cradle content based on resize)
            viewportDataRef.current.isResizing = true
            resizeScrollPosRef.current = {
                top:viewportdivRef.current.scrollTop,
                left:viewportdivRef.current.scrollLeft
            }
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
    return <ViewportContext.Provider value = { viewportDataRef.current }>
        <div 
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