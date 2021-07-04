// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class ScrollManager {

    constructor({managers,viewportdata,cradleprops}) {

       this.managers = managers
       this.viewportdata = viewportdata
       this.cradleprops = cradleprops
       let {scroll, signals, content, cradle, wings, observers, state} = managers
       this.scrollmanager = scroll
       this.signalsmanager = signals
       this.contentmanager = content
       this.cradlemanager = cradle
       this.wingsmanager = wings
       this.observersmanager = observers
       this.statemanager = state
    }

    private managers
    private viewportdata
    private cradleprops

    private scrollmanager
    private signalsmanager
    private contentmanager
    private cradlemanager
    private wingsmanager
    private observersmanager
    private statemanager

    private blockpos:number
    private scrollproperty:string

    private scrollpositions = {current:0,previous:0}

    private scrolltimerid = null



    set blockScrollPos(blockpos) {
        this.blockpos = blockpos
    }

    get blockScrollPos() {
        return this.blockpos
    }

    set blockScrollProperty(property) {
        this.scrollproperty = property
    }

    get blockScrollProperty() {
        return this.scrollproperty
    }

    onScroll() {

        if (this.signalsmanager.signals.pauseScrollingEffects) {

            return
            
        }

        let viewportElement = this.viewportdata.current.elementref.current
        // let scrollPositions = scrollPositionsRef.current

        let scrollPositionCurrent = 
            (this.cradleprops.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        this.scrollpositions.previous = this.scrollpositions.current
        this.scrollpositions.current = scrollPositionCurrent
            // (cradlePropsRef.current.orientation == 'vertical')
            // ?viewportElement.scrollTop
            // :viewportElement.scrollLeft

        clearTimeout(this.scrolltimerid)

        // let cradleState = cradleStateRef.current

        // let cradleContent = cradleContentRef.current

        // if (!viewportDataRef.current.isResizing) {

        //     if (cradleState == 'ready' || cradleState == 'repositioning') {

        //         if (cradleState == 'ready') {
        //             let itemindex = cradleContent.tailModel[0]?.props.index 
        //             if (itemindex === undefined) { // TODO: investigate
        //                 console.log('ERROR: scroll encountered undefined tailcontent lead')
        //             }
        //             let spineVisiblePosOffset
        //             let cradleElements = cradleElementsRef.current

        //             if (cradlePropsRef.current.orientation == 'vertical') {

        //                 spineVisiblePosOffset = cradleElements.spine.current.offsetTop - 
        //                     viewportDataRef.current.elementref.current.scrollTop
                            
        //             } else {

        //                 spineVisiblePosOffset = cradleElements.spine.current.offsetLeft - 
        //                     viewportDataRef.current.elementref.current.scrollLeft

        //             }
        //             scrollReferenceDataRef.current = {
        //                 index:itemindex,
        //                 spineVisiblePosOffset,
        //             }

        //         } else {

        //             scrollReferenceDataRef.current = getScrollReferenceIndexData({
        //                 viewportData:viewportDataRef.current,
        //                 cradleProps:cradlePropsRef.current,
        //                 cradleConfig:cradleConfigRef.current,
        //             })
        //             setCradleState('updatereposition')
        //         }

        //         referenceIndexCallbackRef.current && 
        //             referenceIndexCallbackRef.current(scrollReferenceDataRef.current.index,'scrolling', cradleState)

        //     }

        // }

        // scrollTimeridRef.current = setTimeout(() => {

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

        //         stableReferenceDataRef.current = localrefdata

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

        //             callingReferenceDataRef.current = {...stableReferenceDataRef.current}

        //             setCradleState('reposition')

        //             break
        //         }

        //         default: {
        //             // console.log('scrollerID cradle calling updateCradleContent from end of scroll',scrollerID)
        //             updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

        //         }

        //     }

        // },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

    }


}
