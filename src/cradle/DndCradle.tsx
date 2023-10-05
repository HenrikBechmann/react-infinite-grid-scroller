// DndCradle.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    The role of DndCradle is to initiate operations based on dropping of a source on a legitimate target.
    For intra-list drop it's straighforward: serviceHandler.moveIndex
    Special cases:
        - drop over or with failed CellFrames
        - drop over empty list
        - drop after source has been unmounted
        - inter-list drop with failed CellFrames

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
        // collect:(monitor:DropTargetMonitor) => {
        //     return {
        //         item:monitor.getItem() as any,
        //         isOver:monitor.isOver(),
        //         canDrop:monitor.canDrop(),
        //     }
        // },
        drop:(item:GenericObject,monitor) => {

            const dropResult:GenericObject = monitor.getDropResult()
            
            const sourceType = monitor.getItemType()
            // console.log('sourceType, dropResult',sourceType, dropResult)

            if (!dropResult || !dropResult.target) return

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
                const REMOVE = -1

                // last argument false = do not remove Items
                dragData.sourceCacheAPI.insertRemoveIndex(fromIndex, fromIndex, REMOVE, sourcelistsize, false) 
                dragData.sourceServiceHandler.newListSize = sourcelistsize - 1
                dragData.sourceStateHandler.setCradleState('changelistsizeafterinsertremove')

                // make space for insert
                const insert = +1
                const pendingChangesList = cacheAPI.insertRemoveIndex(toIndex, toIndex, insert, listsize)
                // pendingChangesList = [
                    // startChangeIndex, 
                    // rangeincrement, 
                    // cacheIndexesShiftedList, 
                    // cacheIndexesRemovedList, 
                    // cacheIndexesDeletedList,
                    // cacheIndexesToReplaceList, 
                    // portalPartitionItemsForDeleteList,
                // ]

                const [startChangeIndex, rangeincrement, cacheIndexesShiftedList] = pendingChangesList

                const fromScroller = item.scrollerID
                cacheAPI.transferPortalMetadataToScroller( item.itemID, toIndex ) // move into space

                contentHandler.synchronizeCradleItemIDsToCache(
                    cacheIndexesShiftedList, rangeincrement, startChangeIndex) // sync cradle

                serviceHandler.newListSize = listsize + rangeincrement // rangeincrement always +1 here

                stateHandler.setCradleState('applyinsertremovechanges') // re-render

                scrollerDndContext.displacedIndex = toIndex + 1

            }

            scrollerDndContext.droppedIndex = toIndex
            scrollerDndContext.sourceItem = item
            
        },
    })

    useEffect(()=>{

        targetConnector(viewportFrameElement)

    },[])

    const enhancedProps = {...props, handlerListRef}

    return <Cradle {...enhancedProps}/>

}

export default DndCradle