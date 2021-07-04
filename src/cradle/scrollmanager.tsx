// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

export default class ScrollManager {

    constructor({managers,viewportdata,cradleprops}) {

       this._managers = managers
       this._viewportdata = viewportdata
       this._cradleprops = cradleprops

       let {signals, content, cradle, wings, observers, state} = managers
       // this.scrollmanager = scroll
       this._signalsmanager = signals
       this._contentmanager = content
       this._cradlemanager = cradle
       this._wingsmanager = wings
       this._observersmanager = observers
       this._statemanager = state
    }

    blockScrollPos:number

    blockScrollProperty:string

    private _managers
    private _viewportdata
    private _cradleprops

    // private scrollmanager
    private _signalsmanager
    private _contentmanager
    private _cradlemanager
    private _wingsmanager
    private _observersmanager
    private _statemanager

    private _scrollpositions = {current:0,previous:0}

    private _scrolltimerid = null

    onScroll() {

        if (this._signalsmanager.signals.pauseScrollingEffects) {

            return
            
        }

        let viewportElement = this._viewportdata.current.elementref.current
        // let scrollPositions = scrollPositionsRef.current

        let scrollPositionCurrent = 
            (this._cradleprops.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        this._scrollpositions.previous = this._scrollpositions.current
        this._scrollpositions.current = scrollPositionCurrent

        clearTimeout(this._scrolltimerid)

        let cradleState = this._statemanager.cradleStateRef.current

        // let cradleContent = cradleContentRef.current

        if (!this._viewportdata.current.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
        //             let itemindex = cradleContent.tailModel[0]?.props.index 
        //             if (itemindex === undefined) { // TODO: investigate
        //                 console.log('ERROR: scroll encountered undefined tailcontent lead')
        //             }
        //             let spineVisiblePosOffset
        //             let cradleElements = cradleElementsRef.current

                    if (this._cradleprops.orientation == 'vertical') {

        //                 spineVisiblePosOffset = cradleElements.spine.current.offsetTop - 
        //                     viewportDataRef.current.elementref.current.scrollTop
                            
                    } else {

        //                 spineVisiblePosOffset = cradleElements.spine.current.offsetLeft - 
        //                     viewportDataRef.current.elementref.current.scrollLeft

                    }
        //             scrollReferenceDataRef.current = {
        //                 index:itemindex,
        //                 spineVisiblePosOffset,
        //             }

                } else {

        //             scrollReferenceDataRef.current = getScrollReferenceIndexData({
        //                 viewportData:viewportDataRef.current,
        //                 cradleProps:cradlePropsRef.current,
        //                 cradleConfig:cradleConfigRef.current,
        //             })
        //             setCradleState('updatereposition')
                }

        //         referenceIndexCallbackRef.current && 
        //             referenceIndexCallbackRef.current(scrollReferenceDataRef.current.index,'scrolling', cradleState)

            }

        }

        this._scrolltimerid.current = setTimeout(() => {

        //     if (!isMounted()) return

        //     // console.log('scrollerName, portalData after SCROLL:',scrollerName, cradleContentRef.current.portalData)

        //     let spineVisiblePosOffset
        //     let cradleElements = cradleElementsRef.current

        //     if (cradlePropsRef.current.orientation == 'vertical') {

        //         spineVisiblePosOffset = cradleElements.spine.current.offsetTop - 
        //             viewportDataRef.current.elementref.current.scrollTop
                    
        //     } else {

        //         spineVisiblePosOffset = cradleElements.spine.current.offsetLeft - 
        //             viewportDataRef.current.elementref.current.scrollLeft

        //     }

        //     scrollReferenceDataRef.current.spineVisiblePosOffset = spineVisiblePosOffset

        //     let cradleState = cradleStateRef.current
        //     if (!viewportDataRef.current.isResizing) {
        //         let localrefdata = {...scrollReferenceDataRef.current}

        //         cradleReferenceDataRef.current = localrefdata

        //         // ***new***
        //         if (cradlePropsRef.current.orientation == 'vertical') {

        //             scrollManager.blockScrollProperty = 'scrollTop'
        //             scrollManager.blockScrollPos = viewportElement.scrollTop

        //         } else {
        //             scrollManager.blockScrollProperty = 'scrollLeft'
        //             scrollManager.blockScrollPos = viewportElement.scrollLeft
        //         }

        //     }
        //     switch (cradleState) {

        //         case 'repositioning': {

        //             nextReferenceDataRef.current = {...cradleReferenceDataRef.current}

        //             setCradleState('reposition')

        //             break
        //         }

        //         default: {
        //             // console.log('scrollerID cradle calling updateCradleContent from end of scroll',scrollerID)
        //             updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

        //         }

            // }

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

    }


    setScrollReferenceIndexData({

        viewportData,
        cradleProps,
        cradleConfig,

    }) {

        let {crosscount} = cradleConfig
        let viewportElement = viewportData.elementref.current
        let {orientation, listsize} = cradleProps
        let scrollPos, cellLength
        if (orientation == 'vertical') {

            scrollPos = viewportElement.scrollTop
            cellLength = cradleProps.cellHeight + cradleProps.gap

        } else {

            scrollPos = viewportElement.scrollLeft
            cellLength = cradleProps.cellWidth + cradleProps.gap

        }

        let referencescrolloffset = cellLength - (scrollPos % cellLength)
        if (referencescrolloffset == (cellLength + cradleProps.padding)) {
            referencescrolloffset = 0
        }

        let referencerowindex = Math.ceil((scrollPos - cradleProps.padding)/cellLength)
        let spineReferenceIndex = referencerowindex * crosscount
        spineReferenceIndex = Math.min(spineReferenceIndex,listsize - 1)
        let diff = spineReferenceIndex % crosscount
        spineReferenceIndex -= diff

        let referenceIndexData = {
            index:spineReferenceIndex,
            spineVisiblePosOffset:referencescrolloffset
        }

        if (spineReferenceIndex == 0) referencescrolloffset = 0 // defensive

        this._cradlemanager.scrollReferenceIndex = spineReferenceIndex
        this._cradlemanager.scrollReferenceSpineOffset = referencescrolloffset

    }


}
