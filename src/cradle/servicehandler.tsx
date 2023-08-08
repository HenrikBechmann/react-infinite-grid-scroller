// servicehandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module fields service requests from the host. There are two forms
    - streaming from the scroller to the host
    - function calls from the user to the scroller

    For the list of data streams, see the constructor.

    The function calls avaiable to the host are:

        scrollToIndex, 
        reload, 
        setListsize, *deprectated* for proper camel case
        setListSize,
        setListRange,
        prependIndexCount,
        appendIndexCount,
        clearCache, 

        getCacheIndexMap, 
        getCacheItemMap,
        getCradleIndexMap,
        getPropertiesSnapshot,

        insertIndex,
        removeIndex,
        moveIndex,
        remapIndexes,
    
    The functions listed are defined in this module.

    There are important supporting functions for these in cacheAPI and contentHandler. stateHandler is
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

const isValueGreaterThanOrEqualToMinValue = (compareValue:any, minValue:any) => {

    if (!isInteger(compareValue) || !isInteger(minValue)) return false

    const testvalue = +compareValue
    const testMinValue = +minValue

    return testvalue >= testMinValue

}

const isValueLessThanToOrEqualToMaxValue = (compareValue:any, maxValue:any) => {

    if (!isInteger(compareValue) || !isInteger(maxValue)) return false

    const testvalue = +compareValue
    const testMaxValue = +maxValue

    return testvalue <= testMaxValue

}

const errorMessages = {
    scrollToIndex:'integer: required, greater than or equal to low index',
    setListSize:'integer: required, greater than or equal to 0',
    setListRange:'array[lowindex,highindex]: required, both integers, highindex greater than or equal to lowindex',
    insertFrom:'insertFrom - integer: required, greater than or equal to low index',
    insertRange:'insertRange - blank, or integer greater than or equal to the "from" index',
    removeFrom:'removeFrom - integer: required, greater than or equal to low index',
    removeRange:'removeRange - blank, or integer greater than or equal to the "from" index',
    moveFrom:'moveFrom - integer: required, greater than or equal to low index',
    moveRange:'moveRange - blank, or integer greater than or equal to the "from" index',
    moveTo:'moveTo - integer: required, greater than or equal to low index',
}

