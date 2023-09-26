// DndScrollTab.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useEffect, useContext, useRef, CSSProperties } from 'react'

import { useDrop, DropTargetMonitor} from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import scrollicon from "../../assets/keyboard_double_arrow_right_FILL0_wght400_GRAD0_opsz24.png"

const DndScrollTab = (props) => {

    const scrolltabRef = useRef(null)
    const { presentationOrder, gridProps, showScrollTabs} = props // head, tail
    // const { orientation } = gridProps
    const stylesRef = useRef<CSSProperties>({
        display:'flex',
        alignItems:'center',
        zIndex:6,
        justifyContent:'center',
        transform:'rotate(0.75turn)',
        backgroundColor:'white',
        // opacity:'0.7',
        position:'absolute',
        top:'0',
        right:'0',
        bottom:null,
        left:null,
        borderRadius:'8px 0 0 0',
        // boxShadow:'-3px -3px 3px 3px lightgray',
        border:'1px solid black',
        height:'35px',
        width:'35px',
    })

    useEffect(()=>{
        scrolltabRef.current.classList.add('rigs-scrolltab-highlight')
    },[])

    return <div ref = {scrolltabRef} style = {stylesRef.current} data-type = 'scroll-tab'> 
        <img src = {scrollicon} />
    </div>

}

export default DndScrollTab