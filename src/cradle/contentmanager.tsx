// contentmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import { 
    getUICellShellList, 
    calcHeadAndTailChanges,
    calcContentShifts,
    getContentListRequirements,
    isolateRelevantIntersections,
    allocateContentList,
    deleteAndRerenderPortals,

} from './contentfunctions'

export default class ContentManager {

   constructor(commonProps, contentCallbacksRef) {

      this.commonProps = commonProps

      this.contentCallbacksRef = contentCallbacksRef

   }

   public content = {

      cradleModel: null,
      headModel: null,
      tailModel: null,
      headView: [],
      tailView: [],

    }

    public itemElements = new Map()

    private commonProps

    private instanceIdCounterRef = {
       current:0
    }
    private instanceIdMap = new Map()

    private _previousScrollForward = undefined

    private contentCallbacksRef

    // Two public methods - setCradleContent and updateCradleContent

    // reset cradle, including allocation between head and tail parts of the cradle
    // called only from cradle preparerender event
    public setCradleContent = (cradleState) => { 

        const viewportData = this.commonProps.viewportdataRef.current
        const cradleProps = this.commonProps.cradlePropsRef.current
        const cradleConfig = this.commonProps.cradleConfigRef.current
        const scrollManager = this.commonProps.managersRef.current.scroll
        const cradleManager = this.commonProps.managersRef.current.cradle
        const stateManager = this.commonProps.managersRef.current.state
        const serviceManager = this.commonProps.managersRef.current.service
        const interruptManager = this.commonProps.managersRef.current.interrupts
        const cradleData = this.commonProps.cradleDataRef.current

        // if (viewportData.index == 6) {
        //     console.log('SETTING content - cradleState, cradleData in setCradleContent',
                    // cradleState, cradleData)
        // }

        const viewportElement = viewportData.elementref.current

        const visibletargetindexoffset = cradleManager.cradleReferenceData.nextItemIndexReference
        let visibletargetscrolloffset = cradleManager.cradleReferenceData.nextCradlePosOffset

        const {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        const { cradleRowcount,
            crosscount,
            viewportRowcount } = cradleConfig

        if (cradleState == 'doreposition') {

            visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap

        }

        const localContentList = []
        const cradleContent = this.content

        let {cradleReferenceIndex, 
            referenceoffset, 
            cradleActualContentCount, 
            scrollblockOffset, 
            spinePosOffset, 
            spineAdjustment} = 
            getContentListRequirements({
                cradleProps,
                cradleConfig,
                visibletargetindexoffset,
                targetViewportOffset:visibletargetscrolloffset,
                viewportElement:viewportData.elementref.current
            })

        // returns content constrained by cradleRowcount
        const [childlist,deleteditems] = getUICellShellList({

            cradleProps,
            cradleConfig,
            cradleActualContentCount,
            cradleReferenceIndex,
            headchangecount:0,
            tailchangecount:cradleActualContentCount,
            localContentList,
            callbacks:this.contentCallbacksRef.current,
            observer: interruptManager.cellIntersect.observer,
            instanceIdCounterRef:this.instanceIdCounterRef,
        })

        deleteAndRerenderPortals(cradleData.portalManager, deleteditems)

        const [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:childlist,
            spineReferenceIndex:referenceoffset,
    
        })

        if (headcontentlist.length == 0) {
            spinePosOffset = padding
        }

        cradleContent.cradleModel = childlist
        cradleContent.headModel = headcontentlist
        cradleContent.tailModel = tailcontentlist

        cradleManager.cradleReferenceData.scrollImpliedItemIndexReference = referenceoffset
        cradleManager.cradleReferenceData.scrollImpliedCradlePosOffset = spinePosOffset

        cradleManager.cradleReferenceData.nextItemIndexReference = referenceoffset
        cradleManager.cradleReferenceData.nextCradlePosOffset = spinePosOffset

        if (serviceManager.serviceCalls.referenceIndexCallbackRef.current) {

            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            serviceManager.serviceCalls.referenceIndexCallbackRef.current(

                cradleManager.cradleReferenceData.nextItemIndexReference,'setCradleContent', cstate)
        
        }

        const cradleElements = cradleManager.elements //cradleElementsRef.current

        cradleManager.cradleReferenceData.blockScrollPos = scrollblockOffset - spinePosOffset
        // console.log('setting blockScrollPos in setCradleContent: blockScrollPos, scrollblockOffset, spinePosOffset',
        //     cradleManager.cradleReferenceData.blockScrollPos, scrollblockOffset, spinePosOffset)

        if (orientation == 'vertical') {

            cradleManager.cradleReferenceData.blockScrollProperty = 'scrollTop'
            // cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

            cradleElements.spineRef.current.style.top = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.spineRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            cradleManager.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            // cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft

            cradleElements.spineRef.current.style.top = 'auto'
            cradleElements.spineRef.current.style.left = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }

    updateCradleContent = (entries, source = 'notifications') => {

        const viewportData = this.commonProps.viewportdataRef.current
        const cradleProps = this.commonProps.cradlePropsRef.current
        const scrollManager = this.commonProps.managersRef.current.scroll
        const cradleManager = this.commonProps.managersRef.current.cradle
        const stateManager = this.commonProps.managersRef.current.state
        const interruptManager = this.commonProps.managersRef.current.interrupts

        const cradleData = this.commonProps.cradleDataRef.current

        // if (viewportData.index == 6) {
        //     console.log('UPDATING content - source; in updateCradleContent',source)
        // }

        const viewportElement = viewportData.elementref.current
        if (!viewportElement) {
            console.error('ERROR: viewport element not set in updateCradleContent',
                cradleProps.scrollerID, viewportData.elementref.current,viewportData)
            return
        }
            
        let scrollOffset
        if (cradleProps.orientation == 'vertical') {
            scrollOffset = viewportElement.scrollTop
        } else {
            scrollOffset = viewportElement.scrollLeft
        }
        if ( scrollOffset < 0) { // for Safari elastic bounce at top of scroll

            return

        }

        // ----------------------------[ 1. initialize ]----------------------------

        const scrollPositions = scrollManager.scrollPositions //scrollPositionsRef.current

        let scrollforward
        if (scrollPositions.current == scrollPositions.previous) { // edge case 

            scrollforward = this._previousScrollForward

        } else {

            scrollforward = scrollPositions.current > scrollPositions.previous
            this._previousScrollForward = scrollforward

        }

        if (scrollforward === undefined) {
            return // init call
        }

        const cradleElements = cradleManager.elements
        const cradleContent = this.content
        const cradleConfig = this.commonProps.cradleConfigRef.current

        const itemElements = this.itemElements

        const modelcontentlist = cradleContent.cradleModel

        const cradleReferenceIndex = modelcontentlist[0].props.index

        // --------------------[ 2. filter intersections list ]-----------------------

        // filter out inapplicable intersection entries
        // we're only interested in intersections proximal to the spine
        // TODO: BUG: for nested config end problem intersections count = 4; should be 0; 12 count for entries
        const intersections = isolateRelevantIntersections({

            scrollforward,
            intersections:entries,
            cradleContent,
            cellObserverThreshold:cradleConfig.cellObserverThreshold,

        })

        // if ((viewportData.index == 6) /*&& (tailcontent.length == 0)*/) {
        //     console.log('updateCradleContent INTERSECTIONS',intersections)
        // }

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        const [cradleindex, // TODO: BUG: this changed to 20 from 24
            cradleitemshift, // TODO: BUG: for problem cradleitemshift ends up as -4
            spineReferenceIndex, // TODO: BUG: for problem spineReferenceIndex ends up at 100 (one past the end of list)
            referenceitemshift, // TODO: BUG: set to 4
            spinePosOffset, // TODO: BUG: set to 100
            // TODO: actual content set to 80 (available content), not 76 as it should be
            cradleActualContentCount] = calcContentShifts({

                cradleProps,
                cradleConfig,
                cradleElements,
                cradleContent,
                viewportElement,
                itemElements,
                intersections,
                scrollforward,
                viewportData,

        })

        if ((referenceitemshift == 0 && cradleitemshift == 0)) return

        // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

        // both counts set to 0 but with headchnagecount set to -0
        const [headchangecount,tailchangecount] = calcHeadAndTailChanges({ 

            cradleProps,
            cradleConfig,
            cradleContent,
            cradleshiftcount:cradleitemshift,
            scrollforward,
            cradleReferenceIndex,

        })

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList, deletedContentItems = []

        // both changecounts are 0 (but head = -0) so test should fail
        if (headchangecount || tailchangecount) { // TODO: apparently headchangecount of -0 fails test, should be fixed

            [localContentList,deletedContentItems] = getUICellShellList({
                cradleProps,
                cradleConfig,
                cradleActualContentCount, // TODO: problem!
                localContentList:modelcontentlist,
                headchangecount,
                tailchangecount,
                cradleReferenceIndex,
                observer: interruptManager.cellIntersect.observer,
                callbacks:this.contentCallbacksRef.current,
                instanceIdCounterRef:this.instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        deleteAndRerenderPortals(cradleData.portalManager, deletedContentItems)

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        const [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                spineReferenceIndex, // TODO: BUG: set to 100 for problem
            }
        )

        // if ((viewportData.index == 6) /*&& (tailcontent.length == 0)*/) {
        //     console.log('in updateCradleContent after allocateContentList \n',
        //     'referenceitemshift, cradleitemshift, spineReferenceIndex, spinePosOffset, headcontent, tailcontent', //localContentList, headcontent, tailcontent', 
        //         referenceitemshift, cradleitemshift, spineReferenceIndex, spinePosOffset, headcontent, tailcontent) //, entries, localContentList, headcontent, tailcontent) 
        //     // debugger
        // }

        cradleContent.cradleModel = localContentList
        cradleContent.headView = cradleContent.headModel = headcontent
        cradleContent.tailView = cradleContent.tailModel = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        scrollManager.updateBlockScrollPos()

        if (spinePosOffset !== undefined) {

            // scrollManager.updateBlockScrollPos()
            
            if (cradleProps.orientation == 'vertical') {

                // cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollTop
                // cradleManager.cradleReferenceData.blockScrollProperty = 'scrollTop'
                cradleElements.spineRef.current.style.top = viewportElement.scrollTop + spinePosOffset + 'px'
                cradleElements.spineRef.current.style.left = 'auto'
                cradleElements.headRef.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                // cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
                // cradleManager.cradleReferenceData.blockScrollProperty = 'scrollLeft'
                cradleElements.spineRef.current.style.top = 'auto'
                cradleElements.spineRef.current.style.left = viewportElement.scrollLeft + spinePosOffset + 'px'
                cradleElements.headRef.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

        }

        cradleManager.cradleReferenceData.scrollImpliedItemIndexReference = spineReferenceIndex
        cradleManager.cradleReferenceData.scrollImpliedCradlePosOffset = spinePosOffset

        cradleManager.cradleReferenceData.nextItemIndexReference = spineReferenceIndex
        cradleManager.cradleReferenceData.nextCradlePosOffset = spinePosOffset

        stateManager.setCradleState('renderupdatedcontent')

    }

}