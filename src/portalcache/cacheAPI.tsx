// cacheAPI.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

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
            set it to an object containing scrollerPropertiesRef and cellFramePropertiesRef
        - if your component does not scroll, there should be no issues.

*/

// import React, {useState, useEffect, useRef, useCallback} from 'react'
import React from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

import ScrollerData from './scrollerdata'
import ItemData from './itemdata'
import PartitionData from './partitiondata'

// import CachePartition from './CachePartition'

// the cache itself is maintained in the root infinitegridscroller component
export default class CacheAPI {

    constructor(CACHE_PARTITION_SIZE) {

        // this.CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE

        this.scrollerData = new ScrollerData()
        this.itemData = new ItemData()
        this.partitionData = new PartitionData(CACHE_PARTITION_SIZE)

        this.scrollerData.linkSupport({itemData:this.itemData, partitionData:this.partitionData})
        this.itemData.linkSupport({scrollerData:this.scrollerData, partitionData:this.partitionData})
        this.partitionData.linkSupport({scrollerData:this.scrollerData, itemData:this.itemData})

    }

    private scrollerData
    private itemData
    private partitionData

    private globalItemID = 0
    private globalPartitionID = 0

    // itemMetadataMap holds itemID data, including association with scrollerID, scrollerID index, and partitionID
    // private itemMetadataMap = new Map()

    // private scrollerDataMap = new Map()

    // public measureMemory(source, scrollerID) {
    //   console.log('usedJSHeapSize','-'+scrollerID+'-',source, performance['memory']['usedJSHeapSize'])
    // }

    // ===========================[ Scroller Registration & Maintenance ]===============================

    // the only member accessed directly. All other access is through the facade
    registerScroller(scrollerID) {

        this.scrollerData.registerScroller(scrollerID)

        // this.measureMemory('REGISTER', scrollerID)

        return this.getFacade(scrollerID)

    }

