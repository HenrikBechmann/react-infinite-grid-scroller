// servicehandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

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
           repositioningFlagCallback, // (flag) // boolean
           
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

        stateHandler.setCradleState('scrollto')

    }

    public setListsize = (newlistsize) => {

        newlistsize = Math.max(0,newlistsize)

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

        return true

    }

    public remapIndexes = (changeMap) => { // index => itemID

        if (changeMap.size == 0) return [] // nothing to do

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { 

            metadataMap, // itemID to component data, including index
            portalMap, // twinned with metadataMap for portal
            indexToItemIDMap // index to itemID

        } = cacheHandler.cacheProps 

        const indexesToDeleteList = []
        const changeIndexToItemIDMap = new Map()
        const errorEntriesMap = new Map()

        // =====================[ PREPARATION ]======================

        // ------------ filter out inoperable indexes and itemIDs ------------

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

                    errorEntriesMap.set(index, `target itemID ${itemID} has not changed`)

                } else if (!metadataMap.has(itemID)) {

                    errorEntriesMap.set(index, `target itemID ${itemID} not in cache`)

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

        const portalHoldList = [] // hold deleted portals for deletion until after cradle synch

        originalMap.forEach((originalItemID, originalItemIDIndex) => {

            const finalItemIDIndex = metadataMap.get(originalItemID).index

            if (originalItemIDIndex == finalItemIDIndex) { // not remapped, therefore orphaned

                deletedItemIDToIndexMap.set(originalItemID, originalItemIDIndex)

                metadataMap.delete(originalItemID)
                portalHoldList.push(originalItemID)

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

        // refresh the modified cache
        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()

        // ------------- apply changes to extant cellFrames ------------

        // these are used to reconcile cradle cellFrames, and also for return information
        // const processedIndexList = Array.from(processedMap.keys())
        const deletedOrphanedItemIndexList = Array.from(deletedItemIDToIndexMap.values())
        const deletedOrphanedIndexList = Array.from(deletedIndexToItemIDMap.keys())
        // for return information...
        const deletedOrphanedItemIDList = Array.from(deletedItemIDToIndexMap.keys()) 

        let modifiedIndexList = 
                processedIndexList.concat(
                    indexesToDeleteList, 
                    deletedOrphanedItemIndexList, 
                    deletedOrphanedIndexList
                )

        modifiedIndexList = Array.from(new Set(modifiedIndexList.values())) // remove duplicates

        contentHandler.reconcileCellFrames(modifiedIndexList)
        cacheHandler.portalHoldList = portalHoldList

        stateHandler.setCradleState('applycellframechanges')

        // ---------- returns for user information --------------------

        return [

            modifiedIndexList, 
            processedIndexList, 
            indexesToDeleteList, 
            deletedOrphanedItemIDList, 
            deletedOrphanedIndexList,
            errorEntriesMap, 
            changeMap

        ]

    }

    // move must be entirely within list bounds
    // returns list of processed indexes
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

        const [changeList, replaceList, rangeincrement, portalHoldList] = 
            cacheHandler.insertRemoveIndex(index, rangehighindex, increment, listsize)

        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()
        cacheHandler.portalHoldList = portalHoldList

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

