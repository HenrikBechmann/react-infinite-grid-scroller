// partitiondata.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

import { createHtmlPortalNode, InPortal } from 'react-reverse-portal'

import { GenericObject } from '../../InfiniteGridScroller'

import CachePartition from '../CachePartition'

export default class PortalData {

    constructor(CACHE_PARTITION_SIZE) {

        this.CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE

    }

    private globalItemID = 0
    private itemMetadataMap = new Map()

    private linkSupport = ({cacheScrollerData}) => {

        this.cacheScrollerData = cacheScrollerData

    }

    private globalPartitionID = 0
    private CACHE_PARTITION_SIZE

    private cacheScrollerData

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

    private deletePortalByIndex(scrollerID, index, deleteListCallbackWrapper) {

        const
            indexArray = 
                (!Array.isArray(index))?
                    [index]:
                    index,

            { indexToItemIDMap, itemSet } = this.cacheScrollerData.scrollerDataMap.get(scrollerID),

            { itemMetadataMap } = this,

            { removePartitionPortal } = this,

            deleteList = []

        for (const index of indexArray) {

            const itemID = indexToItemIDMap.get(index)

            if (itemID === undefined) continue // async mismatch

            const { partitionID, profile } = itemMetadataMap.get(itemID)
            deleteList.push({index, itemID, profile})

            removePartitionPortal(partitionID,itemID)

            itemMetadataMap.delete(itemID)
            itemSet.delete(itemID)
            indexToItemIDMap.delete(index)

        }

        deleteListCallbackWrapper && deleteListCallbackWrapper(deleteList)

    }

    // ==========================[ INDIVIDUAL PORTAL MANAGEMENT ]============================

    // used for size calculation in pareCacheToMax
    // registers indexes when requested but before retrieved and entered into cache
    private registerPendingPortal(scrollerID, index) {

        this.cacheScrollerData.scrollerDataMap.get(scrollerID).requestedSet.add(index)

    }

    private unregisterPendingPortal(scrollerID, index) {

        const scrollerDataMap = this.cacheScrollerData.scrollerDataMap.get(scrollerID)

        if (scrollerDataMap) { // otherwise scroller has been deleted
            scrollerDataMap.requestedSet.delete(index)
        }

    }

    private getNewItemID() {

        return this.globalItemID++

    }

    // get new or existing itemID for contentfunctions.createCellFrame
    private getNewOrExistingItemID(scrollerID, index) {

        const { indexToItemIDMap } = this.cacheScrollerData.scrollerDataMap.get(scrollerID)

        const itemID = 
            (indexToItemIDMap.has(index))?
                indexToItemIDMap.get(index):
                (this.getNewItemID())

        return itemID

    }

