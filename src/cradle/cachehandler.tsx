// cachehandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module manages the InfiniteGridScroller limited (sparse) cache. It also provides support for 
    services which allow the host to actively manage many aspects of the cache. See documentation
    about the user functionsCallback callback for details. The cacheMax property allows for control of the
    maximum device memory consumption of the cache.

    The infinite grid scroller stores user cell content (components) in a central hidden cache, 
    from whence the components are pulled into the relevant CellFrames for display. The user components are 
    stored in React portals, with each portal instantiated in a container div (data-type = 'portalwrapper'). 
    These container divs are part of a standard React component list in the real DOM. The contained portals 
    themselves are not part of the real DOM, but are part of React's virtual DOM.

    See https://reactjs.org/docs/portals.html for general information about React portals.
    See https://www.npmjs.com/package/react-reverse-portal for the utility that InfiniteGridScroller
    uses to manage portals.

    This caching has many advantages, notably the ability to move cells back and forth between the
    head and tail grids of the Cradle without losing state, and the ability to maintain state for 
    complex components which move beyond the scope of the content of the Cradle. 

    There is an important side effect to consider. Instantiated components which are removed from the real DOM 
    into the portal of the virtual DOM have their scroll positions, width, and height set to zero. Therefore if 
    components rely on these values for configuration, they must have a way of storing those values in state 
    (notably the Scroll Pos - scrollLeft or scrollTop), recognizing when the component comes out of the portal cache 
    into the real DOM (width and height are typically no longer both 0), and responding to change in 
    cache state appropriately.

    Tips:
        - your component is in cache when both width and height = 0
        - your component is out of cache when both width and height are back to normal
        - if you create an empty 'scrollerProperties' property for your component, CellFrame will
            set it to an object containing scrollerPropertiesRef and cellFrameDataRef
        - if your component does not scroll, there should be no issues.

    Note that in the following, scrollerID is provided as a paramter to some functions for debug purposes, but not used.
*/

import React, {useState, useEffect, useRef, useCallback} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

// the cache itself is maintained in the root infinitegridscroller component
export class CacheHandler {

    constructor(scrollerID, setListsize, listsizeRef, CACHE_PARTITION_SIZE) {
        this.cacheProps.scrollerID = scrollerID // for debug
        this.setListsize = setListsize // passed from InfiniteGridScroller.setListsize(listsize)
        this.listsizeRef = listsizeRef // current list size

        this.CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE
    }

    globalItemID = 0
    globalPartitionID = 0

    cacheProps = {

        // item data
        metadataMap:new Map(), // item => {index, component}
        indexToItemIDMap:new Map(),

        // some portals may have been requested by requestidlecallback, not yet created
        requestedSet:new Set(), // requestedSet of indexes (transitional)

        // partition data
        partitionMetadataMap:new Map(),
        // for rendering partitions...
        partitionMap: new Map(),
        partitionRenderList:null,
        partitionRepoForceUpdate:null,
        partitionModifiedSet: new Set(),

        partitionPtr:null, // active partition, for followup

        scrollerID:null // for debug
    }

    cradleParameters

    CACHE_PARTITION_SIZE

    portalPartitionItemsForDeleteList // array of {itemID,partitionID}

    listsizeRef

    // setListsize(listsize) causes an InfiniteGridScroller useState update
    // of the listsize throughout
    setListsize // function passed from InfiniteGridScroller

    // ===========================[ CACHE PARTITION MANAGEMENT ]===============================

    // partitions are added but not removed

    renderPartitionRepo = () => {

        this.cacheProps.partitionRenderList = Array.from(this.cacheProps.partitionMap.values())

        this.cacheProps.partitionRepoForceUpdate(this.cacheProps.partitionRenderList)

    }

    addPartition = () => {

        const partitionID = this.globalPartitionID++
        this.cacheProps.partitionMetadataMap.set(partitionID,
            {
                portalMap:new Map(), 
                mapcount:0, // portalMap update can be async, so mapcount is used
                portalRenderList:null, 
                modified:false,
                forceUpdate:null,
                partitionID,
            })

        const resolvefunc = {
            current:null
        }

        const promise = new Promise((resolve) => {
            resolvefunc.current = resolve
        })

        const callback = () => {

            resolvefunc.current(partitionID)
            
        }

        this.cacheProps.partitionMap.set(partitionID,
            <CachePartition 
                key = {partitionID} 
                cacheProps = {this.cacheProps} 
                partitionID = {partitionID} 
                callback = { callback } />)

        this.renderPartitionRepo()

        return promise

    }

