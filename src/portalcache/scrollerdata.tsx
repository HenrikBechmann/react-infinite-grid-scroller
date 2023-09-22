// scrollerdata.tsx

import React from 'react'

export default class ScrollerData {

    private scrollerDataMap = new Map()

    private partitionData
    private itemData

    private linkSupport = ({partitionData, itemData}) => {

        this.partitionData = partitionData
        this.itemData = itemData
                
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

        const { itemMetadataMap } = this.itemData

        if ( scrollerDataMap.size == 1 ) return // already getting dismantled; avoid conflict

        scrollerDataMap.delete(scrollerID)
        itemSet.forEach((itemID) => {
            const { partitionID } = itemMetadataMap.get(itemID)
            this.partitionData.removePartitionPortal(partitionID,itemID)
            itemMetadataMap.delete(itemID)
        })
        this.partitionData.renderPortalLists()
        // this.measureMemory('UNREGISTER', scrollerID)

    }

    private clearCache = (scrollerID) => {

        const
            { scrollerDataMap } = this,
            { itemMetadataMap } = this.itemData,
            datamap = scrollerDataMap.get(scrollerID),
            {indexToItemIDMap, itemSet, requestedSet} = datamap

        if (scrollerDataMap.size == 1) {

            // clear base data
            itemMetadataMap.clear()

            // clear cache partitions
            this.partitionData.clearCachePartisions()

        } else {

            itemSet.forEach((itemID) => {
                const { partitionID } = itemMetadataMap.get(itemID)
                this.partitionData.removePartitionPortal(partitionID,itemID)
            })
            this.partitionData.renderPortalLists()

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

            this.partitionData.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

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

            this.partitionData.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

        }

        if (lowestindex < lownewindex) { // pare the cache

            const compareindex = lownewindex
            const parelist = mapkeysList.filter((index)=>{
                return index < (compareindex)
            })

            this.partitionData.deletePortalByIndex(scrollerID, parelist, deleteListCallback)

        }

    }
}