// contenthandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

import { 
    getCellFrameComponentList, 
    calcContentShift,
    getContentListRequirements,
    getShiftInstruction,
    allocateContentList,
    deletePortals,

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

    // public itemElements = new Map()

    private cradleParameters

    private instanceIdCounterRef = {
       current:0
    }
    private instanceIdMap = new Map()

    // Two public methods - setCradleContent and updateCradleContent

    // reset cradle, including allocation between head and tail parts of the cradle
    // called only from cradle state handler

    // ==========================[ SET CONTENT ]===========================
     //initially (dosetup), after reposition (doreposition), or with finishresize, pivot, 
     // or user size param reconfigure or reload
     // setCradleContent sets the scrollblock's scroll position, as well as config and content
    public setCradleContent = (cradleState) => { 

        // ------------------------------[ 1. initialize ]---------------------------

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
        const cradleHandlers = this.cradleParameters.handlersRef.current

        const {

            cacheHandler,
            scaffoldHandler,
            serviceHandler,
            interruptHandler,

        } = cradleHandlers

        // the triggerlines and cradle wings will be moved, so disconnect them from their observers.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        interruptHandler.axisTriggerlinesIntersect.observer.disconnect()
        interruptHandler.cradleIntersect.observer.disconnect()

        const { cradlePositionData } = scaffoldHandler
        const viewportElement = viewportInterruptProperties.elementRef.current

        const requestedAxisReferenceIndex = cradlePositionData.targetAxisReferenceIndex
        let targetAxisPixelOffset = cradlePositionData.targetAxisPixelOffset

        const {
            orientation, 
            gap, 
            padding, 
            cellHeight,
            cellWidth,
            cache,
        } = cradleInheritedProperties

        const {crosscount, listsize} = cradleInternalProperties

        let workingAxisReferenceIndex = Math.min(requestedAxisReferenceIndex,listsize - 1)
        workingAxisReferenceIndex -= (workingAxisReferenceIndex % crosscount)

        // console.log('cradleState in setCradleContent; workingAxisReferenceIndex',
        //     cradleState, workingAxisReferenceIndex)

        if ((cradleState == 'doreposition') || cradleState == 'reconfigure')  {

            targetAxisPixelOffset = 
                (workingAxisReferenceIndex == 0)?
                    padding:
                    gap // default

        }

        // console.log('cradleState in setCradleContent; workingAxisReferenceIndex, targetAxisPixelOffset',
        //     cradleState, workingAxisReferenceIndex, targetAxisPixelOffset)
        
        const workingContentList = []
        const cradleContent = this.content

        // ----------------------[ 2. get content requirements ]----------------------

        const isVertical = (orientation == 'vertical')
        const rowLength = 
            isVertical?
                (cellHeight + gap):
                (cellWidth + gap)

        const {
            targetCradleReferenceIndex, 
            targetAxisReferenceIndex,
            targetAxisRowOffset,
            newCradleContentCount:cradleContentCount, 
            targetScrollblockPixelOffset:scrollblockPixelOffset,
        } = 
            getContentListRequirements({
                rowLength,
                targetAxisReferenceIndex:requestedAxisReferenceIndex,
                targetAxisPixelOffset,
                cradleInheritedProperties,
                cradleInternalProperties,
                viewportElement:viewportInterruptProperties.elementRef.current,
            })

        let scrollPosAdjustment
        if (targetAxisReferenceIndex == 0) {
            scrollPosAdjustment = 0
        // } else if (cradleState == 'doreposition') {
        //     scrollPosAdjustment = padding //+ gap
        } else {
            scrollPosAdjustment = padding
        }

        const axisPixelOffset = targetAxisPixelOffset

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
        })

        // if (deleteditems.length && (cache == 'cradle')) {
        //     deletePortals(cacheHandler, deleteditems)
        // }

        const [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:newcontentlist,
            axisReferenceIndex:targetAxisReferenceIndex,
    
        })

        cradleContent.cradleModelComponents = newcontentlist
        cradleContent.headModelComponents = headcontentlist
        cradleContent.tailModelComponents = tailcontentlist

        cradlePositionData.targetAxisReferenceIndex = targetAxisReferenceIndex
        cradlePositionData.targetAxisPixelOffset = axisPixelOffset

        if (serviceHandler.callbacks.referenceIndexCallback) {

            let cstate = cradleState

            serviceHandler.callbacks.referenceIndexCallback(

                cradlePositionData.targetAxisReferenceIndex,'setCradleContent', cstate)
        
        }

        //  ----------------------[ 4. set CSS ]-----------------------

        cradlePositionData.blockScrollPos = scrollblockPixelOffset + scrollPosAdjustment

        // console.log('setting SCROLLPOS in setCradleContent', '-'+cradleInheritedProperties.scrollerID+'-', cradlePositionData.blockScrollPos)
        viewportElement[cradlePositionData.blockScrollProperty] =
            cradlePositionData.blockScrollPos

        const cradleElements = scaffoldHandler.elements //cradleElementsRef.current
        const axisElement = cradleElements.axisRef.current
        const headElement = cradleElements.headRef.current

        if (orientation == 'vertical') {

            const top = (targetAxisRowOffset * rowLength) + padding
            axisElement.style.top = top + 'px'

            axisElement.style.left = 'auto'
            headElement.style.paddingBottom = 
                headcontentlist.length?
                    gap + 'px':
                    0

        } else { // orientation = 'horizontal'

            axisElement.style.top = 'auto'
            const left = (targetAxisRowOffset * rowLength) + padding
            axisElement.style.left = 
                left + 'px'
            headElement.style.paddingRight = 
                headcontentlist.length?
                    gap + 'px':
                    0

        }

        //  ----------------------[ 5. reset interrupts ]-----------------------

        interruptHandler.axisTriggerlinesIntersect.connectElements()
        interruptHandler.cradleIntersect.connectElements()
        interruptHandler.signals.pauseTriggerlinesObserver = false
        // interruptHandler.signals.pauseCradleIntersectionObserver = false

    }

    // ==================[ UPDATE CONTENT through scroll ]========================

    // updateCradleContent does not touch the viewport element's scroll position for the scrollblock
    // instead it reconfigures elements within the cradle
    public updateCradleContent = (
        isViewportScrollingForward, triggerlineEntries, source = 'notifications') => {

        // ----------------------[ 1. initialize ]-------------------------

        // handler support
        const {
            cacheHandler, 
            scrollHandler, 
            scaffoldHandler, 
            stateHandler, 
            interruptHandler,
            serviceHandler,
        } = this.cradleParameters.handlersRef.current

        // scroll data
        const { scrollData } = scrollHandler

        const scrollPos = scrollData.currentupdate

        // console.log('updateCradleContent with scrollPos, blockScrollPos, source', 
        //     scrollPos, scaffoldHandler.cradlePositionData.blockScrollPos, source)

        // first abandon option/3; nothing to do
        if ( scrollPos < 0) { // for Safari, FF elastic bounce at top of scroll

            return

        }

        // cradle scaffold and user cells
        const cradleElements = scaffoldHandler.elements
        const cradleContent = this.content
        const modelcontentlist = cradleContent.cradleModelComponents
        const oldCradleReferenceIndex = (modelcontentlist[0]?.props.index || 0)

        // --------------------[ 2. get shift instruction ]-----------------------

        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
        const { 
            orientation, 
            cache,
        } = cradleInheritedProperties

        // -1 is move a row up to the head, +1 is move a row down to the tail, 0 is no shift
        const triggerlineRecord = cradleInternalProperties.triggerlineRecordsRef.current
        const shiftinstruction = getShiftInstruction({
            scrollerID: cradleInheritedProperties.scrollerID,
            isViewportScrollingForward,
            orientation,
            triggerlineEntries,
            triggerlineRecord,
            triggerlineSpan: scaffoldHandler.triggerlineSpan,
        })

        // console.log('scrollerID, shiftinstruction',
        //     '-'+cradleInheritedProperties.scrollerID+'-', shiftinstruction)

        // second abandon option/3; nothing to do
        if (shiftinstruction == 0) {

            // console.log('triggerlineRecord',triggerlineRecord)
            return

        }
        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        // cradle properties
        // const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        // const viewportElement = this.cradleParameters.viewportInterruptPropertiesRef.current.elementRef.current

        const {

            newCradleReferenceIndex,
            cradleReferenceItemShift:cradleItemShift, 
            newAxisReferenceIndex:axisReferenceIndex, 
            axisReferenceItemShift:axisItemShift, 
            newAxisPixelOffset:axisPixelOffset, 
            newCradleContentCount:cradleContentCount,
            listStartChangeCount,
            listEndChangeCount,

        } = calcContentShift({

            shiftinstruction,
            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContent,
            cradleElements,
            scrollPos,

        })

        // third abandon option/3; nothing to do
        if ((axisItemShift == 0 && cradleItemShift == 0)) { // TODO: is this possible?

            return

        }

        // the triggerlines will be moved, so disconnect them from their observer.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        interruptHandler.axisTriggerlinesIntersect.observer.disconnect()
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
            })

        } else {

            updatedContentList = modelcontentlist

        }

        if (deletedContentItems.length && (cache == 'cradle')) {

            deletePortals(cacheHandler, deletedContentItems, 
                serviceHandler.callbacks.cacheDeleteListCallback)

        }

        // ----------------------------------[ 5. allocate cradle content ]--------------------------

        const [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:updatedContentList,
                axisReferenceIndex,
            }
        )

        cradleContent.cradleModelComponents = updatedContentList
        cradleContent.headModelComponents = headcontent
        cradleContent.tailModelComponents = tailcontent


        if (serviceHandler.callbacks.referenceIndexCallback) {

            let cstate = stateHandler.cradleStateRef.current

            serviceHandler.callbacks.referenceIndexCallback(

                scaffoldHandler.cradlePositionData.targetAxisReferenceIndex,'updateCradleContent', cstate)
        
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

        const { cradlePositionData } = scaffoldHandler

        cradlePositionData.targetAxisReferenceIndex = axisReferenceIndex
        cradlePositionData.targetAxisPixelOffset = axisPixelOffset

        stateHandler.setCradleState('renderupdatedcontent')

    }

    public guardAgainstRunawayCaching = () => { 
        const { cacheMax } = this.cradleParameters.cradleInheritedPropertiesRef.current
        const { contentHandler, cacheHandler } = this.cradleParameters.handlersRef.current
        const modelComponentList = contentHandler.content.cradleModelComponents
 
        if (cacheHandler.guardAgainstRunawayCaching(cacheMax, modelComponentList.length)) {

            this.pareCacheToMax()

        }
    }
    public pareCacheToMax = () => {

        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current

        if (cradleInheritedProperties.cache == 'keepload') {

            const cradleHandlers = this.cradleParameters.handlersRef.current
            const { cacheHandler, serviceHandler } = cradleHandlers

            const modelIndexList = this.getModelIndexList()

            const paring = cacheHandler.pareCacheToMax(
                cradleInheritedProperties.cacheMax, modelIndexList, 
                serviceHandler.callbacks.cacheDeleteListCallback)
            if (paring) cacheHandler.renderPortalList()
                
        }

    }

    // ==========================[ SERVICE SUPPORT ]=======================

    public clearCache = () => {

        const cradleContent = this.content
        const { cacheHandler } = this.cradleParameters.handlersRef.current

        cradleContent.headModelComponents = []
        cradleContent.tailModelComponents = []

        // register new array id for Object.is to trigger react re-processing
        cradleContent.headDisplayComponents = []
        cradleContent.tailDisplayComponents = []

        cacheHandler.clearCache()

    }

    public getModelIndexList() {

        const { cradleModelComponents } = this.content
        if (!cradleModelComponents) {
            return [] 
        } else {
            return cradleModelComponents.map((item)=>item.props.index)
        }

    }

    public updateCellFrames(modifiedCellFrameMap) {

        // console.log('contentHandler got modifiedCellFrameMap',modifiedCellFrameMap)

        if (!modifiedCellFrameMap.size) return

        const { stateHandler } = this.cradleParameters.handlersRef.current

        const { 
        
            cradleModelComponents, 
            headModelComponents,
            tailModelComponents,
            headDisplayComponents,
            tailDisplayComponents,
        
        } = this.content

        function processComponent (component, i, array ) {
            const instanceID = component.props.instanceID
            if (modifiedCellFrameMap.has(instanceID)) {
                array[i] = modifiedCellFrameMap.get(instanceID)
            }
        }

        cradleModelComponents.forEach(processComponent)
        headModelComponents.forEach(processComponent)
        tailModelComponents.forEach(processComponent)

        this.content.headDisplayComponents = headModelComponents
        this.content.tailDisplayComponents = tailModelComponents

        stateHandler.setCradleState('applycellframechanges')

    }

    public changeCradleCacheItemIDs(indexlist) {

        if (indexlist.length == 0) return

        const { cacheHandler } = this.cradleParameters.handlersRef.current
        const { indexToItemIDMap } = cacheHandler.cacheProps

        const {
            cradleModelComponents,
            headModelComponents,
            tailModelComponents,
        } = this.content

        function processcomponent(component, i, array) {

            const index = component.props.index
            const ptr = indexlist.indexOf(index)
            if (ptr != -1) {
                // const index = indexlist[ptr]
                const cacheItemID = indexToItemIDMap.get(index)
                array[i] = React.cloneElement(component, {cacheItemID})
            }

        }

        cradleModelComponents.forEach(processcomponent)
        headModelComponents.forEach(processcomponent)
        tailModelComponents.forEach(processcomponent)

        this.content.headDisplayComponents = headModelComponents
        this.content.tailDisplayComponents = tailModelComponents

    }

    public createNewCacheItemIDs(indexlist) {


        const { cacheHandler } = this.cradleParameters.handlersRef.current
        const {
            cradleModelComponents,
            headModelComponents,
            tailModelComponents,
        } = this.content

        function processcomponent(component, i, array) {

            const index = component.props.index
            const ptr = indexlist.indexOf(index)
            if (ptr != -1) {
                const newCacheItemID = cacheHandler.getNewCacheItemID()
                array[i] = React.cloneElement(component, {newCacheItemID})
            }

        }

        cradleModelComponents.forEach(processcomponent)
        headModelComponents.forEach(processcomponent)
        tailModelComponents.forEach(processcomponent)

        this.content.headDisplayComponents = headModelComponents
        this.content.tailDisplayComponents = tailModelComponents

    }

}