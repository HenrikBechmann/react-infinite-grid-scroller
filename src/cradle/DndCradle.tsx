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
        outerElement = viewportContext.outerElementRef.current,
        { scrollerID, virtualListSpecs } = props,
        { size:listsize, lowindex, highindex, range:listrange } = virtualListSpecs

    // const [ targetData, targetConnector ] = useDrop({
    const [ targetData, targetConnector ] = useDrop({
        accept:scrollerDndContext.dndOptions.accept || ['-x-x-x-'],
        collect:(monitor) => {
            return {
                canDrop:monitor.canDrop(),
            }
        },
        drop:(item:DndItem, monitor) => {

            // -------------------[ gateway ]---------------------

            const dropResult:GenericObject = monitor.getDropResult()

            const { dynamicDropEffect } = masterDndContext
            masterDndContext.dynamicDropEffect = null // reset
            // console.log('DndCradle: listsize, dropResult',listsize, dropResult)

            if (

                dynamicDropEffect === 'none' ||
                !dropResult || // cautious
                !dropResult.target || // prevent response from drop on scrolltab
                ((dropResult.dataType == 'viewport') && !masterDndContext.onDroppableWhitespace)

            ) {
                return
            }

            // -----------------------[ data assembly ]-----------------

            let hostDropEffect
            if (['move','copy'].includes(dynamicDropEffect)) {
                hostDropEffect = dynamicDropEffect
            }

            const 
                dropEffect = hostDropEffect || dropResult.dropEffect || 'move', // default for mobile
                whitespacePosition = masterDndContext.whitespacePosition,
                onDroppableWhitespace = masterDndContext.onDroppableWhitespace
            // console.log('DndCradle dropEffect',dropEffect)

            item.dropEffect = dropEffect

            const {
                serviceHandler, 
                cacheAPI, 
                contentHandler,
                stateHandler,
            } = handlerListRef.current

            let toIndex, toScrollerID, displacedIndex

            const
                fromIndex = item.index,
                fromScrollerID = item.scrollerID,
                itemID = item.itemID

            if (dropResult.dataType == 'cellframe') {
                toIndex = dropResult.target.index
                toScrollerID = dropResult.target.scrollerID

                displacedIndex = 
                    (fromIndex > toIndex)? 
                        toIndex + 1:
                        toIndex - 1

            } else { // viewport

                const whitespacePosition = masterDndContext.whitespacePosition
                toScrollerID = dropResult.target.scrollerID

                masterDndContext.onDroppableWhitespace = false
                masterDndContext.whitespacePosition = null

                // const wsdropEffect = dropResult.target.dropEffect
                switch (whitespacePosition) {
                    case 'all':{ // empty list
                        toIndex = scrollerDndContext.cradleParameters.cradleInheritedPropertiesRef.current.startingIndex
                        // console.log('startingIndex for toIndex', toIndex)
                        break
                    }
                    case 'head':{
                        toIndex = lowindex
                        break
                    }
                    case 'tail':{
                        if (toScrollerID === fromScrollerID) {
                            toIndex = 
                                dropEffect == 'move'?
                                    highindex:
                                    highindex + 1
                        } else {
                            toIndex = highindex + 1
                        }
                        break
                    }
                }
                // console.log('whitespace toIndex',toIndex)
            }

            // -------------------------[ intra-list drop ]------------------------
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

            // -------------------------[ inter-list drop ]------------------------
            } else {
                
                const { dragContext } = masterDndContext

                // move existing cache item
                if (cacheAPI.itemMetadataMap.has(itemID) && dropEffect == 'move') {

                    // ------------ resolve source data
                    const 
                        [ sourceProps ] = dragContext.sourceServiceHandler.getPropertiesSnapshot(),
                        { size:sourcelistsize, range:sourcelistrange } = sourceProps.virtualListProps

                    let incrementDirection = -1

                    // remove item from source scroller (but leave in cache)
                    dragContext.sourceCacheAPI.insertOrRemoveIndexesFromScroller(
                        fromIndex, fromIndex, incrementDirection, sourcelistsize) 
                    // dragContext.sourceServiceHandler.newListSize = sourcelistsize - 1
                    const [sourcelowindex, sourcehighindex] = sourcelistrange
                    dragContext.sourceServiceHandler.newListRange = 
                        (sourcelowindex === sourcehighindex)?
                            []:
                            [sourcelowindex, sourcehighindex - 1]
                    dragContext.sourceStateHandler.setCradleState('changelistsizeafterinsertremove')

                    // ------------ resolve target data
                    incrementDirection = +1 // insert
                    
                    // console.log('insertOrRemoveIndexes input: toIndex, toIndex, incrementDirection, listsize\n',
                    //     toIndex, toIndex, incrementDirection, listsize)

                    const [startChangeIndex, rangeincrement, cacheIndexesShiftedList] = 
                        cacheAPI.insertOrRemoveIndexes(toIndex, toIndex, incrementDirection, listsize)

                    // console.log('insertOrRemoveIndexes result: startChangeIndex, rangeincrement, cacheIndexesShiftedList\n',
                    //     startChangeIndex, rangeincrement, cacheIndexesShiftedList)

                    // console.log('addCacheItemToScroller: itemID, toIndex',itemID, toIndex)

                    cacheAPI.addCacheItemToScroller( itemID, toIndex ) // move item to scroller

                    contentHandler.synchronizeCradleItemIDsToCache( // sync cradle
                        cacheIndexesShiftedList, rangeincrement, startChangeIndex) 

                    // serviceHandler.newListSize = listsize + rangeincrement // rangeincrement always +1 here
                    const [lowindex, highindex] = listrange
                    serviceHandler.newListRange = 
                        listrange.length === 0?
                            [toIndex, toIndex]:
                            [lowindex, highindex + rangeincrement]

                    if (onDroppableWhitespace) {
                        scrollerDndContext.displacedIndex = null
                    } else {
                        scrollerDndContext.displacedIndex = toIndex + 1
                    }

                    stateHandler.setCradleState('applyinsertremovechanges') // re-render

                // copy item, or move non-cache item
                } else {
                    
                    if (dropEffect == 'move') {
                        dragContext.sourceServiceHandler.removeIndex(fromIndex)
                    }

                    // move or copy requires fetch
                    scrollerDndContext.dndFetchIndex = toIndex
                    scrollerDndContext.dndFetchItem = item

                    if (onDroppableWhitespace) {
                        scrollerDndContext.displacedIndex = null
                    } else { 
                        scrollerDndContext.displacedIndex = toIndex + 1
                    }

                    serviceHandler.insertIndex(toIndex)

                }

            }

            scrollerDndContext.droppedIndex = toIndex
            
        },
    },[listsize])

    // console.log('targetData.canDrop, didDrop',targetData.canDrop, targetData.didDrop)

    useEffect(()=>{

        // targetConnector(viewportElement)
        targetConnector(outerElement)

    },[])

    const enhancedProps = {...props, handlerListRef}

    return <Cradle {...enhancedProps}/>

}

export default DndCradle
