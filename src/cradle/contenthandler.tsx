// contenthandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import { 
    getUICellShellList, 
    calcContentShift,
    getContentListRequirements,
    getShiftInstruction,
    allocateContentList,
    deletePortals,

} from './contentfunctions'

export default class ContentHandler {

   constructor(cradleParameters) {

      this.cradleParameters = cradleParameters

      this.internalCallbacksRef = cradleParameters.internalCallbacksRef

   }

   public content = {

      cradleModel: null,
      headModelComponents: null,
      tailModelComponents: null,
      headViewComponents: [],
      tailViewComponents: [],

    }

    public itemElements = new Map()

    private cradleParameters

    private instanceIdCounterRef = {
       current:0
    }
    private instanceIdMap = new Map()

    private internalCallbacksRef

    // Two public methods - setCradleContent and updateCradleContent

    // reset cradle, including allocation between head and tail parts of the cradle
    // called only from cradle preparerender event

    // ==========================[ SET CONTENT initially, or after reposition ]===========================

    // setCradleContent does not touch the viewport element's scroll position for the scrollblock
    public setCradleContent = (cradleState) => { 

        // ------------------------------[ 1. initialize ]---------------------------

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
        const cradleHandlers = this.cradleParameters.handlersRef.current

        const {

            portals:portalHandler,
            scaffold:scaffoldHandler,
            service:serviceHandler,
            interrupts:interruptHandler,

        } = cradleHandlers

        // the triggerlines and cradle wings will be moved, so disconnect them from their observers.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        interruptHandler.axisTriggerlinesIntersect.observer.disconnect()
        interruptHandler.cradleIntersect.observer.disconnect()

        const { cradlePositionData } = scaffoldHandler
        const viewportElement = viewportInterruptProperties.elementref.current

        const requestedAxisReferenceIndex = cradlePositionData.targetAxisReferenceIndex
        let targetAxisPixelOffset = cradlePositionData.targetAxisPixelOffset

        const {
            orientation, 
            gap, 
            padding, 
            cellHeight,
            cellWidth
        } = cradleInheritedProperties

        if (cradleState == 'doreposition')  {

            targetAxisPixelOffset = gap // default

        }

        const localContentList = []
        const cradleContent = this.content

        // ----------------------[ 2. get content requirements ]----------------------

        const isVertical = (orientation == 'vertical')
        const rowLength = 
            isVertical?
                (cellHeight + gap):
                (cellWidth + gap)

        const {
            targetCradleReferenceIndex, 
            // targetCradleRowOffset,
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
                viewportElement:viewportInterruptProperties.elementref.current,
            })

        let scrollPosAdjustment
        if (targetAxisReferenceIndex == 0) {
            scrollPosAdjustment = 0
        } else if (cradleState == 'doreposition') {
            scrollPosAdjustment = padding //+ gap
        } else {
            scrollPosAdjustment = padding
        }

        const axisPixelOffset = targetAxisPixelOffset
        // returns content constrained by cradleRowcount
        const [childlist,deleteditems] = getUICellShellList({

            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContentCount,
            cradleReferenceIndex:targetCradleReferenceIndex,
            listStartChangeCount:0,
            listEndChangeCount:cradleContentCount,
            localContentList,
            callbacks:this.internalCallbacksRef.current,
            instanceIdCounterRef:this.instanceIdCounterRef,
        })

        if (deleteditems.length) deletePortals(portalHandler, deleteditems)

