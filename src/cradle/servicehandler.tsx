// servicehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

// ServiceHandler handles client service requests
export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       // doing this explicitly here for documentation
       const {
           referenceIndexCallback,
           preloadIndexCallback,
           deleteListCallback,
           changeListsizeCallback,
           itemExceptionsCallback,
           
       } = cradleParameters.externalCallbacksRef.current

       const callbacks = {
           referenceIndexCallback,
           preloadIndexCallback,
           deleteListCallback,
           changeListsizeCallback,
           itemExceptionsCallback,
       }

       this.callbacks = callbacks

    }

    private cradleParameters

    // see above for list
    public callbacks

    // ========================[ GENERAL ]============================

    public reload = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        const { interruptHandler } = this.cradleParameters.handlersRef.current

        interruptHandler.pauseInterrupts()

        stateHandler.setCradleState('reload')

    }


    public scrollToItem = (index) => {

        index = Math.max(0,index)

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler
        const { scaffoldHandler, stateHandler} = this.cradleParameters.handlersRef.current

        signals.pauseScrollingEffects = true

        scaffoldHandler.cradlePositionData.targetAxisReferenceIndex = index

        stateHandler.setCradleState('doreposition')

    }

    public setListsize = (listsize) => {

        listsize = Math.max(0,listsize)

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        cacheHandler.changeListsize(listsize, 
            this.callbacks.deleteListCallback,
            this.callbacks.changeListsizeCallback
        )

    }

    // ======================[ GET SNAPSHOTS ]========================

    public getCacheIndexMap = () => {

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        return cacheHandler.getCacheIndexMap()

    }

    public getCacheItemMap = () => {

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        return cacheHandler.getCacheItemMap()

    }

    public getCradleIndexMap = () => {

        const { cacheHandler, contentHandler } = this.cradleParameters.handlersRef.current

        const modelIndexList = contentHandler.getModelIndexList()
        return cacheHandler.getCradleIndexMap(modelIndexList)
    }

    // =================[ CACHE MANAGEMENT REQUESTS ]==================

    public clearCache = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        stateHandler.setCradleState('clearcache')

        return true

    }

    // blank index values (itemID) are assigned a new 
    // itemID if in the cradle, otherwise removed from the cache.
    // Duplicate index/itemID pairs have the itemID turned to blank
    // and are processed by the above rule
    public changeIndexMap = (changeMap) => { // index => itemID

        // console.log('changeIndexMap: changeMap', changeMap)

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { 
            metadataMap, // itemID to portal data, including index
            indexToItemIDMap // index to itemID
        } = cacheHandler.cacheProps 

        if (changeMap.size == 0) return [] // nothing to do

        const indexesToDeleteList = []
        const changeIndexToItemIDMap = new Map()

        // collect details of change

        changeMap.forEach((itemID, index) =>{
            if (itemID === null) {
                indexesToDeleteList.push(index)
            } else {
                changeIndexToItemIDMap.set(index, itemID)
            }
        })

        // -------------- first, guard against duplicate itemIDs in change map ------------

        const mapsize = changeIndexToItemIDMap.size

        const itemIDSet = new Set(changeIndexToItemIDMap.values())

        const itemsetsize = itemIDSet.size

        if (mapsize != itemsetsize) { // there must be duplicate itemIDs

            const itemIDCountMap = new Map()

            changeIndexToItemIDMap.forEach((itemID, index) => {
                if (!itemIDCountMap.has(itemID)) {
                    itemIDCountMap.set(itemID, 1)
                } else {
                    itemIDCountMap.set(itemID, itemIDCountMap.get(itemID) + 1)
                }
            })

            const duplicateItemsMap = new Map()
            itemIDCountMap.forEach((count,itemID)=>{
                if (count > 1) {
                    duplicateItemsMap.set(itemID, count)
                }
            })

            if (duplicateItemsMap.size) {

                console.log('WARNING: changeIndexMap rejected: \
                    duplicate itemID index assignment values found:\
                    duplicateItemIDs, changeMap',
                    duplicateItemsMap, changeMap)
                return []

            }

        }

        // --------------- delete indexes and associated itemID's for indexes set to null --------

        cacheHandler.deletePortal(indexesToDeleteList, this.callbacks.deleteListCallback)

        // ----------- apply changes to cache index and itemID maps ----------

        // const cradleMap = this.getCradleMap() // index to itemID

        const originalitemindexMap = new Map() // itemID => index; before change
        const processedMap = new Map() // index => itemID; change has been applied

        changeIndexToItemIDMap.forEach((itemID,index) => {

            if (indexToItemIDMap.has(index)) { // in cache, otherwise ignore

                const existingItemID = indexToItemIDMap.get(index)

                if (existingItemID != itemID) { // modification requested

                    indexToItemIDMap.set(index,itemID) // modiication applied, part 1
                    const itemdata = metadataMap.get(itemID)

                    originalitemindexMap.set(itemID,itemdata.index)
                    itemdata.index = index // modification applied, part 2

                    processedMap.set(index,itemID)

                }
            }
        })

        // if the original index for the re-assigned cache item still maps to the cache item,
        // then there is a duplicate
        // TODO this needs to be tested!!
        const orphanedItemIndexesMap = new Map() // itemID => index; unresolved index changes

        originalitemindexMap.forEach((itemID, index) => {
            if (indexToItemIDMap.has(index) && (indexToItemIDMap.get(index) == itemID)) {
                orphanedItemIndexesMap.set(itemID, index)
                indexToItemIDMap.delete(index)
            }
        })

        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()

        // ------------- apply changes to extant cellFrames ------------

        const modifiedIndexesList = Array.from(
            new Set( // get unique list
                Array.from(processedMap.keys()).concat(
                    Array.from(orphanedItemIndexesMap.keys()),
                    indexesToDeleteList
                )
            ).values()
        )

        // console.log('modifiedIndexesList',modifiedIndexesList)

        contentHandler.reconcileCellFrames(modifiedIndexesList)

        stateHandler.setCradleState('applycellframechanges')

        return modifiedIndexesList

    }

    // returns true with moved indexes, otherwise false
    // move must be entirely within list bounds
    public moveIndex = (toindex, fromindex, highrange = null) => {

        // ------------- define parameters ---------------

        const { listsize } = this.cradleParameters.cradleInternalPropertiesRef.current

        // remove nulls
        toindex = toindex ?? 0
        fromindex = fromindex ?? 0
        highrange = highrange ?? fromindex

        toindex = Math.max(0,toindex)
        fromindex = Math.max(0,fromindex)
        highrange = Math.max(0,highrange)

        // keep within current list size
        const listbound = listsize - 1

        toindex = 
            (toindex > listbound)?
                listbound:
                toindex

        fromindex = 
            (fromindex > listbound)?
                listbound:
                fromindex

        highrange = 
            (highrange > listbound)?
                listbound:
                highrange

        // highrange must be >= fromindex
        highrange = 
            (highrange >= fromindex)?
                highrange:
                fromindex

        const rangeincrement = highrange - fromindex + 1
        const moveincrement = toindex - fromindex

        // ---------- constrain parameters --------------

        if (fromindex == toindex) return [] // nothing to do

        // move must be in list bounds
        if (moveincrement > 0) { // move up
            const targettop = toindex + (rangeincrement - 1)
            if (targettop > listbound) return [] // out of bounds
        }

        // ----------- perform cache and cradle operations -----------

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const processedIndexList = 
            cacheHandler.moveIndex(toindex, fromindex, highrange)

        if (processedIndexList.length) {

            cacheHandler.cacheProps.modified = true
            cacheHandler.renderPortalList()

            contentHandler.changeCradleItemIDs(processedIndexList)

            stateHandler.setCradleState('applycellframechanges')
            
        }

        return processedIndexList

    }

    public insertIndex = (index, rangehighindex = null) => {

        return this.insertRemoveIndex(index, rangehighindex, +1)

    }

    public removeIndex = (index, rangehighindex = null) => {

        return this.insertRemoveIndex(index, rangehighindex, -1)

    }

    // shared logic
    private insertRemoveIndex = (index, rangehighindex, increment) => {

        index = index ?? 0
        rangehighindex = rangehighindex ?? index

        index = Math.max(0,index)
        rangehighindex = Math.max(rangehighindex, index)

        // console.log('==> serviceHandler.insertRemoveIndex: index, rangehighindex, increment',
        //     index, rangehighindex, increment)

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { listsize } = this.cradleParameters.cradleInternalPropertiesRef.current

        const [changeList, replaceList, rangeincrement] = 
            cacheHandler.insertRemoveIndex(index, rangehighindex, increment, listsize)

        // console.log('changeList, replaceList, rangeincrement',
        //     changeList, replaceList, rangeincrement)

        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()

        contentHandler.changeCradleItemIDs(changeList)

        if (increment == +1) contentHandler.createNewItemIDs(replaceList)

        const { content } = contentHandler

        stateHandler.setCradleState('applycellframechanges')

        const changecount = rangeincrement
        const newlistsize = listsize + changecount 

        this.setListsize(newlistsize)

        return [changeList, replaceList]

    }

}