export default class ServiceHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       // doing this explicitly here for documentation
       const 

       {
           referenceIndexCallback, // (index, location, cradleState)
           preloadIndexCallback, // (index)
           deleteListCallback, // (reason, deleteList)
           changeListSizeCallback, // (newlistsize)
           changeListRangeCallback,
           itemExceptionCallback, // (index, itemID, returnvalue, location, error)
           repositioningFlagCallback, // (flag) // boolean
           repositioningIndexCallback,
           
       } = cradleParameters.externalCallbacksRef.current,

       callbacks = {
           referenceIndexCallback,
           preloadIndexCallback,
           deleteListCallback,
           changeListSizeCallback,
           changeListRangeCallback,
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

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex, size } = virtualListProps

        if (!size) return

        const isInvalid = (!isInteger(index) || !isValueGreaterThanOrEqualToMinValue(index, lowindex))

        index = +index

        if (isInvalid) {

            console.log('RIGS ERROR scrollToIndex(index)):', index, errorMessages.scrollToIndex)
            return

        }

        const

            handlers = cradleParameters.handlersRef.current,

            {

                interruptHandler,
                layoutHandler,
                stateHandler

            } = handlers,

            { signals } = interruptHandler

        signals.pauseScrollingEffects = true

        layoutHandler.cradlePositionData.targetAxisReferencePosition = index - lowindex

        stateHandler.setCradleState('scrollto')

    }

    // deprecated (camel case)
    public setListsize = (newlistsize) => { // *deprecated* (for camel case)

        this.setListSize(newlistsize)
        
    }

    public setListSize = (newlistsize) => {

        newlistsize = +newlistsize

        const isInvalid = (!isInteger(newlistsize) || !isValueGreaterThanOrEqualToMinValue(newlistsize, 0))

        if (isInvalid) {

            console.log('RIGS ERROR setListSize(newlistsize)', newlistsize, errorMessages.setListSize)
            return

        }

        const 
            { 

                cacheAPI, 
                contentHandler, 
                stateHandler 

            } = this.cradleParameters.handlersRef.current,

            { 

                deleteListCallback, 
                changeListSizeCallback 

            } = this.callbacks,

            currentlistsize = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps.size,

            { cache } = this.cradleParameters.cradleInheritedPropertiesRef.current

        let dListCallback
        if (deleteListCallback) {
            dListCallback = (deleteList) => {

                deleteListCallback('change list size intervention',deleteList)

            }

        }

        contentHandler.updateVirtualListSize(newlistsize)
        cacheAPI.changeCacheListSize(newlistsize, 

            dListCallback,
            changeListSizeCallback

        )

        cacheAPI.renderPortalLists()


        if ((cache == 'preload') && (newlistsize > currentlistsize)) {

            stateHandler.setCradleState('startpreload')

        }

    }

    public setListRange = (newlistrange) => {

        let isInvalid = !Array.isArray(newlistrange)

        if (!isInvalid) {

            isInvalid = !(newlistrange.length == 0 || newlistrange.length == 2)

            if (!isInvalid && (newlistrange.length == 2)) {

                let [lowindex,highindex] = newlistrange

                lowindex = +lowindex
                highindex = +highindex

                isInvalid = ((!isInteger(lowindex)) || (!isInteger(highindex)) || (!isValueGreaterThanOrEqualToMinValue(highindex, lowindex)))

                if (!isInvalid) newlistrange = [lowindex,highindex]

            }

        }

        if (isInvalid) {

            console.log('RIGS ERROR setListRange(newlistrange)', newlistrange, errorMessages.setListRange)
            return

        }

        const 
            { 

                cacheAPI, 
                contentHandler, 
                stateHandler 

            } = this.cradleParameters.handlersRef.current,

            { 

                deleteListCallback, 
                changeListSizeCallback 

            } = this.callbacks,

            currentlistrange = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps.range,

            { cache } = this.cradleParameters.cradleInheritedPropertiesRef.current

        let dListCallback
        if (deleteListCallback) {
            dListCallback = (deleteList) => {

                deleteListCallback('change list range intervention',deleteList)

            }

        }

        contentHandler.updateVirtualListRange(newlistrange)
        cacheAPI.changeCacheListRange(newlistrange, 

            dListCallback,
            changeListSizeCallback

        )

        cacheAPI.renderPortalLists()


        if ((cache == 'preload') && 
            (newlistrange.length == 2) &&
            (newlistrange[0] < currentlistrange[0] || newlistrange[1] > currentlistrange[1])) {

            stateHandler.setCradleState('startpreload')

        }

    }

    public prependIndexCount = (prependCount) => {
        prependCount = +prependCount
        const isInvalid = ((!isInteger(prependCount)) || (!isValueGreaterThanOrEqualToMinValue(prependCount, 0)))
        if (isInvalid) {
            console.log('RIGS ERROR, prependIndexCount must be an integer >= 0')
            return
        }
        const { virtualListProps } = this.cradleParameters.cradleInternalPropertiesRef.current
        const [lowindex, highindex] = virtualListProps.range
        const { size } = virtualListProps

        let newlistrange
        if (size) {

            newlistrange = [lowindex - prependCount,highindex]

        } else {

            newlistrange = [-prependCount + 1,0]

        }

        this.setListRange(newlistrange)
    }

    public appendIndexCount = (appendCount) => {
        appendCount = +appendCount
        const isInvalid = ((!isInteger(appendCount)) || (!isValueGreaterThanOrEqualToMinValue(appendCount, 0)))
        if (isInvalid) {
            console.log('RIGS ERROR, appendIndexCount must be an integer >= 0')
            return
        }
        const { virtualListProps } = this.cradleParameters.cradleInternalPropertiesRef.current
        const [lowindex, highindex] = virtualListProps.range
        const { size } = virtualListProps

        let newlistrange
        if (size) {

            newlistrange = [lowindex,highindex + appendCount] 

        } else {

            newlistrange = [0,appendCount - 1]

        }

        this.setListRange(newlistrange)

    }

    // ======================[ GET SNAPSHOTS ]========================

    public getCacheIndexMap = () => {

        const { cacheAPI } = this.cradleParameters.handlersRef.current

        return cacheAPI.getCacheIndexMap()

    }

    public getCacheItemMap = () => {

        const { cacheAPI } = this.cradleParameters.handlersRef.current

        return cacheAPI.getCacheItemMap()

    }

    public getCradleIndexMap = () => {

        const { cacheAPI, contentHandler } = this.cradleParameters.handlersRef.current

        const modelIndexList = contentHandler.getModelIndexList()
        return cacheAPI.getCradleIndexMap(modelIndexList)
    }

    public getPropertiesSnapshot = () => {

        const props = {...this.cradleParameters.scrollerPropertiesRef.current}
        
        props.virtualListProps = {...props.virtualListProps}
        props.cradleContentProps = {...props.cradleContentProps}

        return props

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
    public remapIndexes = (changeMap) => { // index => itemID

        if (changeMap.size == 0) return [] // nothing to do

        const { cacheAPI, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { 

            itemMetadataMap, // itemID to component data, including index
            indexToItemIDMap, // index to itemID
            itemSet,

        } = cacheAPI 

        const indexesToDeleteList = []
        const indexesToReplaceItemIDList = []
        const partitionItemsToReplaceList = []
        const changeIndexToItemIDMap = new Map()
        const errorEntriesMap = new Map()

        // =====================[ PREPARE ]======================

        // -----------------------[ isolate indexes for which items should be replaced ]--------------

        const workingChangeMap = new Map()
        changeMap.forEach((itemID, index) => {
            if (itemID === undefined) {
                if (indexToItemIDMap.has(index)) {
                    const cacheItemID = indexToItemIDMap.get(index)

                    indexesToReplaceItemIDList.push(index)

                    if (!(cacheItemID === undefined)) { // ignore non-existent indexes

                        const { partitionID } = itemMetadataMap.get(cacheItemID)

                        partitionItemsToReplaceList.push({partitionID, itemID:cacheItemID})
                    }
                } else {

                    errorEntriesMap.set(index, 'index to replace is not in cache')

                }
            } else {

                workingChangeMap.set(index, itemID)

            }
        })

        indexesToReplaceItemIDList.forEach((index) => {
            indexToItemIDMap.delete(index)
        })

        // ------------ filter out inoperable indexes and itemIDs ------------

        const itemsToReplaceSet = new Set()
        partitionItemsToReplaceList.forEach((obj) => {
            itemsToReplaceSet.add(obj.itemID)
        })

        // const itemsToReplaceList = Array.from(itemsToReplaceSet)

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

                } else if (!itemMetadataMap.has(itemID) || itemsToReplaceSet.has(itemID)) {

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

            changeIndexToItemIDMap.forEach((itemID) => {

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
            originalMap.set(itemMetadataMap.get(itemID).index,itemID) // target itemID

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
            const itemdata = itemMetadataMap.get(itemID)

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

        const portalPartitionItemsForDeleteList = [] // hold deleted portals for deletion until after cradle synch

        originalMap.forEach((originalItemID, originalItemIDIndex) => {

            const finalItemIDIndex = itemMetadataMap.get(originalItemID).index

            if (originalItemIDIndex == finalItemIDIndex) { // not remapped, therefore orphaned

                deletedItemIDToIndexMap.set(originalItemID, originalItemIDIndex)

                const { partitionID } = itemMetadataMap.get(originalItemID)
                portalPartitionItemsForDeleteList.push({itemID:originalItemID, partitionID})
                itemMetadataMap.delete(originalItemID)
                itemSet.delete(originalItemID)

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

        cacheAPI.portalPartitionItemsForDeleteList = portalPartitionItemsForDeleteList.concat(partitionItemsToReplaceList)

        stateHandler.setCradleState('applyremapchanges')

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
    public moveIndex = (tolowindex, fromlowindex, fromhighindex = null) => {

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex:listlowindex, size } = virtualListProps

        if (!size) return

        // ------------ confirm validity of arguments -------------

        const isToindexInvalid = (!isInteger(tolowindex) || !isValueGreaterThanOrEqualToMinValue(tolowindex, listlowindex))
        const isFromindexInvalid = (!isInteger(fromlowindex) || !isValueGreaterThanOrEqualToMinValue(fromlowindex, listlowindex))
        let isHighrangeInvalid = false

        if ((!isFromindexInvalid)) {
            if (!isBlank(fromhighindex)) {
                isHighrangeInvalid = !isValueGreaterThanOrEqualToMinValue(fromhighindex, fromlowindex)
            } else {
                fromhighindex = fromlowindex
            }
        }


        tolowindex = +tolowindex
        fromlowindex = +fromlowindex
        fromhighindex = +fromhighindex

        // TODO return error array instead
        if (isToindexInvalid || isFromindexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR moveIndex(toindex, fromindex, fromhighrange)')
            isToindexInvalid && console.log(tolowindex, errorMessages.moveTo)
            isFromindexInvalid && console.log(fromlowindex, errorMessages.moveFrom)
            isHighrangeInvalid && console.log(fromhighindex, errorMessages.moveRange)
            return []
        }

        tolowindex = Math.max(listlowindex,tolowindex)
        fromlowindex = Math.max(listlowindex,fromlowindex)
        fromhighindex = Math.max(listlowindex,fromhighindex)

        const fromspan = fromhighindex - fromlowindex + 1

        let tohighindex = tolowindex + fromspan - 1

        // ------------- coerce parameters to list bounds ---------------

        const listsize = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps.size

        // keep within current list size
        const listhighindex = listsize - 1

        if (tohighindex > listhighindex) {

            const diff = tohighindex - listhighindex
            tohighindex = Math.max(listlowindex,tohighindex - diff)
            tolowindex = Math.max(listlowindex,tolowindex - diff)

        }

        if (fromhighindex > listhighindex) {

            const diff = fromhighindex - listhighindex
            fromhighindex = Math.max(listlowindex,fromhighindex - diff)
            fromlowindex = Math.max(listlowindex,fromlowindex - diff)

        }

        // ---------- constrain parameters --------------

        // nothing to do; no displacement
        if (fromlowindex == tolowindex) return [] 

        // ----------- perform cache and cradle operations -----------

        const { cacheAPI, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const processedIndexList = // both displaced and moved indexes
            cacheAPI.moveIndex(tolowindex, fromlowindex, fromhighindex)

        if (processedIndexList.length) {

            contentHandler.synchronizeCradleItemIDsToCache(processedIndexList)

            const { content } = contentHandler

            content.headModelComponents = content.cradleModelComponents.slice(0,content.headModelComponents.length)
            content.tailModelComponents = content.cradleModelComponents.slice(content.headModelComponents.length)

            stateHandler.setCradleState('applymovechanges')
            
        }

        return processedIndexList

    }

    public insertIndex = (index, rangehighindex = null) => {

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex:listlowindex, size } = virtualListProps

        let isIndexInvalid = !isInteger(index)

        if (!isIndexInvalid) {

            if (size) {
                isIndexInvalid = !isValueGreaterThanOrEqualToMinValue(index, listlowindex)
            } else {
                isIndexInvalid = (index !=0)
            }

        }

        let isHighrangeInvalid = false

        if ((!isIndexInvalid)) {
            if (!isBlank(rangehighindex)) {
                isHighrangeInvalid = !isValueGreaterThanOrEqualToMinValue(rangehighindex, index)
            } else {
                rangehighindex = index
            }
        }

        index = +index

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

        const 

            { cradleParameters } = this,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { virtualListProps } = cradleInternalProperties,

            { lowindex:listlowindex, size } = virtualListProps

        if (!size) return

        const isIndexInvalid = (!isInteger(index) || !isValueGreaterThanOrEqualToMinValue(index, listlowindex))
        let isHighrangeInvalid = false

        if ((!isIndexInvalid)) {
            if (!isBlank(rangehighindex)) {
                isHighrangeInvalid = !isValueGreaterThanOrEqualToMinValue(rangehighindex, index)
            } else {
                rangehighindex = index
            }
        }

        index = +index
        rangehighindex = +rangehighindex

        if (isIndexInvalid || isHighrangeInvalid) {
            console.log('RIGS ERROR moveIndex(index, rangehighindex)')
            isIndexInvalid && console.log(index, errorMessages.removeFrom)
            isHighrangeInvalid && console.log(rangehighindex, errorMessages.removeRange)
            return null
        }

        return this.insertRemoveIndex(index, rangehighindex, -1)

    }

    public newListSize // accessed by changelistsizeafterinsertremove event from Cradle

    // shared logic for insert and remove. Returns lists of indexes shifted, replaced, and removed
    // this operation changes the listsize
    private insertRemoveIndex = (index, rangehighindex, increment) => {

        const 

            { cradleParameters } = this,

            { 
                
                cacheAPI, 
                contentHandler, 
                stateHandler, 
            
            } = this.cradleParameters.handlersRef.current,

            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            { 
            
                cradleContentProps, 
                virtualListProps,

            } = cradleInternalProperties,

            { 
            
                lowindex:listlowindex, 
                crosscount, 
                size:listsize,

            } = virtualListProps,

            { 
            
                lowindex:lowCradleIndex, 
                highindex:highCradleIndex, 
                size:cradleSize, 
                runwayRowcount:runwaySize,
                viewportRowcount,
            
            } = cradleContentProps

        // basic assertions
        index = Math.max(listlowindex,index)
        rangehighindex = Math.max(rangehighindex, index)

        // ------------------- process cache ----------------

        if (listsize == 0) {
            
            if (increment > 0) {

                return this.setListSize(rangehighindex - index + 1)

            }
            return [[],[],[]]
        }

        const [startChangeIndex, rangeincrement, shiftedList, removedList, replaceList, portalPartitionItemsForDeleteList] = 
            cacheAPI.insertRemoveIndex(index, rangehighindex, increment, listsize) //, cradleIndexSpan)

        if (rangeincrement === null) return [[],[],[]] // no action

        // partitionItems to delete with followup state changes - must happen after cradle update
        cacheAPI.portalPartitionItemsForDeleteList = portalPartitionItemsForDeleteList

        // ------------- synchronize cradle to cache changes -------------

        // determine if cradle must be reset or simply adjusted
        const 
            changecount = rangeincrement, // semantics
            newlistsize = this.newListSize = listsize + changecount,

            calculatedCradleRowcount = viewportRowcount + (runwaySize * 2),
            calculatedCradleItemcount = calculatedCradleRowcount * crosscount,

            measuredCradleItemCount = (cradleSize == 0)?0:highCradleIndex - lowCradleIndex + 1,

            resetCradle = ((measuredCradleItemCount < calculatedCradleItemcount) || 
                (highCradleIndex >= (newlistsize - 1)))

        if (!resetCradle) { // synchronize cradle contents to changes

            contentHandler.synchronizeCradleItemIDsToCache(shiftedList, increment, startChangeIndex) // non-zero communications isInsertRemove

            const { content } = contentHandler

            // const requestedSet = cacheAPI.cacheProps.requestedSet
            const requestedSet = cacheAPI.requestedSet

            const timeout = setInterval(() => { // wait until changed cache entries update the cradle

                if(!requestedSet.size) { // finished collecting new cache entries

                    clearInterval(timeout); 

                    content.headModelComponents = content.cradleModelComponents.slice(0,content.headModelComponents.length)
                    content.tailModelComponents = content.cradleModelComponents.slice(content.headModelComponents.length)

                    stateHandler.setCradleState('applyinsertremovechanges')

                }
            }, 100)

        } else { // cradle to be completely reset if listsize change encroaches on cradle

            stateHandler.setCradleState('channelcradleresetafterinsertremove')

        }

        const replacedList = replaceList // semantics

        return [shiftedList, replacedList, removedList] // inform caller

    }

}
