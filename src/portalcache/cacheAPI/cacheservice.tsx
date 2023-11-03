// cacheservice.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

export default class CacheService {

    private cacheScrollerData
    private cachePortalData

    private linkSupport = ({cacheScrollerData, cachePortalData}) => {

        this.cacheScrollerData = cacheScrollerData
        this.cachePortalData = cachePortalData

    }

    private moveIndex(scrollerID, tolowindex, fromlowindex, fromhighindex ) {

        // ----------------------[ assemble data ]------------------------

        const 
            indexToItemIDMap:Map<number, number> = 
                this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            { itemMetadataMap } = this.cachePortalData,

            // ----------- define parameters ---------------

            moveblocksize = fromhighindex - fromlowindex + 1,
            moveincrement = tolowindex - fromlowindex,
            tohighindex = tolowindex + (moveblocksize - 1),

            movedirection = 
                (moveincrement > 0) // move block up in list
                    ? 'up' // shift down, make room for shiftingindex above
                    : 'down', // shift up, make room for shiftingindex below

            // ------------ find bounds of from and to blocks in cache -------------

            orderedindexlist:number[] = Array.from(indexToItemIDMap.keys()).sort((a,b)=>a-b),

            reverseorderedindexlist:number[] = orderedindexlist.slice().reverse(),

            tolowindexptr = orderedindexlist.findIndex(value => value >= tolowindex),
            fromlowindexptr = orderedindexlist.findIndex(value => value >= fromlowindex)

        let 
            tohighindexptr = reverseorderedindexlist.findIndex(value => value <= tohighindex),
            fromhighindexptr = reverseorderedindexlist.findIndex(value => value <= fromhighindex)

        // get required inverse
        const cachelistcount = orderedindexlist.length
        // finalize bounds pointers
        if (tohighindexptr != -1) tohighindexptr = (cachelistcount -1) - tohighindexptr
        if (fromhighindexptr != -1) fromhighindexptr = (cachelistcount -1) - fromhighindexptr

        // ---------------- collect index data for move ----------------

        let listToProcessForMove:number[]

        if ((fromlowindexptr == -1) && (fromhighindexptr == -1)) { // scope is out of view

            listToProcessForMove = []

        } else if (fromhighindexptr == -1) { // scope is partially in view

            listToProcessForMove = orderedindexlist.slice(fromlowindexptr)

        } else { // scope is entirely in view

            listToProcessForMove = orderedindexlist.slice(fromlowindexptr, fromhighindexptr + 1)

        }

        const processToMoveMap = new Map<number,number>()

        for (const index of listToProcessForMove) {
            processToMoveMap.set(index,indexToItemIDMap.get(index))
        }

        // ------------- collect index data for displace ---------------
        
        let listToProcessForDisplace:number[]

        if (movedirection == 'down') { // block is moving down, shift is up; toindex < fromindex

            if ((tolowindexptr == -1) && (fromlowindexptr == -1)) {

                listToProcessForDisplace = []

            } else if (fromlowindexptr == -1) {

                listToProcessForDisplace = orderedindexlist.slice(tolowindexptr)

            } else {

                listToProcessForDisplace = orderedindexlist.slice(tolowindexptr, fromlowindexptr)

            }

        } else { // shiftdirection == -1; block is moving up, shift is down; fromindex < toindex

            if (tohighindexptr == -1 && fromhighindexptr == -1) {

                listToProcessForDisplace = []

            } else if (tohighindexptr == -1) {

                listToProcessForDisplace = orderedindexlist.slice(fromhighindexptr + 1)

            } else {

                listToProcessForDisplace = orderedindexlist.slice(fromhighindexptr + 1, tohighindexptr + 1)

            }
        }

        // if (movedirection == 'down') listToProcessForDisplace.reverse()

        const processToDisplaceMap = new Map<number,number>()

        for (const index of listToProcessForDisplace) {
            processToDisplaceMap.set(index,indexToItemIDMap.get(index))
        }

        // -------------- shift indexes to displace --------------

        const 
            processedIndexSet = new Set<number>(), // list of unique indexes for Cradle to update
            preProcessedDisplaceList:
                {index:number,itemID:number}[] = [], // for internal processing
            displacedDataList:
                {fromIndex:number, toIndex:number, itemID:number, profile:object}[] = [] // for return to host, including profile

        const processsDisplaceIndexFn = (itemID, index) => {

            const 
                newIndex = 
                    (movedirection == 'up')
                        ? index - moveblocksize
                        : index + moveblocksize

            indexToItemIDMap.delete(index)
            // both have to be listed for the cradle in case newIndex doesn't exist in the cache
            processedIndexSet.add(index)
            processedIndexSet.add(newIndex)

            // update itemMetadata in any case
            const itemMetadata = itemMetadataMap.get(itemID)
            itemMetadata.index = newIndex

            preProcessedDisplaceList.push({index:newIndex,itemID})

            const { profile } = itemMetadata
            displacedDataList.push({fromIndex:index, toIndex:newIndex, itemID, profile})

        }

        processToDisplaceMap.forEach(processsDisplaceIndexFn)

        // ------------ replace shifted index space with moved indexes ----------

        const 
            preProcessedMoveList:
                {index:number,itemID:number}[] = [], // for internal processing
            movedDataList:
                {fromIndex:number, toIndex:number, itemID:number, profile:object}[] = [] // for return to host, including profile

        const processMoveIndexFn = (itemID, index) => {

            const newIndex = index + moveincrement // swap

            indexToItemIDMap.delete(index)
            // both have to be listed for the cradle in case newIndex doesn't exist in the cache
            processedIndexSet.add(index)
            processedIndexSet.add(newIndex)

            // update itemMetadata in any case
            const itemMetadata = itemMetadataMap.get(itemID)
            itemMetadata.index = newIndex

            preProcessedMoveList.push({index:newIndex,itemID})

            const { profile } = itemMetadata
            movedDataList.push({fromIndex:index, toIndex:newIndex, itemID, profile})

        }

        processToMoveMap.forEach(processMoveIndexFn)

        // ---------------- insert collected new index => itemID entries -----------

        preProcessedMoveList.forEach((data) =>{
            indexToItemIDMap.set(data.index, data.itemID)
        })

        preProcessedDisplaceList.forEach((data) =>{
            indexToItemIDMap.set(data.index, data.itemID)
        })

        // ----------- return list of processed indexes to caller --------
        // for synchrnization with cradle cellFrames

        const processedIndexes:number[] = Array.from(processedIndexSet)

        processedIndexes.sort((a,b)=>a-b) // tidy up

        return [ processedIndexes, movedDataList, displacedDataList ]

    }

