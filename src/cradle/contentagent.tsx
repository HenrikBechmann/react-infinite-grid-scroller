// contentmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlesuper'
import { 
    getUICellShellList, 
    calcHeadAndTailChanges,
    calcContentShifts,
    getContentListRequirements,
    isolateRelevantIntersections,
    allocateContentList,
    deleteAndRerenderPortals,

} from './contentfunctions'

export default class ContentAgent extends CradleManagement{

   constructor(commonPropsRef, contentCallbacksRef) {

      super(commonPropsRef)

      this.contentCallbacksRef = contentCallbacksRef

   }

   content = {

      cradleModel: null,
      headModel: null,
      tailModel: null,
      headView: [],
      tailView: [],

    }

    instanceIdCounterRef = {
       current:0
    }
    instanceIdMap = new Map()

    private _previousScrollForward = undefined

    itemElements = new Map()

    contentCallbacksRef

    // Two public methods - setCradleContent and updateCradleContent

    // reset cradle, including allocation between head and tail parts of the cradle
    setCradleContent = (cradleState) => { 

        let viewportData = this._viewportdataRef.current
        let cradleProps = this._cradlePropsRef.current
        let cradleConfig = this._cradleconfigRef.current
        let scrollAgent = this._managersRef.current.scroll
        let cradleAgent = this._managersRef.current.cradle
        let stateAgent = this._managersRef.current.state
        let serviceAgent = this._managersRef.current.service
        let observersAgent = this._managersRef.current.observers
        let cradleData = this._cradleDataRef.current

        // console.log('cradleData in setCradleContent',cradleData)

        let viewportElement = viewportData.elementref.current

        let visibletargetindexoffset = cradleAgent.cellReferenceData.readyReferenceIndex
        let visibletargetscrolloffset = cradleAgent.cellReferenceData.readySpineOffset

        let {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        let { cradleRowcount,
            crosscount,
            viewportRowcount } = cradleConfig

        if (cradleState == 'reposition') {

            visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap

        }

        let localContentList = []
        let cradleContent = this.content

        let {cradleReferenceIndex, referenceoffset, contentCount, scrollblockOffset, spinePosOffset, spineAdjustment} = 
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
            contentCount,
            cradleReferenceIndex,
            headchangecount:0,
            tailchangecount:contentCount,
            localContentList,
            callbacks:this.contentCallbacksRef.current,
            observer: observersAgent.cellIntersect.observer,
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

        cradleAgent.cellReferenceData.scrollReferenceIndex = referenceoffset
        cradleAgent.cellReferenceData.scrollSpineOffset = spinePosOffset

        cradleAgent.cellReferenceData.readyReferenceIndex = referenceoffset
        cradleAgent.cellReferenceData.readySpineOffset = spinePosOffset

        if (serviceAgent.serviceCalls.referenceIndexCallbackRef.current) {

            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            serviceAgent.serviceCalls.referenceIndexCallbackRef.current(

                cradleAgent.cellReferenceData.readyReferenceIndex,'setCradleContent', cstate)
        
        }

        let cradleElements = cradleAgent.elements //cradleElementsRef.current

        cradleAgent.blockScrollPos = scrollblockOffset - spinePosOffset
        if (orientation == 'vertical') {

            cradleAgent.blockScrollProperty = 'scrollTop'

            cradleElements.spineRef.current.style.top = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.spineRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            cradleAgent.blockScrollProperty = 'scrollLeft'

            cradleElements.spineRef.current.style.top = 'auto'
            cradleElements.spineRef.current.style.left = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }

    updateCradleContent = (entries, source = 'notifications') => {

        let viewportData = this._viewportdataRef.current
        let cradleProps = this._cradlePropsRef.current
        let scrollAgent = this._managersRef.current.scroll
        let cradleAgent = this._managersRef.current.cradle
        let stateAgent = this._managersRef.current.state
        let observersAgent = this._managersRef.current.observers

        let cradleData = this._cradleDataRef.current
        let portalManager = cradleData.portalManager

        // console.log('cradleData in updateCradleContent',cradleData)

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

        let scrollPositions = scrollAgent.scrollPositions //scrollPositionsRef.current

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

        let cradleElements = cradleAgent.elements
        let cradleContent = this.content
        let cradleConfig = this._cradleconfigRef.current

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

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        let [cradleindex, 
            cradleitemshift, 
            spineReferenceIndex, 
            referenceitemshift,
            spinePosOffset, 
            contentCount] = calcContentShifts({

                cradleProps,
                cradleConfig,
                cradleElements,
                cradleContent,
                viewportElement,
                itemElements,
                intersections,
                scrollforward,

        })

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
                contentCount,
                localContentList:modelcontentlist,
                headchangecount,
                tailchangecount,
                cradleReferenceIndex,
                observer: observersAgent.cellIntersect.observer,
                callbacks:this.contentCallbacksRef.current,
                instanceIdCounterRef:this.instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        deleteAndRerenderPortals(portalManager, deletedContentItems)

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

                cradleAgent.blockScrollPos = viewportElement.scrollTop
                cradleAgent.blockScrollProperty = 'scrollTop'
                cradleElements.spineRef.current.style.top = viewportElement.scrollTop + spinePosOffset + 'px'
                cradleElements.spineRef.current.style.left = 'auto'
                cradleElements.headRef.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                cradleAgent.blockScrollPos = viewportElement.scrollLeft
                cradleAgent.blockScrollProperty = 'scrollLeft'
                cradleElements.spineRef.current.style.top = 'auto'
                cradleElements.spineRef.current.style.left = viewportElement.scrollLeft + spinePosOffset + 'px'
                cradleElements.headRef.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

        }

        cradleAgent.cellReferenceData.scrollReferenceIndex = spineReferenceIndex
        cradleAgent.cellReferenceData.scrollSpineOffset = spinePosOffset

        cradleAgent.cellReferenceData.readyReferenceIndex = spineReferenceIndex
        cradleAgent.cellReferenceData.readySpineOffset = spinePosOffset

        stateAgent.setCradleState('updatecontent')

    }

}