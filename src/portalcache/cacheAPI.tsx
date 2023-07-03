// cachehandler.tsx
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

/*

    TODO

    - modify clear cache for scroller selection

*/

import React, {useState, useEffect, useRef, useCallback} from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

import CachePartition from './CachePartition'

// the cache itself is maintained in the root infinitegridscroller component
export default class CacheAPI {

    constructor(CACHE_PARTITION_SIZE) {

        this.CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE

    }

    private globalItemID = 0
    private globalPartitionID = 0

    private itemMetadataMap = new Map()

    private scrollerDataMap = new Map()

    private partitionProps = {

        partitionMetadataMap:new Map(),
        partitionMap: new Map(),
        partitionRenderList:null,
        partitionRepoForceUpdate:null,
        partitionModifiedSet: new Set(),

        partitionPtr:null, // active partition, for followup

    }

    private CACHE_PARTITION_SIZE

    // private measureMemory(source) {
    //   console.log('usedJSHeapSize',source, performance['memory']['usedJSHeapSize'])
    // }

    // ===========================[ Scroller Registration & Maintenance ]===============================

    // the only member accessed directly. All other access is through the facade
    registerScroller(scrollerID) {

        this.scrollerDataMap.set(scrollerID, 
            {
                cradleParameters:null,
                indexToItemIDMap: new Map(), 
                // some portals may have been requested by requestidlecallback, not yet created
                itemSet: new Set(), // for scrollerID limited operations
                requestedSet:new Set(),
                portalPartitionItemsForDeleteList:null,
            }
        )

        // this.measureMemory('REGISTER')

        return this.getFacade(scrollerID)

    }