    private insertOrRemoveCacheIndexes(
        scrollerID, 
        lowchangeindex, 
        highchangeindex, 
        incrementDirection, // incrementDirection is +1 or -1
        listrange,
    ) { 

        const [
            changeStartIndex, 
            rangeIncrement, 
            cacheIndexesShiftedList, 
            cacheIndexesRemovedList, 
            cacheIndexesToReplaceList, 
            cacheItemsToRemoveList
        ] = this.insertOrRemoveCacheIndexesFromScroller(
            scrollerID,
            lowchangeindex,
            highchangeindex,
            incrementDirection,
            listrange,
        )

        // remove items
        const 
            { itemMetadataMap } = this.cachePortalData,
            cacheIndexesDeletedList = [],
            portalPartitionItemsToDeleteList = []

        for (const itemID of cacheItemsToRemoveList) {
            const { partitionID, index:removedIndex, profile } = itemMetadataMap.get(itemID)
            cacheIndexesDeletedList.push({index:removedIndex,itemID,profile})
            portalPartitionItemsToDeleteList.push({itemID, partitionID})
            itemMetadataMap.delete(itemID)
        }

        // --------------- returns ---------------

        // return values for caller to send to contenthandler for cradle synchronization
        return [
            
            changeStartIndex, 
            rangeIncrement, 
            cacheIndexesShiftedList, 
            cacheIndexesRemovedList, 
            cacheIndexesToReplaceList, 
            cacheIndexesDeletedList,
            portalPartitionItemsToDeleteList,

        ]

    }