    async findPartitionWithRoom() {

        const { CACHE_PARTITION_SIZE } = this

        const { partitionMetadataMap } = this.cacheProps
        let { partitionPtr } = this.cacheProps

        let partitionMetadata
        if (partitionPtr !== null) {

            partitionMetadata = partitionMetadataMap.get(partitionPtr)

            if (partitionMetadata.mapcount < CACHE_PARTITION_SIZE) {

                partitionMetadata.mapcount += 1 
                return partitionPtr

            }

        }

        partitionPtr = null
        for (const [partitionID, partitionMetadata] of partitionMetadataMap) {

            if (partitionMetadata.mapcount < CACHE_PARTITION_SIZE) {
                partitionMetadata.mapcount += 1 
                partitionPtr = partitionID
                break
            }

        }

        if (partitionPtr === null) {

            partitionPtr = await this.addPartition()
            partitionMetadata = partitionMetadataMap.get(partitionPtr)
            partitionMetadata.mapcount += 1 

        }

        this.cacheProps.partitionPtr = partitionPtr

        return partitionPtr

    }

    addPartitionPortal = (partitionID, itemID, portal) => {

        const partitionMetadata = this.cacheProps.partitionMetadataMap.get(partitionID)

        partitionMetadata.portalMap.set(itemID,portal)

        this.cacheProps.partitionModifiedSet.add(partitionID)

    }

    removePartitionPortal = (partitionID, itemID) => {

        const partitionMetadata = this.cacheProps.partitionMetadataMap.get(partitionID)

        partitionMetadata.portalMap.delete(itemID)
        partitionMetadata.mapcount -= 1 

        this.cacheProps.partitionModifiedSet.add(partitionID)

    }

    renderPartition = (partitionID) => {

        const partitionMetadata = this.cacheProps.partitionMetadataMap.get(partitionID)

        if (!partitionMetadata) return

        partitionMetadata.portalRenderList =  Array.from(partitionMetadata.portalMap.values())

        // if forceUpdate has not yet been assigned, it is in the works from first call of partition
        partitionMetadata.forceUpdate && partitionMetadata.forceUpdate(partitionMetadata.portalRenderList)

    }

    // set state of the CachePartition component of the scroller to trigger render
    renderPortalLists = () => {

        const { partitionModifiedSet } = this.cacheProps

        if (partitionModifiedSet.size) {

            partitionModifiedSet.forEach((partitionID) => {

                this.renderPartition(partitionID)

            })            

            this.cacheProps.partitionModifiedSet.clear()

        }

    }

    clearCache = () => {

        // clear base data
        this.cacheProps.metadataMap.clear()
        this.cacheProps.indexToItemIDMap.clear()
        this.cacheProps.requestedSet.clear()
        // clear cache partitions
        this.cacheProps.partitionMetadataMap.clear()
        this.cacheProps.partitionMap.clear()
        this.cacheProps.partitionRenderList = []
        this.cacheProps.partitionModifiedSet.clear()
        this.cacheProps.partitionPtr = null
        this.cacheProps.partitionRepoForceUpdate(null)

    }

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    // ----------------------------[ basic operations ]--------------------------

    changeListsize = (newlistsize, deleteListCallback, changeListsizeCallback) => {

        this.setListsize(newlistsize)

        // match cache to newlistsize
        const portalIndexMap = this.cacheProps.indexToItemIDMap
        const mapkeysList = Array.from(portalIndexMap.keys())
        mapkeysList.sort((a,b) => a - b)

        const highestindex = mapkeysList.at(-1)

        if (highestindex > (newlistsize -1)) { // pare the cache

            const parelist = mapkeysList.filter((index)=>{
                return index > (newlistsize -1)
            })

            this.deletePortal(parelist, deleteListCallback)

        }

        changeListsizeCallback && changeListsizeCallback(newlistsize)

    }

    // ----------------------[ cache size limit enforceent ]------------------

