// DndScrollTab.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useEffect, useContext, useRef, useMemo, CSSProperties } from 'react'

import { useDrop, DropTargetMonitor} from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import scrollicon from "../../assets/keyboard_double_arrow_right_FILL0_wght400_GRAD0_opsz24.png"

const DndScrollTab = (props) => {

    const 
        scrollerDndContext = useContext(ScrollerDndContext),

        { serviceHandler } = scrollerDndContext,

        scrolltabRef = useRef(null),
        { 
            position, // head, tail
            gridSpecs,
            SCROLLTAB_INTERVAL_MILLISECONDS,
            SCROLLTAB_INTERVAL_PIXELS,
        } = props,
        { orientation } = gridSpecs

    const [className, location] = useMemo(()=>{

        let className, location
        if (position == 'head') {
            if (orientation == 'vertical') {
                className = 'rigs-scrolltab-highlight-top'
                location = 'topright'
            } else {
                className = 'rigs-scrolltab-highlight-bottom'
                location = 'bottomright'
            }
        } else { // tail
            if (orientation == 'vertical') {
                className = 'rigs-scrolltab-highlight-bottom'
                location = 'bottomright'
            } else {
                className = 'rigs-scrolltab-highlight-left'
                location = 'bottomleft'
            }
        }
        return [className, location]
    },[orientation, position])

    const [transform, top, right, bottom, left, borderRadius, scrollByPixel] = useMemo(()=>{
        const scrollByPixels = SCROLLTAB_INTERVAL_PIXELS
        let transform, top, right, bottom, left, borderRadius, scrollByPixel
        switch (location) {
            case 'topright': {
                transform = 'rotate(0.75turn)'
                top = '0'
                right = '0'
                bottom = null
                left = null
                borderRadius = '0 0 0 8px'
                scrollByPixel = -scrollByPixels
                break
            }
            case 'bottomright': {
                transform = 
                    orientation == 'vertical'?
                        'rotate(0.25turn)':
                        'rotate(0turn)'
                top = null
                right = '0'
                bottom = '0'
                left = null
                borderRadius = '8px 0 0 0'
                scrollByPixel = 
                    (orientation == 'vertical')?
                        scrollByPixels:
                        -scrollByPixels
                break
            }
            case 'bottomleft': {
                transform = 'rotate(0.5turn)'
                top = null
                right = null
                bottom = '0'
                left = '0'
                borderRadius = '0 8px 0 0'
                scrollByPixel = scrollByPixels
                break
            }
        }

        return [transform, top, right, bottom, left, borderRadius, scrollByPixel]

    },[location, orientation, SCROLLTAB_INTERVAL_PIXELS])

    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['Viewport'],
        collect:(monitor:DropTargetMonitor) => {
            return {
                isOver:monitor.isOver(),
                canDrop:monitor.canDrop(),
            }
        },

    })

    const {isOver, canDrop } = targetData

    const stylesRef = useRef<CSSProperties>({
        display:'flex',
        alignItems:'center',
        zIndex:6,
        justifyContent:'center',
        backgroundColor:'white',
        position:'absolute',
        top,
        right,
        bottom,
        left,
        borderRadius,
        border:'1px solid black',
        height:'35px',
        width:'35px',
    })

    const imgstyleRef = useRef({
        transform,
    })

    useEffect(()=>{

        scrolltabRef.current.classList.add(className)
        
    },[className])

    const intervalIDRef = useRef(null)

    useEffect(()=>{

        if (isOver && canDrop) {

            intervalIDRef.current = setInterval(()=>{
                serviceHandler.scrollByPixel(scrollByPixel)
            },SCROLLTAB_INTERVAL_MILLISECONDS)
        } else {
            clearInterval(intervalIDRef.current)
        }

        return () => {
            clearInterval(intervalIDRef.current)
        }

    },[isOver, canDrop, scrollByPixel])

    return <div ref = {(r) => {
        
        scrolltabRef.current = r
        targetConnector(r)

    }} style = {stylesRef.current} data-type = 'scroll-tab'> 
        <img style = {imgstyleRef.current} src = {scrollicon} />
    </div>

}

export default DndScrollTab