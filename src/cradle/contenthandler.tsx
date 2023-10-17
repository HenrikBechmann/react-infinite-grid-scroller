// contenthandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module supports the setup, rollover and positioning of content in the Cradle. 

    There are three key functions in this module: setCradleContent, updateCradleContent, and
    adjustScrollblockForVariability.

    There are also a few functions which support synchronization of Cradle content with cache 
    content (see internal and external services below).

    setCradleContent is called directly from Cradle (in the state manager), and instantiates new Cradle
    content in response to the scroller setup, or changes to its configuration. setCradleContent
    creates a list of Cradle content CellFrames, and allocates those to the two Cradle grids. This 
    process occurs in response to many state changes, such as finishreposition, pivot, a host scrollto
    request, and more.

    updateCradleContent rolls over the Cradle content in response to user scrolling. When scrolling 
    down (or right), content is removed from the Cradle tail and added to the Cradle head (thus moving the 
    Cradle axis), while new content is added to the tail. When scrolling up (or left), the reverse occurs.

    adjustScrollblockForVariability reconfigures the scrollblock to accommodate variable sized grid rows.

    The Cradle (through the contentfunctions module) delegates fetching content items to the CellFrame.

    This module is supported primarily by the contentfunctions module.

*/

import React from 'react'

// import { 
    // calculateContentParameters,
    // allocateContentList,
    // deletePortals,
    // getCellFrameComponentList, 

// } from './contentfunctions'

import { contentSet } from './contenthandler/contentset'

import { contentUpdate } from './contenthandler/contentupdate'

import { contentAdjust } from './contenthandler/contentadjust'

// import {

//     calculateShiftSpecs,

// } from './updatefunctions'

export default class ContentHandler {

   constructor(cradleParameters) {

      this.cradleParameters = cradleParameters

   }

   public content = {

      cradleModelComponents: null,
      headModelComponents: null,
      tailModelComponents: null,
      // the following two only used in cradle for render
      headDisplayComponents: [],
      tailDisplayComponents: [],

    }

    private cradleParameters

    private instanceIdCounterRef = {

       current:0

    }

    // =============================[ UPDATE VIRTUAL LIST RANGE ]==========================
    public updateVirtualListRange = (newlistrange) => {

        // console.log('contentHandler.updateVirtualListRange: newlistrange', newlistrange)

        const
            { cradleParameters } = this,

            cradleHandlers = cradleParameters.handlersRef.current,

            {
                layoutHandler,

            } = cradleHandlers,

            {

                setVirtualListRange,
                virtualListProps,
                cradleContentProps,

            } = this.cradleParameters.cradleInternalPropertiesRef.current,

            { 
            
                cradlePositionData,

            } = layoutHandler

        let newlistsize
        if (newlistrange.length == 0) {

            newlistsize = 0
            cradlePositionData.targetAxisReferencePosition = 0
            cradlePositionData.targetPixelOffsetAxisFromViewport = 0

        } else {

            const [newlowindex, newhighindex] = newlistrange

            if (virtualListProps.range.length) {

                const {lowindex:previouslowindex} = virtualListProps

                const lowindexchange = newlowindex - previouslowindex

                cradlePositionData.targetAxisReferencePosition -= lowindexchange

            }

            newlistsize = newhighindex - newlowindex + 1

        }

        if (newlistsize == 0) {

            const cradleContent = this.content        

            this.clearCradle()
            cradleContent.headDisplayComponents = []
            cradleContent.tailDisplayComponents = []
            Object.assign(cradleContentProps, 
                {
                    SOL:undefined, 
                    EOL:undefined,
                    highindex:undefined, 
                    lowindex:undefined, 
                    lowrow:undefined,
                    highrow:undefined,
                    axisReferenceIndex:undefined,
                    size:0 
                }
            )

        }

        setVirtualListRange(newlistrange)

    }

    // Three main public methods - setCradleContent, updateCradleContent, and adjustScrollblockForVariability

    // ==========================[ SET CONTENT ]===========================

    public setCradleContent = ( cradleState ) => { // cradleState influences some behaviour

        const 
            { cradleParameters, content:cradleContent, instanceIdCounterRef } = this

        contentSet(cradleState, cradleParameters, cradleContent, instanceIdCounterRef)

    }

    // ==================[ UPDATE CONTENT through scroll ]========================

    // updateCradleContent does not touch the viewport element's scroll position for the scrollblock
    // instead it reconfigures elements within the cradle. It is called solely from
    // axisTriggerlinesObserverCallback of interruptHandler.
    // typically called for scroll action, but can also be called if the triggerLineCell changes
    // size with variant layout.

    public updateCradleContent = () => {

        const 
            { 
            
                cradleParameters,
                content:cradleContent,

            } = this

        contentUpdate(cradleParameters, cradleContent, this.instanceIdCounterRef)

    }

    // ===================[ RECONFIGURE THE SCROLLBLOCK FOR VARIABLE CONTENT ]=======================

/*  
    trackingBlockScrollPos is the amount the scrollBlock is scrolled to reveal the centre of the Cradle
        at the edge of the Viewport
    
    the length of the Scrollblock is shortened by the amount the measured tail length differs from the 
        base tail length

    Called for variable layout only. All DOM elements should have (ideally) been rendered at this point,
        but the function deals with what it finds
    sets CSS: scrollblockElement top and height (or left and width), and axisElement top (or left)
    to get closer to natural proportions
*/

    // private latestAxisReferenceIndex

