// scrollmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 500

export default class ScrollHandler {

    constructor(cradleBackProps) {

        this.cradleBackProps = cradleBackProps

    }

    cradleBackProps

    scrollPositions = {start:0, current:0, previous:0, previousupdate:0, currentupdate:0}

    private _scrolltimerid = null

    private isScrolling = false

    onScroll = (e) => {

        const signals = this.cradleBackProps.managersRef.current.interrupts.signals

        // if (signals.pauseScrollingEffects) {

        //     return

        // }

        const viewportData = this.cradleBackProps.viewportdataRef.current
        const viewportElement = viewportData.elementref.current

        const cradleHandler = this.cradleBackProps.managersRef.current.cradle

        const scrollPositionCurrent = 
            (this.cradleBackProps.cradlePropsRef.current.orientation == 'vertical')
            ?viewportElement.scrollTop
            :viewportElement.scrollLeft

        if (!this.isScrolling) {
            this.isScrolling = true
            this.scrollPositions.start = scrollPositionCurrent
            this.scrollPositions.currentupdate = scrollPositionCurrent
        }

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        // cradleHandler.cradleReferenceData.blockScrollPos = scrollPositionCurrent // TODO: redundant?

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        // if (viewportData.index == 6) {
        //     console.log('running onScroll for index, scrollPositions',
        //         viewportData.index,this.scrollPositions)
        // }

        clearTimeout(this._scrolltimerid)

        if (signals.pauseScrollingEffects) {

            return

        }

        const stateHandler = this.cradleBackProps.managersRef.current.state
        const cradleState = stateHandler.cradleStateRef.current

        const contentHandler = this.cradleBackProps.managersRef.current.content
        const serviceHandler = this.cradleBackProps.managersRef.current.service

        if (!viewportData.isResizing) {

            if ((cradleState == 'ready') || (cradleState == 'repositioningA') || (cradleState == 'repositioningB')) {

                if (cradleState == 'ready') {

                    const itemindex = cradleHandler.cradleReferenceData.nextItemIndexReference
                    let spineVisiblePosOffset
                    const cradleElements = cradleHandler.elements

                    if (this.cradleBackProps.cradlePropsRef.current.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                            this.cradleBackProps.viewportdataRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                            this.cradleBackProps.viewportdataRef.current.elementref.current.scrollLeft

                    }
                    cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference = itemindex
                    cradleHandler.cradleReferenceData.scrollImpliedCradlePosOffset = spineVisiblePosOffset

                }

                if ((cradleState == 'repositioningA') || (cradleState == 'repositioningB')) {

                    this._setScrollReferenceIndexData()
                    if (cradleState == 'repositioningA') stateHandler.setCradleState('repositioningB')

                }

                // TODO: re-instate the following
                serviceHandler.serviceCalls.referenceIndexCallbackRef.current && 
                    serviceHandler.serviceCalls.referenceIndexCallbackRef.current(cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference,'scrolling', cradleState)

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this._onAfterScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        return false

    }


    private _onAfterScroll = () => {

        this.isScrolling = false

        const stateHandler = this.cradleBackProps.managersRef.current.state
        const contentHandler = this.cradleBackProps.managersRef.current.content
        const viewportData = this.cradleBackProps.viewportdataRef.current

        const cradleState = stateHandler.cradleStateRef.current

        // if (viewportData.index == 6) {
        //     console.log('running onAfterScroll for index, cradleState',
        //         viewportData.index,this.scrollPositions, cradleState)
        // }

        switch (cradleState) {

            case 'repositioningA': 
            case 'repositioningB':
            {

                stateHandler.setCradleState('finishreposition')

                break
            }

            default: {

                if ((this.scrollPositions.start != this.scrollPositions.current) || 
                    (this.scrollPositions.current != this.scrollPositions.previous)) {

                    if (stateHandler.isMountedRef.current) {

                        this.updateReferenceData()
                        
                        // contentHandler.updateCradleContent([], 'endofscroll') // for Safari to compensate for overscroll

                    }

                }
            }

        }
        
    }

    updateReferenceData = () => {

        const stateHandler = this.cradleBackProps.managersRef.current.state
        const cradleHandler = this.cradleBackProps.managersRef.current.cradle
        const cradleProps = this.cradleBackProps.cradlePropsRef.current
        const viewportData = this.cradleBackProps.viewportdataRef.current
        // const contentHandler = this.cradleBackProps.managersRef.current.content

        if (!stateHandler.isMountedRef.current) return

        let spineVisiblePosOffset
        const cradleElements = cradleHandler.elements

        const viewportElement = viewportData.elementref.current
        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        cradleHandler.cradleReferenceData.scrollImpliedCradlePosOffset = spineVisiblePosOffset

        if (!viewportData.isResizing) {

            cradleHandler.cradleReferenceData.nextItemIndexReference = 
                cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference
            cradleHandler.cradleReferenceData.nextCradlePosOffset = 
                cradleHandler.cradleReferenceData.scrollImpliedCradlePosOffset

            this.updateBlockScrollPos()

        }

    }

    updateBlockScrollPos = () => {

        const cradleHandler = this.cradleBackProps.managersRef.current.cradle
        const cradleProps = this.cradleBackProps.cradlePropsRef.current
        const viewportData = this.cradleBackProps.viewportdataRef.current
        const viewportElement = viewportData.elementref.current

        if (cradleProps.orientation == 'vertical') {

            cradleHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
            cradleHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

        } else {
            cradleHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            cradleHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
        }

    }

    private _setScrollReferenceIndexData = () => {

        const viewportData = this.cradleBackProps.viewportdataRef.current
        let cradleProps = this.cradleBackProps.cradlePropsRef.current
        let cradleConfig = this.cradleBackProps.cradleConfigRef.current

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

        let cradleHandler = this.cradleBackProps.managersRef.current.cradle
        cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference = spineReferenceIndex
        cradleHandler.cradleReferenceData.scrollImpliedCradlePosOffset = referencescrolloffset

    }

}
