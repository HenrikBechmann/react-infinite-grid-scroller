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

}