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

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const viewportElement = viewportInterruptProperties.elementref.current

        const scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold

        const scrollPositionCurrent = 
            (this.cradleParameters.cradleInheritedPropertiesRef.current.orientation == 'vertical')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft

        if (!this.isScrolling) {
            this.isScrolling = true
            this.scrollPositions.start = scrollPositionCurrent
            this.scrollPositions.currentupdate = scrollPositionCurrent
        }

        // console.log('onScroll scrollPositionCurrent',scrollPositionCurrent)

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        // scaffoldHandler.cradleReferenceData.blockScrollPos = scrollPositionCurrent // TODO: redundant?

        this.scrollPositions.previous = this.scrollPositions.current
        this.scrollPositions.current = scrollPositionCurrent

        // if (viewportInterruptProperties.index == 6) {
        //     console.log('running onScroll for index, scrollPositions',
        //         viewportInterruptProperties.index,this.scrollPositions)
        // }

        clearTimeout(this._scrolltimerid)

        if (signals.pauseScrollingEffects) {

            return

        }

        const stateHandler = this.cradleParameters.handlersRef.current.state
        const cradleState = stateHandler.cradleStateRef.current

        const contentHandler = this.cradleParameters.handlersRef.current.content
        const serviceHandler = this.cradleParameters.handlersRef.current.service

        if (!viewportInterruptProperties.isResizing) {

            if ((cradleState == 'ready') || (cradleState == 'repositioningRender') || (cradleState == 'repositioningContinuation')) {

                if (cradleState == 'ready') {

                    const itemindex = scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex
                    let axisVisiblePixelOffset
                    const cradleElements = scaffoldHandler.elements

                    if (this.cradleParameters.cradleInheritedPropertiesRef.current.orientation == 'vertical') {

                        axisVisiblePixelOffset = cradleElements.axisRef.current.offsetTop - 
                            this.cradleParameters.viewportInterruptPropertiesRef.current.elementref.current.scrollTop
                            
                    } else {

                        axisVisiblePixelOffset = cradleElements.axisRef.current.offsetLeft - 
                            this.cradleParameters.viewportInterruptPropertiesRef.current.elementref.current.scrollLeft

                    }
                    scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex = itemindex
                    scaffoldHandler.cradleReferenceData.scrollImpliedAxisPixelOffset = axisVisiblePixelOffset

                }

                if ((cradleState == 'repositioningRender') || (cradleState == 'repositioningContinuation')) {

                    this._setScrollRepositionReferenceIndexData()
                    if (cradleState == 'repositioningRender') stateHandler.setCradleState('repositioningContinuation')

                }

                // TODO: re-instate the following
                serviceHandler.serviceCalls.referenceIndexCallbackRef.current && 
                    serviceHandler.serviceCalls.referenceIndexCallbackRef.current(scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex,'scrolling', cradleState)

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
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current

        const cradleState = stateHandler.cradleStateRef.current

        // console.log('onAfterScroll cradleState',cradleState)

        // if (viewportInterruptProperties.index == 6) {
        //     console.log('running onAfterScroll for index, cradleState',
        //         viewportInterruptProperties.index,this.scrollPositions, cradleState)
        // }

        switch (cradleState) {

            case 'repositioningRender': 
            case 'repositioningContinuation':
            {

                // console.log('scrollHandler calling finishreposition from ', cradleState)
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

        const { state:stateHandler, scaffold:scaffoldHandler } 
            = this.cradleParameters.handlersRef.current

        const cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        // const contentHandler = this.cradleParameters.handlersRef.current.content

        if (!stateHandler.isMountedRef.current) return

        let axisVisiblePixelOffset
        const cradleElements = scaffoldHandler.elements

        const viewportElement = viewportInterruptProperties.elementref.current
        if (cradleProps.orientation == 'vertical') {

            axisVisiblePixelOffset = cradleElements.axisRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            axisVisiblePixelOffset = cradleElements.axisRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        scaffoldHandler.cradleReferenceData.scrollImpliedAxisPixelOffset = axisVisiblePixelOffset

        if (!viewportInterruptProperties.isResizing) {

            scaffoldHandler.cradleReferenceData.targetAxisReferenceIndex = 
                scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex
            scaffoldHandler.cradleReferenceData.targetAxisPixelOffset = 
                scaffoldHandler.cradleReferenceData.scrollImpliedAxisPixelOffset

            this.updateBlockScrollPos()

        }

    }

    updateBlockScrollPos = () => {

        const scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        const cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        
        const viewportElement = viewportInterruptProperties.elementref.current

        if (cradleProps.orientation == 'vertical') {

            // scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollTop'
            scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollTop

        } else {
            // scaffoldHandler.cradleReferenceData.blockScrollProperty = 'scrollLeft'
            scaffoldHandler.cradleReferenceData.blockScrollPos = viewportElement.scrollLeft
        }

    }

    private _setScrollRepositionReferenceIndexData = () => {

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        let cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        let cradleConfig = this.cradleParameters.cradleInternalPropertiesRef.current

        let {crosscount} = cradleConfig
        let viewportElement = viewportInterruptProperties.elementref.current
        let {orientation, listsize} = cradleProps
        let scrollPos, cellLength
        if (orientation == 'vertical') {

            scrollPos = viewportElement.scrollTop
            cellLength = cradleProps.cellHeight + cradleProps.gap

        } else {

            scrollPos = viewportElement.scrollLeft
            cellLength = cradleProps.cellWidth + cradleProps.gap

        }

        let axisPixelOffset = cellLength - (scrollPos % cellLength)
        if (axisPixelOffset == (cellLength + cradleProps.padding)) {
            axisPixelOffset = 0
        }

        const axisRowIndex = Math.ceil((scrollPos - cradleProps.padding)/cellLength)
        let axisReferenceIndex = axisRowIndex * crosscount
        axisReferenceIndex = Math.min(axisReferenceIndex,listsize - 1)
        let diff = axisReferenceIndex % crosscount
        axisReferenceIndex -= diff

        // let referenceIndexData = {
        //     index:axisReferenceIndex,
        //     axisVisiblePixelOffset:referencescrolloffset
        // }

        if (axisReferenceIndex == 0) axisPixelOffset = 0 // defensive

        let scaffoldHandler = this.cradleParameters.handlersRef.current.scaffold
        scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex = axisReferenceIndex
        scaffoldHandler.cradleReferenceData.scrollImpliedAxisPixelOffset = axisPixelOffset

        // console.log('scrollHandler setting implied repositioning axisReferenceIndex, axisPixelOffset, cradleReferenceData',
        //     axisReferenceIndex, axisPixelOffset, Object.assign({},scaffoldHandler.cradleReferenceData))

    }

}
