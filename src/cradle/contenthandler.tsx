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

        // the breaklines will be moved, so disconnect them from their observer.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        interruptHandler.axisBreaklinesIntersect.observer.disconnect()

        const viewportElement = viewportInterruptProperties.elementref.current

        const requestedAxisReferenceIndex = scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex
        let targetAxisPixelOffset = scaffoldHandler.cradleReferenceData.targetAxisPixelOffset

        console.log('setCradleContent requestedAxisReferenceIndex',requestedAxisReferenceIndex)

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

        // console.log('orientation, targetAxisPixelAdjustment, targetScrollblockPixelAdjustment',
        //     orientation, targetAxisPixelAdjustment, targetScrollblockPixelAdjustment)

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

        console.log('finishing setCradleContent: scrollblockPixelOffset, targetScrollblockPixelAdjustment',
            scrollblockPixelOffset, targetScrollblockPixelAdjustment)

        if (orientation == 'vertical') {

            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'

            cradleElements.axisRef.current.style.top = (axisPixelOffset + targetAxisPixelAdjustment) + 'px'
            cradleElements.axisRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = 
                headcontentlist.length?
                    gap + 'px':
                    0

        } else { // orientation = 'horizontal'

            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'

            cradleElements.axisRef.current.style.top = 'auto'
            cradleElements.axisRef.current.style.left = (axisPixelOffset + targetAxisPixelAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = 
                headcontentlist.length?
                    gap + 'px':
                    0

        }

    }

    // =============================[ UPDATE through scroll ]===============================

    public updateCradleContent = (breaklineEntries, source = 'notifications') => {

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

        console.log('1. updateCradleContent cradleState, isScrollingviewportforward, source, breaklineEntries',
            stateHandler.cradleStateRef.current, isScrollingviewportforward, source, breaklineEntries)

        // cradle scaffold and user cells
        const cradleElements = scaffoldHandler.elements
        const cradleContent = this.content
        const itemElements = this.itemElements
        const modelcontentlist = cradleContent.cradleModel
        const cradleReferenceIndex = (modelcontentlist[0]?.props.index || 0)

        // --------------------[ 2. get shift instruction ]-----------------------

        // -1 is move a row up to the head, +1 is move a row down to the tail, 0 is no shift
        const shiftinstruction = getShiftInstruction({
            isScrollingviewportforward,
            breaklineEntries,
        })

        // second abandon option/3; nothing to do
        if (shiftinstruction == 0) return

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        // cradle properties
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current

        const [

            // cradlereferenceindex, // new index
            cradleItemShift, 
            axisReferenceIndex, // new index
            axisItemShift, 
            axisPixelOffset, // new offset (from leading edge of viewport)
            cradleContentCount, // updated
            headChangeCount,
            tailChangeCount,

        ] = calcContentShift({

            shiftinstruction,
            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContent,
            cradleElements,
            scrollPos,

        })

        // third abandon option/3; nothing to do
        if ((axisItemShift == 0 && cradleItemShift == 0)) {
            console.log('returning for no axis or cradle shift') // notice for suspicious requirement
            return

        }

        // the breaklines will be moved, so disconnect them from their observer.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx
        interruptHandler.axisBreaklinesIntersect.observer.disconnect()

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

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
                cradleReferenceIndex,
                callbacks:this.internalCallbacksRef.current,
                instanceIdCounterRef:this.instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        if (deletedContentItems.length) deletePortals(portalHandler, deletedContentItems)

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        const [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                axisReferenceIndex, // TODO: BUG: set to 100 for problem
            }
        )

        cradleContent.cradleModel = localContentList
        cradleContent.headViewComponents = cradleContent.headModelComponents = headcontent
        cradleContent.tailViewComponents = cradleContent.tailModelComponents = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        scrollHandler.updateBlockScrollPos()

        // if (axisPixelOffset !== undefined) {

        if (cradleInheritedProperties.orientation == 'vertical') {
            // const scrolltop = scrollPos // viewportElement.scrollTop
            const top = scrollPos + axisPixelOffset

            scaffoldHandler.cradleReferenceData.blockScrollPos = scrollPos
            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
            cradleElements.axisRef.current.style.top = top + 'px'
            cradleElements.axisRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        } else {

            scaffoldHandler.cradleReferenceData.blockScrollPos = scrollPos // viewportElement.scrollLeft
            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            cradleElements.axisRef.current.style.top = 'auto'
            cradleElements.axisRef.current.style.left = scrollPos + axisPixelOffset + 'px'
            cradleElements.headRef.current.style.paddingRight = 
                headcontent.length?
                    cradleInheritedProperties.gap + 'px':
                    0

        }

        // }

        console.log('++updateCradleContent axisReferenceIndex, axisPixelOffset, axisItemShift, cradleItemShift, scrollPos', 
            axisReferenceIndex, axisPixelOffset, axisItemShift, cradleItemShift, scrollPos)

        scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex = axisReferenceIndex
        scaffoldHandler.cradleReferenceData.scrollImpliedAxisPixelOffset = axisPixelOffset

        scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex = axisReferenceIndex
        scaffoldHandler.cradleReferenceData.targetAxisPixelOffset = axisPixelOffset

        stateHandler.setCradleState('renderupdatedcontent')

    }

}