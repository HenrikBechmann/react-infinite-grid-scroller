// rigsdnd.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    Dnd is powered by react-dnd. The HTML or Touch backends are installed depending on the isMobile test.

    RigsDnd must be installed as host scroller to install the DndProvider. Only one RigsDnd
    can be installed per environment.

    RigsDnd sets MasterDndContext.installed to true, and informs the child InfiniteGridScroller that it is 
        the master scroller.

    shows DndDragBar when dragging according to masterDndContext, 
        and shows DndScrollTabs on request from DndViewport
        
    dndOptions.master.enabled for the root scroller sets global enabled condition; true by default

    Global communication is supported by MasterDndContext, and Scroller-scoped communication is provided by 
    ScrollerDndContext (see InfiniteGridScroller for details)

    components dedicated to dnd are
    - RigsDnd - *HoC* for InfiniteGridScroller, master
    - DndViewport - useDrop - *HoC* for Viewport, show scroll areas
    - DndDragBar - conditionally rendered by Viewport, for drag layer
    - DndScrollTab - useDrop, conditionally rendered by Viewport, for scrollTab and target list canDrop isOver highlighting
    - DndCradle - useDrop - *HoC* for Cradle, useDrop for drop handling
    - DndCellFrame - useDrop - *HoC* for CellFrame, useDrop for location
    - DndDragIcon - useDrag, conditionally rendered by CellFrame for drag

    MasterDndContext (global scoped namespace) is used by (all but DndDragIcon & DndDisplaceIcon)
    - RigsDnd
        - InfiniteGridScroller
    - DndViewport (useDrop)
        - Viewport
            - DndDragBar
            - DndScrollTab (useDrop)
    - DndCradle (useDrop)
        - Cradle
    - DndCellFrame (useDrop)
        - CellFrame
            - DndDragIcon (useDrag)
            - DndDisplaceIcon

    ScrollerDndContext (scroller scoped namespace) is used by the same modules as MasterDndContext except
    - also DndDragIcon
    - not Viewport

*/

import React, { 
    useState,
    useEffect, 
    useContext, 
    useRef,
    CSSProperties,
} from 'react'

import InfiniteGridScroller, { MasterDndContext, GenericObject } from '../InfiniteGridScroller'
import DndDragBar from '../InfiniteGridScroller/DndDragBar'

// dnd support
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

const DndBackend = 
    isMobile
        ? TouchBackend
        : HTML5Backend

// recommended by TouchBackend...
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

// drag source data
export const masterDndDragContextBase = {
    isDragging:false,
    canDrop:false,
    itemID:null,
    index:null,
    scrollerID:null,
    dndOptions:null,
    scrollerDndOptions:null,
    scrollerProfile:null,
    // processing
    sourceCacheAPI:null,
    sourceStateHandler:null,
    sourceServiceHandler:null,
    setDndCellFrameState:null,
}

// master dnd control data
export const masterDndContextBase = {
    // master data
    enabled:false,
    installed:false,
    scrollerID:null, // the root scroller
    // current drag status
    prescribedDropEffect:null,
    dynamicDropEffect:null,        
    altKey:null,
    onDroppableWhitespace:false,
    whitespacePosition:null,
    // source data
    dropCount:0,
    dragContext:{...masterDndDragContextBase},
    // functions
    getDropEffect:null, // provided by host to RigsDnd
    setRigsDndState:null, // loaded by Viewport if scrollerID compares, to refresh render
    setDragBarState:null, // loaded by DragBar if scrollerID compares, to refresh render
}

// wrapper for Dnd provider
export const RigsDnd = (props) => { // must be loaded as root scroller by host to set up Dnd provider

    const 
        [rigsDndState, setRigsDndState] = useState('setup'),
        masterDndContext = useContext(MasterDndContext)

    console.log('rigsDndState',rigsDndState)

    if (!masterDndContext.installed) masterDndContext.installed = true
    if (!masterDndContext.setRigsDndState) masterDndContext.setRigsDndState = setRigsDndState

    let { dndOptions, getDropEffect } = props

    const isMountedRef = useRef(true),

        basedivstyleRef = useRef<CSSProperties>({
            position:'absolute',
            inset:'0',
        }),

        { dragContext } = masterDndContext


    useEffect(()=>{

        isMountedRef.current = true

        return () => {
            isMountedRef.current = false
        }

    },[])

    useEffect(()=>{

        return () => {

            if (isMountedRef.current) return

            Object.assign(masterDndContext,{...masterDndContextBase})

        }

    },[])

    useEffect(()=>{
        let isEnabled = dndOptions?.master?.enabled

        isEnabled = isEnabled ?? true

        if (!(masterDndContext.enabled === isEnabled)) {

            masterDndContext.enabled = isEnabled

        }

        if (masterDndContext.getDropEffect !== getDropEffect) {

            masterDndContext.getDropEffect = getDropEffect

        }

    },[dndOptions, getDropEffect])

    const enhancedProps = Object.assign(props, {isDndMaster:true})

    useEffect(()=>{

        switch (rigsDndState) {
            case 'startdragbar':
            case 'setup': { // give reset of masterDndContext from previous instance a chance to complete

                setRigsDndState('ready')

                break
            }
        }

    },[rigsDndState])

    return <DndProvider backend={DndBackend} options = {backendOptions}>
        <div data-type = 'dnd-base' style = {basedivstyleRef.current}>
            { masterDndContext.installed
                && dragContext.isDragging 
                && <DndDragBar />
            }
            {(rigsDndState !== 'setup') && <InfiniteGridScroller {...enhancedProps} />}
        </div>
    </DndProvider>

}

// use custom function only if elementsFromPoint is not supported
const backendOptions = {

  getDropTargetElementsAtPoint: !hasNativeElementsFromPoint && getDropTargetElementsAtPoint

}