    private insertOrRemoveCacheIndexesFromScroller = (
        scrollerID,
        lowchangeIndex,
        highchangeIndex,
        incrementDirection, // increment is +1 or -1
        listrange,
    ) => {

        const 
            // clarity
            isInserting = (incrementDirection === 1),
            isRemoving = (incrementDirection === -1),

            // cache resources
            indexToItemIDMap:Map<number,number> = this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            { itemMetadataMap } = this.cachePortalData,
            itemSet = this.cacheScrollerData.scrollerDataMap.get(scrollerID).itemSet

        // ---------- get operation parameters ------------

        const {
            shiftStartIndex,
            rangeIncrement, 
            changeStartIndex, // for caller information only
        } = getInsertRemoveParameters({
            highchangeIndex,
            lowchangeIndex,
            isInserting,
            listrange,
        })

        // ---------- get list of operations ------------

        const {
            cacheIndexesToShiftList,
            cacheIndexesToReplaceList,
            cacheIndexesToRemoveList,
            cacheItemsToRemoveList,
            } = assembleRequiredOperations({
            indexToItemIDMap,
            shiftStartIndex,
            lowchangeIndex,
            highchangeIndex,
            isInserting
        })

        // ---------- apply operations ------------

        // increment higher from top of list to preserve lower values for subsequent increment
        if (isInserting) cacheIndexesToShiftList.reverse() 

        const 
            cacheIndexesShiftedList = [], // track shifted indexes
            cacheIndexesTransferredSet:Set<number> = new Set() // obtain list of orphaned indexes

        // function modify index-to-itemid map, and metadata map, for index shifts
        const processIndexFn = index => {

            const 
                itemID = indexToItemIDMap.get(index),
                newIndex = index + rangeIncrement

            if (isRemoving) {
                cacheIndexesTransferredSet.add(index)
                cacheIndexesTransferredSet.delete(newIndex)
            }

            indexToItemIDMap.set(newIndex, itemID)
            itemMetadataMap.get(itemID).index = newIndex
            cacheIndexesShiftedList.push(newIndex)

        }

        // walk through items to shift
        cacheIndexesToShiftList.forEach(processIndexFn)

        // delete remaining indexes and items now duplicates; track portal data to remove after cradle updated

        // const portalPartitionItemsToDeleteList = [] // hold portals for deletion until after after cradle synch
        let cacheIndexesRemovedList = [] // , cacheIndexesDeletedList = []

        if (isInserting) {

            for (const index of cacheIndexesToReplaceList) {
                
                indexToItemIDMap.delete(index)

            }

        } else { // isRemoving

            for (const itemID of cacheItemsToRemoveList) {

                itemSet.delete(itemID)

            }

            // abandoned indexes from remove process
            const orphanedIndexesTransferredList = Array.from(cacheIndexesTransferredSet)

            for (const index of orphanedIndexesTransferredList) {

                indexToItemIDMap.delete(index)

            }

             cacheIndexesRemovedList = cacheIndexesToRemoveList.concat(orphanedIndexesTransferredList)

        }

        if (isInserting) cacheIndexesShiftedList.reverse() // return to ascending order

        return [
            changeStartIndex, // for caller
            rangeIncrement, 
            cacheIndexesShiftedList, 
            cacheIndexesRemovedList, 
            cacheIndexesToReplaceList, 
            cacheItemsToRemoveList,
        ]

    }

} // class CacheService

// utilities
const getInsertRemoveParameters = ({
    lowchangeIndex,
    highchangeIndex,
    listrange,
    isInserting,
}) => {

    // rangecount is the absolute number in the insert/remove contiguous range
    const 
        rangecount = highchangeIndex - lowchangeIndex + 1,
        // range increment adds sign to rangecount to indicate add/remove
        rangeIncrement = 
            isInserting
                ? rangecount
                : -rangecount,
                
        [listlowindex, listhighindex] = listrange,

        changeStartIndex = 
            (isInserting)
                ? lowchangeIndex
                : highchangeIndex + (rangeIncrement + 1)

    let shiftStartIndex // start of indexes to shift up (insert) or down (remove)

    if (isInserting) {

        shiftStartIndex = Math.max(lowchangeIndex,listlowindex)

    } else { // isRemoving

        shiftStartIndex = highchangeIndex + 1

    }

    // let newListRange
    // if (isInserting) {

    // } else {
    //     newListRange = listrange
    // }

    return {
        rangeIncrement, 
        shiftStartIndex,
        changeStartIndex,
        // newListRange,
    }

}

