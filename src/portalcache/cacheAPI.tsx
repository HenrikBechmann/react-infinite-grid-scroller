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
        - if you create an empty 'scrollerContext' property for your component, CellFrame will
            set it to an object containing scrollerPropertiesRef and cellFramePropertiesRef
        - if your component does not scroll, there should be no issues.

*/

// import React, {useState, useEffect, useRef, useCallback} from 'react'
import React from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

import ScrollerData from './cacheAPI/cachescrollerdata'
import PortalData from './cacheAPI/cacheportaldata'
import CacheService from './cacheAPI/cacheservice'

// import CachePartition from './CachePartition'

// the cache itself is maintained in the root infinitegridscroller component
export default class CacheAPI {

    constructor(CACHE_PARTITION_SIZE) {

        // this.CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE

        this.cacheScrollerData = new ScrollerData()
        this.cachePortalData = new PortalData(CACHE_PARTITION_SIZE)
        this.cacheService = new CacheService()

        this.cacheScrollerData.linkSupport({cachePortalData:this.cachePortalData})
        this.cachePortalData.linkSupport({cacheScrollerData:this.cacheScrollerData})
        this.cacheService.linkSupport({cacheScrollerData:this.cacheScrollerData,cachePortalData:this.cachePortalData})

    }

    private cacheScrollerData
    private cachePortalData
    private cacheService

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

