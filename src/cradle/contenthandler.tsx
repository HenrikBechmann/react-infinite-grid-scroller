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

import { contentUpdate } from './contentupdate'

import { contentSet } from './contentset'

// import {

//     calculateShiftSpecs,

// } from './updatefunctions'

export default class ContentHandler {

   constructor(cradleParameters) {

      this.cradleParameters = cradleParameters

   }

   private gridResizeObserver

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

    // =============================[ UPDATE VIRTUAL LIST SIZE OR RANGE ]==========================
    // these are utilities

    // reset the cradle with new content, including allocation between head and tail parts of the cradle
    // - called only from the Cradle state handler
    public updateVirtualListSize = (newlistsize) => {

        const 
            { cradleParameters } = this,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,
            { 

                cradleContentProps,
                setVirtualListSize,

            } = cradleInternalProperties

        if (newlistsize == 0) {

            const 
                cradleContent = this.content,
                cradleHandlers = cradleParameters.handlersRef.current,
                { layoutHandler } = cradleHandlers,
                { cradlePositionData } = layoutHandler

            this.clearCradle()
            cradleContent.headDisplayComponents = []
            cradleContent.tailDisplayComponents = []
            Object.assign(cradleContentProps, 
                {
                    SOL:undefined, 
                    EOL:undefined,
                    highindex:undefined, 
                    lowindex:undefined, 
                    axisReferenceIndex:undefined,
                    size:0 
                }
            )

            cradlePositionData.targetAxisReferencePosition = 0
            cradlePositionData.targetPixelOffsetAxisFromViewport = 0

        }

        setVirtualListSize(newlistsize)

    }

