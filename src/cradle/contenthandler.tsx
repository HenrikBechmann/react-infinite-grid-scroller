// contenthandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module supports the setup and rollover of content in the Cradle. There are two key functions
    in this module: setCradleContent, and updateCradleContent. There are also a few functions which 
    support synchronization of Cradle content with cache content (see internal and external services
    below).

    setCradleContent is called directly from Cradle (in the state manager), and instantiates new Cradle
    content in response to the scroller setup, or changes to its configuration. setCradleContent
    creates a list of Cradle content CellFrames, and allocates those to the two Cradle grids. This 
    process occurs in response to many state changes, such as finishreposition, pivot, a host scrollto
    request, and more.

    updateCradleContent rolls over the Cradle content in response to user scrolling. When scrolling 
    tailward, content is removed from the Cradle head and added to the Cradle tail. When scrolling 
    headward, the reverse occurs.

    The Cradle (through the contentfunctions module) delegates fetching content items to the CellFrame.

    This module is supported primarily by the contentfunctions module.
*/

import React from 'react'

import { 
    getContentListRequirements,
    getShiftInstruction,
    calcContentShift,
    allocateContentList,
    deletePortals,
    getCellFrameComponentList, 
    getGridRowLengths,
    getGridRowSpans,

} from './contentfunctions'

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
    // Two main public methods - setCradleContent and updateCradleContent

    // ==========================[ SET CONTENT ]===========================

    // reset the cradle with new content, including allocation between head and tail parts of the cradle
    // - called only from the Cradle state handler

    public setCradleContent = ( cradleState ) => { // cradleState influences some behaviour

        // ------------------------------[ 1. initialize ]---------------------------

        // console.log('setCradleContent: cradleState',cradleState)

        const { cradleParameters } = this
        const ViewportContextProperties = cradleParameters.ViewportContextPropertiesRef.current
        const cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current
        const cradleHandlers = cradleParameters.handlersRef.current

        const {

            cacheHandler,
            layoutHandler,
            serviceHandler,
            interruptHandler,
            scrollHandler,

        } = cradleHandlers

        // the triggerlines and cradle grids will be moved, so disconnect them from their observers.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        // console.log('disconnecting triggers in setCradleContent')
        interruptHandler.triggerlinesIntersect.observer.disconnect()
        interruptHandler.cradleIntersect.observer.disconnect()

        const { cradlePositionData } = layoutHandler
        const viewportElement = ViewportContextProperties.elementRef.current

        const requestedAxisReferenceIndex = cradlePositionData.targetAxisReferenceIndex
        let { targetAxisViewportPixelOffset } = cradlePositionData

        const {
            orientation, 
            gap, 
            padding, 
            cellHeight,
            cellWidth,
            cache,
            scrollerID,
            styles,
            layout,
        } = cradleInheritedProperties

        const {crosscount, listsize, listRowcount} = cradleInternalProperties

        let workingRequestAxisReferenceIndex = Math.min(requestedAxisReferenceIndex,listsize - 1)
        workingRequestAxisReferenceIndex -= (workingRequestAxisReferenceIndex % crosscount)

        // console.log('workingRequestAxisReferenceIndex', workingRequestAxisReferenceIndex)

        // reposition at row boundary
        if ([
            'firstrender', 
            'firstrenderfromcache',
            'finishreposition', 
            'reconfigure', 
            'scrollto', 
        ].includes(cradleState)) {

            targetAxisViewportPixelOffset = 
                (workingRequestAxisReferenceIndex == 0)?
                    padding:
                    gap // default

        }

        const workingContentList = []
        const cradleContent = this.content

        // ----------------------[ 2. get content requirements ]----------------------

        const baseRowLength = 
            (orientation == 'vertical')?
                (cellHeight + gap):
                (cellWidth + gap)

        // console.log('setCradleContent: workingRequestAxisReferenceIndex',workingRequestAxisReferenceIndex)

        // note that targetAxisReferenceIndex replaces requestedAxisReferenceIndex here
        const {

            // by index
            targetCradleReferenceIndex, 
            targetAxisReferenceIndex,

            // counts
            newCradleContentCount:cradleContentCount, 

            // target scrollPos by pixels
            targetScrollblockViewportPixelOffset:scrollblockViewportPixelOffset,

        } = getContentListRequirements({

                // pixel
                baseRowLength,
                targetAxisViewportPixelOffset,

                // index
                targetAxisReferenceIndex:workingRequestAxisReferenceIndex,

                // resources
                cradleInheritedProperties,
                cradleInternalProperties,

            })

//         console.log(`setCradleContent: 
// targetCradleReferenceIndex, 
// targetAxisReferenceIndex,
// cradleContentCount, 
// scrollblockViewportPixelOffset`,
//             targetCradleReferenceIndex, 
//             targetAxisReferenceIndex,
//             cradleContentCount, 
//             scrollblockViewportPixelOffset
//         )

        // reset scrollblock Offset and length
        const scrollblockElement = viewportElement.firstChild

        const baselength = (listRowcount * baseRowLength) - gap // final cell has no trailing gap
            + (padding * 2) // leading and trailing padding

        if (orientation == 'vertical') {
            scrollblockElement.style.top = null
            scrollblockElement.style.height = baselength + 'px'
        } else {
            scrollblockElement.style.left = null
            scrollblockElement.style.width = baselength + 'px'
        }

        // console.log('setCradleContent: scrollblockOffset', scrollblockOffset)

        const axisViewportPixelOffset = targetAxisViewportPixelOffset // + scrollblockOffset// semantics

        // ----------------------[ 3. get and config content ]----------------------
        
        // returns content constrained by cradleRowcount
        const [newcontentlist,deleteditems] = getCellFrameComponentList({
            
            cacheHandler,            
            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContentCount,
            cradleReferenceIndex:targetCradleReferenceIndex,
            listStartChangeCount:0,
            listEndChangeCount:cradleContentCount,
            workingContentList,
            instanceIdCounterRef:this.instanceIdCounterRef,
            styles,
        })

        const [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:newcontentlist,
            axisReferenceIndex:targetAxisReferenceIndex,
            layoutHandler,
    
        })

        // console.log('setCradleContent: allocateContentList - headcontentlist, tailcontentlist', headcontentlist, tailcontentlist)

        cradleContent.cradleModelComponents = newcontentlist
        cradleContent.headModelComponents = headcontentlist
        cradleContent.tailModelComponents = tailcontentlist

        cradlePositionData.targetAxisReferenceIndex = targetAxisReferenceIndex
        // console.log('setCradleContent: setting targetAxisViewportPixelOffset', axisViewportPixelOffset)
        cradlePositionData.targetAxisViewportPixelOffset = axisViewportPixelOffset

        if (serviceHandler.callbacks.referenceIndexCallback) {

            let cstate = cradleState

            serviceHandler.callbacks.referenceIndexCallback(

                cradlePositionData.targetAxisReferenceIndex,'setCradleContent', cstate)
        
        }

        //  ----------------------[ 4. set CSS ]-----------------------

        // const adjustedScrollblockViewportPixelOffset = scrollblockViewportPixelOffset + scrollblockOffset

        cradlePositionData.blockScrollPos = scrollblockViewportPixelOffset // - scrollblockOffset
        // avoid bogus call to updateCradleContent
        scrollHandler.resetScrollData(scrollblockViewportPixelOffset) // - scrollblockOffset) 

        viewportElement[cradlePositionData.blockScrollProperty] =
            cradlePositionData.blockScrollPos 

        const cradleElements = layoutHandler.elements
        const axisElement = cradleElements.axisRef.current
        const headElement = cradleElements.headRef.current

        const axisScrollblockPixelOffset = 
            scrollblockViewportPixelOffset + axisViewportPixelOffset

        // console.log('setCradleContent: AxisScrollblockPixelOffset, scrollblockViewportPixelOffset, \
        //     axisViewportPixelOffset',AxisScrollblockPixelOffset, scrollblockViewportPixelOffset,
        //     axisViewportPixelOffset)

        if (orientation == 'vertical') {

            const top = axisScrollblockPixelOffset 

            axisElement.style.top = top + 'px'
            axisElement.style.left = 'auto'

            headElement.style.paddingBottom = 
                headcontentlist.length?
                    gap + 'px':
                    0

        } else { // orientation = 'horizontal'

            const left = axisScrollblockPixelOffset

            axisElement.style.top = 'auto'
            axisElement.style.left = left + 'px'

            headElement.style.paddingRight = 
                headcontentlist.length?
                    gap + 'px':
                    0

        }

    }

    // ==================[ UPDATE CONTENT through scroll ]========================

    // updateCradleContent does not touch the viewport element's scroll position for the scrollblock
    // instead it reconfigures elements within the cradle. It is called solely from
    // axisTriggerlinesObserverCallback of interruptHandler

    public updateCradleContent = (
        // blockScrollingDirection, 
        triggerlineEntries, 
        source = 'notifications'
    ) => {

        // console.log('triggerlineEntries', triggerlineEntries)

        // ----------------------[ 1. initialize ]-------------------------

        // handler support
        const {
            cacheHandler, 
            scrollHandler, 
            layoutHandler, 
            stateHandler, 
            interruptHandler,
            serviceHandler,
        } = this.cradleParameters.handlersRef.current

        // scroll data
        const { scrollData } = scrollHandler

        const scrollPos = scrollData.currentupdate

        // first abandon option/3; nothing to do
        if ( scrollPos < 0) { // for Safari, FF elastic bounce at top of scroll

            return

        }

        // cradle scaffold and user cells
        const cradleElements = layoutHandler.elements

        const cradleContent = this.content,
            modelcontentlist = cradleContent.cradleModelComponents || [],
            oldAxisReferenceIndex = (cradleContent.tailModelComponents[0]?.props.index || 0)

        const oldCradleReferenceIndex = (modelcontentlist[0]?.props.index || 0)

        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
        
        const { 
            orientation, 
            cache,
            styles,
        } = cradleInheritedProperties

        const { 
            viewportVisibleRowcount,
            crosscount,
            listsize,
        } = cradleInternalProperties

        // --------------------[ 2. get shift instruction ]-----------------------

        // -1 is move a row down to the taIL, +1 is move a row up to the head, 0 is no shift
        const [shiftinstruction, triggerData] = getShiftInstruction({
            scrollerID: cradleInheritedProperties.scrollerID,
            orientation,
            triggerlineEntries,
            triggerlineSpan: layoutHandler.triggerlineSpan,

            isFirstRowTriggerConfig:layoutHandler.triggercellIsInTail,

        })

        // second abandon option/3; nothing to do
        if (shiftinstruction == 'none') { // 0) {

            return

        }

        // console.log('updateCradleContent: blockScrollingDirection, shiftinstruction',blockScrollingDirection, shiftinstruction)

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        // cradle properties
        // const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const viewportElement = this.cradleParameters.ViewportContextPropertiesRef.current.elementRef.current

        const {

            // by index
            newCradleReferenceIndex,
            cradleReferenceItemShift:cradleItemShift, 
            newAxisReferenceIndex:axisReferenceIndex, 
            axisReferenceItemShift:axisItemShift, 

            // counts
            newCradleContentCount:cradleContentCount,
            listStartChangeCount,
            listEndChangeCount,

            // pixels
            newAxisPixelOffset:axisPixelOffset, 

        } = calcContentShift({

            shiftinstruction,
            triggerData,
            scrollPos,
            scrollblockElement:viewportElement.firstChild,

            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContent,
            cradleElements,

        })

        // third abandon option/3; nothing to do
        if ((axisItemShift == 0 && cradleItemShift == 0)) { // can happen first row

            return

        }

        // the triggerlines will be moved, so disconnect them from their observer.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        // console.log('disconnecting triggers in updateCradleContent')
        interruptHandler.triggerlinesIntersect.observer.disconnect()
        interruptHandler.signals.pauseTriggerlinesObserver = true

        // ----------------------------------[ 4. reconfigure cradle content ]--------------------------

        // collect modified content
        let updatedContentList, deletedContentItems = []

        if (listStartChangeCount || listEndChangeCount) { // if either is non-0 then modify content

            [updatedContentList,deletedContentItems] = getCellFrameComponentList({
                cacheHandler,
                cradleInheritedProperties,
                cradleInternalProperties,
                cradleContentCount,
                workingContentList:modelcontentlist,
                listStartChangeCount,
                listEndChangeCount,
                cradleReferenceIndex:oldCradleReferenceIndex,
                instanceIdCounterRef:this.instanceIdCounterRef,
                styles,
            })

        } else {

            updatedContentList = modelcontentlist

        }

        if (deletedContentItems.length && (cache == 'cradle')) {

            const { deleteListCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('pare cache to cradle',deleteList)

                }

            }

            deletePortals(cacheHandler, deletedContentItems, dListCallback)

        }

        // ----------------------------------[ 5. allocate cradle content ]--------------------------

        const [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:updatedContentList,
                axisReferenceIndex,
                layoutHandler,
            }
        )

        cradleContent.cradleModelComponents = updatedContentList
        cradleContent.headModelComponents = headcontent
        cradleContent.tailModelComponents = tailcontent


        if (serviceHandler.callbacks.referenceIndexCallback) {

            let cstate = stateHandler.cradleStateRef.current

            serviceHandler.callbacks.referenceIndexCallback(

                axisReferenceIndex,'updateCradleContent', cstate)
        
        }

        // -------------------------------[ 6. set css changes ]-------------------------

        const axisElement = cradleElements.axisRef.current
        const headElement = cradleElements.headRef.current

        if (cradleInheritedProperties.orientation == 'vertical') {

            const topPos = scrollPos + axisPixelOffset

            axisElement.style.top = topPos + 'px'
            axisElement.style.left = 'auto'
            
            headElement.style.paddingBottom = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        } else { // 'horizontal'

            const leftPos = scrollPos + axisPixelOffset

            axisElement.style.top = 'auto'
            axisElement.style.left = leftPos + 'px'

            headElement.style.paddingRight = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        }

        const { cradlePositionData } = layoutHandler

        cradlePositionData.targetAxisReferenceIndex = axisReferenceIndex
        cradlePositionData.targetAxisViewportPixelOffset = axisPixelOffset

        stateHandler.setCradleState('renderupdatedcontent')

    }

    // ===================[ RECONFIGURE THE SCROLLBLOCK FOR VARIABLE CONTENT ]=======================

    // all DOM elements should have been rendered at this point
    // sets CSS: scrollblockElement top and height (or left and width), and axisElement top (or left)
    // this to get closer to natural proportions to minimize janky scroll thumb
    public adjustScrollblockForVariability = (source) => {

        // TODO TEMP
        // if (source == 'afterscroll') {
        //     return
        // }

        // ----------------------[ setup base values and references ]------------------------

        console.log('-> =============[START ADJUSTMENT (source)]============', source)

        const { cradleParameters } = this,
            cradleHandlers = cradleParameters.handlersRef.current,
            ViewportContextProperties = cradleParameters.ViewportContextPropertiesRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current

        const { layoutHandler, scrollHandler } = cradleHandlers,
            { 

                elements: cradleElements, 
                cradlePositionData 

            } = layoutHandler

        const viewportElement = ViewportContextProperties.elementRef.current,
            scrollblockElement = viewportElement.firstChild,
            headGridElement = cradleElements.headRef.current,
            tailGridElement = cradleElements.tailRef.current,
            axisElement = cradleElements.axisRef.current

        // console.log('cradlePositionData',{...cradlePositionData})

        const { 

            targetAxisReferenceIndex: axisReferenceIndex,
            targetAxisViewportPixelOffset: axisViewportOffset,

        } = cradlePositionData

        let { blockScrollPos } = cradlePositionData

        const {

            orientation, 
            gap, 
            padding, 
            cellHeight,
            cellWidth,

        } = cradleInheritedProperties

        const { 

            crosscount, 
            listRowcount 

        } = cradleInternalProperties

        let scrollblockOffset = // from previous adjustments
            (orientation == 'vertical')?
                scrollblockElement.offsetTop:
                scrollblockElement.offsetLeft

        // ------------------------[ precursor calculations ]------------------------

        // rowcounts and row offsets for positioning
        // listRowcount taken from internal properties above
        const headRowCount = Math.ceil(headGridElement.childNodes.length/crosscount)
        const tailRowCount = Math.ceil(tailGridElement.childNodes.length/crosscount)
        const axisReferenceRow = Math.ceil(axisReferenceIndex/crosscount)
        const cradleReferenceRow = axisReferenceRow - headRowCount
        const cradleLastReferenceRow = axisReferenceRow + (tailRowCount - 1)
        const listLastReferenceRow = listRowcount - 1
        const preCradleRowCount = cradleReferenceRow
        const postCradleRowCount = listLastReferenceRow - cradleLastReferenceRow

        // console.log('1. axisReferenceRow', axisReferenceRow)

        // base pixel values
        const baseCellLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth
            ) + gap

        const baseHeadLength = (headRowCount * baseCellLength) + padding
        const baseTailLength = (tailRowCount * baseCellLength) + padding - gap

        const baseblocklength = (listRowcount * baseCellLength) - gap // no gap below last row
            + (padding * 2) // leading and trailing padding

        const baseAxisScrollblockOffset = (axisReferenceRow * baseCellLength) + padding

        // measured pixel cradle grid values
        let measuredHeadLength, measuredTailLength
        if (orientation == 'vertical') {

            measuredHeadLength = headGridElement.offsetHeight
            // used to derive scrollblocklength below
            measuredTailLength = tailGridElement.offsetHeight

        } else {

            measuredHeadLength = headGridElement.offsetWidth
            // used to derive scrollblocklength below
            measuredTailLength = tailGridElement.offsetWidth

        }

        // pixel measures
        const headDeltaPixels = baseHeadLength - measuredHeadLength
        const tailDeltaPixels = baseTailLength - measuredTailLength

        const preCradlePixelLength = preCradleRowCount * baseCellLength
        const postCradlePixelLength = postCradleRowCount * baseCellLength

        const computedPreAxisPixelLength = preCradlePixelLength + measuredHeadLength
        // console.log('2. computedPreAxisPixelLength = preCradlePixelLength + measuredHeadLength',
        //     computedPreAxisPixelLength, preCradlePixelLength, measuredHeadLength)
        const computedPostAxisPixelLength = postCradlePixelLength + measuredTailLength

        const computedScrollblockLength = computedPreAxisPixelLength + computedPostAxisPixelLength

        const basePreAxisPixelLength = ((preCradleRowCount + headRowCount) * baseCellLength) + padding
        const basePostAxisPixelLength = ((postCradleRowCount + tailRowCount) * baseCellLength - gap + padding)

        const baseScrollblockLength = basePreAxisPixelLength + basePostAxisPixelLength

        const deltaPreAxisPixelLength = computedPreAxisPixelLength - basePreAxisPixelLength
        console.log('3. deltaPreAxisPixelLength = computedPreAxisPixelLength - basePreAxisPixelLength',
            deltaPreAxisPixelLength, computedPreAxisPixelLength, basePreAxisPixelLength)
        const deltaPostAxisPixelLength = computedPostAxisPixelLength - basePostAxisPixelLength

        // ------------------------[ change calculations ]----------------------

        let newScrollblockOffset = (deltaPreAxisPixelLength - scrollblockOffset)

        // adjust newScrollblockOffset to be absorbed by blockScrollPos if possible
        const scrollblockOffsetDelta = blockScrollPos + newScrollblockOffset
        newScrollblockOffset = Math.min(0,scrollblockOffsetDelta)

        let newAxisScrollblockOffset = 
            // blockScrollPos + axisViewportOffset + headDeltaPixels + scrollblockOffset
            blockScrollPos + axisViewportOffset - newScrollblockOffset // - deltaPreAxisPixelLength - scrollblockOffset

        console.log('4. -> before: blockScrollPos, scrollblockOffset, axisViewportOffset, newScrollblockOffset, axisScrollblockOffset\n',
            blockScrollPos, scrollblockOffset, axisViewportOffset, newScrollblockOffset, newAxisScrollblockOffset)

        const axisScrollblockOffsetDelta = baseAxisScrollblockOffset - newAxisScrollblockOffset

        // const scrollblockLength = baseblocklength - headDeltaPixels - tailDeltaPixels - axisScrollblockOffsetDelta
        let newScrollblockLength = computedScrollblockLength - axisScrollblockOffsetDelta

        // -----------------------[ application ]-------------------------

        if (source == 'afterscroll') {

            console.log('AFTERSCROLL preCradlePixelLength, measuredHeadLength, \nnewScrollblockOffset, blockScrollPos, newAxisScrollblockOffset\n', 
                preCradlePixelLength, measuredHeadLength,'\n', newScrollblockOffset, blockScrollPos, newAxisScrollblockOffset)

            if (preCradlePixelLength == 0) { // measurements are known

                let measuredDelta = newAxisScrollblockOffset - measuredHeadLength
                console.log('measuredDelta, new blockScrollPos. newAxisScrollblockOffset\n', 
                    measuredDelta,blockScrollPos - measuredDelta, newAxisScrollblockOffset - measuredDelta)
                if (measuredDelta > 0) {
                    blockScrollPos -= measuredDelta
                    if (blockScrollPos < 0) {
                        console.log('adjusting measureDelta by', blockScrollPos)
                        measuredDelta -= blockScrollPos
                        blockScrollPos = 0
                    }
                    cradlePositionData.blockScrollPos = blockScrollPos
                    viewportElement[cradlePositionData.blockScrollProperty] = blockScrollPos
                    scrollHandler.resetScrollData(blockScrollPos)
                    newAxisScrollblockOffset -= measuredDelta
                }
                console.log('applied measuredDelta, blockScrollPos, newAxisScrollblockOffset\n',
                    measuredDelta, blockScrollPos, newAxisScrollblockOffset)
            }

        }

        console.log('Final: newScrollblockOffset, blockScrollPos, newAxisScrollblockOffset\n',// \n newScrollblockLength\n', 
            newScrollblockOffset, cradlePositionData.blockScrollPos, newAxisScrollblockOffset )//,'\n', 
                // newScrollblockLength)

        // change scrollblockElement top and height, or left and width,
        //    and axisElement top or left

        if (orientation == 'vertical') {

            // the scrollblock top is moved to compensate for the headDelta
            scrollblockElement.style.top = newScrollblockOffset + 'px'
            // the axis is moved in the opposite direction to maintain viewport position
            axisElement.style.top = newAxisScrollblockOffset + 'px'
            // the height is adjusted by both deltas, as it controls the scroll length
            scrollblockElement.style.height = newScrollblockLength + 'px'

        } else {

            scrollblockElement.style.left = newScrollblockOffset + 'px'
            axisElement.style.left = newAxisScrollblockOffset + 'px'
            scrollblockElement.style.width = newScrollblockLength + 'px'

        }

    }

    // ========================= [ INTERNAL CONTENT MANAGEMENT SERVICES ]=====================

    public guardAgainstRunawayCaching = () => { 

        const { cacheMax, MAX_CACHE_OVER_RUN } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        const modelComponentList = this.content.cradleModelComponents
 
        if (cacheHandler.guardAgainstRunawayCaching(cacheMax, modelComponentList.length, MAX_CACHE_OVER_RUN )) {

            this.pareCacheToMax()

        }
    }
    
    public pareCacheToMax = () => {

        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current

        const { cache, scrollerID } = cradleInheritedProperties
        
        if (cache == 'keepload') {

            const cradleHandlers = this.cradleParameters.handlersRef.current
            const { cacheHandler, serviceHandler } = cradleHandlers

            const modelIndexList = this.getModelIndexList()

            const { deleteListCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('pare cache to cacheMax',deleteList)

                }

            }

            if (cacheHandler.pareCacheToMax(
                cradleInheritedProperties.cacheMax, modelIndexList, dListCallback, scrollerID)) {
            
                cacheHandler.cacheProps.modified = true
                cacheHandler.renderPortalList()
                
            }
                            
        }

    }

    // ==========================[ EXTERNAL SERVICE SUPPORT ]=======================

    // supports clearCache
    public clearCradle = () => {

        const cradleContent = this.content
        const { cacheHandler } = this.cradleParameters.handlersRef.current

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

    // called from service handler's remapIndexes, as last step
    public reconcileCellFrames(modifiedIndexesList) {

        if (!modifiedIndexesList.length) return

        const { cradleModelComponents } = this.content

        const { cacheHandler } = this.cradleParameters.handlersRef.current

        const { indexToItemIDMap } = cacheHandler.cacheProps

        function processComponent (component, i, array ) {
            const { index, itemID } = component.props
            if (modifiedIndexesList.includes(index)) {

                const newItemID = 
                    indexToItemIDMap.has(index)?
                        indexToItemIDMap.get(index):
                        cacheHandler.getNewItemID()

                if (newItemID != itemID) { // defensive; shouldn't happen

                    array[i] = React.cloneElement(component, {itemID:newItemID})

                }
            }
        }

        cradleModelComponents.forEach(processComponent)

        this.content.headModelComponents = cradleModelComponents.slice(0,this.content.headModelComponents.length)
        this.content.tailModelComponents = cradleModelComponents.slice(this.content.headModelComponents.length)

    }

    // supports moveIndex and insertRemoveIndex
    public changeCradleItemIDs(changeList) {

        if (changeList.length == 0) return

        const { cacheHandler } = this.cradleParameters.handlersRef.current
        const { indexToItemIDMap, metadataMap } = cacheHandler.cacheProps

        const { cradleModelComponents } = this.content

        function processcomponent(component, i, array) {

            const index = component.props.index

            const ptr = changeList.indexOf(index)

            if (ptr != -1) {

                const itemID = indexToItemIDMap.get(index)

                array[i] = React.cloneElement(component, {itemID})
            }

        }

        cradleModelComponents.forEach(processcomponent)

        this.content.headModelComponents = cradleModelComponents.slice(0,this.content.headModelComponents.length)
        this.content.tailModelComponents = cradleModelComponents.slice(this.content.headModelComponents.length)

    }

    // supports insertRemoveIndex
    public createNewItemIDs(newList) {


        const { cacheHandler } = this.cradleParameters.handlersRef.current
        const { cradleModelComponents } = this.content

        function processcomponent(component, i, array) {

            const index = component.props.index
            const ptr = newList.indexOf(index)

            if (ptr != -1) {

                const newItemID = cacheHandler.getNewItemID()
                array[i] = React.cloneElement(component, {itemID:newItemID})

            }

        }

        cradleModelComponents.forEach(processcomponent)

        this.content.headModelComponents = cradleModelComponents.slice(0,this.content.headModelComponents.length)
        this.content.tailModelComponents = cradleModelComponents.slice(this.content.headModelComponents.length)

    }

}