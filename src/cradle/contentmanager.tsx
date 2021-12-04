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

        let viewportData = this.commonProps.viewportdataRef.current
        let cradleProps = this.commonProps.cradlePropsRef.current
        let cradleConfig = this.commonProps.cradleConfigRef.current
        let scrollManager = this.commonProps.managersRef.current.scroll
        let cradleManager = this.commonProps.managersRef.current.cradle
        let stateManager = this.commonProps.managersRef.current.state
        let serviceManager = this.commonProps.managersRef.current.service
        let interruptManager = this.commonProps.managersRef.current.interrupts
        let cradleData = this.commonProps.cradleDataRef.current

        if (viewportData.index == 0) console.log('SETTING content - cradleState, cradleData in setCradleContent',cradleState, cradleData)

        let viewportElement = viewportData.elementref.current

        let visibletargetindexoffset = cradleManager.cradleReferenceData.nextItemIndexReference
        let visibletargetscrolloffset = cradleManager.cradleReferenceData.nextCradlePosOffset

        let {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        let { cradleRowcount,
            crosscount,
            viewportRowcount } = cradleConfig

        if (cradleState == 'reposition') {

            visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap

        }

        let localContentList = []
        let cradleContent = this.content

        let {cradleReferenceIndex, referenceoffset, cradleActualContentCount, scrollblockOffset, spinePosOffset, spineAdjustment} = 
            getContentListRequirements({
                cradleProps,
                cradleConfig,
                visibletargetindexoffset,
                targetViewportOffset:visibletargetscrolloffset,
                viewportElement:viewportData.elementref.current
            })

        // returns content constrained by cradleRowcount
        let [childlist,deleteditems] = getUICellShellList({

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

        let [headcontentlist, tailcontentlist] = allocateContentList({

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

        let cradleElements = cradleManager.elements //cradleElementsRef.current

        cradleManager.cradleReferenceData.blockScrollPos = scrollblockOffset - spinePosOffset
        
        if (orientation == 'vertical') {

            cradleManager.cradleReferenceData.blockScrollProperty = 'scrollTop'

            cradleElements.spineRef.current.style.top = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.spineRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            cradleManager.cradleReferenceData.blockScrollProperty = 'scrollLeft'

            cradleElements.spineRef.current.style.top = 'auto'
            cradleElements.spineRef.current.style.left = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }

    updateCradleContent = (entries, source = 'notifications') => {

        let viewportData = this.commonProps.viewportdataRef.current
        let cradleProps = this.commonProps.cradlePropsRef.current
        let scrollManager = this.commonProps.managersRef.current.scroll
        let cradleManager = this.commonProps.managersRef.current.cradle
        let stateManager = this.commonProps.managersRef.current.state
        let interruptManager = this.commonProps.managersRef.current.interrupts

        let cradleData = this.commonProps.cradleDataRef.current

        if (viewportData.index == 0) console.log('UPDATING content - source, cradleData in updateCradleContent',source, cradleData)

        let viewportElement = viewportData.elementref.current
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

        let scrollPositions = scrollManager.scrollPositions //scrollPositionsRef.current

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

        let cradleElements = cradleManager.elements
        let cradleContent = this.content
        let cradleConfig = this.commonProps.cradleConfigRef.current

        let itemElements = this.itemElements

        let modelcontentlist = cradleContent.cradleModel

        let cradleReferenceIndex = modelcontentlist[0].props.index

        // --------------------[ 2. filter intersections list ]-----------------------

        // filter out inapplicable intersection entries
        // we're only interested in intersections proximal to the spine
        let intersections = isolateRelevantIntersections({

            scrollforward,
            intersections:entries,
            cradleContent,
            cellObserverThreshold:cradleConfig.cellObserverThreshold,

        })

        // if (viewportData.index == 0) console.log('intersections in updateCradleContent',intersections)

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        const [cradleindex, 
            cradleitemshift, 
            spineReferenceIndex, 
            referenceitemshift,
            spinePosOffset, 
            cradleAvailableContentCount] = calcContentShifts({

                cradleProps,
                cradleConfig,
                cradleElements,
                cradleContent,
                viewportElement,
                itemElements,
                intersections,
                scrollforward,

        })
        if (viewportData.index == 0) {
            console.log(`cradleindex, 
            cradleitemshift, 
            spineReferenceIndex, 
            referenceitemshift,
            spinePosOffset, 
            contentCount`,cradleindex, 
            cradleitemshift, 
            spineReferenceIndex, 
            referenceitemshift,
            spinePosOffset, 
            cradleAvailableContentCount)
        }
        if ((referenceitemshift == 0 && cradleitemshift == 0)) return

        // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

        let [headchangecount,tailchangecount] = calcHeadAndTailChanges({

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

        if (headchangecount || tailchangecount) {

            [localContentList,deletedContentItems] = getUICellShellList({
                cradleProps,
                cradleConfig,
                cradleActualContentCount:cradleAvailableContentCount,
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

        let [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                spineReferenceIndex,
            }
        )

        cradleContent.cradleModel = localContentList
        cradleContent.headView = cradleContent.headModel = headcontent
        cradleContent.tailView = cradleContent.tailModel = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        if (spinePosOffset !== undefined) {
            
            if (cradleProps.orientation == 'vertical') {

                cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollTop
                cradleManager.cradleReferenceData.blockScrollProperty = 'scrollTop'
                cradleElements.spineRef.current.style.top = viewportElement.scrollTop + spinePosOffset + 'px'
                cradleElements.spineRef.current.style.left = 'auto'
                cradleElements.headRef.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
                cradleManager.cradleReferenceData.blockScrollProperty = 'scrollLeft'
                cradleElements.spineRef.current.style.top = 'auto'
                cradleElements.spineRef.current.style.left = viewportElement.scrollLeft + spinePosOffset + 'px'
                cradleElements.headRef.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

        }

        cradleManager.cradleReferenceData.scrollImpliedItemIndexReference = spineReferenceIndex
        cradleManager.cradleReferenceData.scrollImpliedCradlePosOffset = spinePosOffset

        cradleManager.cradleReferenceData.nextItemIndexReference = spineReferenceIndex
        cradleManager.cradleReferenceData.nextCradlePosOffset = spinePosOffset

        stateManager.setCradleState('updatecontent')

    }

}