    matchCacheToCradle = (cradleIndexList, deleteListCallback) => {

        const mapkeys = Array.from(this.cacheProps.indexToItemIDMap.keys())

        const delkeys = mapkeys.filter(key => !cradleIndexList.includes(key))

        if (delkeys.length) {

            this.deletePortal(delkeys, deleteListCallback)
            return true

        } else {

            return false

        }

    }

    pareCacheToMax = (cacheMax, cradleIndexList, deleteListCallback, scrollerID = undefined) => {

        const modelLength = cradleIndexList.length

        // determine need for paring
        if ((!cacheMax) || (!modelLength)) return false

        const max = Math.max(modelLength, cacheMax)

        const portalIndexMap = this.cacheProps.indexToItemIDMap,
            requestedSet = this.cacheProps.requestedSet

        if ((portalIndexMap.size + requestedSet.size) <= max) return false

        // sort the map keys
        const mapkeyslist = Array.from(portalIndexMap.keys()),
            requestedkeys = Array.from(requestedSet.keys())

        const mapkeys = [...mapkeyslist,...requestedkeys]

        mapkeys.sort((a,b) => a - b)

        // get number to pare
        const mapLength = mapkeys.length,
            parecount = mapLength - max

        // distribute paring proportionally at front and back
        const headindex = cradleIndexList[0],
            tailindex = cradleIndexList[modelLength - 1],
            headpos = mapkeys.indexOf(headindex),
            tailpos = mapkeys.indexOf(tailindex)

        const headroom = headpos,
            tailroom = mapLength - (tailpos + 1),
            pareroom = headroom + tailroom

        const headparecount = Math.floor((headroom/pareroom)*parecount),
            tailparecount = parecount - headparecount

        // collect indexes to pare
        const headlist = mapkeys.slice(0,headparecount),
            taillist = mapkeys.slice(mapLength - tailparecount)

        const delList = [...headlist,...taillist]

        this.deletePortal(delList, deleteListCallback)

        return true

    }

    guardAgainstRunawayCaching = (cacheMax, cradleListLength, MAX_CACHE_OVER_RUN) => {

        if (!cacheMax) return false

        const {
            indexToItemIDMap,
            requestedSet 
        } = this.cacheProps

        const max = Math.max(cradleListLength, cacheMax)

        if ((indexToItemIDMap.size + requestedSet.size) <= ((max) * MAX_CACHE_OVER_RUN)) {

            return false

        } else {

            return true

        }

    }

    // --------------------------------[ preload ]--------------------------------

    preload(finalCallback, nullItemSetMaxListsize, scrollerID) {

        const { cradleParameters } = this

        const { scrollerPropertiesRef } = cradleParameters

        const { stateHandler, serviceHandler } = cradleParameters.handlersRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current

        const { getItem, cacheMax } = cradleInheritedProperties,
            { listsize } = cradleInternalProperties

        const promises = []

        let cacheSize = cacheMax ?? 0

        cacheSize = Math.min(cacheSize, listsize)

        const preloadsize = 
            cacheSize?
                cacheSize:
                listsize

        const breakloop = {
            current:false
        }

        const maxListsizeInterrupt = (index) => {
            breakloop.current = true
            nullItemSetMaxListsize(index)
        }

        if (stateHandler.isMountedRef.current) {
            
            const indexToItemIDMap = this.cacheProps.indexToItemIDMap

            const { preloadIndexCallback, itemExceptionCallback } = serviceHandler.callbacks

            for (let index = 0; index < preloadsize; index++) {

                preloadIndexCallback && preloadIndexCallback(index)
                if (!indexToItemIDMap.has(index)) {

                    const promise = this.preloadItem(
                        index, 
                        getItem, 
                        scrollerPropertiesRef,
                        itemExceptionCallback,
                        maxListsizeInterrupt,
                        scrollerID
                    )
                    promises.push(promise)

                }

                if (breakloop.current) break
            }
        }

        Promise.allSettled(promises).then(
            ()=>{
                this.renderPortalLists()
                finalCallback()
            }
        )

    }

    // =========================[ SNAPSHOTS ]=========================

    getCacheIndexMap() {

        return new Map(this.cacheProps.indexToItemIDMap)

    }

    getCradleIndexMap(cradleIndexList) {

        const cradleMap = new Map(),
            { indexToItemIDMap } = this.cacheProps

        for (const index of cradleIndexList) {

            cradleMap.set(index, indexToItemIDMap.get(index))

        }

        return cradleMap

    }

