// servicehandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module fields service requests from the host. There are two forms
    - streaming from the scroller to the host
    - function calls from the user to the scroller

    For the list of data streas, see the constructor.

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

    There are important supporting functions in cacheHandler and contentHandler. stateHandler is
    often invoked to change state upon servicing requests.
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
    insertRange:'insertRange - blank, or integer greater than or equal to the "from" index',
    removeFrom:'removeFrom - integer: required, greater than or equal to 0',
    removeRange:'removeRange - blank, or integer greater than or equal to the "from" index',
    moveFrom:'moveFrom - integer: required, greater than or equal to 0',
    moveRange:'moveRange - blank, or integer greater than or equal to the "from" index',
    moveTo:'moveTo - integer: required, greater than or equal to 0',
}

export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       // doing this explicitly here for documentation
       const {
           referenceIndexCallback, // (index, location, cradleState)
           preloadIndexCallback, // (index)
           deleteListCallback, // (reason, deleteList)
           changeListsizeCallback, // (newlistsize)
           itemExceptionCallback, // (index, itemID, returnvalue, location, error)
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

    public scrollToIndex = (index) => {

        const isInvalid = (!isInteger(index) || !minValue(index, 0))

        index = +index

        if (isInvalid) {

            console.log('RIGS ERROR scrollToIndex(index)):', index, errorMessages.scrollToIndex)
            return

        }

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler
        const { layoutHandler, stateHandler} = this.cradleParameters.handlersRef.current

        signals.pauseScrollingEffects = true

        layoutHandler.cradlePositionData.targetAxisReferenceIndex = index

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

    public remapIndexes = (changeMap) => { // index => itemID

        if (changeMap.size == 0) return [] // nothing to do

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { 

            metadataMap, // itemID to component data, including index
            indexToItemIDMap // index to itemID

        } = cacheHandler.cacheProps 

        const indexesToDeleteList = []
        const indexesForNewItemID = []
        const itemsToReplaceList = []
        const changeIndexToItemIDMap = new Map()
        const errorEntriesMap = new Map()

        // =====================[ PREPARE ]======================

        // ------------ filter out inoperable indexes and itemIDs ------------

        const workingChangeMap = new Map()
        changeMap.forEach((itemID, index) => {
            if (itemID === undefined) {
                indexesForNewItemID.push(index)
                const cacheItemID = indexToItemIDMap.get(index)
                if (!(cacheItemID === undefined)) {
                    itemsToReplaceList.push(cacheItemID)
                }
            } else {
                workingChangeMap.set(index, itemID)
            }
        })

        const itemsToReplaceSet = new Set(itemsToReplaceList.values())

        workingChangeMap.forEach((itemID, index) =>{

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

                    errorEntriesMap.set(index, `target itemID ${itemID} has not changed`)

                } else if (!metadataMap.has(itemID) || itemsToReplaceSet.has(itemID)) {

                    errorEntriesMap.set(index, `target itemID ${itemID} not in cache, or has been removed`)

                } else {

                    changeIndexToItemIDMap.set(index, itemID)

                }

            }

        })

        // -------------- filter out duplicate itemIDs ------------

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
            changeIndexToItemIDMap.forEach((itemID, index) => {

                if (duplicateItemsMap.has(itemID)) {
                    duplicatesToRemoveList.push(index)
                }

            })

            duplicatesToRemoveList.forEach((index)=>{

                const itemID = changeIndexToItemIDMap.get(index)
                const count = duplicateItemsMap.get(itemID)

                errorEntriesMap.set(index, `target itemID ${itemID} has duplicates (${count})`)
                changeIndexToItemIDMap.delete(index)

            })

        }

        // ------------ capture map before changes ----------
        // ... this map is used later to identify orphaned item and index cache records for deletion

        // from the list of changes
        // both sides of change map...
        const originalMap = new Map() // index => itemID; before change
        changeIndexToItemIDMap.forEach((itemID, index)=>{

            originalMap.set(index,indexToItemIDMap.get(index)) // index to be mapped
            originalMap.set(metadataMap.get(itemID).index,itemID) // target itemID

        })

        // ... and from the list of indexes to be deleted
        indexesToDeleteList.forEach((index) => {

            originalMap.set(index, indexToItemIDMap.get(index))

        })

        // ======================[ CACHE OPERATIONS ]================

        // --------------- delete listed indexes ---------
        // for indexes set to null or undefined
        // associated itemID's will be orphaned, but could be remapped.
        // orphans are resolved below

        if (indexesToDeleteList.length) {

            indexesToDeleteList.forEach((index) => {

                indexToItemIDMap.delete(index)

            })

        }

        // ----------- apply filtered changes to cache index map and itemID map ----------
        // at this point every remaining index listed will change its mapping

        // const processedMap = new Map() // index => itemID; change has been applied
        const processedIndexList = []

        // make changes
        changeIndexToItemIDMap.forEach((itemID,index) => {

            indexToItemIDMap.set(index,itemID) // modiication applied, part 1
            const itemdata = metadataMap.get(itemID)

            itemdata.index = index // modification applied, part 2

            // processedMap.set(index,itemID)
            processedIndexList.push(index)

        })

        // -------------- look for and delete item and index orphans --------------------
        // if the original item's index has not changed, then it has not been remapped, 
        //     it is orphaned, and the item is deleted
        // if the item's index has changed, but the original item index map still points to the item,
        //     then the index is orphaned (duplicate), and deleted

        const deletedItemIDToIndexMap = new Map() // index => itemID; orphaned index
        const deletedIndexToItemIDMap = new Map()

        const portalItemHoldForDeleteList = [] // hold deleted portals for deletion until after cradle synch

        originalMap.forEach((originalItemID, originalItemIDIndex) => {

            const finalItemIDIndex = metadataMap.get(originalItemID).index

            if (originalItemIDIndex == finalItemIDIndex) { // not remapped, therefore orphaned

                deletedItemIDToIndexMap.set(originalItemID, originalItemIDIndex)

                const { partitionID } = metadataMap.get(originalItemID)
                portalItemHoldForDeleteList.push({itemID:originalItemID, partitionID})
                metadataMap.delete(originalItemID)

            } else { // remapped, check for orphaned index

                if (indexToItemIDMap.has(originalItemIDIndex)) {

                    const finalItemID = indexToItemIDMap.get(originalItemIDIndex)

                    if (finalItemID == originalItemID) { // the index has not been remapped, therefore orphaned

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

        // call contentHandler.createNewItemIDs for 'undefined' items

        contentHandler.reconcileCellFrames(modifiedIndexList)

        cacheHandler.portalItemHoldForDeleteList = portalItemHoldForDeleteList.concat(itemsToReplaceList)

        stateHandler.setCradleState('applycellframechanges')

        // ---------- returns for user information --------------------

        return [

            modifiedIndexList, 
            processedIndexList, 
            indexesToDeleteList, 
            itemsToReplaceList,
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

    public insertIndex = (index, rangehighindex = null) => {

        const isIndexInvalid = (!isInteger(index) || !minValue(index, 0))
        let isHighrangeInvalid = false
        if ((!isBlank(rangehighindex)) && (!isIndexInvalid)) {
            isHighrangeInvalid = !minValue(rangehighindex, index)
        }

        index = +index
        rangehighindex = rangehighindex ?? index
        rangehighindex = +rangehighindex

        if (isIndexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR insertIndex(index, rangehighindex)')
            isIndexInvalid && console.log(index, errorMessages.insertFrom)
            isHighrangeInvalid && console.log(rangehighindex, errorMessages.insertRange)
            return null
        }

        return this.insertRemoveIndex(index, rangehighindex, +1)

    }

    public removeIndex = (index, rangehighindex = null) => {

        const isIndexInvalid = (!isInteger(index) || !minValue(index, 0))
        let isHighrangeInvalid = false
        if ((!isBlank(rangehighindex)) && (!isIndexInvalid)) {
            isHighrangeInvalid = !minValue(rangehighindex, index)
        }

        index = +index
        rangehighindex = rangehighindex ?? index
        rangehighindex = +rangehighindex

        if (isIndexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR moveIndex(index, rangehighindex)')
            isIndexInvalid && console.log(index, errorMessages.removeFrom)
            isHighrangeInvalid && console.log(rangehighindex, errorMessages.removeRange)
            return null
        }

        return this.insertRemoveIndex(index, rangehighindex, -1)

    }

    // shared logic. Returns lists of items changed, and items replaced (new items for insert)
    // this operation changes the listsize
    private insertRemoveIndex = (index, rangehighindex, increment) => {

        index = index ?? 0
        rangehighindex = rangehighindex ?? index

        index = Math.max(0,index)
        rangehighindex = Math.max(rangehighindex, index)

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { listsize } = this.cradleParameters.cradleInternalPropertiesRef.current

        const [changeList, replaceList, rangeincrement, portalItemHoldForDeleteList] = 
            cacheHandler.insertRemoveIndex(index, rangehighindex, increment, listsize)

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