    private getFacade = (scrollerID) => {
        const facade = {

            // get and set data
            get indexToItemIDMap() {
                return this.getIndexToItemIDMap()
            },
            getIndexToItemIDMap:() => {
                return  this.scrollerDataMap.get(scrollerID).indexToItemIDMap
            },
            get itemSet() {
                return this.getItemSet()
            },
            getItemSet:() => {
                return  this.scrollerDataMap.get(scrollerID).itemSet
            },
            itemMetadataMap:this.itemMetadataMap,
            get requestedSet() {
                return this.getRequestedSet()
            },
            getRequestedSet:() => {
                return this.scrollerDataMap.get(scrollerID).requestedSet
            },
            set partitionRepoForceUpdate(fn) {
                this.setPartitionRepoForceUpdate(fn)
            },
            setPartitionRepoForceUpdate:(fn) => {
                this.partitionProps.partitionRepoForceUpdate = fn
            },
            set cradleParameters(parms){
                this.setCradleParameters(parms)
            },
            setCradleParameters:(parms) => {
                this.scrollerDataMap.get(scrollerID).cradleParameters = parms
            },
            set portalPartitionItemsForDeleteList(list) {
                this.setPortalPartitionItemsForDeleteList(list)
            },
            setPortalPartitionItemsForDeleteList:(list) => {
                this.scrollerDataMap.get(scrollerID).portalPartitionItemsForDeleteList = list
            },
            get instance() {
                return this.getInstance()
            }, 
            getInstance:() => {
                return this
            },

            // methods
            unRegisterScroller:(itemSet) => {
                return this.unRegisterScroller(scrollerID, itemSet)
            },
            renderPartitionRepo:() => {
                return this.renderPartitionRepo()
            },
            renderPortalLists:() => {
                return this.renderPortalLists()
            },
            clearCache:() => {
                return this.clearCache(scrollerID)
            },
            changeCacheListSize:(newlistsize, deleteListCallback, changeListSizeCallback) => {
                return this.changeCacheListSize(scrollerID, newlistsize, deleteListCallback, changeListSizeCallback)
            },
            changeCacheListRenge:(newlistrange, deleteListCallback, changeListRangeCallback) => {
                return this.changeCacheListRange(scrollerID, newlistrange, deleteListCallback, changeListRangeCallback)
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
            insertRemoveIndex:(index, highrange, increment, listsize ) => {
                return this.insertRemoveIndex(scrollerID, index, highrange, increment, listsize )
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
            createPortal:(component, index, itemID, scrollerProperties, isPreload = false) => {
                return this.createPortal(scrollerID, component, index, itemID, scrollerProperties, isPreload = false)
            },
            deletePortalByIndex:(index, deleteListCallback) => {
                return this.deletePortalByIndex(scrollerID, index, deleteListCallback)
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

    private unRegisterScroller = (scrollerID, itemSet) => {

        const { scrollerDataMap, itemMetadataMap } = this

        if ( scrollerDataMap.size == 1 ) return // already getting dismantled; avoid conflict

        // console.log('unregister scrollerID, itemSet',scrollerID, itemSet)

        scrollerDataMap.delete(scrollerID)
        itemSet.forEach((itemID) => {
            const { partitionID } = itemMetadataMap.get(itemID)
            this.removePartitionPortal(partitionID,itemID)
            itemMetadataMap.delete(itemID)
        })
        this.renderPortalLists()
        // this.measureMemory('UNREGISTER')

    }

    // ===========================[ CACHE PARTITION MANAGEMENT ]===============================

    // partitions are added but not removed

    private renderPartitionRepo = () => {

        this.partitionProps.partitionRenderList = Array.from(this.partitionProps.partitionMap.values())

        this.partitionProps.partitionRepoForceUpdate(this.partitionProps.partitionRenderList)

    }

    private addPartition = () => {

        const partitionID = this.globalPartitionID++
        this.partitionProps.partitionMetadataMap.set(partitionID,
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

        this.partitionProps.partitionMap.set(partitionID,
            <CachePartition 
                key = {partitionID} 
                partitionProps = {this.partitionProps} 
                partitionID = {partitionID} 
                callback = { callback } />)

        this.renderPartitionRepo()

        return promise

    }

    private async findPartitionWithRoom() {

        const { CACHE_PARTITION_SIZE } = this

        const { partitionMetadataMap } = this.partitionProps
        let { partitionPtr } = this.partitionProps

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

        this.partitionProps.partitionPtr = partitionPtr

        return partitionPtr

    }

    private addPartitionPortal = (partitionID, itemID, portal) => {

        const partitionMetadata = this.partitionProps.partitionMetadataMap.get(partitionID)

        partitionMetadata.portalMap.set(itemID,portal)

        this.partitionProps.partitionModifiedSet.add(partitionID)

    }

    private removePartitionPortal = (partitionID, itemID) => {

        const partitionMetadata = this.partitionProps.partitionMetadataMap.get(partitionID)

        partitionMetadata.portalMap.delete(itemID)
        partitionMetadata.mapcount -= 1 

        this.partitionProps.partitionModifiedSet.add(partitionID)

    }

    private renderPartition = (partitionID) => {

        const partitionMetadata = this.partitionProps.partitionMetadataMap.get(partitionID)

        if (!partitionMetadata) return

        partitionMetadata.portalRenderList =  Array.from(partitionMetadata.portalMap.values())

        // if forceUpdate has not yet been assigned, it is in the works from first call of partition
        partitionMetadata.forceUpdate && partitionMetadata.forceUpdate(partitionMetadata.portalRenderList)

    }

    // set state of the CachePartition component of the scroller to trigger render
    private renderPortalLists = () => {

        const { partitionModifiedSet } = this.partitionProps

        if (partitionModifiedSet.size) {

            partitionModifiedSet.forEach((partitionID) => {

                this.renderPartition(partitionID)

            })            

            this.partitionProps.partitionModifiedSet.clear()

        }

    }

    private clearCache = (scrollerID) => {

        const { scrollerDataMap, itemMetadataMap } = this
        const datamap = scrollerDataMap.get(scrollerID)
        const {indexToItemIDMap, itemSet, requestedSet} = datamap

        if (scrollerDataMap.size == 1) {

            // clear base data
            itemMetadataMap.clear()

            // clear cache partitions
            this.partitionProps.partitionMetadataMap.clear()
            this.partitionProps.partitionMap.clear()
            this.partitionProps.partitionRenderList = []
            this.partitionProps.partitionModifiedSet.clear()
            this.partitionProps.partitionPtr = null
            this.partitionProps.partitionRepoForceUpdate(null)

        } else {

            itemSet.forEach((itemID) => {
                const { partitionID } = itemMetadataMap.get(itemID)
                this.removePartitionPortal(partitionID,itemID)
            })
            this.renderPortalLists()

        }

        indexToItemIDMap.clear()
        itemSet.clear()
        requestedSet.clear()

    }

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    // ----------------------------[ basic operations ]--------------------------

    // called from Cradle.nullItemSetMaxListsize, and serviceHandler.setListSize
    private changeCacheListSize = (scrollerID, newlistsize, deleteListCallback, changeListSizeCallback) => {

        // match cache to newlistsize
        const portalIndexMap:Map<number,number> = this.scrollerDataMap.get(scrollerID).indexToItemIDMap
        const mapkeysList = Array.from(portalIndexMap.keys())

        mapkeysList.sort((a,b) => a - b) // ascending

        const { cradleParameters } = this.scrollerDataMap.get(scrollerID)

        const { virtualListProps } = cradleParameters.cradleInternalPropertiesRef.current

        const { lowindex } = virtualListProps

        const highestindex = mapkeysList.at(-1)

        if (highestindex > ((newlistsize + lowindex) -1)) { // pare the cache

            const parelist = mapkeysList.filter((index)=>{
                const comparehighindex = newlistsize + lowindex - 1
                return index > (comparehighindex)
            })

            this.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

        }

        changeListSizeCallback && changeListSizeCallback(newlistsize)

    }

    private changeCacheListRange = (scrollerID, newlistrange, deleteListCallback, changeListRangeCallback) => {

        // match cache to newlistsize
        const portalIndexMap:Map<number,number> = this.scrollerDataMap.get(scrollerID).indexToItemIDMap
        const mapkeysList = Array.from(portalIndexMap.keys())

        mapkeysList.sort((a,b) => a - b) // ascending

        const { cradleParameters } = this.scrollerDataMap.get(scrollerID)

        const { virtualListProps } = cradleParameters.cradleInternalPropertiesRef.current

        const { lowindex } = virtualListProps

        const highestindex = mapkeysList.at(-1)

        if (highestindex > ((newlistrange + lowindex) -1)) { // pare the cache

            const parelist = mapkeysList.filter((index)=>{
                const comparehighindex = newlistrange + lowindex - 1
                return index > (comparehighindex)
            })

            this.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

        }

        changeListRangeCallback && changeListRangeCallback(newlistrange)

    }
    // ----------------------[ cache size limit enforceent ]------------------

    private matchCacheToCradle = (scrollerID, cradleIndexList, deleteListCallback) => {

        const mapkeys = Array.from(this.scrollerDataMap.get(scrollerID).indexToItemIDMap.keys())

        const delkeys = mapkeys.filter(key => !cradleIndexList.includes(key))

        if (delkeys.length) {

            this.deletePortalByIndex(scrollerID, delkeys, deleteListCallback)
            return true

        } else {

            return false

        }

    }

    private pareCacheToMax = (scrollerID, cacheMax, cradleIndexList, deleteListCallback) => {

        const modelLength = cradleIndexList.length

        // determine need for paring
        if ((!cacheMax) || (!modelLength)) return false

        const max = Math.max(modelLength, cacheMax)

        const portalIndexMap:Map<number, number> = this.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            requestedSet:Set<number> = this.scrollerDataMap.get(scrollerID).requestedSet

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

        this.deletePortalByIndex(scrollerID, delList, deleteListCallback)

        return true

    }

    private guardAgainstRunawayCaching = (scrollerID, cacheMax, cradleListLength, MAX_CACHE_OVER_RUN) => {

        if (!cacheMax) return false

        const { indexToItemIDMap, requestedSet } = this.scrollerDataMap.get(scrollerID)

        const max = Math.max(cradleListLength, cacheMax)

        if ((indexToItemIDMap.size + requestedSet.size) <= ((max) * MAX_CACHE_OVER_RUN)) {

            return false

        } else {

            return true

        }

    }

    // --------------------------------[ preload ]--------------------------------

    private preload = (scrollerID, finalCallback, nullItemSetMaxListsize) => {

        const { cradleParameters } = this.scrollerDataMap.get(scrollerID)

        const { scrollerPropertiesRef } = cradleParameters

        const { stateHandler, serviceHandler } = cradleParameters.handlersRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current

        const { getItem, cacheMax } = cradleInheritedProperties,
            listsize = cradleInternalProperties.virtualListProperties.size

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
            
            const indexToItemIDMap = this.scrollerDataMap.get(scrollerID).indexToItemIDMap

            const { preloadIndexCallback, itemExceptionCallback } = serviceHandler.callbacks

            for (let index = 0; index < preloadsize; index++) {

                preloadIndexCallback && preloadIndexCallback(index)
                if (!indexToItemIDMap.has(index)) {

                    const promise = this.preloadItem(
                        scrollerID,
                        index, 
                        getItem, 
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
                this.renderPortalLists()
                finalCallback()
            }
        )

    }

    // =========================[ SNAPSHOTS ]=========================

    private getCacheIndexMap(scrollerID) {

        return new Map(this.scrollerDataMap.get(scrollerID).indexToItemIDMap)

    }

    private getCradleIndexMap(scrollerID, cradleIndexList) {

        const cradleMap = new Map(),
            { indexToItemIDMap } = this.scrollerDataMap.get(scrollerID)

        for (const index of cradleIndexList) {

            cradleMap.set(index, indexToItemIDMap.get(index))

        }

        return cradleMap

    }

    private getCacheItemMap(scrollerID) {

        const cachelist = new Map()
        const { itemSet } = this.scrollerDataMap.get(scrollerID)
        const { itemMetadataMap } = this

        // for (const [key, value] of this.itemMetadataMap) {
        for (const itemID of itemSet) {
            const metadata = itemMetadataMap.get(itemID)
            const {
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

        const indexToItemIDMap:Map<number, number> = this.scrollerDataMap.get(scrollerID).indexToItemIDMap
        const { itemMetadataMap } = this

        // ----------- define parameters ---------------

        const moveblocksize = fromhighindex - fromlowindex + 1,
            moveincrement = tolowindex - fromlowindex,
            tohighindex = tolowindex + (moveblocksize - 1)

        const movedirection = 
            (moveincrement > 0)? // move block up in list
                'up': // shift down, make room for shiftingindex above
                'down'   // shift up, make room for shiftingindex below

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
    private insertRemoveIndex(scrollerID, index, highrange, increment, listsize ) { // increment is +1 or -1

        // clarity
        const isInserting = (increment == 1)
        const isRemoving = (increment == -1)

        const emptyreturn = [null, null, [],[],[], []] // no action return value

        // cache resources
        const indexToItemIDMap:Map<number, number>  = this.scrollerDataMap.get(scrollerID).indexToItemIDMap
        const { itemMetadataMap } = this
        const orderedCacheIndexList = Array.from(indexToItemIDMap.keys()).sort((a,b)=>a-b) // ascending order
        const itemSet = this.scrollerDataMap.get(scrollerID).itemSet

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
        const startChangeIndex = 
            (increment == 1)?
                lowrangeindex:
                highrangeindex + (rangeincrement + 1)

        let toShiftStartIndex // start of indexes to shift up (insert) or down (remove)
        if (isInserting) {
            toShiftStartIndex = lowrangeindex
        } else { // isRemoving
            toShiftStartIndex = highrangeindex + 1
        }

        // ---------- define range boundaries within ordered cache index list ------------

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

        const cacheIndexesShiftedList = [] // track shifted indexes
        const cacheIndexesTransferredSet:Set<number> = new Set() // obtain list of orphaned indexes

        // function modify index-to-itemid map, and metadata map, for index shifts
        const processIndexFn = index => {

            const itemID = indexToItemIDMap.get(index)
            const newIndex = index + rangeincrement

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

                const { partitionID } = itemMetadataMap.get(itemID)
                portalPartitionItemsForDeleteList.push({itemID, partitionID})
                itemMetadataMap.delete(itemID)
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
        return [startChangeIndex, rangeincrement, cacheIndexesShiftedList, cacheIndexesRemovedList, cacheIndexesToReplaceList, portalPartitionItemsForDeleteList]

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // used for size calculation in pareCacheToMax
    // registers indexes when requested but before retrieved and entered into cache
    private registerPendingPortal(scrollerID, index) {

        this.scrollerDataMap.get(scrollerID).requestedSet.add(index)

    }

    private unregisterPendingPortal(scrollerID, index) {

        const scrollerDataMap = this.scrollerDataMap.get(scrollerID)

        if (scrollerDataMap) { // otherwise scroller has been deleted
            scrollerDataMap.requestedSet.delete(index)
        }

    }

    private getNewItemID() {

        return this.globalItemID++

    }

    // get new or existing itemID for contentfunctions.createCellFrame
    private getNewOrExistingItemID(scrollerID, index) {

        const { indexToItemIDMap } = this.scrollerDataMap.get(scrollerID)

        const itemID = 
            (indexToItemIDMap.has(index))?
                indexToItemIDMap.get(index):
                (this.getNewItemID())

        return itemID

    }

     // create new portal
    private async createPortal(scrollerID, component, index, itemID, scrollerProperties, isPreload = false) {

        this.unregisterPendingPortal(scrollerID, index)

        const scrollerDataMap = this.scrollerDataMap.get(scrollerID)

        if (!scrollerDataMap) return null

        const { layout, cellHeight, cellWidth, orientation } = 
            this.scrollerDataMap.get(scrollerID).cradleParameters.cradleInheritedPropertiesRef.current

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
            scrollerID,
            scrollerProperties,
            component,
            partitionID,
        }

        this.itemMetadataMap.set(itemID, portalMetadata)
        scrollerDataMap.itemSet.add(itemID)
        scrollerDataMap.indexToItemIDMap.set(index, itemID)

        if (!isPreload) this.renderPortalLists()

        return portalMetadata

    }

    // used for preloading new item
    private async preloadItem(
        scrollerID,
        index, 
        getItem, 
        scrollerPropertiesRef, 
        itemExceptionCallback,
        maxListsizeInterrupt
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
                await this.createPortal(scrollerID,content, index, itemID, scrollerProperties, true) // true = isPreload

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
    private deletePortalByIndex(scrollerID, index, deleteListCallback) {

        const indexArray = 
            (!Array.isArray(index))?
                [index]:
                index

        const { indexToItemIDMap, itemSet } = this.scrollerDataMap.get(scrollerID)

        const { itemMetadataMap } = this

        const { removePartitionPortal } = this

        const deleteList = []

        for (const index of indexArray) {

            const itemID = indexToItemIDMap.get(index)

            if (itemID === undefined) continue // async mismatch

            deleteList.push({index,itemID})
            const { partitionID } = itemMetadataMap.get(itemID)

            removePartitionPortal(partitionID,itemID)

            itemMetadataMap.delete(itemID)
            itemSet.delete(itemID)
            indexToItemIDMap.delete(index)

        }

        deleteListCallback && deleteListCallback(deleteList)

    }

    private applyPortalPartitionItemsForDeleteList = (scrollerID) => {

        const { portalPartitionItemsForDeleteList } = this.scrollerDataMap.get(scrollerID)

        if (portalPartitionItemsForDeleteList && portalPartitionItemsForDeleteList.length) {

            for (const item of portalPartitionItemsForDeleteList) {

                this.removePartitionPortal(item.partitionID, item.itemID)
                
            }

            this.scrollerDataMap.get(scrollerID).portalPartitionItemsForDeleteList = []                    

            this.renderPortalLists()

        }

    }

    // query existence of a portal list item
    private hasPortal(itemID) {

        return this.itemMetadataMap.has(itemID)

    }

    private getPortalMetadata(itemID) {

        if (this.hasPortal(itemID)) {
            return this.itemMetadataMap.get(itemID)
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