    getCacheItemMap() {

        const cachelist = new Map()

        for (const [key, value] of this.cacheProps.metadataMap) {
            const {
                index,
                component,
            } = value

            cachelist.set(key,{
                index,
                component,
            })

        }

        return cachelist

    }

    // ==========================[ SERVICE SUPPORT ]=========================

    // --------------------------[ move indexes ]-------------------------------

    // move is coerced by servicehandler to be within current list bounds
    moveIndex(tolowindex, fromlowindex, fromhighindex ) {

        const {indexToItemIDMap,metadataMap} = this.cacheProps

        // ----------- define parameters ---------------

        const moveblocksize = fromhighindex - fromlowindex + 1,
            moveincrement = tolowindex - fromlowindex,
            tohighindex = tolowindex + (moveblocksize - 1)

        const movedirection = 
            (moveincrement > 0)? // move block up in list
                'up': // shift down, make room for shiftingindex above
                'down'   // shift up, make room for shiftingindex below

//         console.log('==> cacheHandler.moveIndex: \n\
// fromlowindex, fromhighindex, tolowindex, tohighindex, moveblocksize, moveincrement, movedirection\n',
//             fromlowindex, fromhighindex, tolowindex, tohighindex, moveblocksize, moveincrement, movedirection)

        // ------------ find bounds of from and to blocks in cache -------------

        const orderedindexlist = Array.from(indexToItemIDMap.keys()).sort((a,b)=>a-b)

        const reverseorderedindexlist = orderedindexlist.slice().reverse()

        const tolowindexptr = orderedindexlist.findIndex(value => value >= tolowindex),
            fromlowindexptr = orderedindexlist.findIndex(value => value >= fromlowindex)

        let tohighindexptr = reverseorderedindexlist.findIndex(value => value <= tohighindex),
            fromhighindexptr = reverseorderedindexlist.findIndex(value => value <= fromhighindex)

        // get required inverse
        {
            const cachelistcount = orderedindexlist.length
            if (tohighindexptr != -1) tohighindexptr = (cachelistcount -1) - tohighindexptr
            if (fromhighindexptr != -1) fromhighindexptr = (cachelistcount -1) - fromhighindexptr
        }

        // console.log('fromlowindexptr, fromhighindexptr, tolowindexptr, tohighindexptr, orderedindexlist\n',
        //     fromlowindexptr, fromhighindexptr, tolowindexptr, tohighindexptr, orderedindexlist)

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

            const itemID = indexToItemIDMap.get(index)

            const newIndex = 
                (movedirection == 'up')?
                    index - moveblocksize:
                    index + moveblocksize

            indexToItemIDMap.set(newIndex,itemID)
            metadataMap.get(itemID).index = newIndex
            processeddisplaceList.push(newIndex)

        }

        listtoprocessfordisplace.forEach(processsdisplaceindexFn)

        // ------------ replace shifted index space with moved indexes ----------

        const processedmoveList = []
        const processmoveindexFn = (itemID, index) => {
            const newIndex = index + moveincrement // swap

            indexToItemIDMap.set(newIndex, itemID)
            metadataMap.get(itemID).index = newIndex
            processedmoveList.push(newIndex)

        }

        processtomoveMap.forEach(processmoveindexFn)

        // -----------return list of processed indexes to caller --------
        // for synchrnization with cradle cellFrames

        const processedIndexes = [...processeddisplaceList,...processedmoveList].sort((a,b)=>a-b)

