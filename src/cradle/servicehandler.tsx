// servicehandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module fields service requests from the host. There are two forms
    - streaming from the scroller to the host
    - function calls from the user to the scroller

    For the list of data streams, see the constructor.

    The function calls avaiable to the host are:

        scrollToIndex, 
        reload, 
        setListsize,
        clearCache, 

        getCacheIndexMap, 
        getCacheItemMap,
        getCradleIndexMap,

        insertIndex,
        removeIndex,
        moveIndex,
        remapIndexes,
    
    The functions listed are defined in this module.

    There are important supporting functions for these in cacheHandler and contentHandler. stateHandler is
    often invoked by service functions to change Cradle state upon servicing requests.
*/

const isBlank = (value:any) => {
    const testvalue = value ?? ''
    return testvalue === ''
}

const isNumber = (value:any) => {

    return ( 
        (!isNaN(Number(value))) && 
        (!isNaN(parseInt(value))) 
    )

}

const isInteger = (value:any) => {

    const test = +value

    return (isNumber(value) && (Math.floor(test) == test))

}

const minValue = (value:any, minValue:any) => {

    if (!isInteger(value) || !isInteger(minValue)) return false

    const testvalue = +value
    const testMinValue = +minValue

    return testvalue >= testMinValue

}

const maxValue = (value:any, maxValue:any) => {

    if (!isInteger(value) || !isInteger(maxValue)) return false

    const testvalue = +value
    const testMaxValue = +maxValue

    return testvalue <= testMaxValue

}

const errorMessages = {
    scrollToIndex:'integer: required, greater than or equal to 0',
    setListsize:'integer: required, greater than or equal to 0',
    insertFrom:'insertFrom - integer: required, greater than or equal to 0',
    insertRange:'insertRange - blank, or integer greater than or equal to the "from" listposition',
    removeFrom:'removeFrom - integer: required, greater than or equal to 0',
    removeRange:'removeRange - blank, or integer greater than or equal to the "from" listposition',
    moveFrom:'moveFrom - integer: required, greater than or equal to 0',
    moveRange:'moveRange - blank, or integer greater than or equal to the "from" listposition',
    moveTo:'moveTo - integer: required, greater than or equal to 0',
}

