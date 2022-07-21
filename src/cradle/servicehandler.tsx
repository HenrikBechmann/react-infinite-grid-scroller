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
           cacheDeleteListCallback,
           newListSizeCallback,
       } = cradleParameters.externalCallbacksRef.current

       const callbacks = {
           referenceIndexCallback,
           preloadIndexCallback,
           cacheDeleteListCallback,
           newListSizeCallback,
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

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler
        const { scaffoldHandler, stateHandler} = this.cradleParameters.handlersRef.current

        signals.pauseScrollingEffects = true

        scaffoldHandler.cradlePositionData.targetAxisReferenceIndex = index

        stateHandler.setCradleState('doreposition')

    }

    public setListsize = (listsize) => {

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        cacheHandler.changeListsize(listsize, this.callbacks.cacheDeleteListCallback)

    }

    // ======================[ GET SNAPSHOTS ]========================

    public getCacheMap = () => {

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        return cacheHandler.getCacheMap()

    }

    public getCacheList = () => {

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        return cacheHandler.getCacheList()

    }

    public getCradleMap = () => {

        const { cacheHandler, contentHandler } = this.cradleParameters.handlersRef.current

        const modelIndexList = contentHandler.getModelIndexList()
        return cacheHandler.getCradleMap(modelIndexList)
    }

    // =================[ CACHE MANAGEMENT REQUESTS ]==================

    public clearCache = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        stateHandler.setCradleState('clearcache')

    }

    // blank index values (itemID) are assigned a new 
    // itemID if in the cradle, otherwise removed from the cache.
    // Duplicate index/itemID pairs have the itemID turned to blank
    // and are processed by the above rule
    public changeIndexMap = (changeMap) => { // index => itemID

        // -------------- first, guard against duplicate itemIDs in change map ------------

        const mapsize = changeMap.size

        if (mapsize == 0) return true // nothing to do

        const itemIDset = new Set(changeMap.values())

        const itemsetsize = itemIDset.size

        if (mapsize != itemsetsize) { // there must be duplicate itemIDs

            const itemIDCountMap = new Map()

            changeMap.forEach((itemID, index) => {
                if (!itemIDCountMap.has(itemID)) {
                    itemIDCountMap.set(itemID, 1)
                } else {
                    itemIDCountMap.set(itemID, itemIDCountMap.get(itemID) + 1)
                }
            })

            itemIDCountMap.delete(null) // legitimate - means remove item from cache

            const duplicateitemsMap = new Map()
            itemIDCountMap.forEach((count,itemID)=>{
                if (count > 1) {
                    duplicateitemsMap.set(itemID, count)
                }
            })

            if (duplicateitemsMap.size) {

                console.log('WARNING: changeIndexMap rejected: \
                    duplicate itemID index assignment values found:\
                    duplicateItemIDs, changeMap',
                    duplicateitemsMap, changeMap)
                return false

            }

        }

        // ----------- apply changes to cache index and itemID maps ----------

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { 
            metadataMap, // itemID to portal data, including index
            indexToItemIDMap // index to itemID
        } = cacheHandler.cacheProps 
        // const cradleMap = this.getCradleMap() // index to itemID

        const pendingMap = new Map() // index => itemID; itemID set to null, pending removal from cache
        const ignoredMap = new Map() // index => itemID; itemID for index same as changerequest
        const originalitemindexMap = new Map() // itemID => index; before change
        const processedMap = new Map() // index => itemID; change has been applied
        const duplicatesMap = new Map() // itemID => index; unresolved index changes

        changeMap.forEach((itemID,index) => {
            if (itemID === null) {
                pendingMap.set(index, null)
            } else {
                if (!indexToItemIDMap.has(index)) { // not in cache
                    ignoredMap.set(index,itemID)
                } else {
                    if (indexToItemIDMap.get(index) != itemID) { // modification requested
                        indexToItemIDMap.set(index,itemID) // modiication applied, part 1
                        const data = metadataMap.get(itemID)
                        originalitemindexMap.set(itemID,data.index)
                        data.index = index // modification applied, part 2
                        processedMap.set(index,itemID)
                    }
                }
            }
        })

        // console.log('ignored,processed',ignored,processed)

        if ((processedMap.size == 0) && (pendingMap.size == 0)) return true

        // eliminate duplicate itemIDs in index map

        // if the original index for the re-assigned cache item still maps to the cache item,
        // then there is a duplicate
        originalitemindexMap.forEach((itemID, index) => {
            if (indexToItemIDMap.has(index) && (indexToItemIDMap.get(index) == itemID)) {
                if (!pendingMap.has(index)) {
                    duplicatesMap.set(itemID, index)
                }
            }
        })

        if (duplicatesMap.size) {
            console.log('WARNING: original mapping for re-assigned cache item ID(s) was left \
                unchanged by changeIndexMap, creating duplicates:\
                \nduplicates, changeMap\n',
                duplicatesMap, changeMap, 
                '\nDuplicates left behind will be cleared from cache.')
            duplicatesMap.forEach((index, itemID)=>{
                pendingMap.set(index,null)
            })
        }

        if (pendingMap.size) {
            pendingMap.forEach((value, index)=>{ // value is always null
                changeMap.set(index, value) // assert null for itemID
            })
        }

        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()

        // ------------- apply changes to extant cellFrames ------------

        const { cradleModelComponents } = contentHandler.content

        const modifiedCellFrames = new Map()

        cradleModelComponents.forEach((component) => {
            const index = component.props.index
            if (changeMap.has(index)) {
                const itemID = component.props.itemID
                let newItemID = changeMap.get(index)
                if (newItemID === null) {
                    newItemID = cacheHandler.getNewItemID()
                }
                if ( newItemID != itemID ) {

                    const instanceID = component.props.instanceID
                
                    modifiedCellFrames.set(instanceID, React.cloneElement(component, {itemID:newItemID}))

                }
            }
        })

        // console.log('modifiedCellFrames',modifiedCellFrames)

        if (modifiedCellFrames.size) {

            contentHandler.updateCellFrames(modifiedCellFrames)

            stateHandler.setCradleState('applycellframechanges')

        }

        return true

    }

    // TODO implement hightrange logic
    public moveIndex = (toindex, fromindex, highrange = null) => {

        if (fromindex == toindex) return

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

    }

    public insertIndex = (index, rangehighindex = null) => {

        this.insertRemoveIndex(index, rangehighindex, +1)

    }

    public removeIndex = (index, rangehighindex = null) => {

        this.insertRemoveIndex(index, rangehighindex, -1)

    }

    // shared logic
    private insertRemoveIndex = (index, rangehighindex, increment) => {

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current

        const { listsize } = this.cradleParameters.cradleInternalPropertiesRef.current

        const [changeList, removeList, rangeincrement] = 
            cacheHandler.incrementFromIndex(index, rangehighindex, increment, listsize)

        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()

        contentHandler.changeCradleItemIDs(changeList)

        if (increment == +1) contentHandler.createNewItemIDs(removeList)

        const { content } = contentHandler

        stateHandler.setCradleState('applycellframechanges')

        const changecount = rangeincrement
        const newlistsize = listsize + changecount 

        this.setListsize(newlistsize)

    }

}