    public updateVirtualListRange = (newlistrange) => {

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

        // ----------------------[ setup base values and references ]------------------------

        // resources...
        const
            // acquire repositories
            { cradleParameters } = this,
            cradleHandlers = cradleParameters.handlersRef.current,
            viewportContextProperties = cradleParameters.viewportContextPropertiesRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            {

                layoutHandler, 
                scrollHandler, 
                interruptHandler 

            } = cradleHandlers,

            // extract resources from repositories
            { 

                elements: cradleElements, 
                cradlePositionData 

            } = layoutHandler,

            // current configurations...
            { 

                targetAxisReferencePosition: axisReferencePosition,
                targetPixelOffsetAxisFromViewport: pixelOffsetAxisFromViewport,

            } = cradlePositionData,

            // element references...
            viewportElement = viewportContextProperties.elementRef.current,
            scrollblockElement = viewportElement.firstChild,
            headGridElement = cradleElements.headRef.current,
            tailGridElement = cradleElements.tailRef.current,
            axisElement = cradleElements.axisRef.current,

            // configuration
            {

                orientation, 
                // gap, 
                cellHeight,
                cellWidth,

            } = cradleInheritedProperties,

            {

                virtualListProps,
                paddingProps,
                gapProps,

            } = cradleInternalProperties,

            { 

                crosscount, 
                rowcount:listRowcount,
                lowindex:listlowindex,
                rowshift:listrowshift,

            } = virtualListProps

        // console.log('var cradlePositionData', {...cradlePositionData})

        // cancel end of list reconciliation if scrolling re-starts
        if (scrollHandler.isScrolling && this.gridResizeObserver) {
            this.gridResizeObserver.disconnect()
            this.gridResizeObserver = undefined
            clearTimeout(this.gridResizeTimeoutID)
        }

        // ------------------------[ calculations ]------------------------

        const 
            axisReferenceIndex = axisReferencePosition + listlowindex,
            // rowcounts and row offsets for positioning
            // listRowcount taken from internal properties above
            headRowCount = Math.ceil(headGridElement.childNodes.length/crosscount),
            tailRowCount = Math.ceil(tailGridElement.childNodes.length/crosscount),

            // reference rows - cradle first/last; axis; list end
            axisReferenceRow = Math.floor(axisReferenceIndex/crosscount),

            cradleReferenceRow = axisReferenceRow - headRowCount,
            cradleLastRow = axisReferenceRow + (tailRowCount - 1),
            listLastRow = listRowcount - 1 + listrowshift,

            preCradleRowCount = cradleReferenceRow - listrowshift,
            postCradleRowCount = listLastRow - cradleLastRow,

            gaplength = 
                orientation == 'vertical'?
                    gapProps.column:
                    gapProps.row,

            // base pixel values
            baseCellLength = 
                ((orientation == 'vertical')?
                    cellHeight:
                    cellWidth
                ) + gaplength,

            measuredTailPixelLength = 
                (orientation == 'vertical')?
                    tailGridElement.offsetHeight:
                    tailGridElement.offsetWidth,

            postCradleRowsPixelLength = (postCradleRowCount * baseCellLength),

            paddingTailOffset = 
                orientation == 'vertical'?
                    paddingProps.bottom:
                    paddingProps.right,

            totalPostAxisScrollblockPixelLength = 
                postCradleRowsPixelLength + measuredTailPixelLength + paddingTailOffset,

            paddingHeadOffset = 
                orientation == 'vertical'?
                    paddingProps.top:
                    paddingProps.left,

            // base figures used for preAxis #s for compatibility with repositioning, which uses base figures
            totalPreAxisScrollblockPixelLength = 
                ((preCradleRowCount + headRowCount) * baseCellLength) + paddingHeadOffset

        // this.latestAxisReferenceIndex = axisReferenceIndex

        // ------------------------[ layout adjustments ]----------------------

        interruptHandler.signals.pauseCradleIntersectionObserver = true

        const 
            totalScrollblockPixelLength = totalPreAxisScrollblockPixelLength + totalPostAxisScrollblockPixelLength,
            trackingBlockScrollPos = totalPreAxisScrollblockPixelLength - pixelOffsetAxisFromViewport,
            newPixelOffsetAxisFromScrollblock = trackingBlockScrollPos + pixelOffsetAxisFromViewport // ie. totalPreAxisPixelLength, but semantics

        if (orientation == 'vertical') {

            axisElement.style.top = (newPixelOffsetAxisFromScrollblock - paddingProps.top) + 'px'

            scrollblockElement.style.height = (totalScrollblockPixelLength) + 'px'

        } else { // 'horizontal'

            axisElement.style.left = (newPixelOffsetAxisFromScrollblock - paddingProps.left) + 'px'

            scrollblockElement.style.width = totalScrollblockPixelLength + 'px'

        }
        // -----------------------[ scrollPos adjustment ]-------------------------

        if (orientation == 'vertical') {

            headGridElement.style.padding = 
                headRowCount?
                    `0px 0px ${gapProps.column}px 0px`:
                    `0px`

        } else {

            headGridElement.style.padding = 
                headRowCount?
                    `0px ${gapProps.row}px 0px 0px`:
                    `0px`

        }

        // temporarily adjust scrollblockElement offset; onAfterScrollForVariable transfers shift to trackingBlockScrollPos
        const 
            startingScrollPos = 
                (orientation == 'vertical')?
                    viewportElement.scrollTop:
                    viewportElement.scrollLeft,

            scrollDiff = trackingBlockScrollPos - startingScrollPos

        if (orientation == 'vertical') {

            scrollblockElement.style.top = -scrollDiff + 'px'

        } else {

            scrollblockElement.style.left = -scrollDiff + 'px'

        }

        // check for gotoIndex or resize overshoot
        if ((source == 'setcradle') && !postCradleRowCount) { 

            const tailGridElement = cradleElements.tailRef.current

            this.gridResizeObserver = new ResizeObserver(this.gridResizeObserverCallback)

            this.gridResizeObserver.observe(tailGridElement)

        }

    }

    private gridResizeTimeoutID

