// scrollhandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 500

export default class ScrollHandler {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    cradleParameters

    scrollPositions = {start:0, current:0, previous:0, previousupdate:0, currentupdate:0}

    private _scrolltimerid = null

    private isScrolling = false

    onScroll = (e) => {

        const signals = this.cradleParameters.handlersRef.current.interrupts.signals

        // if (signals.pauseScrollingEffects) {

        //     return

        // }

        const viewportProperties = this.cradleParameters.viewportPropertiesRef.current
        const viewportElement = viewportProperties.elementref.current

        const scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold

        const scrollPositionCurrent = 
            (this.cradleParameters.cradleInheritedPropertiesRef.current.orientation == 'vertical')
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

        // scaffoldHandler.cradleReferenceData.blockScrollPos = scrollPositionCurrent // TODO: redundant?

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        // if (viewportProperties.index == 6) {
        //     console.log('running onScroll for index, scrollPositions',
        //         viewportProperties.index,this.scrollPositions)
        // }

        clearTimeout(this._scrolltimerid)

        if (signals.pauseScrollingEffects) {

            return

        }

        const stateHandler = this.cradleParameters.handlersRef.current.state
        const cradleState = stateHandler.cradleStateRef.current

        const contentHandler = this.cradleParameters.handlersRef.current.content
        const serviceHandler = this.cradleParameters.handlersRef.current.service

        if (!viewportProperties.isResizing) {

            if ((cradleState == 'ready') || (cradleState == 'repositioningRender') || (cradleState == 'repositioningContinuation')) {

                if (cradleState == 'ready') {

                    const itemindex = scaffoldHandler.cradleReferenceData.nextItemIndexReference
                    let spineVisiblePosOffset
                    const cradleElements = scaffoldHandler.elements

                    if (this.cradleParameters.cradleInheritedPropertiesRef.current.orientation == 'vertical') {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                            this.cradleParameters.viewportPropertiesRef.current.elementref.current.scrollTop
                            
                    } else {

                        spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                            this.cradleParameters.viewportPropertiesRef.current.elementref.current.scrollLeft

                    }
                    scaffoldHandler.cradleReferenceData.scrollImpliedItemIndexReference = itemindex
                    scaffoldHandler.cradleReferenceData.scrollImpliedCradlePosOffset = spineVisiblePosOffset

                }

                if ((cradleState == 'repositioningRender') || (cradleState == 'repositioningContinuation')) {

                    this._setScrollReferenceIndexData()
                    if (cradleState == 'repositioningRender') stateHandler.setCradleState('repositioningContinuation')

                }

                // TODO: re-instate the following
                serviceHandler.serviceCalls.referenceIndexCallbackRef.current && 
                    serviceHandler.serviceCalls.referenceIndexCallbackRef.current(scaffoldHandler.cradleReferenceData.scrollImpliedItemIndexReference,'scrolling', cradleState)

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this._onAfterScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        return false

    }


    private _onAfterScroll = () => {

        this.isScrolling = false

        const stateHandler = this.cradleParameters.handlersRef.current.state
        const contentHandler = this.cradleParameters.handlersRef.current.content
        const viewportProperties = this.cradleParameters.viewportPropertiesRef.current

        const cradleState = stateHandler.cradleStateRef.current

        // if (viewportProperties.index == 6) {
        //     console.log('running onAfterScroll for index, cradleState',
        //         viewportProperties.index,this.scrollPositions, cradleState)
        // }

        switch (cradleState) {

            case 'repositioningRender': 
            case 'repositioningContinuation':
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

        const stateHandler = this.cradleParameters.handlersRef.current.state
        const scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        const cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        const viewportProperties = this.cradleParameters.viewportPropertiesRef.current
        // const contentHandler = this.cradleParameters.handlersRef.current.content

        if (!stateHandler.isMountedRef.current) return

        let spineVisiblePosOffset
        const cradleElements = scaffoldHandler.elements

        const viewportElement = viewportProperties.elementref.current
        if (cradleProps.orientation == 'vertical') {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            spineVisiblePosOffset = cradleElements.spineRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        scaffoldHandler.cradleReferenceData.scrollImpliedCradlePosOffset = spineVisiblePosOffset

        if (!viewportProperties.isResizing) {

            scaffoldHandler.cradleReferenceData.nextItemIndexReference = 
                scaffoldHandler.cradleReferenceData.scrollImpliedItemIndexReference
            scaffoldHandler.cradleReferenceData.nextCradlePosOffset = 
                scaffoldHandler.cradleReferenceData.scrollImpliedCradlePosOffset

            this.updateBlockScrollPos()

        }

    }

    updateBlockScrollPos = () => {

        const scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        const cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        const viewportProperties = this.cradleParameters.viewportPropertiesRef.current
        const viewportElement = viewportProperties.elementref.current

        if (cradleProps.orientation == 'vertical') {

            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
            scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

        } else {
            scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
        }

    }

    private _setScrollReferenceIndexData = () => {

        const viewportProperties = this.cradleParameters.viewportPropertiesRef.current
        let cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        let cradleConfig = this.cradleParameters.CradleInternalPropertiesRef.current

        let {crosscount} = cradleConfig
        let viewportElement = viewportProperties.elementref.current
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

        let scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        scaffoldHandler.cradleReferenceData.scrollImpliedItemIndexReference = spineReferenceIndex
        scaffoldHandler.cradleReferenceData.scrollImpliedCradlePosOffset = referencescrolloffset

    }

}