        this.cacheScrollerData.registerScroller(scrollerID)

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
                return  this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap
            },
            get itemSet() {
                return this.getItemSet()
            },
            getItemSet:() => {
                return  this.cacheScrollerData.scrollerDataMap.get(scrollerID).itemSet
            },
            itemMetadataMap:this.cachePortalData.itemMetadataMap,
            get requestedSet() {
                return this.getRequestedSet()
            },
            getRequestedSet:() => {
                return this.cacheScrollerData.scrollerDataMap.get(scrollerID).requestedSet
            },
            set partitionRepoForceUpdate(fn) {
                this.setPartitionRepoForceUpdate(fn)
            },
            setPartitionRepoForceUpdate:(fn) => {
                this.cachePortalData.partitionProps.partitionRepoForceUpdate = fn
            },
            set cradleParameters(parms){
                this.setCradleParameters(parms)
            },
            setCradleParameters:(parms) => {
                this.cacheScrollerData.scrollerDataMap.get(scrollerID).cradleParameters = parms
            },
            set portalPartitionItemsToDeleteList(list) {
                this.setPortalPartitionItemsForDeleteList(list)
            },
            setPortalPartitionItemsForDeleteList:(list) => {
                this.cacheScrollerData.scrollerDataMap.get(scrollerID).portalPartitionItemsToDeleteList = list
            },
            get instance() {
                return this.getInstance()
            }, 
            getInstance:() => {
                return this
            },

            // methods
            unRegisterScroller:(itemSet) => {
                return this.cacheScrollerData.unRegisterScroller(scrollerID, itemSet)
            },
            renderPartitionRepo:() => {
                return this.cachePortalData.renderPartitionRepo()
            },
            renderPortalLists:() => {
                return this.cachePortalData.renderPortalLists()
            },
            clearCache:() => {
                return this.cacheScrollerData.clearCache(scrollerID)
            },
            // changeCacheListSize:(newlistsize, deleteListCallbackWrapper) => {
            //     return this.cacheScrollerData.changeCacheListSize(scrollerID, newlistsize, deleteListCallbackWrapper) 
            // },
            changeCacheListRange:(newlistrange, deleteListCallbackWrapper) => { 
                return this.cacheScrollerData.changeCacheListRange(scrollerID, newlistrange, deleteListCallbackWrapper)
            },
            matchCacheToCradle:(cradleIndexList, deleteListCallbackWrapper) => {
                return this.matchCacheToCradle(scrollerID, cradleIndexList, deleteListCallbackWrapper)
            },
            pareCacheToMax:(cacheMax, cradleIndexList, deleteListCallbackWrapper) => {
                return this.pareCacheToMax(scrollerID, cacheMax, cradleIndexList, deleteListCallbackWrapper)
            },
            guardAgainstRunawayCaching:(cacheMax, cradleListLength, MAX_CACHE_OVER_RUN) => {
                return this.guardAgainstRunawayCaching(scrollerID, cacheMax, cradleListLength, MAX_CACHE_OVER_RUN)
            },
            preload:(finalCallback, accept) => {
                return this.cachePortalData.preload(scrollerID, finalCallback, accept)
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
                return this.cacheService.moveIndex(scrollerID, tolowindex, fromlowindex, fromhighindex)
            },
            insertOrRemoveCacheIndexes:(index, highrange, incrementDirection, listrange ) => {
                return this.cacheService.insertOrRemoveCacheIndexes( scrollerID, index, highrange, incrementDirection, listrange )
            },
            insertOrRemoveCacheIndexesFromScroller:(index, highrange, incrementDirection, listrange) => {
                return this.cacheService.insertOrRemoveCacheIndexesFromScroller( scrollerID, index, highrange, incrementDirection, listrange)
            },
            registerPendingPortal:(index) => {
                return this.cachePortalData.registerPendingPortal(scrollerID, index)
            },
            unregisterPendingPortal:(index) => {
                return this.cachePortalData.unregisterPendingPortal(scrollerID, index)
            },
            getNewItemID:() => {
                return this.cachePortalData.getNewItemID()
            },
            getNewOrExistingItemID:(index) => {
                return this.cachePortalData.getNewOrExistingItemID(scrollerID, index)
            },
            addCacheItemToScroller:(itemID, index) => {
                return this.cachePortalData.addCacheItemToScroller(scrollerID,itemID, index)
            },
            createPortal:(component, index, itemID, scrollerContext, dndOptions, profile, isPreload = false) => {
                return this.cachePortalData.createPortal(scrollerID, component, index, itemID, scrollerContext, dndOptions, profile, isPreload = false)
            },
            deletePortalByIndex:(index, deleteListCallbackWrapper) => {
                return this.cachePortalData.deletePortalByIndex(scrollerID, index, deleteListCallbackWrapper)
            },
            applyPortalPartitionItemsForDeleteList:() => {
                return this.cachePortalData.applyPortalPartitionItemsForDeleteList(scrollerID)
            },
            hasPortal:(itemID) => {
                return this.cachePortalData.hasPortal(itemID)
            },
            getPortalMetadata:(itemID) => {
                return this.cachePortalData.getPortalMetadata(itemID)
            }
        }

        return facade
    }

    // ----------------------[ cache size limit enforceent ]------------------

    private matchCacheToCradle = (scrollerID, cradleIndexList, deleteListCallbackWrapper) => {

        const 
            mapkeys = Array.from(this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap.keys()),
            delkeys = mapkeys.filter(key => !cradleIndexList.includes(key))

        if (delkeys.length) {

            this.cachePortalData.deletePortalByIndex(scrollerID, delkeys, deleteListCallbackWrapper)
            return true

        } else {

            return false

        }

    }

    private pareCacheToMax = (scrollerID, cacheMax, cradleIndexList, deleteListCallbackWrapper) => {

        const modelLength = cradleIndexList.length

        // determine need for paring
        if ((!cacheMax) || (!modelLength)) return false

        const 
            max = Math.max(modelLength, cacheMax),
            portalIndexMap:Map<number, number> = this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            requestedSet:Set<number> = this.cacheScrollerData.scrollerDataMap.get(scrollerID).requestedSet

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

        this.cachePortalData.deletePortalByIndex(scrollerID, delList, deleteListCallbackWrapper)

        return true

    }

    private guardAgainstRunawayCaching = (scrollerID, cacheMax, cradleListLength, MAX_CACHE_OVER_RUN) => {

        if (!cacheMax) return false

        const 
            { indexToItemIDMap, requestedSet } = this.cacheScrollerData.scrollerDataMap.get(scrollerID),
            max = Math.max(cradleListLength, cacheMax)

        if ((indexToItemIDMap.size + requestedSet.size) <= ((max) * MAX_CACHE_OVER_RUN)) {

            return false

        } else {

            return true

        }

    }

    // =========================[ SNAPSHOTS ]=========================

    private getCacheIndexMap(scrollerID) {

        return new Map(this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap)

    }

    private getCradleIndexMap(scrollerID, cradleIndexList) {

        const cradleMap = new Map(),
            { indexToItemIDMap } = this.cacheScrollerData.scrollerDataMap.get(scrollerID)

        for (const index of cradleIndexList) {

            cradleMap.set(index, indexToItemIDMap.get(index))

        }

        return cradleMap

    }

    private getCacheItemMap(scrollerID) {

        const 
            cachelist = new Map(),
            { itemSet } = this.cacheScrollerData.scrollerDataMap.get(scrollerID),
            { itemMetadataMap } = this.cachePortalData

        // for (const [key, value] of this.itemMetadataMap) {
        for (const itemID of itemSet) {
            const
                metadata = itemMetadataMap.get(itemID),
                {

                    index,
                    component,
                    profile,

                } = metadata

            cachelist.set(itemID,{
                index,
                component,
                profile,
            })

        }

        return cachelist

    }

}