    public adjustScrollblockForVariability = (source) => {

        const
            { cradleParameters } = this

        contentAdjust(source, cradleParameters)

    }

    // ========================= [ INTERNAL CONTENT MANAGEMENT SERVICES ]=====================

    public guardAgainstRunawayCaching = () => { 

        const 
            { cacheMax, MAX_CACHE_OVER_RUN } = this.cradleParameters.cradleInheritedPropertiesRef.current,

            { cacheAPI } = this.cradleParameters.handlersRef.current,

            modelComponentList = this.content.cradleModelComponents
 
        if (cacheAPI.guardAgainstRunawayCaching(cacheMax, modelComponentList.length, MAX_CACHE_OVER_RUN )) {

            this.pareCacheToMax()

        }
    }
    
    public pareCacheToMax = () => {

        const 
            cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current,

            { cache, scrollerID } = cradleInheritedProperties
        
        if (cache == 'keepload') {

            const 
                cradleHandlers = this.cradleParameters.handlersRef.current,
                { cacheAPI, serviceHandler } = cradleHandlers,

                modelIndexList = this.getModelIndexList(),

                { deleteListCallback } = serviceHandler.callbacks

            let deleteListCallbackWrapper
            if (deleteListCallback) {
                deleteListCallbackWrapper = (deleteList) => {

                    deleteListCallback(deleteList, 
                    {
                        contextType:'deleteList',
                        scrollerID,
                        message:'pare cache to cacheMax',
                    })

                }

            }

            if (cacheAPI.pareCacheToMax(
                cradleInheritedProperties.cacheMax, modelIndexList, deleteListCallbackWrapper)) {
            
                cacheAPI.renderPortalLists()
                
            }
                            
        }

    }

    // ==========================[ EXTERNAL SERVICE SUPPORT ]=======================

    // supports clearCache
    public clearCradle = () => {

        const cradleContent = this.content
        // const { cacheAPI } = this.cradleParameters.handlersRef.current

        cradleContent.cradleModelComponents = []

        cradleContent.headModelComponents = []
        cradleContent.tailModelComponents = []

    }

    // called from serviceHandler getCradleIndexMap
    // also supports pareCacheToMax, matchCacheToCradle
    public getModelIndexList() {

        const { cradleModelComponents } = this.content

        if (!cradleModelComponents) {

            return [] 

        } else {

            return cradleModelComponents.map((item)=>item.props.index)

        }

    }

    // supports moveIndex and insertOrRemoveIndex, 
    // updates cradle contiguous items from startChangeIndex or start of cradle
    public synchronizeCradleItemIDsToCache(updatedIndexList, isInsertRemove = 0, startChangeIndex = null) { // 0 = move

        // console.log('synchronizeCradleItemIDsToCache: updatedIndexList, isInsertRemove, startChangeIndex\n',
        //     updatedIndexList, isInsertRemove, startChangeIndex)

        // assemble resources
        const 
            { cacheAPI } = this.cradleParameters.handlersRef.current,
            
            { indexToItemIDMap } = cacheAPI,

            { cradleModelComponents } = this.content,

            { cradleContentProps } = this.cradleParameters.cradleInternalPropertiesRef.current

        if (cradleContentProps.size == 0) return

        const { lowindex:lowSpan, highindex:highSpan } = cradleContentProps

        // console.log('lowSpan, highSpan',lowSpan, highSpan)

        let startIndex, endIndex
        if (isInsertRemove) {

            if (startChangeIndex > highSpan) return

            startIndex = startChangeIndex
            endIndex = highSpan

        } else { // move

            if (updatedIndexList.length == 0) return

            startIndex = updatedIndexList[0]
            endIndex = updatedIndexList.at(-1)

        }

        const updatedSpan = endIndex - startIndex + 1

        let firstIndex = startIndex

        if (firstIndex > highSpan) return

        if (firstIndex < lowSpan) firstIndex = lowSpan

        const 
            lowPtr = firstIndex - lowSpan,

            highPtr = isInsertRemove
                ?cradleModelComponents.length - 1
                :Math.min(cradleModelComponents.length - 1,lowPtr + updatedSpan - 1)

        // function to update individual cradle components to cache changes
        function processcomponentFn(component, componentptr, componentarray) {

            const 
                index = component.props.index,
                cacheItemID = indexToItemIDMap.get(index)

            // console.log('index, cacheItemID', index, cacheItemID)

            // if cache has no component for cradle item, then get one
            if (cacheItemID === undefined) {

                const newItemID = cacheAPI.getNewItemID()
                componentarray[componentptr] = React.cloneElement(component, {itemID:newItemID})

                // console.log('getting new itemID',newItemID)

                return

            } else { // match cache itemID to cradle component itemID

                const 
                    cradleItemID = component.props.itemID,
                    updateptr = updatedIndexList.indexOf(index) // TODO verify need for updatelist

                if (updateptr != -1) { // update list confirms there is a cache item for this index

                    if (cacheItemID == cradleItemID) return

                    componentarray[componentptr] = React.cloneElement(component, {itemID:cacheItemID})

                } else {

                    const newItemID = cacheAPI.getNewItemID()
                    componentarray[componentptr] = React.cloneElement(component, {itemID:newItemID})

                }

            }

        }

        for (let ptr = lowPtr; ptr <= highPtr; ptr++) {
            processcomponentFn(cradleModelComponents[ptr], ptr, cradleModelComponents)
        }

    }

}