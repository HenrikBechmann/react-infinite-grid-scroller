// rigsdnd.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    Dnd is powered by react-dnd. The HTML or Touch backends are installed depending on the ismobile test.

    RigsDnd must be installed as host scroller to support dnd as it installs the dnd Provicer. Only on RigsDnd
    can be installed per environment.

    Global communication is supported by MasterDndContext, and Scroller-scoped communication is provided by 
    ScrollerDndContext (see InfiniteGridScroller for details)
*/

import React, { 
    useEffect, 
    useContext, 
} from 'react'

import InfiniteGridScroller, { MasterDndContext, GenericObject } from '../InfiniteGridScroller'

// dnd support
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

const ismobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

const DndBackend = ismobile?TouchBackend:HTML5Backend

// recommended...
const hasNativeElementsFromPoint =
  document && (document['elementsFromPoint'] || document['msElementsFromPoint'])

function getDropTargetElementsAtPoint(x, y, dropTargets) {
  return dropTargets.filter((t) => {
    const rect = t.getBoundingClientRect()
    return (
      x >= rect.left && x <= rect.right && y <= rect.bottom && y >= rect.top
    )
  })
}

// wrapper for Dnd provider - the export statement for this is next to RigsWrapper export statement below
export const RigsDnd = (props) => { // must be loaded as root scroller by host to set up Dnd provider

    const masterDndContext = useContext(MasterDndContext)

    const { dndOptions } = props

    useEffect(()=>{

        let isEnabled = dndOptions?.enabled

        isEnabled = isEnabled ?? true

        if (!masterDndContext.dnd) masterDndContext.dnd = true

        if (!(masterDndContext.enabled === isEnabled)) {
            masterDndContext.enabled = isEnabled
        }

        return () => {
            Object.assign(masterDndContext,{
                dnd:false,
                active:false,
                enabled:false,
                scrollerID:null,
                setViewportState:null,
                setDragBarState:null,
                dropCount:0,
                dragData:{
                    isDragging:false,
                    itemID:null,
                    index:null,
                    dndOptions:{} as GenericObject,
                    sourceCacheAPI:null,
                    sourceStateHandler:null,
                    sourceServiceHandler:null,
                }
            })
        }

    },[masterDndContext,dndOptions])

    const enhancedProps = {...props, isDndMaster:true}

    return <DndProvider backend={DndBackend} options = {backendOptions}>
        <InfiniteGridScroller {...enhancedProps} />
    </DndProvider>

}

// use custom function only if elementsFromPoint is not supported
const backendOptions = {
  getDropTargetElementsAtPoint: !hasNativeElementsFromPoint && getDropTargetElementsAtPoint
}
