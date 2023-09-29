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

        this.scrollerData = new ScrollerData()
        this.portalData = new PortalData(CACHE_PARTITION_SIZE)
        this.cacheService = new CacheService()

        this.scrollerData.linkSupport({portalData:this.portalData})
        this.portalData.linkSupport({scrollerData:this.scrollerData})
        this.cacheService.linkSupport({scrollerData:this.scrollerData,portalData:this.portalData})

    }

    private scrollerData
    private portalData
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
            itemMetadataMap:this.portalData.itemMetadataMap,
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
                this.portalData.partitionProps.partitionRepoForceUpdate = fn
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
                return this.portalData.renderPartitionRepo()
            },
            renderPortalLists:() => {
                return this.portalData.renderPortalLists()
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
            preload:(finalCallback) => {
                return this.portalData.preload(scrollerID, finalCallback)
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
            insertRemoveIndex:(index, highrange, increment, listsize, removeItems ) => {
                return this.cacheService.insertRemoveIndex( scrollerID, index, highrange, increment, listsize, removeItems )
            },
            registerPendingPortal:(index) => {
                return this.portalData.registerPendingPortal(scrollerID, index)
            },
            unregisterPendingPortal:(index) => {
                return this.portalData.unregisterPendingPortal(scrollerID, index)
            },
            getNewItemID:() => {
                return this.portalData.getNewItemID()
            },
            getNewOrExistingItemID:(index) => {
                return this.portalData.getNewOrExistingItemID(scrollerID, index)
            },
            transferPortalMetadataToScroller:(itemID,toIndex) => {
                return this.portalData.transferPortalMetadataToScroller(scrollerID,itemID,toIndex)
            },
            createPortal:(component, index, itemID, scrollerContext, dndOptions, profile, isPreload = false) => {
                return this.portalData.createPortal(scrollerID, component, index, itemID, scrollerContext, dndOptions, profile, isPreload = false)
            },
            deletePortalByIndex:(index, deleteListCallback) => {
                return this.portalData.deletePortalByIndex(scrollerID, index, deleteListCallback)
            },
            applyPortalPartitionItemsForDeleteList:() => {
                return this.portalData.applyPortalPartitionItemsForDeleteList(scrollerID)
            },
            hasPortal:(itemID) => {
                return this.portalData.hasPortal(itemID)
            },
            getPortalMetadata:(itemID) => {
                return this.portalData.getPortalMetadata(itemID)
            }
        }

        return facade
    }

    // ----------------------[ cache size limit enforceent ]------------------

    private matchCacheToCradle = (scrollerID, cradleIndexList, deleteListCallback) => {

        const 
            mapkeys = Array.from(this.scrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap.keys()),
            delkeys = mapkeys.filter(key => !cradleIndexList.includes(key))

        if (delkeys.length) {

            this.portalData.deletePortalByIndex(scrollerID, delkeys, deleteListCallback)
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

        this.portalData.deletePortalByIndex(scrollerID, delList, deleteListCallback)

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
            { itemMetadataMap } = this.portalData

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

}