        return processedIndexes

    }

    // ----------------------------[ insert/remove indexes ]------------------------------

    // insert or remove indexes: much of this deals with the fact that the cache is sparse.
    insertRemoveIndex(index, highrange, increment, listsize ) { // increment is +1 or -1

        // clarity
        const isInserting = (increment == 1)
        const isRemoving = (increment == -1)

        const emptyreturn = [null, null, [],[],[]] // no action return value

        // cache data to modify
        const { indexToItemIDMap, metadataMap } = this.cacheProps

        // ---------- define contiguous range parameters; add sentinels ---------------

        // high range is the highest index number of the insert/remove range
        let highrangeindex = highrange
        let lowrangeindex = index // semantics - name symmetry

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

                // return emptyreturn

            }

        }

        // rangecount is the absolute number in the insert/remove contiguous range
        const rangecount = highrangeindex - lowrangeindex + 1

        // range increment adds sign to rangecount to indicate add/remove
        const rangeincrement = rangecount * increment

        let toShiftStartIndex // start of indexes to shift up (insert) or down (remove)
        if (isInserting) {
            toShiftStartIndex = lowrangeindex
        } else { // isRemoving
            toShiftStartIndex = highrangeindex + 1
        }

        console.log('==> 1. cacheHandler.insertRemoveIndex: lowrangeindex, highrangeindex, rangecount, rangeincrement, toShiftStartIndex',
            lowrangeindex, highrangeindex, rangecount, rangeincrement, toShiftStartIndex)

        // ---------- define range boundaries within ordered cache index list ------------

        const orderedCacheIndexList = Array.from(indexToItemIDMap.keys()).sort((a,b)=>a-b) // ascending order

        // obtain starptr for indexes to shift
        const toShiftStartCachePtr = orderedCacheIndexList.findIndex(value => {

            return (value >= toShiftStartIndex)

        })

        // obtain lowCacheRangePtr...
        const lowCacheRangePtr = orderedCacheIndexList.findIndex(value => {

            return (value >= lowrangeindex) && (value <= highrangeindex)

        })

        // obtain highCacheRangePtr...
        const reverseCacheIndexList = Array.from(orderedCacheIndexList).reverse()
        let highCacheRangePtr = reverseCacheIndexList.findIndex(value=> {

            return (value <= highrangeindex) && (value >= lowrangeindex)

        })
        // take inverse of highCacheRangePtr for non-reverse sort
        if (highCacheRangePtr != -1) {

            highCacheRangePtr = (orderedCacheIndexList.length - 1) - highCacheRangePtr
            if (highCacheRangePtr < lowCacheRangePtr) highCacheRangePtr = -1

        }

        console.log('2. lowCacheRangePtr, highCacheRangePtr, toShiftStartCachePtr, orderedCacheIndexList',
            lowCacheRangePtr, highCacheRangePtr, toShiftStartCachePtr, orderedCacheIndexList)

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

                if (toShiftStartCachePtr == -1) {

                    cacheToShiftIndexesList = []

                } else {

                    cacheToShiftIndexesList = orderedCacheIndexList.slice(toShiftStartCachePtr)
                    
                }

            }

        } else { // range fully in view

            cacheRangeIndexesList = orderedCacheIndexList.slice(lowCacheRangePtr, highCacheRangePtr + 1)

            if (isInserting) {

                cacheToShiftIndexesList = orderedCacheIndexList.slice(toShiftStartCachePtr)

            } else {

                if (toShiftStartCachePtr == -1) {

                    cacheToShiftIndexesList = []

                } else {

                    cacheToShiftIndexesList = orderedCacheIndexList.slice(toShiftStartCachePtr)

                }

            }

        }

        console.log('3. cacheRangeIndexesList, cacheToShiftIndexesList',// cacheScopeIndexesList',
            cacheRangeIndexesList, cacheToShiftIndexesList) //, cacheScopeIndexesList)

        // ----------- list cache items to replace or remove -----------

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

            }

        }

        console.log('4. cacheIndexesToReplaceList, cacheIndexesToRemoveList',
            cacheIndexesToReplaceList, cacheIndexesToRemoveList)

        // ----------- conduct cache operations; capture list of shifted indexes ----------

        // increment higher from top of list to preserve lower values for subsequent increment
        if (isInserting) cacheToShiftIndexesList.reverse() 

        const cacheIndexesShiftedList = []
        const cacheIndexesTransferredSet = new Set()

        // modify index-to-itemid map, and metadata map, for index shifts
        const processIndexFn = index => {

            const itemID = indexToItemIDMap.get(index)
            const newIndex = index + rangeincrement

            if (isRemoving) {
                cacheIndexesTransferredSet.add(index)
                cacheIndexesTransferredSet.delete(newIndex)
            }

            indexToItemIDMap.set(newIndex, itemID)
            metadataMap.get(itemID).index = newIndex
            cacheIndexesShiftedList.push(newIndex)

        }

        cacheToShiftIndexesList.forEach(processIndexFn)

        // delete remaining indexes and items now duplicates

        const portalPartitionItemsForDeleteList = [] // hold portals for deletion until after after cradle synch
        let cacheIndexesRemovedList = []

        if (isInserting) {

            for (const index of cacheIndexesToReplaceList) {
                
                indexToItemIDMap.delete(index)

            }

        } else { // isRemoving

            for (const itemID of cacheItemsToRemoveList) {

                const { partitionID } = metadataMap.get(itemID)
                portalPartitionItemsForDeleteList.push({itemID, partitionID})
                metadataMap.delete(itemID)

            }

            // abandoned indexes from remove process
            const orphanedIndexesTransferredList = Array.from(cacheIndexesTransferredSet)

            // console.log('orphanedIndexesTransferredList',orphanedIndexesTransferredList)

            for (const index of cacheIndexesToRemoveList) {

                indexToItemIDMap.delete(index)

            }

            for (const index of orphanedIndexesTransferredList) {

                indexToItemIDMap.delete(index)

            }

            cacheIndexesRemovedList = cacheIndexesToRemoveList.concat(orphanedIndexesTransferredList)

        }

        if (isInserting) cacheIndexesShiftedList.reverse() // return to ascending order

        console.log('5. cacheIndexesAfterShiftedList, portalPartitionItemsForDeleteList',
            cacheIndexesShiftedList, portalPartitionItemsForDeleteList)

        // --------------- returns ---------------

        // return values for caller to send to contenthandler for cradle synchronization
        return [rangeincrement, cacheIndexesShiftedList, cacheIndexesRemovedList, cacheIndexesToReplaceList, portalPartitionItemsForDeleteList]

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // used for size calculation in pareCacheToMax
    // registers indexes when requested but before retrieved and entered into cache
    registerPendingPortal(index) {

        this.cacheProps.requestedSet.add(index)

    }

    unregisterPendingPortal(index) {

        this.cacheProps.requestedSet.delete(index)

    }

    getNewItemID() {

        return this.globalItemID++

    }

    // get new or existing itemID for contentfunctions.createCellFrame
    getNewOrExistingItemID(index) {

        const { indexToItemIDMap } = this.cacheProps

        const itemID = 
            (indexToItemIDMap.has(index))?
                indexToItemIDMap.get(index):
                (this.getNewItemID())

        return itemID

    }

     // create new portal
    async createPortal(component, index, itemID, scrollerProperties, isPreload = false) {

        this.unregisterPendingPortal(index)

        const { layout, cellHeight, cellWidth, orientation } = 
            this.cradleParameters.cradleInheritedPropertiesRef.current

        const portalNode = createPortalNode(index, itemID)

        const partitionID = await this.findPartitionWithRoom()

        const portal = 
            <div data-type = 'portalwrapper' key = {itemID} data-itemid = {itemID} data-index = {index}>
                <InPortal key = {itemID} node = {portalNode} > { component } </InPortal>
            </div>

        this.addPartitionPortal(partitionID, itemID, portal)

        const portalMetadata = {
            portalNode,
            index,
            itemID,
            scrollerProperties,
            component,
            partitionID,
        }

        // console.log('==>createPortal: index, itemID', index, itemID)

        this.cacheProps.metadataMap.set(itemID, portalMetadata)
        this.cacheProps.indexToItemIDMap.set(index, itemID)

        if (!isPreload) this.renderPortalLists()

        return portalMetadata

    }

    // used for preloading new item
    private async preloadItem(
        index, 
        getItem, 
        scrollerPropertiesRef, 
        itemExceptionCallback,
        maxListsizeInterrupt,
        scrollerID
    ) {

        const itemID = this.getNewItemID()

        let returnvalue, usercontent, error

        try {

            usercontent = await getItem(index, itemID)
            if (usercontent === null) returnvalue = usercontent

        } catch(e) {

            returnvalue = usercontent = undefined
            error = e

        }

        if ((usercontent !== null) && (usercontent !== undefined)) {

            if (!React.isValidElement(usercontent)) {
                returnvalue = usercontent
                usercontent = undefined
                error = new Error('invalid React element')
            }

        }

        if ((usercontent !== null) && (usercontent !== undefined)) {

            let content 
            const scrollerProperties = {
                scrollerPropertiesRef,
            }
            if (usercontent.props.hasOwnProperty('scrollerProperties')) {
                content = React.cloneElement(usercontent, {scrollerProperties})
            } else {
                content = usercontent
            }

            // const portalData = 
                await this.createPortal(content, index, itemID, scrollerProperties, true) // true = isPreload

        } else {

            if (usercontent === undefined) {

                itemExceptionCallback && 
                    itemExceptionCallback(index, itemID, returnvalue, 'preload', error)

            } else { // usercontent === null; last item in list

                itemExceptionCallback && 
                    itemExceptionCallback(index, itemID, returnvalue, 'preload', new Error('end of list'))

                maxListsizeInterrupt(index)

            }

        }

    }

    // delete a portal list item
    // accepts an array of indexes
    deletePortal(index, deleteListCallback) {

        const indexArray = 
            (!Array.isArray(index))?
                [index]:
                index

        const { 
            metadataMap,
            indexToItemIDMap 
        } = this.cacheProps

        const { removePartitionPortal } = this

        const deleteList = []

        // console.log('index, indexToItemIDMap, metadataMap',index, indexToItemIDMap, metadataMap)
        for (const index of indexArray) {

            const itemID = indexToItemIDMap.get(index)

            if (itemID === undefined) continue // async mismatch

            deleteList.push({index,itemID})
            const { partitionID } = metadataMap.get(itemID)

            removePartitionPortal(partitionID,itemID)

            metadataMap.delete(itemID)
            indexToItemIDMap.delete(index)

        }
        
        deleteListCallback && deleteListCallback(deleteList)

    }

    // query existence of a portal list item
    hasPortal(itemID) {

        return this.cacheProps.metadataMap.has(itemID)

    }

    getPortalMetadata(itemID) {

        if (this.hasPortal(itemID)) {
            return this.cacheProps.metadataMap.get(itemID)
        }

    }

}