    // a facade is used to accommodate access by multiple RIGS scrollers
    private getFacade = (scrollerID) => {
        const facade = {

            // measureMemory:(source) => {
            //     this.measureMemory(source, scrollerID)
            // },
            // get and set data
            get indexToItemIDMap() {
                return this.getIndexToItemIDMap()
            },
            getIndexToItemIDMap:() => {
                return  this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap
            },
            get itemSet() {
                return this.getItemSet()
            },
            getItemSet:() => {
                return  this.scrollerData.scrollerDataMap.get(scrollerID).itemSet
            },
            itemMetadataMap:this.itemData.itemMetadataMap,
            get requestedSet() {
                return this.getRequestedSet()
            },
            getRequestedSet:() => {
                return this.scrollerData.scrollerDataMap.get(scrollerID).requestedSet
            },
            set partitionRepoForceUpdate(fn) {
                this.setPartitionRepoForceUpdate(fn)
            },
            setPartitionRepoForceUpdate:(fn) => {
                this.partitionData.partitionProps.partitionRepoForceUpdate = fn
            },
            set cradleParameters(parms){
                this.setCradleParameters(parms)
            },
            setCradleParameters:(parms) => {
                this.scrollerData.scrollerDataMap.get(scrollerID).cradleParameters = parms
            },
            set portalPartitionItemsForDeleteList(list) {
                this.setPortalPartitionItemsForDeleteList(list)
            },
            setPortalPartitionItemsForDeleteList:(list) => {
                this.scrollerData.scrollerDataMap.get(scrollerID).portalPartitionItemsForDeleteList = list
            },
            get instance() {
                return this.getInstance()
            }, 
            getInstance:() => {
                return this
            },

            // methods
            unRegisterScroller:(itemSet) => {
                return this.scrollerData.unRegisterScroller(scrollerID, itemSet)
            },
            renderPartitionRepo:() => {
                return this.partitionData.renderPartitionRepo()
            },
            renderPortalLists:() => {
                return this.partitionData.renderPortalLists()
            },
            clearCache:() => {
                return this.scrollerData.clearCache(scrollerID)
            },
            changeCacheListSize:(newlistsize, deleteListCallback) => {
                return this.scrollerData.changeCacheListSize(scrollerID, newlistsize, deleteListCallback) 
            },
            changeCacheListRange:(newlistrange, deleteListCallback) => { 
                return this.scrollerData.changeCacheListRange(scrollerID, newlistrange, deleteListCallback)
            },
            matchCacheToCradle:(cradleIndexList, deleteListCallback) => {
                return this.matchCacheToCradle(scrollerID, cradleIndexList, deleteListCallback)
            },
            pareCacheToMax:(cacheMax, cradleIndexList, deleteListCallback) => {
                return this.pareCacheToMax(scrollerID, cacheMax, cradleIndexList, deleteListCallback)
            },
            guardAgainstRunawayCaching:(cacheMax, cradleListLength, MAX_CACHE_OVER_RUN) => {
                return this.guardAgainstRunawayCaching(scrollerID, cacheMax, cradleListLength, MAX_CACHE_OVER_RUN)
            },
            preload:(finalCallback, nullItemSetMaxListsize) => {
                return this.preload(scrollerID, finalCallback, nullItemSetMaxListsize)
            },
            getCacheIndexMap:() => {
                return this.getCacheIndexMap(scrollerID)
            },
            getCradleIndexMap:(cradleIndexList) => {
                return this.getCradleIndexMap(scrollerID, cradleIndexList)
            },
            getCacheItemMap:() => {
                return this.getCacheItemMap(scrollerID)
            },
            moveIndex:(tolowindex, fromlowindex, fromhighindex ) => {
                return this.moveIndex(scrollerID, tolowindex, fromlowindex, fromhighindex)
            },
            insertRemoveIndex:(index, highrange, increment, listsize, removeItems ) => {
                return this.insertRemoveIndex( scrollerID, index, highrange, increment, listsize, removeItems )
            },
            registerPendingPortal:(index) => {
                return this.registerPendingPortal(scrollerID, index)
            },
            unregisterPendingPortal:(index) => {
                return this.unregisterPendingPortal(scrollerID, index)
            },
            getNewItemID:() => {
                return this.getNewItemID()
            },
            getNewOrExistingItemID:(index) => {
                return this.getNewOrExistingItemID(scrollerID, index)
            },
            transferPortalMetadataToScroller:(itemID,toIndex) => {
                return this.transferPortalMetadataToScroller(scrollerID,itemID,toIndex)
            },
            createPortal:(component, index, itemID, scrollerProperties, dndOptions, profile, isPreload = false) => {
                return this.createPortal(scrollerID, component, index, itemID, scrollerProperties, dndOptions, profile, isPreload = false)
            },
            deletePortalByIndex:(index, deleteListCallback) => {
                return this.partitionData.deletePortalByIndex(scrollerID, index, deleteListCallback)
            },
            applyPortalPartitionItemsForDeleteList:() => {
                return this.applyPortalPartitionItemsForDeleteList(scrollerID)
            },
            hasPortal:(itemID) => {
                return this.hasPortal(itemID)
            },
            getPortalMetadata:(itemID) => {
                return this.getPortalMetadata(itemID)
            }
        }

        return facade
    }

    // //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    // ----------------------[ cache size limit enforceent ]------------------

    private matchCacheToCradle = (scrollerID, cradleIndexList, deleteListCallback) => {

        const 
            mapkeys = Array.from(this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap.keys()),
            delkeys = mapkeys.filter(key => !cradleIndexList.includes(key))

        if (delkeys.length) {

            this.partitionData.deletePortalByIndex(scrollerID, delkeys, deleteListCallback)
            return true

        } else {

            return false

        }

    }