const assembleRequiredOperations = ({
    indexToItemIDMap,
    shiftStartIndex,
    lowchangeIndex,
    highchangeIndex,
    isInserting,
}) => {

   const orderedCacheIndexList = Array.from(indexToItemIDMap.keys()).sort((a:number,b:number)=>a-b) // ascending order

    // obtain startptr for indexes to shift
    const shiftStartCachePtr = orderedCacheIndexList.findIndex(value => {

        return (value >= shiftStartIndex)

    })

    // obtain lowCacheRangePtr...
    const lowCacheRangePtr = orderedCacheIndexList.findIndex(value => {

        return (value >= lowchangeIndex) && (value <= highchangeIndex)

    })

    // obtain highCacheRangePtr...
    const reversedCacheIndexList = Array.from(orderedCacheIndexList).reverse()

    let highCacheRangePtr = reversedCacheIndexList.findIndex(value=> {

        return (value <= highchangeIndex) && (value >= lowchangeIndex)

    })
    // take inverse of highCacheRangePtr for non-reverse sort
    if (highCacheRangePtr != -1) {

        highCacheRangePtr = (orderedCacheIndexList.length - 1) - highCacheRangePtr
        if (highCacheRangePtr < lowCacheRangePtr) highCacheRangePtr = -1

    }

    // ----------- isolate index range list and shift list ------------

    // cache inputs
    let cacheRangeIndexesList, // for either insert or remove
        cacheIndexesToShiftList // for either insert or remove

    // get inputs
    if (lowCacheRangePtr == -1) { // core scope is out of view

        cacheRangeIndexesList = []
        cacheIndexesToShiftList = []

    } else if (highCacheRangePtr == -1) { // core scope is partially in view; lowCacheRangePtr is available

        // all items above lowCacheRangePtr must have indexes reset
        cacheRangeIndexesList = orderedCacheIndexList.slice(lowCacheRangePtr)

        if (isInserting) {

            cacheIndexesToShiftList = cacheRangeIndexesList.slice()

        } else {

            if (shiftStartCachePtr == -1) {

                cacheIndexesToShiftList = []

            } else {

                cacheIndexesToShiftList = orderedCacheIndexList.slice(shiftStartCachePtr)
                
            }

        }

    } else { // range fully in view

        cacheRangeIndexesList = orderedCacheIndexList.slice(lowCacheRangePtr, highCacheRangePtr + 1)

        if (isInserting) {

            cacheIndexesToShiftList = orderedCacheIndexList.slice(shiftStartCachePtr)

        } else {

            if (shiftStartCachePtr == -1) {

                cacheIndexesToShiftList = []

            } else {

                cacheIndexesToShiftList = orderedCacheIndexList.slice(shiftStartCachePtr)

            }

        }

    }

    // ----------- list cache indexes and items to replace or remove -----------

    // cache outputs
    // for insert, the range being inserted; for remove, any tail cradle items abandoned
    let cacheIndexesToReplaceList = [], // for insert, the range being inserted
        cacheIndexesToRemoveList = [], // for remove, the range being removed
        cacheItemsToRemoveList = [] // for remove, derived from the previous

    if (isInserting) {

        cacheIndexesToReplaceList = cacheRangeIndexesList

    } else { // isRemoving

        cacheIndexesToRemoveList = cacheRangeIndexesList

        // get cacheItemsToRemoveList
        for (const index of cacheIndexesToRemoveList) {

            cacheItemsToRemoveList.push(indexToItemIDMap.get(index))
            indexToItemIDMap.delete(index)

        }

    }

    return {
        cacheIndexesToShiftList,
        cacheIndexesToReplaceList,
        cacheIndexesToRemoveList,
        cacheItemsToRemoveList,
    }

}
