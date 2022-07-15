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

    // blank index values (cacheItemID) are assigned a new 
    // cacheItemID if in the cradle, otherwise removed from the cache.
    // Duplicate index/itemID pairs have the itemID turned to blank
    // and are processed by the above rule
    public modifyCacheMap = (modifyMap) => { // index => cacheItemID

        // console.log('modifyMap in serviceHandler',modifyMap)

        const modifymapsize = modifyMap.size

        if (modifymapsize == 0) return true

        const unitIDset = new Set(modifyMap.values())

        const unitidsetsize = unitIDset.size

        if (modifymapsize != unitidsetsize) {

            const modifyUnitIDCount = new Map()

            modifyMap.forEach((cacheUnitID, index) => {
                if (!modifyUnitIDCount.has(cacheUnitID)) {
                    modifyUnitIDCount.set(cacheUnitID, 1)
                } else {
                    modifyUnitIDCount.set(cacheUnitID, modifyUnitIDCount.get(cacheUnitID) + 1)
                }
            })

            modifyUnitIDCount.delete(null) // legitimate

            const duplicateunits = new Map()
            modifyUnitIDCount.forEach((count,cacheUnitID)=>{
                if (count > 1) {
                    duplicateunits.set(cacheUnitID, count)
                }
            })

            if (duplicateunits.size) {

                console.log('WARNING: modifyCacheMap rejected: \
                    duplicate cacheUnitID index assignment values found:\
                    duplicateCacheUnitIDs, modifyMap',
                    duplicateunits, modifyMap)
                return false

            }

        }

        const { cacheHandler, contentHandler } = this.cradleParameters.handlersRef.current

        // apply changes to cache index and cacheItemID maps
        const { 
            metadataMap, // cacheItemID to portal data, including index
            indexToItemIDMap // index to cacheItemID
        } = cacheHandler.cacheProps 
        // const cradleMap = this.getCradleMap() // index to cacheItemID

        const duplicates = new Map()
        const processed = new Map()
        const originalitemindex = new Map()
        const ignored = new Map()
        const pending = new Map()

        modifyMap.forEach((cacheItemID,index) => {
            if (cacheItemID === null) {
                pending.set(index, null)
            } else {
                if (!indexToItemIDMap.has(index)) { // not in cache
                    ignored.set(index,cacheItemID)
                } else {
                    if (indexToItemIDMap.get(index) != cacheItemID) { // modification requested
                        indexToItemIDMap.set(index,cacheItemID) // modiication applied, part 1
                        const data = metadataMap.get(cacheItemID)
                        originalitemindex.set(cacheItemID,data.index)
                        data.index = index // modification applied, part 2
                        processed.set(index,cacheItemID)
                    }
                }
            }
        })

        // console.log('ignored,processed',ignored,processed)

        if ((processed.size == 0) && (pending.size == 0)) return true

        if (processed.size) {
            cacheHandler.cacheProps.modified = true
            cacheHandler.renderPortalList()
        }

        // eliminate duplicate cacheItemIDs in index map

        // if the original index for the re-assigned cache item still maps to the cache item,
        // then there is a duplicate
        originalitemindex.forEach((cacheItemID, index) => {
            if (indexToItemIDMap.has(index) && (indexToItemIDMap.get(index) == cacheItemID)) {
                duplicates.set(cacheItemID, index)
            }
        })
        let retval = true
        if (duplicates.size) {
            retval = false
            console.log('WARNING: original mapping for re-assigned cache item ID(s) was left \
                unchanged by modifyCacheMap, creating duplicates:\
                \nduplicates, modifyMap\n',
                duplicates, modifyMap, 
                '\nDuplicates left behind will be cleared.')
            duplicates.forEach((index, cacheItemID)=>{
                pending.set(index,null)
            })
        }

        if (pending.size) {
            pending.forEach((value, index)=>{ // value is always null
                modifyMap.set(index, value) // assert null for cacheItemID
            })
        }

        // apply changes to extant cellFrames
        const { cradleModelComponents } = contentHandler.content

        const modifiedCellFrames = new Map()

        cradleModelComponents.forEach((component) => {
            const index = component.props.index
            if (modifyMap.has(index)) {
                const cacheItemID = component.props.cacheItemID
                let newCacheItemID = modifyMap.get(index)
                if (newCacheItemID === null) {
                    newCacheItemID = cacheHandler.getNewCacheItemID()
                }
                if ( newCacheItemID != cacheItemID ) {

                    const instanceID = component.props.instanceID
                
                    modifiedCellFrames.set(instanceID, React.cloneElement(component, {cacheItemID:newCacheItemID}))

                }
            }
        })

        // console.log('modifiedCellFrames',modifiedCellFrames)

        if (modifiedCellFrames.size) {

            contentHandler.updateCellFrames(modifiedCellFrames)

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
            contentHandler.changeCradleCacheItemIDs(processedIndexList)
            stateHandler.setCradleState('applycellframechanges')
            
        }

    }

    public insertIndex = (index, rangehighindex = null) => {

        console.log('service handler called to insert index', index, rangehighindex)

        this.insertRemoveIndex(index, rangehighindex, +1)

    }

    public removeIndex = (index, rangehighindex = null) => {

        console.log('service handler called to remove index', index, rangehighindex)

        this.insertRemoveIndex(index, rangehighindex, -1)

    }

    // shared logic
    private insertRemoveIndex = (index, rangehighindex, increment) => {

        const { cacheHandler, contentHandler, stateHandler } = 
            this.cradleParameters.handlersRef.current
            
        const { listsize } = this.cradleParameters.cradleInternalPropertiesRef.current

        const [processedMap, removedList] = cacheHandler.incrementFromIndex(index, rangehighindex, increment)

        const processedList = Array.from(processedMap.keys())

        console.log('listsize, processedList, removedList',listsize, processedList, removedList)

        contentHandler.changeCradleCacheItemIDs(processedList)

        if (increment == +1) contentHandler.createNewCacheItemIDs(removedList)

        stateHandler.setCradleState('applycellframechanges')

        const changecount = (removedList.length * increment)
        const newlistsize = listsize + changecount 

        this.setListsize(newlistsize)

    }

    public setListsize = (listsize) => {

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        cacheHandler.changeListsize(listsize, this.callbacks.cacheDeleteListCallback)

    }

}

