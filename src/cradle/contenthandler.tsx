// contenthandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import { 
    getUICellShellList, 
    calcHeadAndTailChanges,
    calcContentShifts,
    getContentListRequirements,
    isolateShiftingIntersections,
    allocateContentList,
    deleteAndRerenderPortals,

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


    // TODO: last row is sometimes left off with reposition
    public setCradleContent = (cradleState) => { 

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current
        const portalHandler = this.cradleParameters.handlersRef.current.portals
        const cradleInternalProperties = this.cradleParameters.CradleInternalPropertiesRef.current
        const scrollHandler = this.cradleParameters.handlersRef.current.scroll
        const scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        const stateHandler = this.cradleParameters.handlersRef.current.state
        const serviceHandler = this.cradleParameters.handlersRef.current.service
        // const interruptHandler = this.cradleParameters.handlersRef.current.interrupts
        // const cradleData = this.cradleParameters.cradleInheritedPropertiesRef.current

        // if (viewportInterruptProperties.index == 6) {
        //     console.log('SETTING content - cradleState, cradleData in setCradleContent',
                    // cradleState, cradleData)
        // }

        const viewportElement = viewportInterruptProperties.elementref.current

        const visibletargetindexoffset = scaffoldHandler.cradleReferenceData.nextItemIndexReference
        let visibletargetscrolloffset = scaffoldHandler.cradleReferenceData.nextCradlePosOffset

        const {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleInheritedProperties

        const { cradleRowcount,
            crosscount,
            viewportRowcount } = cradleInternalProperties

        if (cradleState == 'doreposition') {

            visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap

        }

        const localContentList = []
        const cradleContent = this.content

        let {
            cradleReferenceIndex, 
            referenceoffset, 
            cradleActualContentCount, 
            scrollblockOffset, 
            axisPosOffset, 
            axisAdjustment
        } = 
            getContentListRequirements({
                cradleInheritedProperties,
                cradleInternalProperties,
                visibletargetindexoffset,
                targetViewportOffset:visibletargetscrolloffset,
                viewportElement:viewportInterruptProperties.elementref.current
            })

         // console.log('cradleActualContentCount from getContentListRequirements',cradleActualContentCount)

        // if (viewportInterruptProperties.index == 6) {
        //     console.log('SET index, cradleActualContentCount', viewportInterruptProperties.index,cradleActualContentCount)
        // }

        // returns content constrained by cradleRowcount
        const [childlist,deleteditems] = getUICellShellList({

            cradleInheritedProperties,
            cradleInternalProperties,
            cradleActualContentCount,
            cradleReferenceIndex,
            headchangecount:0,
            tailchangecount:cradleActualContentCount,
            localContentList,
            callbacks:this.internalCallbacksRef.current,
            // observer: interruptHandler.cellIntersect.observer,
            instanceIdCounterRef:this.instanceIdCounterRef,
        })

        deleteAndRerenderPortals(portalHandler, deleteditems)

        const [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:childlist,
            axisreferenceindex:referenceoffset,
    
        })

        if (headcontentlist.length == 0) {
            axisPosOffset = padding
        }

        cradleContent.cradleModel = childlist
        cradleContent.headModelComponents = headcontentlist
        cradleContent.tailModelComponents = tailcontentlist

        scaffoldHandler.cradleReferenceData.scrollImpliedItemIndexReference = referenceoffset
        scaffoldHandler.cradleReferenceData.scrollImpliedCradlePosOffset = axisPosOffset

        scaffoldHandler.cradleReferenceData.nextItemIndexReference = referenceoffset
        scaffoldHandler.cradleReferenceData.nextCradlePosOffset = axisPosOffset

        if (serviceHandler.serviceCalls.referenceIndexCallbackRef.current) {

            let cstate = cradleState
            // if (cstate == 'setreload') cstate = 'reload'
            serviceHandler.serviceCalls.referenceIndexCallbackRef.current(

                scaffoldHandler.cradleReferenceData.nextItemIndexReference,'setCradleContent', cstate)
        
        }

        const cradleElements = scaffoldHandler.elements //cradleElementsRef.current

        scaffoldHandler.cradleReferenceData.blockScrollPos = scrollblockOffset - axisPosOffset
        // console.log('setting blockScrollPos in setCradleContent: blockScrollPos, scrollblockOffset, axisPosOffset',
        //     scaffoldHandler.cradleReferenceData.blockScrollPos, scrollblockOffset, axisPosOffset)

        if (orientation == 'vertical') {

            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
            // scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

            cradleElements.axisRef.current.style.top = (scrollblockOffset + axisAdjustment) + 'px'
            cradleElements.axisRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = headcontentlist.length?cradleInheritedProperties.gap + 'px':0

        } else { // orientation = 'horizontal'

            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            // scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft

            cradleElements.axisRef.current.style.top = 'auto'
            cradleElements.axisRef.current.style.left = (scrollblockOffset + axisAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = headcontentlist.length?cradleInheritedProperties.gap + 'px':0

        }

    }

    public updateCradleContent = (entries, source = 'notifications') => {

        console.log('updateCradleContent', source, entries )

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current

        const {
            portals: portalHandler, 
            scroll: scrollHandler, 
            scaffold: scaffoldHandler, 
            state: stateHandler, 
            // interrupts: interruptHandler,
        } = this.cradleParameters.handlersRef.current

        // const cradleData = this.cradleParameters.cradleInheritedPropertiesRef.current

        // if (viewportInterruptProperties.index == 6) {
            // console.log('UPDATING content - source; in updateCradleContent',source)
        // }

        const viewportElement = viewportInterruptProperties.elementref.current
        if (!viewportElement) { 
            // not mounted; return
            return
        }
            
        let scrollOffset
        if (cradleInheritedProperties.orientation == 'vertical') {
            scrollOffset = viewportElement.scrollTop
        } else {
            scrollOffset = viewportElement.scrollLeft
        }
        if ( scrollOffset < 0) { // for Safari elastic bounce at top of scroll

            return

        }

        // ----------------------------[ 1. initialize ]----------------------------

        const scrollPositions = scrollHandler.scrollPositions 

        let isScrollingviewportforward
        if (scrollPositions.current == scrollPositions.previous) { // edge case 

            isScrollingviewportforward = this._previousScrollForward

        } else {

            // console.log('scrollPositions',scrollPositions)
            isScrollingviewportforward = scrollPositions.currentupdate > scrollPositions.previousupdate
            this._previousScrollForward = isScrollingviewportforward

        }

        if (isScrollingviewportforward === undefined) {
            return // init call
        }

        console.log('returning for DEBUG')
        return; // *    DEBUG*

        const cradleElements = scaffoldHandler.elements
        const cradleContent = this.content
        const cradleInternalProperties = this.cradleParameters.CradleInternalPropertiesRef.current

        const itemElements = this.itemElements

        const modelcontentlist = cradleContent.cradleModel

        const cradleReferenceIndex = modelcontentlist[0].props.index

        // --------------------[ 2. filter intersections list ]-----------------------

        // filter out inapplicable intersection entries
        // we're only interested in intersections proximal to the axis
        let shiftingintersections = []
        if (entries.length) {
            shiftingintersections = isolateShiftingIntersections({

                isScrollingviewportforward,
                intersections:entries,
                cradleContent,
                cellObserverThreshold:cradleInternalProperties.cellObserverThreshold,

            })
            // console.log('SHIFTING intersections',shiftingintersections)
        }

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        const [
            cradlereferenceindex, 
            cradleitemshift, 
            axisreferenceindex, 
            axisitemshift, 
            axisposoffset, 
            newCradleActualContentCount,
            headchange,
            tailchange,
        ] = calcContentShifts({

            cradleInheritedProperties,
            cradleInternalProperties,
            cradleElements,
            cradleContent,
            viewportElement,
            // itemElements,
            shiftingintersections,
            isScrollingviewportforward,
            // viewportInterruptProperties,

        })

        if ((axisitemshift == 0 && cradleitemshift == 0)) return

        // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

        // the number of items to add to and clip from the contentlist
        // negative number is clip; positive number is add
        const [headchangecount,tailchangecount] = calcHeadAndTailChanges({ 

            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContent,
            cradleshiftcount:cradleitemshift,
            isScrollingviewportforward,
            cradleReferenceIndex, // previous cradlereferenceindex

        })

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList, deletedContentItems = []

        if (headchangecount || tailchangecount) { // TODO: apparently headchangecount of -0 fails test, should be fixed

            [localContentList,deletedContentItems] = getUICellShellList({
                cradleInheritedProperties,
                cradleInternalProperties,
                cradleActualContentCount:newCradleActualContentCount,
                localContentList:modelcontentlist,
                headchangecount,
                tailchangecount,
                cradleReferenceIndex,
                // observer: interruptHandler.cellIntersect.observer,
                callbacks:this.internalCallbacksRef.current,
                instanceIdCounterRef:this.instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        deleteAndRerenderPortals(portalHandler, deletedContentItems)

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        const [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                axisreferenceindex, // TODO: BUG: set to 100 for problem
            }
        )

        cradleContent.cradleModel = localContentList
        cradleContent.headViewComponents = cradleContent.headModelComponents = headcontent
        cradleContent.tailViewComponents = cradleContent.tailModelComponents = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        scrollHandler.updateBlockScrollPos()

        if (axisposoffset !== undefined) {

            // scrollHandler.updateBlockScrollPos()
            
            if (cradleInheritedProperties.orientation == 'vertical') {

                // scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollTop
                // scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
                cradleElements.axisRef.current.style.top = viewportElement.scrollTop + axisposoffset + 'px'
                cradleElements.axisRef.current.style.left = 'auto'
                cradleElements.headRef.current.style.paddingBottom = headcontent.length?cradleInheritedProperties.gap + 'px':0

            } else {

                // scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
                // scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
                cradleElements.axisRef.current.style.top = 'auto'
                cradleElements.axisRef.current.style.left = viewportElement.scrollLeft + axisposoffset + 'px'
                cradleElements.headRef.current.style.paddingRight = headcontent.length?cradleInheritedProperties.gap + 'px':0

            }

        }

        scaffoldHandler.cradleReferenceData.scrollImpliedItemIndexReference = axisreferenceindex
        scaffoldHandler.cradleReferenceData.scrollImpliedCradlePosOffset = axisposoffset

        scaffoldHandler.cradleReferenceData.nextItemIndexReference = axisreferenceindex
        scaffoldHandler.cradleReferenceData.nextCradlePosOffset = axisposoffset

        stateHandler.setCradleState('renderupdatedcontent')

    }

}