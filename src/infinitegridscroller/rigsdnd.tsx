// rigsdnd.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    Dnd is powered by react-dnd. The HTML or Touch backends are installed depending on the ismobile test.

    RigsDnd must be installed as host scroller to install the DndProvicer. Only one RigsDnd
    can be installed per environment.

    RigsDnd sets MasterDndContext.installed to true.
    dndOptions.master.enabled for the root scroller sets global enabled condition; true by default

    Global communication is supported by MasterDndContext, and Scroller-scoped communication is provided by 
    ScrollerDndContext (see InfiniteGridScroller for details)

    components dedicated to dnd are
    - RigsDnd - HoC for InfiniteGridScroller, master
    - DndViewport - HoC for Viewport, show scroll areas
    - DndDragBar - conditionally rendered by Viewport, for drag layer
    - DndCradle - HoC for Cradle, useDrop for drop handling
    - DndCellFrame - HoC for CellFrame, useDrop for location
    - DragIcon - useDrag, conditionally rendered by CellFrame for drag

    MasterDndContext (global scoped namespace) is used by
    - RigsDnd
    - InfiniteGridScroller
    - DndViewport
    - Viewport
    - DndDragBar
    - DndCradle
    - Cradle
    - DndCellFrame
    - CellFrame

    ScrollerDndContext (scroller scoped namespace) is used by the same modules as MasterDndContext except
    - also DragIcon
    - not Viewport

*/

import React, { 
    useEffect, 
    useContext, 
    useRef,
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

    if (!masterDndContext.installed) masterDndContext.installed = true

    const { dndOptions } = props

    const isMountedRef = useRef(true)

    useEffect(() =>{

        isMountedRef.current = true

        return () => {

            isMountedRef.current = false

        }
    },[])

    useEffect(()=>{

        let isEnabled = dndOptions?.master?.enabled

        isEnabled = isEnabled ?? true

        if (!(masterDndContext.enabled === isEnabled)) {
            masterDndContext.enabled = isEnabled
        }

        return () => {
            if (!isMountedRef.current) {
                Object.assign(masterDndContext,{
                    enabled:false,
                    installed:false,
                    scrollerID:null,
                    setViewportState:null, // loaded by Viewport if scrollerID compares, refresh render
                    setDragBarState:null, // loaded by DragBar if scrollerID compares, refresh render
                    dropCount:0,
                    dragData:{
                        isDragging:false,
                        itemID:null,
                        index:null,
                        dndOptions:{} as GenericObject,
                        // the following for inter-list drops to process drag source
                        sourceCacheAPI:null,
                        sourceStateHandler:null,
                        sourceServiceHandler:null,
                    }
                })
            }
        }

    },[dndOptions])

    const enhancedProps = {...props, isDndMaster:true}

    return <DndProvider backend={DndBackend} options = {backendOptions}>
        <InfiniteGridScroller {...enhancedProps} />
    </DndProvider>

}

// use custom function only if elementsFromPoint is not supported
const backendOptions = {
  getDropTargetElementsAtPoint: !hasNativeElementsFromPoint && getDropTargetElementsAtPoint
}
