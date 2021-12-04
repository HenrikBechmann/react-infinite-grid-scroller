// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

export default class ScrollManager {

    constructor(commonProps) {

        this.commonProps = commonProps

    }

    commonProps

    scrollPositions = {current:0,previous:0}

    private _scrolltimerid = null

    onScroll = (e) => {

        // e.preventDefault()
        // e.stopPropagation()

        let signals = this.commonProps.managersRef.current.signals.signals

        if (signals.pauseScrollingEffects) {

            return

        }

        let viewportData = this.commonProps.viewportdataRef.current
        let viewportElement = viewportData.elementref.current

        let cradleManager = this.commonProps.managersRef.current.cradle

        let scrollPositionCurrent = 
            (this.commonProps.cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        // cradleManager.cradleReferenceData.blockScrollPos = scrollPositionCurrent // EXPERIMENTAL!!

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        clearTimeout(this._scrolltimerid)

        let stateManager = this.commonProps.managersRef.current.state
        let cradleState = stateManager.cradleStateRef.current

        let contentManager = this.commonProps.managersRef.current.content
        let serviceManager = this.commonProps.managersRef.current.service

        if (!viewportData.isResizing) {

            if (cradleState == 'ready' || cradleState == 'repositioning') {

                if (cradleState == 'ready') {
                    // let itemindex = contentManager.content.tailModel[0]?.props.index 
                    // console.log('itemindex, nextItemIndexReference',itemindex,cradleManager.cradleReferenceData.nextItemIndexReference)

                    let itemindex = cradleManager.cradleReferenceData.nextItemIndexReference
                    let spineVisiblePosOffset
                    let cradleElements = cradleManager.elements

                    if (this.commonProps.cradlePropsRef.current.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                            this.commonProps.viewportdataRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                            this.commonProps.viewportdataRef.current.elementref.current.scrollLeft

                    }
                    cradleManager.cradleReferenceData.scrollImpliedItemIndexReference = itemindex
                    cradleManager.cradleReferenceData.scrollImpliedCradlePixelOffset = spineVisiblePosOffset

                }

                if (cradleState == 'repositioning') {

                    this._setScrollReferenceIndexData()
                    stateManager.setCradleState('updatereposition')

                }

                // TODO: re-instate the following
                serviceManager.serviceCalls.referenceIndexCallbackRef.current && 
                    serviceManager.serviceCalls.referenceIndexCallbackRef.current(cradleManager.cradleReferenceData.scrollImpliedItemIndexReference,'scrolling', cradleState)

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this._onAfterScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        return false

    }


    private _onAfterScroll = () => {

        let stateManager = this.commonProps.managersRef.current.state
        let cradleManager = this.commonProps.managersRef.current.cradle
        let cradleProps = this.commonProps.cradlePropsRef.current
        let viewportData = this.commonProps.viewportdataRef.current
        // let cradleMaster = this._managersRef.current.cradleMaster
        let contentManager = this.commonProps.managersRef.current.content

        if (!stateManager.isMountedRef.current) return

        let spineVisiblePosOffset
        let cradleElements = cradleManager.elements

        let viewportElement = viewportData.elementref.current
        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        cradleManager.cradleReferenceData.scrollImpliedCradlePixelOffset = spineVisiblePosOffset

        if (!viewportData.isResizing) {

            // if (stateManager.cradleStateRef.current == 'repositioning') {

                // this._setScrollReferenceIndexData()

            // }

            cradleManager.cradleReferenceData.nextItemIndexReference = 
                cradleManager.cradleReferenceData.scrollImpliedItemIndexReference
            cradleManager.cradleReferenceData.nextCradlePixelOffset = 
                cradleManager.cradleReferenceData.scrollImpliedCradlePixelOffset

            if (cradleProps.orientation == 'vertical') {

                cradleManager.cradleReferenceData.blockScrollProperty = 'scrollTop'
                cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

            } else {
                cradleManager.cradleReferenceData.blockScrollProperty = 'scrollLeft'
                cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
            }

        }

        let cradleState = stateManager.cradleStateRef.current
        switch (cradleState) {

            case 'repositioning': {

                // cradleManager.theNextItemIndexReference = cradleManager.nextItemIndexReference
                // cradleManager.theNextSpinePixelOffset = cradleManager.nextCradlePixelOffset

                stateManager.setCradleState('reposition')

                break
            }

            default: {

                contentManager.updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

            }

        }
        
    }

    private _setScrollReferenceIndexData = () => {

        let viewportData = this.commonProps.viewportdataRef.current
        let cradleProps = this.commonProps.cradlePropsRef.current
        let cradleConfig = this.commonProps.cradleConfigRef.current

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

        let cradleManager = this.commonProps.managersRef.current.cradle
        cradleManager.cradleReferenceData.scrollImpliedItemIndexReference = spineReferenceIndex
        cradleManager.cradleReferenceData.scrollImpliedCradlePixelOffset = referencescrolloffset

    }

}