    private transferPortalMetadataToScroller(scrollerID, itemID, toIndex) {

        const targetScrollerDataMap = this.cacheScrollerData.scrollerDataMap.get(scrollerID)

        if (!targetScrollerDataMap) return null

        const portalMetadata = this.itemMetadataMap.get(itemID)

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
    private async createPortal(scrollerID, component, index, itemID, scrollerContext, dndOptions, profile, isPreload = false) {

        this.unregisterPendingPortal(scrollerID, index)

        const scrollerDataMap = this.cacheScrollerData.scrollerDataMap.get(scrollerID)

        if (!scrollerDataMap) return null

        const 
            portalNode = createPortalNode(index, itemID),
            partitionID = await this.findPartitionWithRoom(),
            portal = 
                <div data-type = 'portalwrapper' key = {itemID} data-itemid = {itemID}>
                    <InPortal key = {itemID} node = {portalNode} > { component } </InPortal>
                </div>

        this.addPartitionPortal(partitionID, itemID, portal)

        const portalMetadata = {
            itemID,
            scrollerID,
            index,
            partitionID,
            portalNode,
            scrollerContext,
            component,
            dndOptions,
            profile,
        }

        this.itemMetadataMap.set(itemID, portalMetadata)
        scrollerDataMap.itemSet.add(itemID)
        scrollerDataMap.indexToItemIDMap.set(index, itemID)

        if (!isPreload) this.renderPortalLists()

        return portalMetadata

    }

    private preload = (scrollerID, finalCallback, accept) => {

        const 
            { cradleParameters } = this.cacheScrollerData.scrollerDataMap.get(scrollerID),

            { scrollerPropertiesRef } = cradleParameters,

            { stateHandler, serviceHandler } = cradleParameters.handlersRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { getItemPack } = cradleInheritedProperties,
            { lowindex, highindex } = cradleInternalProperties.virtualListProps,

            promises = [],

            breakloop = {
                current:false
            }

        const maxListsizeInterrupt = (index) => {
            breakloop.current = true
        }

        if (stateHandler.isMountedRef.current) {
            
            const 
                indexToItemIDMap = this.cacheScrollerData.scrollerDataMap.get(scrollerID).indexToItemIDMap,

                { preloadIndexCallback, itemExceptionCallback } = serviceHandler.callbacks

            for (let index = lowindex; index <= highindex; index++) {

                preloadIndexCallback && preloadIndexCallback(index)
                if (!indexToItemIDMap.has(index)) {

                    const promise = this.preloadItem(
                        scrollerID,
                        index, 
                        getItemPack,
                        scrollerPropertiesRef,
                        itemExceptionCallback,
                        maxListsizeInterrupt,
                        accept
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

    // used for preloading new item
    private async preloadItem(
        scrollerID,
        index, 
        getItemPack,
        scrollerPropertiesRef, 
        itemExceptionCallback,
        maxListsizeInterrupt,
        accept
    ) {

        const itemID = this.getNewItemID()

        let returnvalue, itempack, usercontent, error, dndOptions, profile

        const context:GenericObject = // {accept:{}}
            accept?
                {
                    contextType:'dndFetch',
                    accept,
                    scrollerID,
                }:
                {
                    contextType:'fetch',
                    scrollerID,
                }

        try {

            itempack = await getItemPack(index, itemID, context);

            ({dndOptions, profile} = itempack)

            usercontent = await itempack.component

            if (usercontent === null) returnvalue = usercontent = undefined

        } catch(e) {

            returnvalue = usercontent = undefined
            error = e

        }

        dndOptions = dndOptions ?? {}
        profile = profile ?? {}

        if (usercontent !== undefined) {

            if (!React.isValidElement(usercontent)) {
                returnvalue = usercontent
                usercontent = undefined
                error = new Error('invalid React element')
            }

        }

        if (usercontent !== undefined) {

            let component 
            const scrollerContext = {
                scroller:scrollerPropertiesRef,
                cell:{current:{index,itemID}}
            }
            if (usercontent.props.hasOwnProperty('scrollerContext')) {
                component = React.cloneElement(usercontent, {scrollerContext})
            } else {
                component = usercontent
            }

            await this.createPortal(scrollerID,component, index, itemID, scrollerContext, dndOptions, profile, true) // true = isPreload

        } else {

            itemExceptionCallback && 
                itemExceptionCallback(index, {
                    contextType: 'itemException',
                    itemID, 
                    scrollerID,
                    profile,
                    dndOptions,
                    component:returnvalue, 
                    location:'preload', 
                    error: error.message
                }
            )
        }

    }

    private applyPortalPartitionItemsForDeleteList = (scrollerID) => {

        const { portalPartitionItemsForDeleteList } = this.cacheScrollerData.scrollerDataMap.get(scrollerID)

        if (portalPartitionItemsForDeleteList && portalPartitionItemsForDeleteList.length) {

            for (const item of portalPartitionItemsForDeleteList) {

                this.removePartitionPortal(item.partitionID, item.itemID)
                
            }

            this.cacheScrollerData.scrollerDataMap.get(scrollerID).portalPartitionItemsForDeleteList = []                    

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

    const 
        portalNode = createHtmlPortalNode(),
        container = portalNode.element

    // container.style.overflow = 'hidden'

    container.dataset.type = 'contentenvelope'
    container.dataset.index = index
    container.dataset.cacheitemid = itemID

    return portalNode

}     
