// contentmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class ContentManager extends CradleManagement{

   constructor(commonPropsRef) {

      super(commonPropsRef)

   }

   content = {

      cradleModel: null,
      headModel: null,
      tailModel: null,
      headView: [],
      tailView: [],

    }

    updateCradleContent = (entries, source = 'notifications') => {

    //     // console.log('updateCradleContent source',scrollerID,source)

    //     let viewportData = viewportDataRef.current
    //     let viewportElement = viewportData.elementref.current
    //     if (!viewportElement) {
    //         console.error('ERROR: viewport element not set in updateCradleContent',
    //             scrollerID, viewportData.elementref.current,viewportDataRef)
    //         return
    //     }
            
    //     let cradleProps = cradlePropsRef.current

    //     let scrollOffset
    //     if (cradleProps.orientation == 'vertical') {
    //         scrollOffset = viewportElement.scrollTop
    //     } else {
    //         scrollOffset = viewportElement.scrollLeft
    //     }
    //     if ( scrollOffset < 0) { // for Safari elastic bounce at top of scroll

    //         return

    //     }

    //     // ----------------------------[ 1. initialize ]----------------------------

    //     let scrollPositions = scrollPositionsRef.current

    //     let scrollforward
    //     if (scrollPositions.current == scrollPositions.previous) { // edge case 

    //         scrollforward = previousScrollForwardRef.current

    //     } else {

    //         scrollforward = scrollPositions.current > scrollPositions.previous
    //         previousScrollForwardRef.current = scrollforward

    //     }

    //     if (scrollforward === undefined) {
    //         return // init call
    //     }

    //     let cradleElements = cradleElementsRef.current
    //     let cradleContent = contentManagerRef.current.content
    //     let cradleConfig = cradleConfigRef.current

    //     let itemElements = itemElementsRef.current

    //     let modelcontentlist = cradleContent.cradleModel

    //     let cradleReferenceIndex = modelcontentlist[0].props.index

    //     // --------------------[ 2. filter intersections list ]-----------------------

    //     // filter out inapplicable intersection entries
    //     // we're only interested in intersections proximal to the spine
    //     let intersections = isolateRelevantIntersections({

    //         scrollforward,
    //         intersections:entries,
    //         cradleContent,
    //         cellObserverThreshold:cradleConfig.cellObserverThreshold,

    //     })

    //     // console.log('intersections', intersections)

    //     // --------------------------------[ 3. Calculate shifts ]-------------------------------

    //     let [cradleindex, 
    //         cradleitemshift, 
    //         spineReferenceIndex, 
    //         referenceitemshift,
    //         spinePosOffset, 
    //         contentCount] = calcContentShifts({

    //             cradleProps,
    //             cradleConfig,
    //             cradleElements,
    //             cradleContent,
    //             viewportElement,
    //             itemElements,
    //             intersections,
    //             scrollforward,

    //     })

    //      // console.log('in updateCradleContent: cradleindex, cradleitemshift, spineReferenceIndex, referenceitemshift, spinePosOffset, contentCount',
    //      //     cradleindex, cradleitemshift, spineReferenceIndex, referenceitemshift, spinePosOffset, contentCount)

    //     if ((referenceitemshift == 0 && cradleitemshift == 0)) return

    //     // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

    //     let [headchangecount,tailchangecount] = calcHeadAndTailChanges({

    //         cradleProps,
    //         cradleConfig,
    //         cradleContent,
    //         cradleshiftcount:cradleitemshift,
    //         scrollforward,
    //         cradleReferenceIndex,

    //     })

    //     // console.log('headchangecount,tailchangecount',headchangecount,tailchangecount)

    //     // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

    //     // collect modified content
    //     let localContentList, deletedContentItems = []

    //     // console.log('cradle UPDATECradleContent cradleReferenceIndex, cradleProps',cradleReferenceIndex, cradleProps)

    //     if (headchangecount || tailchangecount) {

    //         [localContentList,deletedContentItems] = getUIContentList({
    //             cradleProps,
    //             cradleConfig,
    //             contentCount,
    //             localContentList:modelcontentlist,
    //             headchangecount,
    //             tailchangecount,
    //             cradleReferenceIndex,
    //             observer: cellObserverRef.current,
    //             callbacks:callbacksRef.current,
    //             instanceIdCounterRef,
    //         })
    //     } else {

    //         localContentList = modelcontentlist

    //     }

    //     deleteAndResetPortals(portalManager, scrollerID, deletedContentItems)

    //     // console.log('deletedContentItems from updateCradleContent',deletedContentItems)

    //     // console.log('localContentList.length', localContentList.length)

    //     // ----------------------------------[ 7. allocate cradle content ]--------------------------

    //     let [headcontent, tailcontent] = allocateContentList(
    //         {
    //             contentlist:localContentList,
    //             spineReferenceIndex,
    //         }
    //     )

    //     // console.log('headcontent.length, tailcontent.length',headcontent.length, tailcontent.length)

    //     cradleContent.cradleModel = localContentList
    //     cradleContent.headView = cradleContent.headModel = headcontent
    //     cradleContent.tailView = cradleContent.tailModel = tailcontent

    //     // -------------------------------[ 8. set css changes ]-------------------------

    //     if (spinePosOffset !== undefined) {
            
    //         let cradleElements = cradleElementsRef.current

    //         const scrollManager = managersRef.current.scrollRef.current
    //         if (cradleProps.orientation == 'vertical') {

    //             scrollManager.blockScrollPos = viewportElement.scrollTop
    //             scrollManager.blockScrollProperty = 'scrollTop'
    //             cradleElements.spine.current.style.top = viewportElement.scrollTop + spinePosOffset + 'px'
    //             cradleElements.spine.current.style.left = 'auto'
    //             cradleElements.head.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

    //         } else {

    //             scrollManager.blockScrollPos = viewportElement.scrollLeft
    //             scrollManager.blockScrollProperty = 'scrollLeft'
    //             cradleElements.spine.current.style.top = 'auto'
    //             cradleElements.spine.current.style.left = viewportElement.scrollLeft + spinePosOffset + 'px'
    //             cradleElements.head.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

    //         }

    //     }

    //     cradleReferenceDataRef.current = // **new July 3**
    //     scrollReferenceDataRef.current = {
    //         index:spineReferenceIndex,
    //         spineVisiblePosOffset:spinePosOffset
    //     }

    //     cradleManager.scrollReferenceIndex = spineReferenceIndex
    //     cradleManager.scrollSpineOffset = spinePosOffset

    //     cradleManager.readyReferenceIndex = spineReferenceIndex
    //     cradleManager.readySpineOffset = spinePosOffset

    //     setCradleState('updatecontent')

    }

    // reset cradle, including allocation between head and tail parts of the cradle
   setCradleContent = (cradleState, referenceIndexData) => { 

        // let cradleProps = cradlePropsRef.current
        // let { index: visibletargetindexoffset, 
        //     spineVisiblePosOffset: visibletargetscrolloffset } = referenceIndexData

        // let {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        // let cradleConfig = cradleConfigRef.current
        // let { cradleRowcount,
        //     crosscount,
        //     viewportRowcount } = cradleConfig

        // if (cradleState == 'reposition') {

        //     visibletargetscrolloffset = (visibletargetindexoffset == 0)?padding:gap

        // }

        // let localContentList = []
        // let cradleContent = contentManagerRef.current.content
        // // cradleContent.portalData.clear()

        // let {cradleReferenceIndex, referenceoffset, contentCount, scrollblockOffset, spinePosOffset, spineAdjustment} = 
        //     getContentListRequirements({
        //         cradleProps,
        //         cradleConfig,
        //         visibletargetindexoffset,
        //         targetViewportOffset:visibletargetscrolloffset,
        //         viewportElement:viewportDataRef.current.elementref.current
        //     })

        // // console.log('setCradleContent getContentListRequirements: cradleReferenceIndex, referenceoffset, contentCount, scrollblockOffset, spinePosOffset, spineAdjustment',
        // //     cradleReferenceIndex, referenceoffset, contentCount, scrollblockOffset, spinePosOffset, spineAdjustment)

        // // console.log('cradle SETCradleContent cradleProps',cradleProps)

        // // returns content constrained by cradleRowcount
        // let [childlist,deleteditems] = getUIContentList({

        //     cradleProps,
        //     cradleConfig,
        //     contentCount,
        //     cradleReferenceIndex,
        //     headchangecount:0,
        //     tailchangecount:contentCount,
        //     localContentList,
        //     callbacks:callbacksRef.current,
        //     observer: cellObserverRef.current,
        //     instanceIdCounterRef,
        // })

        // deleteAndResetPortals(portalManager, scrollerID, deleteditems)

        // // console.log('contentlist, deleteditems from setCradleContent',childlist,deleteditems)

        // // console.log('childlist.length, contentCount, rows from setContent', childlist.length, contentCount, Math.ceil(contentCount/crosscount))

        // let [headcontentlist, tailcontentlist] = allocateContentList({

        //     contentlist:childlist,
        //     spineReferenceIndex:referenceoffset,
    
        // })

        // // console.log('headcontentlist.length, tailcontentlist.length',headcontentlist.length, tailcontentlist.length)

        // if (headcontentlist.length == 0) {
        //     spinePosOffset = padding
        // }

        // cradleContent.cradleModel = childlist
        // cradleContent.headModel = headcontentlist
        // cradleContent.tailModel = tailcontentlist

        // scrollReferenceDataRef.current = 
        // cradleReferenceDataRef.current = {

        //     index: referenceoffset,
        //     spineVisiblePosOffset:spinePosOffset,

        // }

        // cradleManager.scrollReferenceIndex = referenceoffset
        // cradleManager.scrollSpineOffset = spinePosOffset

        // cradleManager.readyReferenceIndex = referenceoffset
        // cradleManager.readySpineOffset = spinePosOffset

        // // console.log('setting referenceindexdata in setCradleContent',cradleReferenceDataRef.current)

        // if (referenceIndexCallbackRef.current) {

        //     let cstate = cradleState
        //     if (cstate == 'setreload') cstate = 'reload'
        //     referenceIndexCallbackRef.current(
        //         cradleReferenceDataRef.current.index, 'setCradleContent', cstate)

        // }

        // let cradleElements = cradleElementsRef.current

        // const scrollManager = managersRef.current.scrollRef.current

        // scrollManager.blockScrollPos = scrollblockOffset - spinePosOffset
        // if (orientation == 'vertical') {

        //     scrollManager.blockScrollProperty = 'scrollTop'

        //     cradleElements.spine.current.style.top = (scrollblockOffset + spineAdjustment) + 'px'
        //     cradleElements.spine.current.style.left = 'auto'
        //     cradleElements.head.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        // } else { // orientation = 'horizontal'

        //     scrollManager.blockScrollProperty = 'scrollLeft'

        //     cradleElements.spine.current.style.top = 'auto'
        //     cradleElements.spine.current.style.left = (scrollblockOffset + spineAdjustment) + 'px'
        //     cradleElements.head.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        // }

   }

}