export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       // doing this explicitly here for documentation
       const {
           referenceIndexCallback, // (listposition, location, cradleState)
           preloadIndexCallback, // (listposition)
           deleteListCallback, // (reason, deleteList)
           changeListsizeCallback, // (newlistsize)
           itemExceptionCallback, // (listposition, itemID, returnvalue, location, error)
           repositioningFlagCallback, // (flag) // boolean
           repositioningIndexCallback,
           
       } = cradleParameters.externalCallbacksRef.current

       const callbacks = {
           referenceIndexCallback,
           preloadIndexCallback,
           deleteListCallback,
           changeListsizeCallback,
           itemExceptionCallback,
           repositioningFlagCallback,
           repositioningIndexCallback
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

    public scrollToIndex = (listposition) => {

        const isInvalid = (!isInteger(listposition) || !minValue(listposition, 0))

        listposition = +listposition

        if (isInvalid) {

            console.log('RIGS ERROR scrollToIndex(listposition)):', listposition, errorMessages.scrollToIndex)
            return

        }

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler
        const { layoutHandler, stateHandler} = this.cradleParameters.handlersRef.current

        signals.pauseScrollingEffects = true

        layoutHandler.cradlePositionData.targetAxisReferenceIndex = listposition

        stateHandler.setCradleState('scrollto')

    }

    public setListsize = (newlistsize) => {

        const isInvalid = (!isInteger(newlistsize) || !minValue(newlistsize, 0))

        newlistsize = +newlistsize

        if (isInvalid) {

            console.log('RIGS ERROR setListsize(newlistsize)', newlistsize, errorMessages.setListsize)
            return

        }

        const { cacheHandler, stateHandler } = this.cradleParameters.handlersRef.current

        const { deleteListCallback, changeListsizeCallback } = this.callbacks

        const { listsize:currentlistsize } = this.cradleParameters.cradleInternalPropertiesRef.current
        const { cache } = this.cradleParameters.cradleInheritedPropertiesRef.current

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

        if ((cache == 'preload') && (newlistsize > currentlistsize)) {
            stateHandler.setCradleState('startpreload')
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

    }

    // itemID set to null deletes the indexed item
    // itemID set to undefined replaces the indexed item
    // the main purpose is to allow itemsIDs to be remapped to new indexes
    // operations are on existing cache items only
    public remapIndexes = (changeMap) => { // listposition => itemID

        if (changeMap.size == 0) return [] // nothing to do

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { 

            metadataMap, // itemID to component data, including listposition
            indexToItemIDMap // listposition to itemID

        } = cacheHandler.cacheProps 

        const indexesToDeleteList = []
        const indexesToReplaceItemIDList = []
        const partitionItemsToReplaceList = []
        const changeIndexToItemIDMap = new Map()
        const errorEntriesMap = new Map()

        // =====================[ PREPARE ]======================

        // -----------------------[ isolate indexes for which items should be replaced ]--------------

        const workingChangeMap = new Map()
        changeMap.forEach((itemID, listposition) => {
            if (itemID === undefined) {
                if (indexToItemIDMap.has(listposition)) {
                    const cacheItemID = indexToItemIDMap.get(listposition)

                    indexesToReplaceItemIDList.push(listposition)

                    if (!(cacheItemID === undefined)) { // ignore non-existent indexes

                        const { partitionID } = metadataMap.get(cacheItemID)

                        partitionItemsToReplaceList.push({partitionID, itemID:cacheItemID})
                    }
                } else {

                    errorEntriesMap.set(listposition, 'listposition to replace is not in cache')

                }
            } else {

                workingChangeMap.set(listposition, itemID)

            }
        })

        indexesToReplaceItemIDList.forEach((listposition) => {
            indexToItemIDMap.delete(listposition)
        })

        // ------------ filter out inoperable indexes and itemIDs ------------

        const itemsToReplaceSet = new Set()
        partitionItemsToReplaceList.forEach((obj) => {
            itemsToReplaceSet.add(obj.itemID)
        })

        const itemsToReplaceList = Array.from(itemsToReplaceSet)

        workingChangeMap.forEach((itemID, listposition) =>{

            if ((itemID === null) || (itemID === undefined)) {

                indexesToDeleteList.push(listposition)

            } else {

                if ((typeof itemID) == 'string') {

                    errorEntriesMap.set(listposition,'itemID is a string')

                } else if (!Number.isInteger(itemID)) {

                    errorEntriesMap.set(listposition,'itemID is not an integer')

                } else if (!indexToItemIDMap.has(listposition)) {

                    errorEntriesMap.set(listposition, 'listposition not in cache')

                } else if (indexToItemIDMap.get(listposition) == itemID) {

                    errorEntriesMap.set(listposition, `target itemID ${itemID} has not changed`)

                } else if (!metadataMap.has(itemID) || itemsToReplaceSet.has(itemID)) {

                    errorEntriesMap.set(listposition, `target itemID ${itemID} not in cache, or has been removed`)

                } else {

                    changeIndexToItemIDMap.set(listposition, itemID)

                }

            }

        })

        // -------------- filter out duplicate itemIDs ------------

        const mapsize = changeIndexToItemIDMap.size

        const itemIDSet = new Set(changeIndexToItemIDMap.values())

        const itemsetsize = itemIDSet.size

        if (mapsize != itemsetsize) { // there must be duplicate itemIDs

            const itemIDCountMap = new Map()

            changeIndexToItemIDMap.forEach((itemID, listposition) => {

                if (!itemIDCountMap.has(itemID)) {

                    itemIDCountMap.set(itemID, 1)

                } else {

                    let count = itemIDCountMap.get(itemID)
                    itemIDCountMap.set(itemID, ++count )

                }
            })

            const duplicateItemsMap = new Map()
            itemIDCountMap.forEach((count,itemID)=>{

                if (count > 1) {

                    duplicateItemsMap.set(itemID, count)
                    
                }

            })

            const duplicatesToRemoveList = []
            changeIndexToItemIDMap.forEach((itemID, listposition) => {

                if (duplicateItemsMap.has(itemID)) {
                    duplicatesToRemoveList.push(listposition)
                }

            })

            duplicatesToRemoveList.forEach((listposition)=>{

                const itemID = changeIndexToItemIDMap.get(listposition)
                const count = duplicateItemsMap.get(itemID)

                errorEntriesMap.set(listposition, `target itemID ${itemID} has duplicates (${count})`)
                changeIndexToItemIDMap.delete(listposition)

            })

        }

        // ------------ capture map before changes ----------
        // ... this map is used later to identify orphaned item and listposition cache records for deletion

        // from the list of changes
        // both sides of change map...
        const originalMap = new Map() // listposition => itemID; before change
        changeIndexToItemIDMap.forEach((itemID, listposition)=>{

            originalMap.set(listposition,indexToItemIDMap.get(listposition)) // listposition to be mapped
            originalMap.set(metadataMap.get(itemID).listposition,itemID) // target itemID

        })

        // ... and from the list of indexes to be deleted
        indexesToDeleteList.forEach((listposition) => {

            originalMap.set(listposition, indexToItemIDMap.get(listposition))

        })

        // ======================[ CACHE OPERATIONS ]================

        // --------------- delete listed indexes ---------
        // for indexes set to null or undefined
        // associated itemID's will be orphaned, but could be remapped.
        // orphans are resolved below

        if (indexesToDeleteList.length) {

            indexesToDeleteList.forEach((listposition) => {

                indexToItemIDMap.delete(listposition)

            })

        }

        // ----------- apply filtered changes to cache listposition map and itemID map ----------
        // at this point every remaining listposition listed will change its mapping

        // const processedMap = new Map() // listposition => itemID; change has been applied
        const processedIndexList = []

        // make changes
        changeIndexToItemIDMap.forEach((itemID,listposition) => {

            indexToItemIDMap.set(listposition,itemID) // modiication applied, part 1
            const itemdata = metadataMap.get(itemID)

            itemdata.listposition = listposition // modification applied, part 2

            // processedMap.set(listposition,itemID)
            processedIndexList.push(listposition)

        })

        // -------------- look for and delete item and listposition orphans --------------------
        // if the original item's listposition has not changed, then it has not been remapped, 
        //     it is orphaned, and the item is deleted
        // if the item's listposition has changed, but the original item listposition map still points to the item,
        //     then the listposition is orphaned (duplicate), and deleted

        const deletedItemIDToIndexMap = new Map() // listposition => itemID; orphaned listposition
        const deletedIndexToItemIDMap = new Map()

        const portalItemHoldForDeleteList = [] // hold deleted portals for deletion until after cradle synch

        originalMap.forEach((originalItemID, originalItemIDIndex) => {

            const finalItemIDIndex = metadataMap.get(originalItemID).listposition

            if (originalItemIDIndex == finalItemIDIndex) { // not remapped, therefore orphaned

                deletedItemIDToIndexMap.set(originalItemID, originalItemIDIndex)

                const { partitionID } = metadataMap.get(originalItemID)
                portalItemHoldForDeleteList.push({itemID:originalItemID, partitionID})
                metadataMap.delete(originalItemID)

            } else { // remapped, check for orphaned listposition

                if (indexToItemIDMap.has(originalItemIDIndex)) {

                    const finalItemID = indexToItemIDMap.get(originalItemIDIndex)

                    if (finalItemID == originalItemID) { // the listposition has not been remapped, therefore orphaned

                        deletedIndexToItemIDMap.set(originalItemIDIndex, originalItemID)

                        indexToItemIDMap.delete(originalItemIDIndex)

                    }
                }
            }
        })

        // refresh the changed cache
        // cacheHandler.cacheProps.partitionModified = true
        // cacheHandler.renderPortalLists()

        // ------------- apply changes to extant cellFrames ------------

        // these are used to reconcile cradle cellFrames, and also for return information
        // const processedIndexList = Array.from(processedMap.keys())
        const deletedOrphanedItemIndexList = Array.from(deletedItemIDToIndexMap.values())
        const deletedOrphanedIndexList = Array.from(deletedIndexToItemIDMap.keys())
        // for return information...
        const deletedOrphanedItemIDList = Array.from(deletedItemIDToIndexMap.keys()) 

        let modifiedIndexList = [
            ...processedIndexList,
            ...indexesToDeleteList, 
            ...deletedOrphanedItemIndexList, 
            ...deletedOrphanedIndexList
        ]

        modifiedIndexList = Array.from(new Set(modifiedIndexList.values())) // remove duplicates

        contentHandler.createNewItemIDs(indexesToReplaceItemIDList)

        contentHandler.reconcileCellFrames(modifiedIndexList)

        modifiedIndexList = modifiedIndexList.concat(indexesToReplaceItemIDList)

        cacheHandler.portalItemHoldForDeleteList = portalItemHoldForDeleteList.concat(partitionItemsToReplaceList)

        stateHandler.setCradleState('applycellframechanges')

        // ---------- returns for user information --------------------

        return [

            modifiedIndexList, 
            processedIndexList, 
            indexesToDeleteList, 
            indexesToReplaceItemIDList,
            deletedOrphanedItemIDList, 
            deletedOrphanedIndexList,
            errorEntriesMap, 
            changeMap

        ]

    }

    // move must be entirely within list bounds
    // returns list of processed indexes
    public moveIndex = (toindex, fromindex, highrange = null) => {


        const isToindexInvalid = (!isInteger(toindex) || !minValue(toindex, 0))
        const isFromindexInvalid = (!isInteger(fromindex) || !minValue(fromindex, 0))
        let isHighrangeInvalid = false
        if ((!isBlank(highrange)) && (!isFromindexInvalid)) {
            isHighrangeInvalid = !minValue(highrange,fromindex)
        }

        toindex = +toindex
        fromindex = +fromindex
        highrange = highrange ?? fromindex
        highrange = +highrange

        if (isToindexInvalid || isFromindexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR moveIndex(toindex, fromindex, highrange)')
            isToindexInvalid && console.log(toindex, errorMessages.moveTo)
            isFromindexInvalid && console.log(fromindex, errorMessages.moveFrom)
            isHighrangeInvalid && console.log(highrange, errorMessages.moveRange)
            return null
        }

        // ------------- define parameters ---------------

        const { listsize } = this.cradleParameters.cradleInternalPropertiesRef.current

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

            contentHandler.changeCradleItemIDs(processedIndexList)

            stateHandler.setCradleState('applycellframechanges')
            
        }

        return processedIndexList

    }

    public insertIndex = (listposition, rangehighindex = null) => {

        const isIndexInvalid = (!isInteger(listposition) || !minValue(listposition, 0))
        let isHighrangeInvalid = false
        if ((!isBlank(rangehighindex)) && (!isIndexInvalid)) {
            isHighrangeInvalid = !minValue(rangehighindex, listposition)
        }

        listposition = +listposition
        rangehighindex = rangehighindex ?? listposition
        rangehighindex = +rangehighindex

        if (isIndexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR insertIndex(listposition, rangehighindex)')
            isIndexInvalid && console.log(listposition, errorMessages.insertFrom)
            isHighrangeInvalid && console.log(rangehighindex, errorMessages.insertRange)
            return null
        }

        return this.insertRemoveIndex(listposition, rangehighindex, +1)

    }

    public removeIndex = (listposition, rangehighindex = null) => {

        const isIndexInvalid = (!isInteger(listposition) || !minValue(listposition, 0))
        let isHighrangeInvalid = false
        if ((!isBlank(rangehighindex)) && (!isIndexInvalid)) {
            isHighrangeInvalid = !minValue(rangehighindex, listposition)
        }

        listposition = +listposition
        rangehighindex = rangehighindex ?? listposition
        rangehighindex = +rangehighindex

        if (isIndexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR moveIndex(listposition, rangehighindex)')
            isIndexInvalid && console.log(listposition, errorMessages.removeFrom)
            isHighrangeInvalid && console.log(rangehighindex, errorMessages.removeRange)
            return null
        }

        return this.insertRemoveIndex(listposition, rangehighindex, -1)

    }

    // shared logic. Returns lists of items changed, and items replaced (new items for insert)
    // this operation changes the listsize
    private insertRemoveIndex = (listposition, rangehighindex, increment) => {

        listposition = listposition ?? 0
        rangehighindex = rangehighindex ?? listposition

        listposition = Math.max(0,listposition)
        rangehighindex = Math.max(rangehighindex, listposition)

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { listsize } = this.cradleParameters.cradleInternalPropertiesRef.current

        const [changeList, replaceList, rangeincrement, portalItemHoldForDeleteList] = 
            cacheHandler.insertRemoveIndex(listposition, rangehighindex, increment, listsize)

        cacheHandler.portalItemHoldForDeleteList = portalItemHoldForDeleteList

        contentHandler.changeCradleItemIDs(changeList)

        if (increment == +1) contentHandler.createNewItemIDs(replaceList)

        const { content } = contentHandler

        stateHandler.setCradleState('applycellframechanges')

        const changecount = rangeincrement // semantics
        const newlistsize = listsize + changecount 

        this.setListsize(newlistsize)

        return [changeList, replaceList]

    }

}
