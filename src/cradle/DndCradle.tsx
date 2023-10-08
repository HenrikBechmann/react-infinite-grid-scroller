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
        viewportElement = viewportContext.elementRef.current,
        { scrollerID, virtualListSpecs } = props,
        { size:listsize } = virtualListSpecs

    // const [ targetData, targetConnector ] = useDrop({
    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['-x-x-x-'],
        collect:(monitor) => {
            return {
                canDrop:monitor.canDrop(),
            }
        },
        drop:(item:DndItem, monitor) => {

            // TODO take into account that drop onto blank portion of Viewport is
            // legitimate given Viewport open space
            // signifies last position for either intra-list or inter-list
            // could be legitimate for single list item list copy
                
            const dropResult:GenericObject = monitor.getDropResult()

            console.log('DndCradle: listsize, dropResult',listsize, dropResult)

            if (

                !dropResult || // cautious
                !dropResult.target || // cautious
                ((dropResult.dataType == 'viewport') && listsize !== 0) // require CellFrame location

            ) return

            const dropEffect = dropResult.dropEffect || 'move' // default for mobile

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

            // -------------------------[ intra-list ]------------------------
            if (fromScrollerID === toScrollerID) {

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

            // -------------------------[ inter-list ]------------------------
            } else {
                
                const { dragData } = masterDndContext
                // move existing cache item
                if (cacheAPI.itemMetadataMap.has(itemID) && dropEffect == 'move') {

                    // ------------ resolve source data
                    const 
                        [ sourceProps ] = dragData.sourceServiceHandler.getPropertiesSnapshot(),
                        { size:sourcelistsize } = sourceProps.virtualListProps

                    let incrementDirection = -1

                    // remove item from source scroller (but leave in cache)
                    dragData.sourceCacheAPI.insertOrRemoveIndexedItemsFromScroller(
                        fromIndex, fromIndex, incrementDirection, sourcelistsize) 
                    dragData.sourceServiceHandler.newListSize = sourcelistsize - 1
                    dragData.sourceStateHandler.setCradleState('changelistsizeafterinsertremove')

                    // ------------ resolve target data
                    incrementDirection = +1 // insert
                    
                    const [startChangeIndex, rangeincrement, cacheIndexesShiftedList] = 
                        cacheAPI.insertOrRemoveIndexedItems(toIndex, toIndex, incrementDirection, listsize)

                    cacheAPI.addCacheItemToScroller( itemID, toIndex ) // move item to scroller

                    contentHandler.synchronizeCradleItemIDsToCache( // sync cradle
                        cacheIndexesShiftedList, rangeincrement, startChangeIndex) 

                    serviceHandler.newListSize = listsize + rangeincrement // rangeincrement always +1 here

                    scrollerDndContext.displacedIndex = toIndex + 1

                    stateHandler.setCradleState('applyinsertremovechanges') // re-render

                } else { // copy item, or move non-cache item

                    if (dropEffect == 'move') {
                        dragData.sourceServiceHandler.removeIndex(fromIndex)
                    }

                    // move or copy requires fetch
                    scrollerDndContext.dndFetchIndex = toIndex
                    scrollerDndContext.dndFetchItem = item

                    scrollerDndContext.displacedIndex = toIndex + 1
                    serviceHandler.insertIndex(toIndex)

                }

            }

            scrollerDndContext.droppedIndex = toIndex
            
        },
    },[listsize])

    // console.log('targetData.canDrop, didDrop',targetData.canDrop, targetData.didDrop)

    useEffect(()=>{

        targetConnector(viewportElement)

    },[])

    const enhancedProps = {...props, handlerListRef}

    return <Cradle {...enhancedProps}/>

}

export default DndCradle