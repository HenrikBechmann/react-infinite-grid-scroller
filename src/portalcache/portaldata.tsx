// partitiondata.tsx

import React from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

import CachePartition from './CachePartition'

export default class PortalData {

    constructor(CACHE_PARTITION_SIZE) {

        this.CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE

    }

    private globalItemID = 0
    private itemMetadataMap = new Map()

    private linkSupport = ({scrollerData}) => {

        this.scrollerData = scrollerData

    }

    private globalPartitionID = 0
    private CACHE_PARTITION_SIZE

    private scrollerData

    // partition holds itemID components
    private partitionProps = {

        partitionMetadataMap:new Map(),
        partitionMap: new Map(),
        partitionRenderList:null,
        partitionRepoForceUpdate:null,
        partitionModifiedSet: new Set(),

        partitionPtr:null, // active partition, for followup

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

        const 
            resolvefunc = {
                current:null
            },

            promise = new Promise((resolve) => {
                resolvefunc.current = resolve
            }),

            callback = () => {

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

        const 
            { CACHE_PARTITION_SIZE } = this,
            { partitionMetadataMap } = this.partitionProps

        let 
            { partitionPtr } = this.partitionProps,
            partitionMetadata

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

    private clearCachePartitions = () => {

        this.partitionProps.partitionMetadataMap.clear()
        this.partitionProps.partitionMap.clear()
        this.partitionProps.partitionRenderList = []
        this.partitionProps.partitionModifiedSet.clear()
        this.partitionProps.partitionPtr = null
        this.partitionProps.partitionRepoForceUpdate(null)

    }

    private deletePortalByIndex(scrollerID, index, deleteListCallback) {

        const
            indexArray = 
                (!Array.isArray(index))?
                    [index]:
                    index,

            { indexToItemIDMap, itemSet } = this.scrollerData.scrollerDataMap.get(scrollerID),

            { itemMetadataMap } = this,

            { removePartitionPortal } = this,

            deleteList = []

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

}