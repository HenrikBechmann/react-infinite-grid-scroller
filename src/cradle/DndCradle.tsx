// DndCradle.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useEffect, useContext, useRef } from 'react'

import { useDrop, DropTargetMonitor } from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import { Cradle } from '../Cradle'

import { ViewportContext } from '../Viewport'

// HoC for DnD functionality
const DndCradle = (props) => {

    // console.log('running DndCradle')

    const 
        scrollerDndContext = useContext(ScrollerDndContext),
        masterDndContext = useContext(MasterDndContext),
        viewportContext = useContext(ViewportContext),
        handlerListRef = useRef(null),
        viewportElement = viewportContext.elementRef.current,
        { scrollerID, virtualListSpecs } = props,
        { size:listsize } = virtualListSpecs


    // console.log('scrollerDndContext.dndOptions.accept',
    //     scrollerDndContext.dndOptions.accept)

    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['Cell'],
        collect:(monitor:DropTargetMonitor) => {
            console.log('collecting from DndCradle')
            return {
                item:monitor.getItem() as any,
                isOver:monitor.isOver(),
                canDrop:monitor.canDrop(),
            }
        },
        drop:(item:GenericObject,monitor) => {
            const dropResult:GenericObject = monitor.getDropResult()

            console.log('DndCradle: dropResult', dropResult)
            if (!dropResult) return // TODO: check for drop on empty list

            const {
                serviceHandler, 
                cacheAPI, 
                contentHandler,
                stateHandler,
            } = handlerListRef.current

            const 
                fromIndex = item.index,
                toIndex = dropResult.target.index

            console.log('DndCradle drop: item.scrollerID, dropResult.target.scrollerID',
                item.scrollerID, dropResult.target.scrollerID)
            if (item.scrollerID == dropResult.target.scrollerID) {

                 serviceHandler.moveIndex(toIndex, fromIndex)
                scrollerDndContext.displacedIndex = (fromIndex > toIndex)? toIndex + 1:toIndex - 1

            } else {

                const { dragData } = masterDndContext
                const sourceProps = dragData.sourceServiceHandler.getPropertiesSnapshot()
                const sourcelistsize = sourceProps.virtualListProps.size
                const remove = -1

                dragData.sourceCacheAPI.insertRemoveIndex(fromIndex, fromIndex, remove, sourcelistsize, false) // false = removeItems (not)
                dragData.sourceServiceHandler.newListSize = sourcelistsize - 1
                dragData.sourceStateHandler.setCradleState('changelistsizeafterinsertremove')

                const insert = +1
                const pendingChangesList = cacheAPI.insertRemoveIndex(toIndex, toIndex, insert, listsize) // make space for insert
                // pendingChangesList:

                // startChangeIndex, 
                // rangeincrement, 
                // cacheIndexesShiftedList, 
                // cacheIndexesRemovedList, 
                // cacheIndexesToReplaceList, 
                // portalPartitionItemsForDeleteList

                const [startChangeIndex, rangeincrement, cacheIndexesShiftedList] = pendingChangesList

                // console.log('pendingChanges', pendingChangesList)
                // const portalMetadata =
                const fromScroller = item.scrollerID
                cacheAPI.transferPortalMetadataToScroller(
                    item.itemID, toIndex) // move into space
                contentHandler.synchronizeCradleItemIDsToCache(
                    cacheIndexesShiftedList, rangeincrement, startChangeIndex) // sync cradle
                serviceHandler.newListSize = listsize + rangeincrement // rangeincrement always +1 here
                stateHandler.setCradleState('applyinsertremovechanges') // re-render
                scrollerDndContext.displacedIndex = toIndex + 1

            }
            // console.log('setting droppedIndex',toIndex)
            scrollerDndContext.droppedIndex = toIndex
        },
    })

    console.log('DndCradle: canDrop',targetData.canDrop)

    useEffect(()=>{

        // console.log('DndCradle viewportElement for targetConnector',viewportElement)
        targetConnector(viewportElement)

    },[])

    const enhancedProps = {...props, handlerListRef}

    return <Cradle {...enhancedProps}/>

}

export default DndCradle