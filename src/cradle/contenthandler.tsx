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

    // TODO: last row is sometimes left off with reposition
    public setCradleContent = (cradleState) => { 

        // console.log('inside setCradleContent from cradleState', cradleState)

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
        // interruptHandler.axisTriggerlinesIntersect.observer.disconnect()
        interruptHandler.signals.pauseTriggerlinesObserver = true

        const viewportElement = viewportInterruptProperties.elementref.current

        const requestedAxisReferenceIndex = scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex
        let targetAxisPixelOffset = scaffoldHandler.cradleReferenceData.targetAxisPixelOffset

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

        let targetAxisPixelAdjustment = 0
        let targetScrollblockPixelAdjustment = 0
        if (cradleState == 'doreposition' || targetAxisReferenceIndex == 0) {

            targetAxisPixelAdjustment = padding

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

        scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex = targetAxisReferenceIndex
        scaffoldHandler.cradleReferenceData.scrollImpliedAxisPixelOffset = axisPixelOffset

        scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex = targetAxisReferenceIndex
        scaffoldHandler.cradleReferenceData.targetAxisPixelOffset = axisPixelOffset

        if (serviceHandler.serviceCalls.referenceIndexCallbackRef.current) {

            let cstate = cradleState

            serviceHandler.serviceCalls.referenceIndexCallbackRef.current(

                scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex,'setCradleContent', cstate)
        
        }

        const cradleElements = scaffoldHandler.elements //cradleElementsRef.current

        scaffoldHandler.cradleReferenceData.blockScrollPos = 
            scrollblockPixelOffset + targetScrollblockPixelAdjustment

        if (orientation == 'vertical') {

            // scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'

            cradleElements.axisRef.current.style.top = (axisPixelOffset + targetAxisPixelAdjustment) + 'px'
            cradleElements.axisRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = 
                headcontentlist.length?
                    gap + 'px':
                    0

        } else { // orientation = 'horizontal'

            // scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'

            cradleElements.axisRef.current.style.top = 'auto'
            cradleElements.axisRef.current.style.left = (axisPixelOffset + targetAxisPixelAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = 
                headcontentlist.length?
                    gap + 'px':
                    0

        }

    }

    // =============================[ UPDATE through scroll ]===============================

    public updateCradleContent = (triggerlineEntries, source = 'notifications') => {

        // ----------------------[ 1. initialize ]-------------------------

        // console.log('inside updateCradleContent')

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

            console.log('returning with scrollPos < 0')
            return

        }

        let isScrollingviewportforward
        if (scrollPositions.currentupdate == scrollPositions.previousupdate) { // edge case 

            isScrollingviewportforward = this._previousScrollForward

        } else {

            isScrollingviewportforward = (scrollPositions.currentupdate > scrollPositions.previousupdate)
            this._previousScrollForward = isScrollingviewportforward

        }

        // console.log('---isScrollingviewportforward',isScrollingviewportforward)

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

            // console.log('quitting with shiftinstruction',shiftinstruction, triggerlineEntries)
            return

        }
        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        // cradle properties
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
        const viewportElement = this.cradleParameters.viewportInterruptPropertiesRef.current.elementref.current

        const {

            newcradlereferenceindex, 
            cradlereferenceitemshift:cradleItemShift, 
            newaxisreferenceindex:axisReferenceIndex, 
            axisreferenceitemshift:axisItemShift, 
            newaxispixeloffset:axisPixelOffset, 
            newcradlecontentcount:cradleContentCount,
            headchangecount:headChangeCount,
            tailchangecount:tailChangeCount,

        } = calcContentShift({

            shiftinstruction,
            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContent,
            cradleElements,
            scrollPos,
            viewportElement,

        })

        // third abandon option/3; nothing to do
        if ((axisItemShift == 0 && cradleItemShift == 0)) {
            console.log('returning with axisItemShift and cradleItemShift both 0')
            return

        }

        // the triggerlines will be moved, so disconnect them from their observer.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        // interruptHandler.axisTriggerlinesIntersect.observer.disconnect()
        interruptHandler.signals.pauseTriggerlinesObserver = true

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

        // console.log('allocated content to head and tail, axisreferenceindex',
        //     headcontent.length, tailcontent.length, axisReferenceIndex)

        cradleContent.cradleModel = localContentList
        cradleContent.headViewComponents = cradleContent.headModelComponents = headcontent
        cradleContent.tailViewComponents = cradleContent.tailModelComponents = tailcontent

        // -------------------------------[ 6. set css changes ]-------------------------
        // debugger
        scaffoldHandler.cradleReferenceData.blockScrollPos = scrollPos
        // viewportElement.scrollTop = scrollPos

        if (cradleInheritedProperties.orientation == 'vertical') {

            const top = scrollPos + axisPixelOffset

            // console.log('DOM setting axis top, scrollPos, axisPixelOffset',
            //     top, scrollPos, axisPixelOffset)

            cradleElements.axisRef.current.style.top = top + 'px'
            cradleElements.axisRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        } else {

            const left = scrollPos + axisPixelOffset

            cradleElements.axisRef.current.style.top = 'auto'
            cradleElements.axisRef.current.style.left = left + 'px'
            cradleElements.headRef.current.style.paddingRight = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        }

        scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex = axisReferenceIndex
        scaffoldHandler.cradleReferenceData.scrollImpliedAxisPixelOffset = axisPixelOffset

        scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex = axisReferenceIndex
        scaffoldHandler.cradleReferenceData.targetAxisPixelOffset = axisPixelOffset

        // trigger lines have been moved, so observer must be reset
        interruptHandler.axisTriggerlinesIntersect.resetObservers()
        interruptHandler.signals.pauseTriggerlinesObserver = false

        stateHandler.setCradleState('renderupdatedcontent')

    }

}