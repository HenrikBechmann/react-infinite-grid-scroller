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

        const signals = this.commonProps.managersRef.current.interrupts.signals

        // if (signals.pauseScrollingEffects) {

        //     return

        // }

        const viewportData = this.commonProps.viewportdataRef.current
        const viewportElement = viewportData.elementref.current

        const cradleManager = this.commonProps.managersRef.current.cradle

        const scrollPositionCurrent = 
            (this.commonProps.cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        // cradleManager.cradleReferenceData.blockScrollPos = scrollPositionCurrent // TODO: redundant?

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        clearTimeout(this._scrolltimerid)

        if (signals.pauseScrollingEffects) {

            return

        }

        const stateManager = this.commonProps.managersRef.current.state
        const cradleState = stateManager.cradleStateRef.current

        const contentManager = this.commonProps.managersRef.current.content
        const serviceManager = this.commonProps.managersRef.current.service

        if (!viewportData.isResizing) {

            if ((cradleState == 'ready') || (cradleState == 'repositioningA') || (cradleState == 'repositioningB')) {

                if (cradleState == 'ready') {

                    const itemindex = cradleManager.cradleReferenceData.nextItemIndexReference
                    let spineVisiblePosOffset
                    const cradleElements = cradleManager.elements

                    if (this.commonProps.cradlePropsRef.current.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                            this.commonProps.viewportdataRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                            this.commonProps.viewportdataRef.current.elementref.current.scrollLeft

                    }
                    cradleManager.cradleReferenceData.scrollImpliedItemIndexReference = itemindex
                    cradleManager.cradleReferenceData.scrollImpliedCradlePosOffset = spineVisiblePosOffset

                }

                if ((cradleState == 'repositioningA') || (cradleState == 'repositioningB')) {

                    this._setScrollReferenceIndexData()
                    if (cradleState == 'repositioningA') stateManager.setCradleState('repositioningB')

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

        const stateManager = this.commonProps.managersRef.current.state
        const contentManager = this.commonProps.managersRef.current.content

        const cradleState = stateManager.cradleStateRef.current
        switch (cradleState) {

            case 'repositioningA': 
            case 'repositioningB':
            {

                stateManager.setCradleState('finishreposition')

                break
            }

            default: {
                this.updateReferenceData()
                contentManager.updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

            }

        }
        
    }

    updateReferenceData = () => {

        const stateManager = this.commonProps.managersRef.current.state
        const cradleManager = this.commonProps.managersRef.current.cradle
        const cradleProps = this.commonProps.cradlePropsRef.current
        const viewportData = this.commonProps.viewportdataRef.current
        // const contentManager = this.commonProps.managersRef.current.content

        if (!stateManager.isMountedRef.current) return

        let spineVisiblePosOffset
        const cradleElements = cradleManager.elements

        const viewportElement = viewportData.elementref.current
        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        cradleManager.cradleReferenceData.scrollImpliedCradlePosOffset = spineVisiblePosOffset

        if (!viewportData.isResizing) {

            cradleManager.cradleReferenceData.nextItemIndexReference = 
                cradleManager.cradleReferenceData.scrollImpliedItemIndexReference
            cradleManager.cradleReferenceData.nextCradlePosOffset = 
                cradleManager.cradleReferenceData.scrollImpliedCradlePosOffset

            this.updateBlockScrollPos()

        }

    }

    updateBlockScrollPos = () => {

        const cradleManager = this.commonProps.managersRef.current.cradle
        const cradleProps = this.commonProps.cradlePropsRef.current
        const viewportData = this.commonProps.viewportdataRef.current
        const viewportElement = viewportData.elementref.current

        if (cradleProps.orientation == 'vertical') {

            cradleManager.cradleReferenceData.blockScrollProperty = 'scrollTop'
            cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

        } else {
            cradleManager.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            cradleManager.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
        }

    }

    private _setScrollReferenceIndexData = () => {

        const viewportData = this.commonProps.viewportdataRef.current
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
        cradleManager.cradleReferenceData.scrollImpliedCradlePosOffset = referencescrolloffset

    }

}
