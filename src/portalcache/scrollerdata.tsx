// scrollerdata.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

export default class ScrollerData {

    private scrollerDataMap = new Map()

    private portalData

    private linkSupport = ({portalData}) => {

        this.portalData = portalData
                
    }
    registerScroller(scrollerID) {

        this.scrollerDataMap.set(scrollerID, 
            {
                indexToItemIDMap: new Map(), 
                itemSet: new Set(), // for scrollerID limited operations
                cradleParameters:null,
                // some portals may have been requested by requestidlecallback, not yet created
                requestedSet:new Set(),
                portalPartitionItemsForDeleteList:null,
            }
        )
    }

    private unRegisterScroller = (scrollerID, itemSet) => {

        const { scrollerDataMap } = this

        const { itemMetadataMap } = this.portalData

        if ( scrollerDataMap.size == 1 ) return // already getting dismantled; avoid conflict

        scrollerDataMap.delete(scrollerID)
        itemSet.forEach((itemID) => {
            const { partitionID } = itemMetadataMap.get(itemID)
            this.portalData.removePartitionPortal(partitionID,itemID)
            itemMetadataMap.delete(itemID)
        })
        this.portalData.renderPortalLists()
        // this.measureMemory('UNREGISTER', scrollerID)

    }

    private clearCache = (scrollerID) => {

        const
            { scrollerDataMap } = this,
            { itemMetadataMap } = this.portalData,
            datamap = scrollerDataMap.get(scrollerID),
            {indexToItemIDMap, itemSet, requestedSet} = datamap

        if (scrollerDataMap.size == 1) {

            // clear base data
            itemMetadataMap.clear()

            // clear cache partitions
            this.portalData.clearCachePartisions()

        } else {

            itemSet.forEach((itemID) => {
                const { partitionID } = itemMetadataMap.get(itemID)
                this.portalData.removePartitionPortal(partitionID,itemID)
            })
            this.portalData.renderPortalLists()

        }

        indexToItemIDMap.clear()
        itemSet.clear()
        requestedSet.clear()

    }

    //===========================[ REPOSITORY AND LIST MANAGEMENT ]==================================

    // ----------------------------[ basic operations ]--------------------------

    // called from Cradle.nullItemSetMaxListsize, and serviceHandler.setListSize
    private changeCacheListSize = (scrollerID, newlistsize, deleteListCallback) => {

        if (newlistsize.length == 0) {
            this.clearCache(scrollerID) 
            return
        }

        // match cache to newlistsize
        const 
            portalIndexMap:Map<number,number> = this.scrollerDataMap.get(scrollerID).indexToItemIDMap,
            mapkeysList = Array.from(portalIndexMap.keys())

        mapkeysList.sort((a,b) => a - b) // ascending

        const 
            { cradleParameters } = this.scrollerDataMap.get(scrollerID),

            { virtualListProps } = cradleParameters.cradleInternalPropertiesRef.current,

            { lowindex } = virtualListProps,

            highestindex = mapkeysList.at(-1)

        if (highestindex > ((newlistsize + lowindex) -1)) { // pare the cache

            const parelist = mapkeysList.filter((index)=>{
                const comparehighindex = newlistsize + lowindex - 1
                return index > (comparehighindex)
            })

            this.portalData.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

        }

    }

    private changeCacheListRange = (scrollerID, newlistrange, deleteListCallback) => { 

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

            this.portalData.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

        }

        if (lowestindex < lownewindex) { // pare the cache

            const compareindex = lownewindex
            const parelist = mapkeysList.filter((index)=>{
                return index < (compareindex)
            })

            this.portalData.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

        }

    }
}