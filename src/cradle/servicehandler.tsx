// servicehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

// ServiceHandler handles client service requests
export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       // doing this explicitly here for documentation
       const {
           referenceIndexCallback, // (index, location, cradleState)
           preloadIndexCallback, // (index)
           deleteListCallback, // (reason, deleteList)
           changeListsizeCallback, // (newlistsize)
           itemExceptionsCallback, // (index, itemID, returnvalue, location, error)
           repositioningFlagCallback, // (index)
           
       } = cradleParameters.externalCallbacksRef.current

       const callbacks = {
           referenceIndexCallback,
           preloadIndexCallback,
           deleteListCallback,
           changeListsizeCallback,
           itemExceptionsCallback,
           repositioningFlagCallback,
       }

       this.callbacks = callbacks

       // console.log('serviceHandler callbacks', callbacks, this.callbacks)

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

        stateHandler.setCradleState('doscrollto')

    }

    public setListsize = (newlistsize) => {

        newlistsize = Math.max(0,newlistsize)

        const { cacheHandler, stateHandler } = this.cradleParameters.handlersRef.current

        const { deleteListCallback, changeListsizeCallback } = this.callbacks

        const { listsize:currentlistsize } = this.cradleParameters.cradleInternalPropertiesRef.current

        let dListCallback
        if (deleteListCallback) {
            dListCallback = (deleteList) => {

                deleteListCallback('change list size intervention',deleteList)

            }

        }

        cacheHandler.changeListsize(newlistsize, 
            dListCallback,
            changeListsizeCallback
        )

        if (newlistsize > currentlistsize) {
            stateHandler.setCradleState('dopreload')
        }

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

    /*
        checks for
        - duplicates
        - typeID is string
        - typeID is null or undefined
        - Number.isNaN, Number.isInteger

    */    
    public remapIndexes = (changeMap) => { // index => itemID

        console.log('remapIndexes: changeMap', changeMap)

        if (changeMap.size == 0) return [[],true] // nothing to do

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { 

            metadataMap, // itemID to portal data, including index
            indexToItemIDMap // index to itemID

        } = cacheHandler.cacheProps 

        const indexesToDeleteList = []
        const changeIndexToItemIDMap = new Map()
        const errorEntriesMap = new Map()

        // filter out inoperable itemIDs

        changeMap.forEach((itemID, index) =>{

            if ((itemID === null) || (itemID === undefined)) {

                indexesToDeleteList.push(index)

            } else {

                if ((typeof itemID) == 'string') {

                    errorEntriesMap.set(index,'itemID is a string')

                } else if (!Number.isInteger(itemID)) {

                    errorEntriesMap.set(index,'itemID is not an integer')

                } else if (!indexToItemIDMap.has(index)) {

                    errorEntriesMap.set(index, 'index not in cache')

                } else if (indexToItemIDMap.get(index) == itemID) {

                    errorEntriesMap.set(index, 'target itemID has not changed')

                } else if (!metadataMap.has(itemID)) {

                    errorEntriesMap.set(index, 'target itemID not in cache')

                } else {

                    changeIndexToItemIDMap.set(index, itemID)

                }

            }

        })

        // -------------- first, filter out duplicate itemIDs in change map ------------

        const mapsize = changeIndexToItemIDMap.size

        const itemIDSet = new Set(changeIndexToItemIDMap.values())

        const itemsetsize = itemIDSet.size

        if (mapsize != itemsetsize) { // there must be duplicate itemIDs

            const itemIDCountMap = new Map()

            changeIndexToItemIDMap.forEach((itemID, index) => {

                if (!itemIDCountMap.has(itemID)) {

                    itemIDCountMap.set(itemID, 1)

                } else {

                    let count = itemIDCountMap.get(itemID)
                    itemIDCountMap.set(itemID, count++ )

                }
            })

            const duplicateItemsMap = new Map()
            itemIDCountMap.forEach((count,itemID)=>{

                if (count > 1) {
                    duplicateItemsMap.set(itemID, count)
                }

            })

            const duplicatesToDeleteList = []
            changeIndexToItemIDMap.forEach((itemID, index) => {

                if (duplicateItemsMap.has(itemID)) {
                    duplicatesToDeleteList.push(index)
                }

            })

            duplicatesToDeleteList.forEach((index)=>{

                const itemID = changeIndexToItemIDMap.get(index)
                const count = duplicateItemsMap.get(itemID)

                errorEntriesMap.set(index, `itemID ${itemID} has duplicates (${count})`)
                changeIndexToItemIDMap.delete(index)

            })

        }

        // capture map before changes
        const originalIndexToItemIDMap = new Map() // itemID => index; before change
        changeIndexToItemIDMap.forEach((itemID, index)=>{

            originalIndexToItemIDMap.set(index, indexToItemIDMap.get(index))

        })        

        // --------------- delete listed indexes and itemID's --------
        // for indexes set to null or undefined

        if (indexesToDeleteList.length) {

            // const { deleteListCallback } = this.callbacks
            // let dListCallback

            // if (deleteListCallback) {
            //     dListCallback = (deleteList) => {

            //         deleteListCallback('delete indexes remapped to null or undefined',deleteList)

            //     }

            // }
            indexesToDeleteList.forEach((index) => {

                indexToItemIDMap.delete(index)

            })

            // cacheHandler.deletePortal(indexesToDeleteList, dListCallback)

        }

        // ----------- apply filtered changes to cache index and itemID maps ----------
        // at this point every remaining index listed will change its mapping

        const processedMap = new Map() // index => itemID; change has been applied

        // make changes
        changeIndexToItemIDMap.forEach((itemID,index) => {

            const prechangeItemID = indexToItemIDMap.get(index)

            indexToItemIDMap.set(index,itemID) // modiication applied, part 1
            const itemdata = metadataMap.get(itemID)

            itemdata.index = index // modification applied, part 2

            processedMap.set(index,itemID)

        })

        // if the original index for the re-assigned cache item still maps to the cache item,
        // then there is a duplicate
        const orphanedItemsIDMap = new Map() // index => itemID; orphaned index

        originalIndexToItemIDMap.forEach((itemID, index) => {
            if (metadataMap.has(itemID) && (metadataMap.get(itemID).index == index)) {
                orphanedItemsIDMap.set(itemID, index)
                metadataMap.delete(itemID)
            }
        })

        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()

        // ------------- apply changes to extant cellFrames ------------

        // const processedList = Array.from(processedMap.keys()),
        //     orphanedIndexesList = Array.from(orphanedIndexesMap.keys())
        const processedList = Array.from(processedMap.keys())

        const modifiedIndexesList = 
                processedList.concat(
                    indexesToDeleteList)

        // console.log('modifiedIndexesList',modifiedIndexesList)

        contentHandler.reconcileCellFrames(modifiedIndexesList)

        stateHandler.setCradleState('applycellframechanges')

        return [

            modifiedIndexesList, 
            processedList, 
            indexesToDeleteList, 
            orphanedItemsIDMap, 
            errorEntriesMap, 
            changeMap

        ]

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

