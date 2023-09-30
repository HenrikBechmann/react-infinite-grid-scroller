// cacheservice.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

export default class CacheService {

    private cacheScrollerData
    private cachePortalData

    private linkSupport = ({cacheScrollerData, cachePortalData}) => {

        this.cacheScrollerData = cacheScrollerData
        this.cachePortalData = cachePortalData

    }

    private moveIndex(scrollerID, tolowindex, fromlowindex, fromhighindex ) {

        const 
            indexToItemIDMap:Map<number, number> = this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            { itemMetadataMap } = this.cachePortalData,

            // ----------- define parameters ---------------

            moveblocksize = fromhighindex - fromlowindex + 1,
            moveincrement = tolowindex - fromlowindex,
            tohighindex = tolowindex + (moveblocksize - 1),

            movedirection = 
                (moveincrement > 0)? // move block up in list
                    'up': // shift down, make room for shiftingindex above
                    'down',   // shift up, make room for shiftingindex below

            // ------------ find bounds of from and to blocks in cache -------------

            orderedindexlist = Array.from(indexToItemIDMap.keys()).sort((a,b)=>a-b),

            reverseorderedindexlist = orderedindexlist.slice().reverse(),

            tolowindexptr = orderedindexlist.findIndex(value => value >= tolowindex),
            fromlowindexptr = orderedindexlist.findIndex(value => value >= fromlowindex)

        let tohighindexptr = reverseorderedindexlist.findIndex(value => value <= tohighindex),
            fromhighindexptr = reverseorderedindexlist.findIndex(value => value <= fromhighindex)

        // get required inverse
        {
            const cachelistcount = orderedindexlist.length

            if (tohighindexptr != -1) tohighindexptr = (cachelistcount -1) - tohighindexptr
            if (fromhighindexptr != -1) fromhighindexptr = (cachelistcount -1) - fromhighindexptr
        }

        // ---------------- capture index data to move ----------------

        let listtoprocessformove
        if ((fromlowindexptr == -1) && (fromhighindexptr == -1)) { // scope is out of view

            listtoprocessformove = []

        } else if (fromhighindexptr == -1) { // scope is partially in view

            listtoprocessformove = orderedindexlist.slice(fromlowindexptr)

        } else { // scope is entirely in view

            listtoprocessformove = orderedindexlist.slice(fromlowindexptr, fromhighindexptr + 1)

        }

        const processtomoveMap = new Map()
        const capturemoveindexFn = (index) => {

            processtomoveMap.set(index, indexToItemIDMap.get(index))

        }

        listtoprocessformove.forEach(capturemoveindexFn)

        // ------------- get list of indexes to shift out of the way ---------------
        
        let listtoprocessfordisplace
        if (movedirection == 'down') { // block is moving down, shift is up; toindex < fromindex

            if ((tolowindexptr == -1) && (fromlowindexptr == -1)) {

                listtoprocessfordisplace = []

            } else if (fromlowindexptr == -1) {

                listtoprocessfordisplace = orderedindexlist.slice(tolowindexptr)

            } else {

                listtoprocessfordisplace = orderedindexlist.slice(tolowindexptr, fromlowindexptr)

            }

        } else { // shiftdirection == -1; block is moving up, shift is down; fromindex < toindex

            if (tohighindexptr == -1 && fromhighindexptr == -1) {

                listtoprocessfordisplace = []

            } else if (tohighindexptr == -1) {

                listtoprocessfordisplace = orderedindexlist.slice(fromhighindexptr + 1)

            } else {

                listtoprocessfordisplace = orderedindexlist.slice(fromhighindexptr + 1, tohighindexptr + 1)

            }
        }

        if (movedirection == 'down') listtoprocessfordisplace.reverse()

        // -------------- move indexes out of the way --------------

        const processeddisplaceList = []

        const processsdisplaceindexFn = (index) => {

            const 
                itemID = indexToItemIDMap.get(index),
                newIndex = 
                    (movedirection == 'up')?
                        index - moveblocksize:
                        index + moveblocksize

            indexToItemIDMap.set(newIndex,itemID)
            itemMetadataMap.get(itemID).index = newIndex
            processeddisplaceList.push(newIndex)

        }

        listtoprocessfordisplace.forEach(processsdisplaceindexFn)

        // ------------ replace shifted index space with moved indexes ----------

        const processedmoveList = []
        const processmoveindexFn = (itemID, index) => {
            const newIndex = index + moveincrement // swap

            indexToItemIDMap.set(newIndex, itemID)
            itemMetadataMap.get(itemID).index = newIndex
            processedmoveList.push(newIndex)

        }

        processtomoveMap.forEach(processmoveindexFn)

        // -----------return list of processed indexes to caller --------
        // for synchrnization with cradle cellFrames

        const processedIndexes = [...processeddisplaceList,...processedmoveList].sort((a,b)=>a-b)

        return processedIndexes

    }

