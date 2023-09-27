// DndScrollTab.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useEffect, useContext, useRef, useMemo, CSSProperties } from 'react'

import { useDrop, DropTargetMonitor} from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import scrollicon from "../../assets/keyboard_double_arrow_right_FILL0_wght400_GRAD0_opsz24.png"

const DndScrollTab = (props) => {

    const scrolltabRef = useRef(null)
    const { position, gridSpecs } = props // head, tail
    const { orientation } = gridSpecs
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

    const [transform, top, right, bottom, left, borderRadius] = useMemo(()=>{

        let transform, top, right, bottom, left, borderRadius
        switch (location) {
            case 'topright': {
                transform = 'rotate(0.75turn)'
                top = '0'
                right = '0'
                bottom = null
                left = null
                borderRadius = '0 0 0 8px'
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
                break
            }
            case 'bottomleft': {
                transform = 'rotate(0.5turn)'
                top = null
                right = null
                bottom = '0'
                left = '0'
                borderRadius = '0 8px 0 0'
                break
            }
        }
        return [transform, top, right, bottom, left, borderRadius]
    },[location, orientation])

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

    return <div ref = {scrolltabRef} style = {stylesRef.current} data-type = 'scroll-tab'> 
        <img style = {imgstyleRef.current} src = {scrollicon} />
    </div>

}

export default DndScrollTab