// scrollerdata.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

export default class ScrollerData {

    private scrollerDataMap = new Map()

    private cachePortalData

    private linkSupport = ({cachePortalData}) => {

        this.cachePortalData = cachePortalData
                
    }
    registerScroller(scrollerID) {

        this.scrollerDataMap.set(scrollerID, 
            {
                indexToItemIDMap: new Map(), 
                itemSet: new Set(), // for scrollerID limited operations
                cradleParameters:null,
                // some portals may have been requested by requestidlecallback, not yet created
                requestedSet:new Set(),
                portalPartitionItemsToDeleteList:null,
            }
        )
    }

    private unRegisterScroller = (scrollerID, itemSet) => {

        const 
            { scrollerDataMap } = this,
            { itemMetadataMap } = this.cachePortalData

        if ( scrollerDataMap.size == 1 ) return // already getting dismantled; avoid conflict

        scrollerDataMap.delete(scrollerID)
        itemSet.forEach((itemID) => {
            const { partitionID } = itemMetadataMap.get(itemID)
            this.cachePortalData.removePartitionPortal(partitionID,itemID)
            itemMetadataMap.delete(itemID)
        })
        this.cachePortalData.renderPortalLists()
        // this.measureMemory('UNREGISTER', scrollerID)

    }

    private clearCache = (scrollerID) => {

        const
            { scrollerDataMap } = this,
            { itemMetadataMap } = this.cachePortalData,
            datamap = scrollerDataMap.get(scrollerID),
            {indexToItemIDMap, itemSet, requestedSet} = datamap

        if (scrollerDataMap.size == 1) {

            // clear base data
            itemMetadataMap.clear()

            // clear cache partitions
            this.cachePortalData.clearCachePartitions()

        } else {

            itemSet.forEach((itemID) => {
                const { partitionID } = itemMetadataMap.get(itemID)
                this.cachePortalData.removePartitionPortal(partitionID,itemID)
            })
            this.cachePortalData.renderPortalLists()

        }

        indexToItemIDMap.clear()
        itemSet.clear()
        requestedSet.clear()

    }

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    // ----------------------------[ basic operations ]--------------------------

    private changeCacheListRange = (scrollerID, newlistrange, deleteListCallbackWrapper) => { 

        if (newlistrange.length == 0) {
            this.clearCache(scrollerID) 
            return
        }
        // match cache to newlistsize
        const 
            portalIndexMap:Map<number,number> = this.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            mapkeysList = Array.from(portalIndexMap.keys())

        mapkeysList.sort((a,b) => a - b) // ascending

        const 
            [ lownewindex, highnewindex ] = newlistrange,

            highestindex = mapkeysList.at(-1),
            lowestindex = mapkeysList.at(0)

        if (highestindex > highnewindex) { // pare the cache

            const compareindex = highnewindex
            const parelist = mapkeysList.filter((index)=>{
                return index > (compareindex)
            })

            this.cachePortalData.deletePortalByIndex(scrollerID, parelist, deleteListCallbackWrapper)

        }

        if (lowestindex < lownewindex) { // pare the cache

            const compareindex = lownewindex
            const parelist = mapkeysList.filter((index)=>{
                return index < (compareindex)
            })

            this.cachePortalData.deletePortalByIndex(scrollerID, parelist, deleteListCallbackWrapper)

        }

    }
}