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

type DndItem = { 
    scrollerID:number,
    itemID:number, 
    index:number,
    profile:GenericObject, // host defined
    dropEffect:string, // undefined, or dropEffect property set in useDrag
}


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
    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['-x-x-x-'],
        collect:(monitor) => {
            return {
                canDrop:monitor.canDrop()
            }
        },
        drop:(item:DndItem,monitor) => {

            console.log('dropping in DndCradle')

            const dropResult:GenericObject = monitor.getDropResult()

            console.log('DndCradle: listsize, dropResult',listsize, dropResult)

            if (

                // TODO take into account that drop onto blank portion of Viewport is
                // legitimate given Viewport open space
                // signifies last position for either intra-list or inter-list
                // could be legitimate for single list item list copy
                !dropResult || // cautious
                !dropResult.target || // cautious
                ((dropResult.dataType == 'viewport') && listsize !== 0) // require CellFrame location

            ) return

            const { dropEffect } = dropResult

            item.dropEffect = dropEffect

            const {
                serviceHandler, 
                cacheAPI, 
                contentHandler,
                stateHandler,
            } = handlerListRef.current

            const 
                fromIndex = item.index,
                fromScrollerID = item.scrollerID,

                toIndex = dropResult.target.index,
                toScrollerID = dropResult.target.scrollerID,

                itemID = item.itemID,

                displacedIndex = 
                    (fromIndex > toIndex)? 
                        toIndex + 1:
                        toIndex - 1

            if (fromScrollerID === toScrollerID) { // intra-list

                scrollerDndContext.displacedIndex = displacedIndex
                if (!cacheAPI.itemMetadataMap.has(itemID) || (dropEffect == 'copy')) { // will have to fetch

                    scrollerDndContext.dndFetchIndex = toIndex
                    scrollerDndContext.dndFetchItem = item

                }

                if (dropEffect == 'move') {

                    serviceHandler.moveIndex(toIndex, fromIndex)

                } else {

                    serviceHandler.insertIndex(toIndex)

                }

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

                const portalMetadata = cacheAPI.addCacheItemToScroller( itemID, toIndex ) // move into space

                contentHandler.synchronizeCradleItemIDsToCache(
                    cacheIndexesShiftedList, rangeincrement, startChangeIndex) // sync cradle

                serviceHandler.newListSize = listsize + rangeincrement // rangeincrement always +1 here

                scrollerDndContext.displacedIndex = toIndex + 1

                stateHandler.setCradleState('applyinsertremovechanges') // re-render

            }

            scrollerDndContext.droppedIndex = toIndex
            // scrollerDndContext.sourceItem = item
            
        },
    },[listsize])

    console.log('targetData.canDrop',targetData.canDrop)

    useEffect(()=>{

        console.log('setting connector')

        targetConnector(viewportFrameElement)

    },[])

    const enhancedProps = {...props, handlerListRef}

    return <Cradle {...enhancedProps}/>

}

export default DndCradle