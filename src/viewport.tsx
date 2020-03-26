// viewport.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of viewport is to provide data to its children (cradle)
*/

import React, {useState, useRef, useEffect, useMemo, useCallback} from 'react'

import { GenericObject } from '../../../services/interfaces'

export const ViewportContext = React.createContext(null)

// control constants
const SCROLL_DIFF_FOR_UPDATE = 20
const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 250
const RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE = 250

const Viewport = ({
    children, 
    orientation, 
    cellWidth, 
    cellHeight, 
    gap, 
    padding, 
    component, 
    styles,
}) => {

    const [portstate,setPortState] = useState('prepare')

    // console.log('running VIEWPORT with portstate',portstate)

    const sizegenerationcounterRef = useRef(0)
    const timeoutidRef = useRef(null)
    const viewportdivRef = useRef(undefined)
    const resizeScrollPosRef = useRef({top:0,left:0})
    const divlinerstyleRef = useRef(
        Object.assign({
        position:'absolute',
        height:'100%',
        width:'100%',
        overflow:'auto',
        backgroundColor:'red',
    } as React.CSSProperties,styles?.viewport))

    useEffect(()=>{

        window.addEventListener('resize',onResize)

        return () => {
            window.removeEventListener('resize',onResize)
        }

    },[])

    const resizeTimeridRef = useRef(null)
    const isResizingRef = useRef(false)

    const onResize = useCallback(() => {

        if (!isResizingRef.current) {
            isResizingRef.current = true
            viewportDataRef.current.isResizing = true
            resizeScrollPosRef.current = {
                top:viewportdivRef.current.scrollTop,
                left:viewportdivRef.current.scrollLeft
            }
            // pauseObserversRef.current = true
            setPortState('resizing')
        }

        clearTimeout(resizeTimeridRef.current)
        resizeTimeridRef.current = setTimeout(() => {

            isResizingRef.current = false
            setPortState('resize')

        },250)

    },[])

    useEffect(()=>{
        switch (portstate) {
            case 'prepare':
                // setPortState('render')
                // break
            case 'resize': {
                setPortState('render')
                break
            }
        }
    },[portstate])

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

    const viewportDataRef = useRef(null)

    let viewportClientRect
    if (viewportdivRef.current) {
        viewportClientRect = viewportdivRef.current.getBoundingClientRect()
    } else {
        viewportClientRect = {}
    }
    let {top, right, bottom, left} = viewportClientRect

    viewportDataRef.current = useMemo(() => {
        let width, height, localViewportData
        if (!(top === undefined)) { //proxy
            width = (right - left)
            height = (bottom - top)
            localViewportData = {
                viewportDimensions:{top,right, bottom, left, width, height},
                elementref:viewportdivRef,
                isResizing:isResizingRef.current,
                scrollPos:{
                    left:resizeScrollPosRef.current.left,
                    top:resizeScrollPosRef.current.top,
                }
            }
            // console.log('recalculating viewport data: localViewportData',
            //     localViewportData)
        }
        return localViewportData

    },[orientation, top, right, bottom, left,isResizingRef.current])

    let divlinerstyle = divlinerstyleRef.current as React.CSSProperties

    return <ViewportContext.Provider value = { viewportDataRef.current }>
        <div 
            style = {divlinerstyle}
            ref = {viewportdivRef}
        >
            { (portstate != 'prepare')?children:null }
        </div>
    </ViewportContext.Provider>
    
} // Viewport

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