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

    private _previousScrollForward = undefined

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

        // the triggerlines will be moved, so disconnect them from their observer.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        interruptHandler.axisTriggerlinesIntersect.observer.disconnect()
        // interruptHandler.signals.pauseTriggerlinesObserver = true

        const { cradlePositionData } = scaffoldHandler
        const viewportElement = viewportInterruptProperties.elementref.current

        const requestedAxisReferenceIndex = cradlePositionData.targetAxisReferenceIndex
        let targetAxisPixelOffset = cradlePositionData.targetAxisPixelOffset

        console.log('==> OPENING setCradleContent: cradleState, scaffoldHandler.cradlePositionData',
            cradleState, Object.assign({},cradlePositionData))

        const {
            orientation, 
            gap, 
            padding, 
        } = cradleInheritedProperties

        if (cradleState == 'doreposition') {

            targetAxisPixelOffset = 0

        }

        const localContentList = []
        const cradleContent = this.content

        // ----------------------[ 2. get content requirements ]----------------------

        const {
            targetCradleReferenceIndex, 
            targetAxisReferenceIndex,
            newCradleContentCount:cradleContentCount, 
            targetScrollblockPixelOffset:scrollblockPixelOffset, 
            targetAxisPixelOffset:axisPixelOffset, 
        } = 
            getContentListRequirements({
                targetAxisReferenceIndex:requestedAxisReferenceIndex,
                targetAxisPixelOffset,
                cradleInheritedProperties,
                cradleInternalProperties,
                viewportElement:viewportInterruptProperties.elementref.current,
            })

        console.log(`getContentListRequirements return values:
            targetCradleReferenceIndex, 
            targetAxisReferenceIndex,
            cradleContentCount, 
            scrollblockPixelOffset, 
            axisPixelOffset
            `,
            targetCradleReferenceIndex, 
            targetAxisReferenceIndex,
            cradleContentCount, 
            scrollblockPixelOffset, 
            axisPixelOffset, 
            )

        let targetAxisPixelAdjustment = 0
        let targetScrollblockPixelAdjustment = 0
        if (cradleState == 'doreposition' || targetAxisReferenceIndex == 0) {

            targetAxisPixelAdjustment = 
                (targetAxisReferenceIndex == 0)?
                    padding:
                    gap

            targetScrollblockPixelAdjustment =
                (targetAxisReferenceIndex == 0)?
                    0:
                    gap
                    
        }

        // returns content constrained by cradleRowcount
        const [childlist,deleteditems] = getUICellShellList({

            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContentCount,
            cradleReferenceIndex:targetCradleReferenceIndex,
            headChangeCount:0,
            tailChangeCount:cradleContentCount,
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

        // const viewportElement = viewportInterruptProperties.elementref.current
        // const cradlePositionData = scaffoldHandler.cradlePositionData

        cradlePositionData.blockScrollPos = 
            scrollblockPixelOffset + targetScrollblockPixelAdjustment

        viewportElement[cradlePositionData.blockScrollProperty] =
            Math.max(0,cradlePositionData.blockScrollPos)

        const cradleElements = scaffoldHandler.elements //cradleElementsRef.current
        const axisElement = cradleElements.axisRef.current
        const headElement = cradleElements.headRef.current

        if (orientation == 'vertical') {

            axisElement.style.top = 
                (cradlePositionData.blockScrollPos + axisPixelOffset + targetAxisPixelAdjustment) + 'px'
            axisElement.style.left = 'auto'
            headElement.style.paddingBottom = 
                headcontentlist.length?
                    gap + 'px':
                    0

        } else { // orientation = 'horizontal'

            axisElement.style.top = 'auto'
            axisElement.style.left = 
                (cradlePositionData.blockScrollPos + axisPixelOffset + targetAxisPixelAdjustment) + 'px'
            headElement.style.paddingRight = 
                headcontentlist.length?
                    gap + 'px':
                    0

        }

        console.log('==> CLOSING setCradleContent: scaffoldHandler.cradlePositionData',
            Object.assign({},cradlePositionData))

        interruptHandler.axisTriggerlinesIntersect.reconnectTriggerlines()
        interruptHandler.signals.pauseTriggerlinesObserver = false

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
        const scrollPositions = scrollHandler.scrollPositions 

        let scrollPos = scrollPositions.currentupdate

        // first abandon option/3; nothing to do
        if ( scrollPos < 0) { // for Safari elastic bounce at top of scroll

            return

        }

        let isScrollingviewportforward
        if (scrollPositions.currentupdate == scrollPositions.previousupdate) { // edge case 

            isScrollingviewportforward = this._previousScrollForward

        } else {

            isScrollingviewportforward = (scrollPositions.currentupdate > scrollPositions.previousupdate)
            this._previousScrollForward = isScrollingviewportforward

        }

        // cradle scaffold and user cells
        const cradleElements = scaffoldHandler.elements
        const cradleContent = this.content
        const itemElements = this.itemElements
        const modelcontentlist = cradleContent.cradleModel
        const oldCradleReferenceIndex = (modelcontentlist[0]?.props.index || 0)

        // --------------------[ 2. get shift instruction ]-----------------------

        // -1 is move a row up to the head, +1 is move a row down to the tail, 0 is no shift
        const shiftinstruction = getShiftInstruction({
            isScrollingviewportforward,
            triggerlineEntries,
        })

        // second abandon option/3; nothing to do
        if (shiftinstruction == 0) {

            return

        }
        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        // cradle properties
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
        const viewportElement = this.cradleParameters.viewportInterruptPropertiesRef.current.elementref.current

        const {

            cradleReferenceItemShift:cradleItemShift, 
            newAxisReferenceIndex:axisReferenceIndex, 
            axisReferenceItemShift:axisItemShift, 
            newAxisPixelOffset:axisPixelOffset, 
            newCradleContentCount:cradleContentCount,
            headChangeCount,
            tailChangeCount,

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
        // interruptHandler.signals.pauseTriggerlinesObserver = true

        // ----------------------------------[ 4. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList, deletedContentItems = []

        if (headChangeCount || tailChangeCount) { // if either is non-0 then modify content

            [localContentList,deletedContentItems] = getUICellShellList({
                cradleInheritedProperties,
                cradleInternalProperties,
                cradleContentCount,
                localContentList:modelcontentlist,
                headChangeCount,
                tailChangeCount,
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

        cradleContent.cradleModel = localContentList
        cradleContent.headViewComponents = cradleContent.headModelComponents = headcontent
        cradleContent.tailViewComponents = cradleContent.tailModelComponents = tailcontent

        // -------------------------------[ 6. set css changes ]-------------------------

        const axisElement = cradleElements.axisRef.current
        const headElement = cradleElements.headRef.current

        if (cradleInheritedProperties.orientation == 'vertical') {

            const top = scrollPos + axisPixelOffset

            axisElement.style.top = top + 'px'
            axisElement.style.left = 'auto'
            headElement.style.paddingBottom = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        } else {

            const left = scrollPos + axisPixelOffset

            axisElement.style.top = 'auto'
            axisElement.left = left + 'px'
            headElement.style.paddingRight = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        }

        const { cradlePositionData } = scaffoldHandler

        cradlePositionData.targetAxisReferenceIndex = axisReferenceIndex
        cradlePositionData.targetAxisPixelOffset = axisPixelOffset

        // trigger lines have been moved, so observer must be reset
        interruptHandler.axisTriggerlinesIntersect.reconnectTriggerlines()
        interruptHandler.signals.pauseTriggerlinesObserver = false

        stateHandler.setCradleState('renderupdatedcontent')

    }

}