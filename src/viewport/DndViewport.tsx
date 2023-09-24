// DndViewport.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useEffect, useContext, useRef } from 'react'

import { useDrop} from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import { Viewport } from '../Viewport'

// HoC for DnD functionality
const DndViewport = (props) => {

    const scrollerDndContext = useContext(ScrollerDndContext)

    const viewportElementRef = useRef(null)

    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['Cell'],

    
    })

    useEffect(()=>{

        targetConnector(viewportElementRef.current)

    },[])

    const enhancedProps = {...props,viewportElementRef}

    return <Viewport {...enhancedProps}/>

}

export default DndViewport