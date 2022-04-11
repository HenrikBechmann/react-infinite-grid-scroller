// contentmanager.tsx
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

   constructor(cradleBackProps, contentCallbacksRef) {

      this.cradleBackProps = cradleBackProps

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

    private cradleBackProps

    private instanceIdCounterRef = {
       current:0
    }
    private instanceIdMap = new Map()

    private _previousScrollForward = undefined

    private contentCallbacksRef

    // Two public methods - setCradleContent and updateCradleContent

    // reset cradle, including allocation between head and tail parts of the cradle
    // called only from cradle preparerender event


    // TODO: last row is sometimes left off with reposition
    public setCradleContent = (cradleState) => { 

        const viewportData = this.cradleBackProps.viewportdataRef.current
        const cradleProps = this.cradleBackProps.cradlePropsRef.current
        const cradleConfig = this.cradleBackProps.cradleConfigRef.current
        const scrollHandler = this.cradleBackProps.managersRef.current.scroll
        const cradleHandler = this.cradleBackProps.managersRef.current.cradle
        const stateHandler = this.cradleBackProps.managersRef.current.state
        const serviceHandler = this.cradleBackProps.managersRef.current.service
        const interruptHandler = this.cradleBackProps.managersRef.current.interrupts
        const cradleData = this.cradleBackProps.cradleDataRef.current

        // if (viewportData.index == 6) {
        //     console.log('SETTING content - cradleState, cradleData in setCradleContent',
                    // cradleState, cradleData)
        // }

        const viewportElement = viewportData.elementref.current

        const visibletargetindexoffset = cradleHandler.cradleReferenceData.nextItemIndexReference
        let visibletargetscrolloffset = cradleHandler.cradleReferenceData.nextCradlePosOffset

        const {cellHeight, cellWidth, orientation, runwaycount, gap, padding, listsize} = cradleProps

        const { cradleRowcount,
            crosscount,
            viewportRowcount } = cradleConfig

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
            spinePosOffset, 
            spineAdjustment
        } = 
            getContentListRequirements({
                cradleProps,
                cradleConfig,
                visibletargetindexoffset,
                targetViewportOffset:visibletargetscrolloffset,
                viewportElement:viewportData.elementref.current
            })

         // console.log('cradleActualContentCount from getContentListRequirements',cradleActualContentCount)

        // if (viewportData.index == 6) {
        //     console.log('SET index, cradleActualContentCount', viewportData.index,cradleActualContentCount)
        // }

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
            observer: interruptHandler.cellIntersect.observer,
            instanceIdCounterRef:this.instanceIdCounterRef,
        })

        deleteAndRerenderPortals(cradleData.portalHandler, deleteditems)

        const [headcontentlist, tailcontentlist] = allocateContentList({

            contentlist:childlist,
            spinereferenceindex:referenceoffset,
    
        })

        if (headcontentlist.length == 0) {
            spinePosOffset = padding
        }

        cradleContent.cradleModel = childlist
        cradleContent.headModel = headcontentlist
        cradleContent.tailModel = tailcontentlist

        cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference = referenceoffset
        cradleHandler.cradleReferenceData.scrollImpliedCradlePosOffset = spinePosOffset

        cradleHandler.cradleReferenceData.nextItemIndexReference = referenceoffset
        cradleHandler.cradleReferenceData.nextCradlePosOffset = spinePosOffset

        if (serviceHandler.serviceCalls.referenceIndexCallbackRef.current) {

            let cstate = cradleState
            // if (cstate == 'setreload') cstate = 'reload'
            serviceHandler.serviceCalls.referenceIndexCallbackRef.current(

                cradleHandler.cradleReferenceData.nextItemIndexReference,'setCradleContent', cstate)
        
        }

        const cradleElements = cradleHandler.elements //cradleElementsRef.current

        cradleHandler.cradleReferenceData.blockScrollPos = scrollblockOffset - spinePosOffset
        // console.log('setting blockScrollPos in setCradleContent: blockScrollPos, scrollblockOffset, spinePosOffset',
        //     cradleHandler.cradleReferenceData.blockScrollPos, scrollblockOffset, spinePosOffset)

        if (orientation == 'vertical') {

            cradleHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
            // cradleHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

            cradleElements.spineRef.current.style.top = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.spineRef.current.style.left = 'auto'
            cradleElements.headRef.current.style.paddingBottom = headcontentlist.length?cradleProps.gap + 'px':0

        } else { // orientation = 'horizontal'

            cradleHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            // cradleHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft

            cradleElements.spineRef.current.style.top = 'auto'
            cradleElements.spineRef.current.style.left = (scrollblockOffset + spineAdjustment) + 'px'
            cradleElements.headRef.current.style.paddingRight = headcontentlist.length?cradleProps.gap + 'px':0

        }

    }

    public updateCradleContent = (entries, source = 'notifications') => {

        const viewportData = this.cradleBackProps.viewportdataRef.current
        const cradleProps = this.cradleBackProps.cradlePropsRef.current
        const scrollHandler = this.cradleBackProps.managersRef.current.scroll
        const cradleHandler = this.cradleBackProps.managersRef.current.cradle
        const stateHandler = this.cradleBackProps.managersRef.current.state
        const interruptHandler = this.cradleBackProps.managersRef.current.interrupts

        const cradleData = this.cradleBackProps.cradleDataRef.current

        // if (viewportData.index == 6) {
            // console.log('UPDATING content - source; in updateCradleContent',source)
        // }

        const viewportElement = viewportData.elementref.current
        if (!viewportElement) { 
            // not mounted; return
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

        const scrollPositions = scrollHandler.scrollPositions //scrollPositionsRef.current

        let scrollingviewportforward
        if (scrollPositions.current == scrollPositions.previous) { // edge case 

            scrollingviewportforward = this._previousScrollForward

        } else {

            // console.log('scrollPositions',scrollPositions)
            scrollingviewportforward = scrollPositions.currentupdate > scrollPositions.previousupdate
            this._previousScrollForward = scrollingviewportforward

        }

        if (scrollingviewportforward === undefined) {
            return // init call
        }

        const cradleElements = cradleHandler.elements
        const cradleContent = this.content
        const cradleConfig = this.cradleBackProps.cradleConfigRef.current

        const itemElements = this.itemElements

        const modelcontentlist = cradleContent.cradleModel

        const cradleReferenceIndex = modelcontentlist[0].props.index

        // --------------------[ 2. filter intersections list ]-----------------------

        // filter out inapplicable intersection entries
        // we're only interested in intersections proximal to the spine
        let shiftingintersections = []
        if (entries.length) {
            shiftingintersections = isolateShiftingIntersections({

                scrollingviewportforward,
                intersections:entries,
                cradleContent,
                cellObserverThreshold:cradleConfig.cellObserverThreshold,

            })
            // console.log('SHIFTING intersections',shiftingintersections)
        }

        // --------------------------------[ 3. Calculate shifts ]-------------------------------

        const [
            cradlereferenceindex, 
            cradleitemshift, 
            spinereferenceindex, 
            spineitemshift, 
            spineposoffset, 
            newCradleActualContentCount,
            headchange,
            tailchange,
        ] = calcContentShifts({

            cradleProps,
            cradleConfig,
            cradleElements,
            cradleContent,
            viewportElement,
            // itemElements,
            shiftingintersections,
            scrollingviewportforward,
            viewportData,

        })

        if ((spineitemshift == 0 && cradleitemshift == 0)) return

        // ------------------[ 4. calculate head and tail consolidated cradle content changes ]-----------------

        // the number of items to add to and clip from the contentlist
        // negative number is clip; positive number is add
        const [headchangecount,tailchangecount] = calcHeadAndTailChanges({ 

            cradleProps,
            cradleConfig,
            cradleContent,
            cradleshiftcount:cradleitemshift,
            scrollingviewportforward,
            cradleReferenceIndex, // previous cradlereferenceindex

        })

        // ----------------------------------[ 5. reconfigure cradle content ]--------------------------

        // collect modified content
        let localContentList, deletedContentItems = []

        if (headchangecount || tailchangecount) { // TODO: apparently headchangecount of -0 fails test, should be fixed

            [localContentList,deletedContentItems] = getUICellShellList({
                cradleProps,
                cradleConfig,
                cradleActualContentCount:newCradleActualContentCount,
                localContentList:modelcontentlist,
                headchangecount,
                tailchangecount,
                cradleReferenceIndex,
                observer: interruptHandler.cellIntersect.observer,
                callbacks:this.contentCallbacksRef.current,
                instanceIdCounterRef:this.instanceIdCounterRef,
            })
        } else {

            localContentList = modelcontentlist

        }

        deleteAndRerenderPortals(cradleData.portalHandler, deletedContentItems)

        // ----------------------------------[ 7. allocate cradle content ]--------------------------

        const [headcontent, tailcontent] = allocateContentList(
            {
                contentlist:localContentList,
                spinereferenceindex, // TODO: BUG: set to 100 for problem
            }
        )

        cradleContent.cradleModel = localContentList
        cradleContent.headView = cradleContent.headModel = headcontent
        cradleContent.tailView = cradleContent.tailModel = tailcontent

        // -------------------------------[ 8. set css changes ]-------------------------

        scrollHandler.updateBlockScrollPos()

        if (spineposoffset !== undefined) {

            // scrollHandler.updateBlockScrollPos()
            
            if (cradleProps.orientation == 'vertical') {

                // cradleHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollTop
                // cradleHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
                cradleElements.spineRef.current.style.top = viewportElement.scrollTop + spineposoffset + 'px'
                cradleElements.spineRef.current.style.left = 'auto'
                cradleElements.headRef.current.style.paddingBottom = headcontent.length?cradleProps.gap + 'px':0

            } else {

                // cradleHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
                // cradleHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
                cradleElements.spineRef.current.style.top = 'auto'
                cradleElements.spineRef.current.style.left = viewportElement.scrollLeft + spineposoffset + 'px'
                cradleElements.headRef.current.style.paddingRight = headcontent.length?cradleProps.gap + 'px':0

            }

        }

        cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference = spinereferenceindex
        cradleHandler.cradleReferenceData.scrollImpliedCradlePosOffset = spineposoffset

        cradleHandler.cradleReferenceData.nextItemIndexReference = spinereferenceindex
        cradleHandler.cradleReferenceData.nextCradlePosOffset = spineposoffset

        stateHandler.setCradleState('renderupdatedcontent')

    }

}