// ==========================[ Utility function ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
// see also some styles set in CellFrame

const createPortalNode = (index, itemID) => {

    const portalNode = createHtmlPortalNode()

    const container = portalNode.element
    container.style.overflow = 'hidden'

    container.dataset.type = 'contentenvelope'
    container.dataset.index = index
    container.dataset.cacheitemid = itemID

    return portalNode

}     

// ========================[ Utility components ]==============================

// portal list component for rapid relisting of updates, using external callback for set state
export const CachePartition = ({ cacheProps, partitionID, callback }) => {

    const [portalListCounter, setPortalListCounter] = useState(0)

    const [partitionState, setPartitionState] = useState('setup')

    const counterRef = useRef(portalListCounter)

    const isMountedRef = useRef(true)

    const portalArrayRef = useRef(null)

    const partitionMetadata = cacheProps.partitionMetadataMap.get(partitionID)

    const forceUpdate = useCallback((portalRenderList) => {

        portalArrayRef.current = portalRenderList

        isMountedRef.current && setPortalListCounter(++counterRef.current) // force render

    },[])

    useEffect(()=>{

        isMountedRef.current = true

        partitionMetadata.forceUpdate = forceUpdate

        callback()

        return () => {

            isMountedRef.current = false

        }

    },[]) 

    useEffect(()=>{

        switch (partitionState) {
            case 'setup': {
                setPartitionState('ready')
                break
            }
        }

    },[partitionState])

    return <div key = {partitionID} data-type = 'cachepartition' data-partitionid = {partitionID}>
        {portalArrayRef.current}
    </div>

}

export const PortalMasterCache = ({ cacheProps }) => {

    const [portalCacheCounter, setPortalCacheCounter] = useState(0)
    const counterRef = useRef(portalCacheCounter)

    const [masterState, setMasterState] = useState('setup')

    const isMountedRef = useRef(true)

    const partitionArrayRef = useRef(null)

    const partitionRepoForceUpdate = useCallback((partitionRenderList) => {

        partitionArrayRef.current = partitionRenderList

        isMountedRef.current && setPortalCacheCounter(++counterRef.current) // force render

    },[])

    useEffect(()=>{

        isMountedRef.current = true

        cacheProps.partitionRepoForceUpdate = partitionRepoForceUpdate

        return () => {

            isMountedRef.current = false

        }

    },[]) 

    useEffect(()=>{

        switch (masterState) {
            case 'setup': {
                setMasterState('ready')
            }
        }

    },[masterState])

    return <div data-type = 'portal-master'>{partitionArrayRef.current}</div>

}