    private insertRemoveIndex(scrollerID, index, highrange, increment, listsize, removeItems = true ) { // increment is +1 or -1

        const 
            // clarity
            isInserting = (increment == 1),
            isRemoving = (increment == -1),

            emptyreturn = [null, null, [],[],[], []], // no action return value

            // cache resources
            indexToItemIDMap:Map<number, number> = this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            { itemMetadataMap } = this.cachePortalData,
            orderedCacheIndexList = Array.from(indexToItemIDMap.keys()).sort((a,b)=>a-b), // ascending order
            itemSet = this.cacheScrollerData.scrollerDataMap.get(scrollerID).itemSet

        // ---------- define contiguous range parameters; add sentinels ---------------

        // high range is the highest index number of the insert/remove range
        let 
            highrangeindex = highrange,
            lowrangeindex = index // semantics - name symmetry

        if (isRemoving) {

            // removal must be entirely within scope of the list
            if (highrangeindex > (listsize - 1)) {

                highrangeindex = (listsize - 1)

                if (highrangeindex < lowrangeindex) return emptyreturn

            }

        } else { // isInserting

            // addition can at most start at the next lowrangeindex above the current list; aka append
            if (lowrangeindex > listsize) {

                const diff = lowrangeindex - listsize
                lowrangeindex -= diff
                highrangeindex -= diff

            }

        }

        // rangecount is the absolute number in the insert/remove contiguous range
        const 
            rangecount = highrangeindex - lowrangeindex + 1,
            // range increment adds sign to rangecount to indicate add/remove
            rangeincrement = rangecount * increment,
            startChangeIndex = 
                (increment == 1)?
                    lowrangeindex:
                    highrangeindex + (rangeincrement + 1)

        let shiftStartIndex // start of indexes to shift up (insert) or down (remove)

        if (isInserting) {

            shiftStartIndex = lowrangeindex

        } else { // isRemoving

            shiftStartIndex = highrangeindex + 1

        }

        // ---------- define range boundaries within ordered cache index list ------------

        // obtain startptr for indexes to shift
        const shiftStartCachePtr = orderedCacheIndexList.findIndex(value => {

            return (value >= shiftStartIndex)

        })

        // obtain lowCacheRangePtr...
        const lowCacheRangePtr = orderedCacheIndexList.findIndex(value => {

            return (value >= lowrangeindex) && (value <= highrangeindex)

        })

        // obtain highCacheRangePtr...
        const reversedCacheIndexList = Array.from(orderedCacheIndexList).reverse()

        let highCacheRangePtr = reversedCacheIndexList.findIndex(value=> {

            return (value <= highrangeindex) && (value >= lowrangeindex)

        })
        // take inverse of highCacheRangePtr for non-reverse sort
        if (highCacheRangePtr != -1) {

            highCacheRangePtr = (orderedCacheIndexList.length - 1) - highCacheRangePtr
            if (highCacheRangePtr < lowCacheRangePtr) highCacheRangePtr = -1

        }

        // ----------- isolate index range list and shift list ------------

        // cache inputs
        let cacheRangeIndexesList, // for either insert or remove
            cacheToShiftIndexesList // for either insert or remove

        // get inputs
        if (lowCacheRangePtr == -1) { // core scope is out of view

            cacheRangeIndexesList = []
            cacheToShiftIndexesList = []

        } else if (highCacheRangePtr == -1) { // core scope is partially in view; lowCacheRangePtr is available

            // all items above lowCacheRangePtr must have indexes reset
            cacheRangeIndexesList = orderedCacheIndexList.slice(lowCacheRangePtr)

            if (isInserting) {

                cacheToShiftIndexesList = cacheRangeIndexesList.slice()

            } else {

                if (shiftStartCachePtr == -1) {

                    cacheToShiftIndexesList = []

                } else {

                    cacheToShiftIndexesList = orderedCacheIndexList.slice(shiftStartCachePtr)
                    
                }

            }

        } else { // range fully in view

            cacheRangeIndexesList = orderedCacheIndexList.slice(lowCacheRangePtr, highCacheRangePtr + 1)

            if (isInserting) {

                cacheToShiftIndexesList = orderedCacheIndexList.slice(shiftStartCachePtr)

            } else {

                if (shiftStartCachePtr == -1) {

                    cacheToShiftIndexesList = []

                } else {

                    cacheToShiftIndexesList = orderedCacheIndexList.slice(shiftStartCachePtr)

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

        // ----------- conduct cache operations; capture list of shifted indexes ----------

        // increment higher from top of list to preserve lower values for subsequent increment
        if (isInserting) cacheToShiftIndexesList.reverse() 

        const 
            cacheIndexesShiftedList = [], // track shifted indexes
            cacheIndexesTransferredSet:Set<number> = new Set() // obtain list of orphaned indexes

        // function modify index-to-itemid map, and metadata map, for index shifts
        const processIndexFn = index => {

            const 
                itemID = indexToItemIDMap.get(index),
                newIndex = index + rangeincrement

            if (isRemoving) {
                cacheIndexesTransferredSet.add(index)
                cacheIndexesTransferredSet.delete(newIndex)
            }

            indexToItemIDMap.set(newIndex, itemID)
            itemMetadataMap.get(itemID).index = newIndex
            cacheIndexesShiftedList.push(newIndex)

        }

        // walk through items to shift
        cacheToShiftIndexesList.forEach(processIndexFn)

        // delete remaining indexes and items now duplicates; track portal data to remove after cradle updated

        const portalPartitionItemsForDeleteList = [] // hold portals for deletion until after after cradle synch
        let cacheIndexesRemovedList = [], cacheIndexesDeletedList = []

        if (isInserting) {

            for (const index of cacheIndexesToReplaceList) {
                
                indexToItemIDMap.delete(index)

            }

        } else { // isRemoving

            for (const itemID of cacheItemsToRemoveList) {

                if (removeItems) {
                    const { partitionID, index:removedIndex, profile } = itemMetadataMap.get(itemID)
                    cacheIndexesDeletedList.push({index:removedIndex,itemID,profile})
                    portalPartitionItemsForDeleteList.push({itemID, partitionID})
                    itemMetadataMap.delete(itemID)
                }
                itemSet.delete(itemID)

            }

            // console.log('cacheIndexesDeletedList',cacheIndexesDeletedList)

            // abandoned indexes from remove process
            const orphanedIndexesTransferredList = Array.from(cacheIndexesTransferredSet)

            for (const index of orphanedIndexesTransferredList) {

                indexToItemIDMap.delete(index)

            }

             cacheIndexesRemovedList = cacheIndexesToRemoveList.concat(orphanedIndexesTransferredList)

        }

        if (isInserting) cacheIndexesShiftedList.reverse() // return to ascending order

        // --------------- returns ---------------

        // return values for caller to send to contenthandler for cradle synchronization
        return [
            
            startChangeIndex, 
            rangeincrement, 
            cacheIndexesShiftedList, 
            cacheIndexesRemovedList, 
            cacheIndexesToReplaceList, 
            portalPartitionItemsForDeleteList,
            cacheIndexesDeletedList,

        ]

    }

}