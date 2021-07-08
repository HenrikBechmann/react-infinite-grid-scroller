// contentmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'
import { 
    getUICellShellList, 
    calcHeadAndTailChanges,
    calcContentShifts,
    getContentListRequirements,
    isolateRelevantIntersections,
    allocateContentList,
    deleteAndResetPortals,

} from './contentfunctions'

import { portalManager } from '../portalmanager'

export default class ContentManager extends CradleManagement{

   constructor(commonPropsRef, cellObserverRef, contentCallbacksRef) {

      super(commonPropsRef)
      this.cellObserverRef = cellObserverRef
      this.contentCallbacksRef = contentCallbacksRef

      // console.log('ContentManager props',commonPropsRef, cellObserverRef, contentCallbacksRef, referenceIndexCallbackRef)
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

    previousScrollForward = undefined

    itemElements = new Map()

    cellObserverRef

    contentCallbacksRef

    updateCradleContent = (entries, source = 'notifications') => {

        let viewportData = this._viewportdata
        let cradleProps = this._cradlePropsRef.current
        let scrollManager = this._managers.current.scroll
        let cradleManager = this._managers.current.cradle
        let stateManager = this._managers.current.state

        let viewportElement = viewportData.elementref.current
        if (!viewportElement) {
            console.error('ERROR: viewport element not set in updateCradleContent',
                cradleProps.scrollerID, viewportData.elementref.current,viewportData)
            return
        }
            
        // let cradleProps = cradlePropsRef.current

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

            scrollforward = this.previousScrollForward

        } else {

            scrollforward = scrollPositions.current > scrollPositions.previous
            this.previousScrollForward = scrollforward

        }

        if (scrollforward === undefined) {
            return // init call
        }

        let cradleElements = cradleManager.elements
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

        // console.log('headchangecount,tailchangecount',headchangecount,tailchangecount)

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList, deletedContentItems = []

        // console.log('cradle UPDATECradleContent cradleReferenceIndex, cradleProps',cradleReferenceIndex, cradleProps)

        if (headchangecount || tailchangecount) {

            [localContentList,deletedContentItems] = getUICellShellList({
                cradleProps,
                cradleConfig,
                contentCount,
                localContentList:modelcontentlist,
                headchangecount,
                tailchangecount,
                cradleReferenceIndex,
                observer: this.cellObserverRef.current,
                callbacks:this.contentCallbacksRef.current,
                instanceIdCounterRef:this.instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        deleteAndResetPortals(portalManager, cradleProps.scrollerID, deletedContentItems)

        // console.log('deletedContentItems from updateCradleContent',deletedContentItems)

        // console.log('localContentList.length', localContentList.length)

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        let [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                spineReferenceIndex,
            }
        )

        // console.log('headcontent.length, tailcontent.length',headcontent.length, tailcontent.length)

        cradleContent.cradleModel = localContentList
        cradleContent.headView = cradleContent.headModel = headcontent
        cradleContent.tailView = cradleContent.tailModel = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        if (spinePosOffset !== undefined) {
            
            // let cradleElements = cradleElementsRef.current

            if (cradleProps.orientation == 'vertical') {

                cradleManager.blockScrollPos = viewportElement.scrollTop
                cradleManager.blockScrollProperty = 'scrollTop'
                cradleElements.spineRef.current.style.top = viewportElement.scrollTop + spinePosOffset + 'px'
                cradleElements.spineRef.current.style.left = 'auto'
                cradleElements.headRef.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                cradleManager.blockScrollPos = viewportElement.scrollLeft
                cradleManager.blockScrollProperty = 'scrollLeft'
                cradleElements.spineRef.current.style.top = 'auto'
                cradleElements.spineRef.current.style.left = viewportElement.scrollLeft + spinePosOffset + 'px'
                cradleElements.headRef.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

        }

        cradleManager.cellReferenceData.scrollReferenceIndex = spineReferenceIndex
        cradleManager.cellReferenceData.scrollSpineOffset = spinePosOffset

        cradleManager.cellReferenceData.readyReferenceIndex = spineReferenceIndex
        cradleManager.cellReferenceData.readySpineOffset = spinePosOffset

        stateManager.setCradleState('updatecontent')

    }

    // reset cradle, including allocation between head and tail parts of the cradle
    setCradleContent = (cradleState/*, referenceIndexData*/) => { 

        let viewportData = this._viewportdata
        let cradleProps = this._cradlePropsRef.current
        let cradleConfig = this._cradleconfigRef.current
        let scrollManager = this._managers.current.scroll
        let cradleManager = this._managers.current.cradle
        let stateManager = this._managers.current.state
        let serviceManager = this._managers.current.service

        // console.log('cradleManager in setCradleContent',this._managers,cradleManager)

        let viewportElement = viewportData.elementref.current

        // console.log('setCradleContent start: cradleState, referenceIndexData',cradleState, referenceIndexData)

        // let cradleProps = cradlePropsRef.current

        let visibletargetindexoffset = cradleManager.cellReferenceData.readyReferenceIndex
        let visibletargetscrolloffset = cradleManager.cellReferenceData.readySpineOffset

        let {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        // let cradleConfig = cradleConfigRef.current
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
            observer: this.cellObserverRef.current,
            instanceIdCounterRef:this.instanceIdCounterRef,
        })

        deleteAndResetPortals(portalManager, cradleProps.scrollerID, deleteditems)

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

        cradleManager.cellReferenceData.scrollReferenceIndex = referenceoffset
        cradleManager.cellReferenceData.scrollSpineOffset = spinePosOffset

        cradleManager.cellReferenceData.readyReferenceIndex = referenceoffset
        cradleManager.cellReferenceData.readySpineOffset = spinePosOffset

        // console.log('setting referenceindexdata in setCradleContent',cradleReferenceDataRef.current)

        if (serviceManager.serviceCalls.referenceIndexCallbackRef.current) {

            let cstate = cradleState
            if (cstate == 'setreload') cstate = 'reload'
            serviceManager.serviceCalls.referenceIndexCallbackRef.current(

                cradleManager.cellReferenceData.readyReferenceIndex,'setCradleContent', cstate)
        
        }

        let cradleElements = cradleManager.elements //cradleElementsRef.current

        // const scrollManager = managersRef.current.scrollRef.current

        cradleManager.blockScrollPos = scrollblockOffset - spinePosOffset
        if (orientation == 'vertical') {

            cradleManager.blockScrollProperty = 'scrollTop'

            cradleElements.spineRef.current.style.top = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.spineRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            cradleManager.blockScrollProperty = 'scrollLeft'

            cradleElements.spineRef.current.style.top = 'auto'
            cradleElements.spineRef.current.style.left = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }

}