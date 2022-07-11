// servicehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

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

    public callbacks

    // TODO: adjust axisPixelOffset to match new data
    public reload = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        const { interruptHandler } = this.cradleParameters.handlersRef.current

        interruptHandler.pauseInterrupts()

        stateHandler.setCradleState('reload')

    }


    public clearCache = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        stateHandler.setCradleState('clearcache')

    }

    public scrollToItem = (index) => {

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler
        const { scaffoldHandler, stateHandler} = this.cradleParameters.handlersRef.current

        signals.pauseScrollingEffects = true

        scaffoldHandler.cradlePositionData.targetAxisReferenceIndex = index

        stateHandler.setCradleState('doreposition')

    }

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

    //TODO implement this
    public modifyCacheMap = (modifyMap) => { // index => cacheItemID

        console.log('modifyMap in serviceHandler',modifyMap)

        if (modifyMap.size == 0) return

        const { cacheHandler, contentHandler } = this.cradleParameters.handlersRef.current

        // apply changes to cache index and cacheItemID maps
        const metadataMap = cacheHandler.cacheProps.metadataMap
        const indexToItemIDMap = cacheHandler.cacheProps.indexToItemIDMap

        const duplicates = new Map()
        const processed = new Map()
        const originalitemindex = new Map()
        const ignored = new Map()

        modifyMap.forEach((cacheItemID,index) => {
            if (!indexToItemIDMap.has(index)) {
                ignored.set(index,cacheItemID)
            } else {
                indexToItemIDMap.set(index,cacheItemID)
                const value = metadataMap.get(cacheItemID)
                originalitemindex.set(cacheItemID,value.index)
                value.index = index
                processed.set(index,cacheItemID)
            }
        })

        console.log('ignored,processed',ignored,processed)

        if (processed.size == 0) return

        cacheHandler.cacheProps.modified = true
        cacheHandler.renderPortalList()

        // eliminate duplicate cacheItemIDs in index map

        // apply changes to extant cellFrames
        const cradleModelComponents = contentHandler.content.cradleModelComponents

        const modifiedCellFrames = new Map()

        for (const i in cradleModelComponents) {
            const component = cradleModelComponents[i]
            const index = component.props.index
            if (modifyMap.has(index)) {
                const cacheItemID = component.props.cacheItemID
                const newCacheItemID = modifyMap.get(index)
                if ( newCacheItemID != cacheItemID ) {

                    const instanceID = component.props.instanceID
                
                    modifiedCellFrames.set(instanceID, React.cloneElement(component, {cacheItemID}))

                }
            }
        }

        console.log('modifiedCellFrames',modifiedCellFrames)

        if (modifiedCellFrames.size) {

            contentHandler.updateCellFrames(modifiedCellFrames)

        }

    }

    public setListsize = (listsize) => {

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        cacheHandler.changeListsize(listsize, this.callbacks.cacheDeleteListCallback)

    }

}