    private pareCacheToMax = (scrollerID, cacheMax, cradleIndexList, deleteListCallback) => {

        const modelLength = cradleIndexList.length

        // determine need for paring
        if ((!cacheMax) || (!modelLength)) return false

        const 
            max = Math.max(modelLength, cacheMax),
            portalIndexMap:Map<number, number> = this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            requestedSet:Set<number> = this.scrollerData.scrollerDataMap.get(scrollerID).requestedSet

        if ((portalIndexMap.size + requestedSet.size) <= max) return false

        // sort the map keys
        const 
            mapkeyslist = Array.from(portalIndexMap.keys()),
            requestedkeys = Array.from(requestedSet.keys()),
            mapkeys = [...mapkeyslist,...requestedkeys]

        mapkeys.sort((a,b) => a - b)

        // get number to pare
        const 
            mapLength = mapkeys.length,
            parecount = mapLength - max,

            // distribute paring proportionally at front and back
            headindex = cradleIndexList[0],
            tailindex = cradleIndexList[modelLength - 1],
            headpos = mapkeys.indexOf(headindex),
            tailpos = mapkeys.indexOf(tailindex),

            headroom = headpos,
            tailroom = mapLength - (tailpos + 1),
            pareroom = headroom + tailroom,

            headparecount = Math.floor((headroom/pareroom)*parecount),
            tailparecount = parecount - headparecount,

            // collect indexes to pare
            headlist = mapkeys.slice(0,headparecount),
            taillist = mapkeys.slice(mapLength - tailparecount),

            delList = [...headlist,...taillist]

        this.partitionData.deletePortalByIndex(scrollerID, delList, deleteListCallback)

        return true

    }

    private guardAgainstRunawayCaching = (scrollerID, cacheMax, cradleListLength, MAX_CACHE_OVER_RUN) => {

        if (!cacheMax) return false

        const 
            { indexToItemIDMap, requestedSet } = this.scrollerData.scrollerDataMap.get(scrollerID),
            max = Math.max(cradleListLength, cacheMax)

        if ((indexToItemIDMap.size + requestedSet.size) <= ((max) * MAX_CACHE_OVER_RUN)) {

            return false

        } else {

            return true

        }

    }

    // --------------------------------[ preload ]--------------------------------

    private preload = (scrollerID, finalCallback, nullItemSetMaxListsize) => {

        const 
            { cradleParameters } = this.scrollerData.scrollerDataMap.get(scrollerID),

            { scrollerPropertiesRef } = cradleParameters,

            { stateHandler, serviceHandler } = cradleParameters.handlersRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { getItem, getItemPack } = cradleInheritedProperties,
            {lowindex, highindex} = cradleInternalProperties.virtualListProps,

            promises = [],

            breakloop = {
                current:false
            }

        const maxListsizeInterrupt = (index) => {
            breakloop.current = true
            nullItemSetMaxListsize(index)
        }

        if (stateHandler.isMountedRef.current) {
            
            const 
                indexToItemIDMap = this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,

                { preloadIndexCallback, itemExceptionCallback } = serviceHandler.callbacks

            for (let index = lowindex; index <= highindex; index++) {

                preloadIndexCallback && preloadIndexCallback(index)
                if (!indexToItemIDMap.has(index)) {

                    const promise = this.preloadItem(
                        scrollerID,
                        index, 
                        getItem, 
                        getItemPack,
                        scrollerPropertiesRef,
                        itemExceptionCallback,
                        maxListsizeInterrupt
                    )
                    promises.push(promise)

                }

                if (breakloop.current) break
            }
        }

        Promise.allSettled(promises).then(
            ()=>{
                this.partitionData.renderPortalLists()
                finalCallback()
            }
        )

    }

    // =========================[ SNAPSHOTS ]=========================

    private getCacheIndexMap(scrollerID) {

        return new Map(this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap)

    }

    private getCradleIndexMap(scrollerID, cradleIndexList) {

        const cradleMap = new Map(),
            { indexToItemIDMap } = this.scrollerData.scrollerDataMap.get(scrollerID)

        for (const index of cradleIndexList) {

            cradleMap.set(index, indexToItemIDMap.get(index))

        }

        return cradleMap

    }

    private getCacheItemMap(scrollerID) {

        const 
            cachelist = new Map(),
            { itemSet } = this.scrollerData.scrollerDataMap.get(scrollerID),
            { itemMetadataMap } = this.itemData

        // for (const [key, value] of this.itemMetadataMap) {
        for (const itemID of itemSet) {
            const
                metadata = itemMetadataMap.get(itemID),
                {

                    index,
                    component,

                } = metadata

            cachelist.set(itemID,{
                index,
                component,
            })

        }

        return cachelist

    }

