// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class ScrollManager {

    constructor({managers,viewportdata,cradleprops}) {

       this.managers = managers
       this.viewportdata = viewportdata
       this.cradleprops = cradleprops

    }

    private managers
    private viewportdata
    private cradleprops
    private blockpos:number
    private scrollproperty:string

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

    onScroll(e) {

        // if (signalsRef.current.pauseScrollingEffects) {
        //     return
        // }

        // let viewportElement = viewportDataRef.current.elementref.current
        // let scrollPositions = scrollPositionsRef.current

        // let scrollPositioncurrent = 
        //     (cradlePropsRef.current.orientation == 'vertical')
        //     ?viewportElement.scrollTop
        //     :viewportElement.scrollLeft

        // if (scrollPositioncurrent < 0) { // for Safari

        //     return 

        // }

        // scrollPositions.previous = scrollPositions.current
        // scrollPositions.current = 
        //     (cradlePropsRef.current.orientation == 'vertical')
        //     ?viewportElement.scrollTop
        //     :viewportElement.scrollLeft

        // clearTimeout(scrollTimeridRef.current)

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