        const [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:childlist,
            axisReferenceIndex:targetAxisReferenceIndex,
    
        })

        cradleContent.cradleModel = childlist
        cradleContent.headModelComponents = headcontentlist
        cradleContent.tailModelComponents = tailcontentlist

        cradlePositionData.targetAxisReferenceIndex = targetAxisReferenceIndex
        cradlePositionData.targetAxisPixelOffset = axisPixelOffset

        if (serviceHandler.serviceCalls.referenceIndexCallbackRef.current) {

            let cstate = cradleState

            serviceHandler.serviceCalls.referenceIndexCallbackRef.current(

                cradlePositionData.targetAxisReferenceIndex,'setCradleContent', cstate)
        
        }

        cradlePositionData.blockScrollPos = scrollblockPixelOffset + scrollPosAdjustment

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

        interruptHandler.axisTriggerlinesIntersect.connectElements()
        interruptHandler.cradleIntersect.connectElements()
        interruptHandler.signals.pauseTriggerlinesObserver = false
        interruptHandler.signals.pauseCradleIntersectionObserver = false

    }

    // =============================[ UPDATE through scroll ]===============================

    public updateCradleContent = (triggerlineEntries, source = 'notifications') => {

        // ----------------------[ 1. initialize ]-------------------------

        // handler support
        const {
            portals: portalHandler, 
            scroll: scrollHandler, 
            scaffold: scaffoldHandler, 
            state: stateHandler, 
            interrupts: interruptHandler,
        } = this.cradleParameters.handlersRef.current

        // scroll data
        const scrollData = scrollHandler.scrollData 

        const scrollPos = scrollData.currentupdate

        // first abandon option/3; nothing to do
        if ( scrollPos < 0) { // for Safari elastic bounce at top of scroll

            return

        }

        let isScrollingviewportforward
        if (scrollData.currentupdate == scrollData.previousupdate) { 

            isScrollingviewportforward = (scrollData.current > scrollData.previous)

        } else {

            isScrollingviewportforward = (scrollData.currentupdate > scrollData.previousupdate)

        }

        // cradle scaffold and user cells
        const cradleElements = scaffoldHandler.elements
        const cradleContent = this.content
        const itemElements = this.itemElements
        const modelcontentlist = cradleContent.cradleModel
        const oldCradleReferenceIndex = (modelcontentlist[0]?.props.index || 0)

        // --------------------[ 2. get shift instruction ]-----------------------

        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const orientation = cradleInheritedProperties.orientation
        console.log('==> getting shift instructions from scrollPos, isScrollingviewportforward',
            scrollPos, isScrollingviewportforward)
        // -1 is move a row up to the head, +1 is move a row down to the tail, 0 is no shift
        const shiftinstruction = getShiftInstruction({
            orientation,
            isScrollingviewportforward,
            triggerlineEntries,
        })

        // second abandon option/3; nothing to do
        if (shiftinstruction == 0) {

            return

        }
        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        // cradle properties
        // const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
        const viewportElement = this.cradleParameters.viewportInterruptPropertiesRef.current.elementref.current

        const {

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
        // console.log('disabling triggerlines')
        interruptHandler.signals.pauseTriggerlinesObserver = true

        // ----------------------------------[ 4. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList, deletedContentItems = []

        if (listStartChangeCount || listEndChangeCount) { // if either is non-0 then modify content

            [localContentList,deletedContentItems] = getUICellShellList({
                cradleInheritedProperties,
                cradleInternalProperties,
                cradleContentCount,
                localContentList:modelcontentlist,
                listStartChangeCount,
                listEndChangeCount,
                cradleReferenceIndex:oldCradleReferenceIndex,
                callbacks:this.internalCallbacksRef.current,
                instanceIdCounterRef:this.instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        if (deletedContentItems.length) deletePortals(portalHandler, deletedContentItems)

        // ----------------------------------[ 5. allocate cradle content ]--------------------------

        const [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                axisReferenceIndex, // TODO: BUG: set to 100 for problem
            }
        )

        console.log('allocated content with axisReferenceIndex:localContentList, headcontent, tailcontent', 
            axisReferenceIndex, localContentList, headcontent, tailcontent)

        cradleContent.cradleModel = localContentList
        cradleContent.headViewComponents = cradleContent.headModelComponents = headcontent
        cradleContent.tailViewComponents = cradleContent.tailModelComponents = tailcontent

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

        // trigger lines have been moved, so observer must be reset
        console.log('re-enabling triggerlines: axisReferenceIndex, axisPixelOffset, scrollPos',
            axisReferenceIndex, axisPixelOffset, scrollPos)
        interruptHandler.axisTriggerlinesIntersect.connectElements()
        interruptHandler.signals.pauseTriggerlinesObserver = false

        stateHandler.setCradleState('renderupdatedcontent')

    }

}