    private gridResizeObserverCallback = () => {

        const { stateHandler } = this.cradleParameters.handlersRef.current

        clearTimeout(this.gridResizeTimeoutID)

        this.gridResizeTimeoutID = setTimeout(() => {

            clearTimeout(this.gridResizeTimeoutID) // run once

            if (!stateHandler.isMountedRef.current) return

            const
                { cradleParameters } = this,
                // cradleHandlers = cradleParameters.handlersRef.current,
                viewportContextProperties = cradleParameters.viewportContextPropertiesRef.current,
                // { serviceHandler } = cradleHandlers,
                viewportElement = viewportContextProperties.elementRef.current,
                scrollblockElement = viewportElement.firstChild,
                cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,

                { orientation } = cradleInheritedProperties,

                scrollblockLength = 
                    orientation == 'vertical'?
                        scrollblockElement.offsetHeight:
                        scrollblockElement.offsetWidth,

                scrollblockOffset = 
                    orientation == 'vertical'?
                        scrollblockElement.offsetTop:
                        scrollblockElement.offsetLeft,

                viewportLength = 
                    orientation == 'vertical'?
                        viewportElement.offsetHeight:
                        viewportElement.offsetWidth,

                scrollTop = viewportElement.scrollTop,
                scrollLeft = viewportElement.scrollLeft,

                viewportScrollPos = 
                    orientation == 'vertical'?
                        viewportElement.scrollTop:
                        viewportElement.scrollLeft

            // check for overshoot
            if ((scrollblockLength + scrollblockOffset - viewportScrollPos) < viewportLength) { // overshoot

                if (scrollblockOffset) {
                    if (orientation == 'vertical') {
                        scrollblockElement.style.top = 0
                    } else {
                        scrollblockElement.style.left = 0
                    }
                }

                let options
                if (orientation == 'vertical') {

                    options = {
                        top:scrollblockLength - viewportLength,
                        left:scrollLeft,
                        behavior:'smooth'
                    }

                } else {

                    options = {
                        top:scrollTop,
                        left:scrollblockLength - viewportLength,
                        behavior:'smooth'
                    }

                }

                viewportElement.scroll(options)
            }

            if (this.gridResizeObserver) {
                this.gridResizeObserver.disconnect()
                this.gridResizeObserver = null
            }

        }, 500)
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

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('pare cache to cacheMax',deleteList)

                }

            }

            if (cacheAPI.pareCacheToMax(
                cradleInheritedProperties.cacheMax, modelIndexList, dListCallback)) {
            
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

    // supports moveIndex and insertRemoveIndex, 
    // updates cradle contiguous items from startChangeIndex or start of cradle
    public synchronizeCradleItemIDsToCache(updatedIndexList, isInsertRemove = 0, startChangeIndex = null) { // 0 = move

        // console.log('updatedIndexList',updatedIndexList)

        // asssemble resources
        const 
            { cacheAPI } = this.cradleParameters.handlersRef.current,
            
            { indexToItemIDMap } = cacheAPI,

            { cradleModelComponents } = this.content,

            { cradleContentProps } = this.cradleParameters.cradleInternalPropertiesRef.current

        if (cradleContentProps.size == 0) return

        const { lowindex:lowSpan, highindex:highSpan } = cradleContentProps

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

            highPtr = isInsertRemove?
                cradleModelComponents.length - 1:
                Math.min(cradleModelComponents.length - 1,lowPtr + updatedSpan - 1)

        // function to update individual cradle components to cache changes
        function processcomponentFn(component, componentptr, componentarray) {

            const 
                index = component.props.index,
                cacheItemID = indexToItemIDMap.get(index)

            // if cache has no component for cradle item, then get one
            if (cacheItemID === undefined) {

                const newItemID = cacheAPI.getNewItemID()
                componentarray[componentptr] = React.cloneElement(component, {itemID:newItemID})
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