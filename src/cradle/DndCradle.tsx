// DndCradle.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    The role of DndCradle is to initiate operations based on dropping of a source on a legitimate target.
    For intra-list drop it's straighforward: serviceHandler.moveIndex
    Special cases:
        - intra-list or inter-list drop over or with failed CellFrames
        - drop over empty list
        - drop after source has been unmounted
        - copy vs move

*/

import React, {useEffect, useContext, useRef } from 'react'

import { useDrop, DropTargetMonitor } from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'
import { ViewportContext } from '../Viewport'

import { Cradle } from '../Cradle'

// HoC for DnD functionality
const DndCradle = (props) => {

    const 
        masterDndContext = useContext(MasterDndContext),
        scrollerDndContext = useContext(ScrollerDndContext),
        viewportContext = useContext(ViewportContext),

        handlerListRef = useRef(null),

        viewportFrameElement = viewportContext.frameElementRef.current,
        { scrollerID, virtualListSpecs } = props,
        { size:listsize } = virtualListSpecs

    // const [ targetData, targetConnector ] = useDrop({
    const [ , targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['-x-x-x-'],
        drop:(item:GenericObject,monitor) => {

            const dropResult:GenericObject = monitor.getDropResult()

            console.log('listsize, dropResult',listsize, dropResult)

            if (
                !dropResult || 
                !dropResult.target || 
                ((dropResult.dataType == 'viewport') && listsize !== 0)
            ) return

            const { dropEffect } = dropResult

            const {
                serviceHandler, 
                cacheAPI, 
                contentHandler,
                stateHandler,
            } = handlerListRef.current

            const 
                fromIndex = item.index,
                toIndex = dropResult.target.index

            if (item.scrollerID === dropResult.target.scrollerID) { // intra-list

                serviceHandler.moveIndex(toIndex, fromIndex)

                scrollerDndContext.displacedIndex = 
                    (fromIndex > toIndex)? 
                        toIndex + 1:
                        toIndex - 1

            } else { // inter-list

                const { dragData } = masterDndContext
                const [ sourceProps ] = dragData.sourceServiceHandler.getPropertiesSnapshot()
                const { size:sourcelistsize } = sourceProps.virtualListProps
                let incrementDirection = -1

                // remove item from source scroller (but leave in cache)
                dragData.sourceCacheAPI.insertOrRemoveIndexedItemsFromScroller(
                    fromIndex, fromIndex, incrementDirection, sourcelistsize) 
                dragData.sourceServiceHandler.newListSize = sourcelistsize - 1
                dragData.sourceStateHandler.setCradleState('changelistsizeafterinsertremove')

                // make space for insert
                incrementDirection = +1
                const [startChangeIndex, rangeincrement, cacheIndexesShiftedList] = 
                    cacheAPI.insertOrRemoveIndexedItems(toIndex, toIndex, incrementDirection, listsize)

                const portalMetadata = cacheAPI.addCacheItemToScroller( item.itemID, toIndex ) // move into space

                contentHandler.synchronizeCradleItemIDsToCache(
                    cacheIndexesShiftedList, rangeincrement, startChangeIndex) // sync cradle

                serviceHandler.newListSize = listsize + rangeincrement // rangeincrement always +1 here

                stateHandler.setCradleState('applyinsertremovechanges') // re-render

                scrollerDndContext.displacedIndex = toIndex + 1 // TODO place before setCradleState?

            }

            scrollerDndContext.droppedIndex = toIndex
            scrollerDndContext.sourceItem = item
            
        },
    },[listsize])

    useEffect(()=>{

        targetConnector(viewportFrameElement)

    },[])

    const enhancedProps = {...props, handlerListRef}

    return <Cradle {...enhancedProps}/>

}

export default DndCradle