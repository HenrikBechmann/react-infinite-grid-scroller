// DndCradle.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    The role of DndCradle is to initiate transfer operations based on dropping of a source on a legitimate target.
    For intra-list drop it's straighforward: serviceHandler.moveIndex
    Special cases:
        - intra-list or inter-list drop over or with failed CellFrames
        - drop over empty list
        - drop after source has been unmounted
        - copy vs move

*/

import React, { useEffect, useContext, useRef, useState } from 'react'

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
        { size:listsize, lowindex, highindex, range:listrange } = virtualListSpecs,
        [dndCradleState, setDndCradleState] = useState('ready')

    useEffect(()=>{

        switch (dndCradleState) {

            case 'gotoheadposition': {
                const 
                    { lowindex } = virtualListSpecs,
                    { serviceHandler } = handlerListRef.current
                
                serviceHandler.scrollToIndex(lowindex)

                setDndCradleState('ready')
                break
            }
            case 'gototailposition': {
                const 
                    { highindex } = virtualListSpecs,
                    { serviceHandler } = handlerListRef.current
                
                serviceHandler.scrollToIndex(highindex)

                setDndCradleState('ready')
                break
            }
        }

    },[dndCradleState])

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

            if (

                dynamicDropEffect === 'none' 
                    || !dropResult // cautious
                    || !dropResult.target // prevent response from drop on scrolltab
                    || ((dropResult.dataType == 'viewport') // whitespace
                        && !masterDndContext.onDroppableWhitespace)

            ) {
                return
            }

            // -----------------------[ data assembly ]-----------------

            let hostDropEffect
            if (['move','copy'].includes(dynamicDropEffect)) {
                hostDropEffect = dynamicDropEffect
            }

            // collect drop parameters
            const 
                dropEffect = hostDropEffect 
                    || dropResult.dropEffect 
                    || 'move', // default for mobile
                onDroppableWhitespace = masterDndContext.onDroppableWhitespace,
                whitespacePosition = masterDndContext.whitespacePosition

            item.dropEffect = dropEffect

            // collect operational resources
            const {
                serviceHandler, 
                cacheAPI, 
                contentHandler,
                stateHandler,
            } = handlerListRef.current

            // collect source/target parameters
            let toIndex, toScrollerID, displacedIndex
            const
                fromIndex = item.index,
                fromScrollerID = item.scrollerID,
                itemID = item.itemID
                toScrollerID = dropResult.target.scrollerID

            // toIndex and displaceIndex for datatype == 'cellframe'
            if (dropResult.dataType == 'cellframe') {

                toIndex = dropResult.target.index
                displacedIndex = 
                    (fromIndex > toIndex)
                        ?toIndex + 1
                        :toIndex - 1

            } else { // toIndex and displacedIndex for datatype == 'viewport'

                // reset
                masterDndContext.onDroppableWhitespace = false
                masterDndContext.whitespacePosition = null

                switch (whitespacePosition) {
                    case 'all':{ // empty list

                        toIndex = scrollerDndContext.cradleParameters.cradleInheritedPropertiesRef.current.startingIndex

                        break
                    }
                    case 'head':{

                        if (toScrollerID === fromScrollerID) {
                            toIndex = 
                                dropEffect == 'move'
                                    ?lowindex
                                    :lowindex - 1
                        } else { // inter-list

                            toIndex = lowindex - 1
                            
                        }
                        break
                    }
                    case 'tail':{

                        if (toScrollerID === fromScrollerID) {
                            toIndex = 
                                dropEffect == 'move'
                                    ?highindex
                                    :highindex + 1
                        } else { // inter-list

                            toIndex = highindex + 1

                        }
                        break
                    }
                }

                displacedIndex = null

            }

            // -------------------------[ intra-list drop ]------------------------
            if (fromScrollerID === toScrollerID) {

                scrollerDndContext.displacedIndex = displacedIndex
                scrollerDndContext.droppedIndex = toIndex

                if (!cacheAPI.itemMetadataMap.has(itemID) || (dropEffect == 'copy')) { // will have to fetch

                    scrollerDndContext.dndFetchIndex = toIndex
                    scrollerDndContext.dndFetchItem = item

                }

                if (dropEffect == 'move') {

                    serviceHandler.moveIndex(toIndex, fromIndex)

                } else {

                    serviceHandler.insertIndex(toIndex)
                    if (onDroppableWhitespace) {
                        setTimeout(() => {
                            if (whitespacePosition == 'head') {
                                setDndCradleState('gotoheadposition')
                            } else {
                                setDndCradleState('gototailposition')
                            }
                        },100)
                    }
                }

            // -------------------------[ inter-list drop ]------------------------
            } else {
                
                const { dragContext } = masterDndContext

                // move existing cache item
                if (cacheAPI.itemMetadataMap.has(itemID) 
                    && dropEffect == 'move') {

                    // ------------ resolve source data
                    const 
                        [ sourceProps ] = dragContext.sourceServiceHandler.getPropertiesSnapshot(),
                        { size:sourcelistsize, range:sourcelistrange } = sourceProps.virtualListProps

                    let incrementDirection = -1

                    // remove item from source scroller (but leave in cache)
                    dragContext.sourceCacheAPI.insertOrRemoveCacheIndexesFromScroller(
                        fromIndex, fromIndex, incrementDirection, listrange) 
                    // dragContext.sourceServiceHandler.newListSize = sourcelistsize - 1
                    const [sourcelowindex, sourcehighindex] = sourcelistrange
                    dragContext.sourceServiceHandler.newListRange = 
                        (sourcelowindex === sourcehighindex)
                            ?[]
                            :[sourcelowindex, sourcehighindex - 1]
                    dragContext.sourceStateHandler.setCradleState('changelistsizeafterinsertremove')

                    // ------------ resolve target data
                    incrementDirection = +1 // insert
                    
                    const [startChangeIndex, rangeincrement, cacheIndexesShiftedList] = 
                        cacheAPI.insertOrRemoveCacheIndexes(toIndex, toIndex, incrementDirection, listrange)

                    cacheAPI.addCacheItemToScroller( itemID, toIndex ) // move item to scroller

                    contentHandler.synchronizeCradleItemIDsToCache( // sync cradle
                        cacheIndexesShiftedList, rangeincrement, startChangeIndex) 

                    const [lowindex, highindex] = listrange
                    serviceHandler.newListRange = 
                        listrange.length === 0
                            ?[toIndex, toIndex]
                            :onDroppableWhitespace
                                ?whitespacePosition == 'head'
                                    ?[lowindex - 1,highindex]
                                    :[lowindex, highindex + rangeincrement]
                                :[lowindex, highindex + rangeincrement]

                    if (onDroppableWhitespace) {
                        scrollerDndContext.displacedIndex = null
                    } else {
                        scrollerDndContext.displacedIndex = toIndex + 1
                    }

                    scrollerDndContext.droppedIndex = toIndex

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

                    scrollerDndContext.droppedIndex = toIndex

                    serviceHandler.insertIndex(toIndex)

                }

                if (onDroppableWhitespace) {
                    setTimeout(() => {
                        if (whitespacePosition == 'head') {
                            setDndCradleState('gotoheadposition')
                        } else {
                            setDndCradleState('gototailposition')
                        }
                    },100)
                }
            }
            
        },
    })

    useEffect(()=>{

        // targetConnector(viewportElement)
        targetConnector(outerElement)

    },[])

    const enhancedProps = {...props, handlerListRef}

    return <Cradle {...enhancedProps}/>

}

export default DndCradle