    // ==========================[ SERVICE SUPPORT ]=========================

    // --------------------------[ move indexes ]-------------------------------

    // move is coerced by servicehandler to be within current list bounds
    private moveIndex(scrollerID, tolowindex, fromlowindex, fromhighindex ) {

        const 
            indexToItemIDMap:Map<number, number> = this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            { itemMetadataMap } = this.itemData,

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

    // ----------------------------[ insert/remove indexes ]------------------------------

    // insert or remove indexes: much of this deals with the fact that the cache is sparse.
    private insertRemoveIndex(scrollerID, index, highrange, increment, listsize, removeItems = true ) { // increment is +1 or -1

        const 
            // clarity
            isInserting = (increment == 1),
            isRemoving = (increment == -1),

            emptyreturn = [null, null, [],[],[], []], // no action return value

            // cache resources
            indexToItemIDMap:Map<number, number> = this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            { itemMetadataMap } = this.itemData,
            orderedCacheIndexList = Array.from(indexToItemIDMap.keys()).sort((a,b)=>a-b), // ascending order
            itemSet = this.scrollerData.scrollerDataMap.get(scrollerID).itemSet

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
        let cacheIndexesRemovedList = []

        if (isInserting) {

            for (const index of cacheIndexesToReplaceList) {
                
                indexToItemIDMap.delete(index)

            }

        } else { // isRemoving

            for (const itemID of cacheItemsToRemoveList) {

                if (removeItems) {
                const { partitionID } = itemMetadataMap.get(itemID)
                    portalPartitionItemsForDeleteList.push({itemID, partitionID})
                    itemMetadataMap.delete(itemID)
                }
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

        // --------------- returns ---------------

        // return values for caller to send to contenthandler for cradle synchronization
        return [
            startChangeIndex, 
            rangeincrement, 
            cacheIndexesShiftedList, 
            cacheIndexesRemovedList, 
            cacheIndexesToReplaceList, 
            portalPartitionItemsForDeleteList
        ]

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // used for size calculation in pareCacheToMax
    // registers indexes when requested but before retrieved and entered into cache
    private registerPendingPortal(scrollerID, index) {

        this.scrollerData.scrollerDataMap.get(scrollerID).requestedSet.add(index)

    }

    private unregisterPendingPortal(scrollerID, index) {

        const scrollerDataMap = this.scrollerData.scrollerDataMap.get(scrollerID)

        if (scrollerDataMap) { // otherwise scroller has been deleted
            scrollerDataMap.requestedSet.delete(index)
        }

    }

    private getNewItemID() {

        return this.globalItemID++

    }

    // get new or existing itemID for contentfunctions.createCellFrame
    private getNewOrExistingItemID(scrollerID, index) {

        const { indexToItemIDMap } = this.scrollerData.scrollerDataMap.get(scrollerID)

        const itemID = 
            (indexToItemIDMap.has(index))?
                indexToItemIDMap.get(index):
                (this.getNewItemID())

        return itemID

    }

    private transferPortalMetadataToScroller(scrollerID, itemID, toIndex) {

        const targetScrollerDataMap = this.scrollerData.scrollerDataMap.get(scrollerID)

        if (!targetScrollerDataMap) return null

        const portalMetadata = this.itemData.itemMetadataMap.get(itemID)

        // const sourceIndex = portalMetadata.index
        portalMetadata.scrollerID = scrollerID
        portalMetadata.index = toIndex

        targetScrollerDataMap.itemSet.add(itemID)
        targetScrollerDataMap.indexToItemIDMap.set(toIndex, itemID)

        // sourceScrollerDataMap.itemSet.delete(itemID)
        // sourceScrollerDataMap.indexToItemIDMap.delete(sourceIndex)

        return portalMetadata

    }

     // create new portal
    private async createPortal(scrollerID, component, index, itemID, scrollerProperties, dndOptions, profile, isPreload = false) {

        this.unregisterPendingPortal(scrollerID, index)

        const scrollerDataMap = this.scrollerData.scrollerDataMap.get(scrollerID)

        if (!scrollerDataMap) return null

        const 
            portalNode = createPortalNode(index, itemID),
            partitionID = await this.partitionData.findPartitionWithRoom(),
            portal = 
                <div data-type = 'portalwrapper' key = {itemID} data-itemid = {itemID}>
                    <InPortal key = {itemID} node = {portalNode} > { component } </InPortal>
                </div>

        this.partitionData.addPartitionPortal(partitionID, itemID, portal)

        const portalMetadata = {
            itemID,
            scrollerID,
            index,
            partitionID,
            portalNode,
            scrollerProperties,
            component,
            dndOptions,
            profile,
        }

        this.itemData.itemMetadataMap.set(itemID, portalMetadata)
        scrollerDataMap.itemSet.add(itemID)
        scrollerDataMap.indexToItemIDMap.set(index, itemID)

        if (!isPreload) this.partitionData.renderPortalLists()

        return portalMetadata

    }

    // used for preloading new item
    private async preloadItem(
        scrollerID,
        index, 
        getItem, 
        getItemPack,
        scrollerPropertiesRef, 
        itemExceptionCallback,
        maxListsizeInterrupt
    ) {

        const itemID = this.getNewItemID()

        let returnvalue, usercontent, error, dndOptions, profile

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
                cellFramePropertiesRef:{current:{index,itemID}}
            }
            if (usercontent.props.hasOwnProperty('scrollerProperties')) {
                content = React.cloneElement(usercontent, {scrollerProperties})
            } else {
                content = usercontent
            }

            // const portalData = 
                await this.createPortal(scrollerID,content, index, itemID, scrollerProperties, dndOptions, profile, true) // true = isPreload

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
    // accept an array of indexes
    // private deletePortalByIndex(scrollerID, index, deleteListCallback) {

    //     const
    //         indexArray = 
    //             (!Array.isArray(index))?
    //                 [index]:
    //                 index,

    //         { indexToItemIDMap, itemSet } = this.scrollerData.scrollerDataMap.get(scrollerID),

    //         { itemMetadataMap } = this,

    //         { removePartitionPortal } = this.partitionData,

    //         deleteList = []

    //     for (const index of indexArray) {

    //         const itemID = indexToItemIDMap.get(index)

    //         if (itemID === undefined) continue // async mismatch

    //         deleteList.push({index,itemID})
    //         const { partitionID } = itemMetadataMap.get(itemID)

    //         removePartitionPortal(partitionID,itemID)

    //         itemMetadataMap.delete(itemID)
    //         itemSet.delete(itemID)
    //         indexToItemIDMap.delete(index)

    //     }

    //     deleteListCallback && deleteListCallback(deleteList)

    // }

    private applyPortalPartitionItemsForDeleteList = (scrollerID) => {

        const { portalPartitionItemsForDeleteList } = this.scrollerData.scrollerDataMap.get(scrollerID)

        if (portalPartitionItemsForDeleteList && portalPartitionItemsForDeleteList.length) {

            for (const item of portalPartitionItemsForDeleteList) {

                this.partitionData.removePartitionPortal(item.partitionID, item.itemID)
                
            }

            this.scrollerData.scrollerDataMap.get(scrollerID).portalPartitionItemsForDeleteList = []                    

            this.partitionData.renderPortalLists()

        }

    }

    // query existence of a portal list item
    private hasPortal(itemID) {

        return this.itemData.itemMetadataMap.has(itemID)

    }

    private getPortalMetadata(itemID) {

        if (this.hasPortal(itemID)) {
            return this.itemData.itemMetadataMap.get(itemID)
        }

    }

}

// ==========================[ Utility function ]============================

// get a react-reverse-portal InPortal component, with its metadata
// with user content and container
// see also some styles set in CellFrame

const createPortalNode = (index, itemID) => {

    const 
        portalNode = createHtmlPortalNode(),
        container = portalNode.element

    // container.style.overflow = 'hidden'

    container.dataset.type = 'contentenvelope'
    container.dataset.index = index
    container.dataset.cacheitemid = itemID

    return portalNode

}     
