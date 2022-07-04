// scrollhandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 500

export default class ScrollHandler {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    private cradleParameters

    public scrollData = {start:0, current:0, previous:0, previousupdate:0, currentupdate:0}

    private _scrolltimerid = null

    private isScrolling = false

    public onScroll = (e) => {

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const viewportElement = viewportInterruptProperties.elementRef.current

        if ((viewportElement.clientWidth == 0  && viewportElement.clientHeight == 0)) {// in cache
            clearTimeout(this._scrolltimerid)
            return
        }
        const scrollPositionCurrent = 
            (this.cradleParameters.cradleInheritedPropertiesRef.current.orientation == 'vertical')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft

        const scrollerID = this.cradleParameters.cradleInheritedPropertiesRef.current.scrollerID
        // console.log('scrollPositionCurrent in onScroll','-'+scrollerID+'-' ,scrollPositionCurrent)

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        clearTimeout(this._scrolltimerid)

        const {signals} = this.cradleParameters.handlersRef.current.interruptHandler

        if (signals.pauseScrollingEffects) {

            return

        }

        if (!this.isScrolling) {
            this.isScrolling = true
            this.scrollData.start = scrollPositionCurrent
            this.scrollData.currentupdate = scrollPositionCurrent
        }

        const {scaffoldHandler} = this.cradleParameters.handlersRef.current
        const { cradlePositionData } = scaffoldHandler

        // keep up to date in case of reparenting interrupt
        cradlePositionData.blockScrollPos = scrollPositionCurrent

        this.scrollData.previous = this.scrollData.current
        this.scrollData.current = scrollPositionCurrent

        const {stateHandler} = this.cradleParameters.handlersRef.current
        const cradleState = stateHandler.cradleStateRef.current

        const {contentHandler, serviceHandler} = this.cradleParameters.handlersRef.current

        if (!viewportInterruptProperties.isResizing) {

            if ((cradleState == 'ready') || (cradleState == 'repositioningRender') || (cradleState == 'repositioningContinuation')) {

                if (cradleState == 'ready') {

                    // const itemindex = cradlePositionData.targetAxisReferenceIndex
                    let axisVisiblePixelOffset
                    const cradleElements = scaffoldHandler.elements
                    const axisElement = cradleElements.axisRef.current
                    const viewportElement = this.cradleParameters.viewportInterruptPropertiesRef.current.elementRef.current

                    if (this.cradleParameters.cradleInheritedPropertiesRef.current.orientation == 'vertical') {

                        axisVisiblePixelOffset = axisElement.offsetTop - viewportElement.scrollTop
                            
                    } else {

                        axisVisiblePixelOffset = axisElement.offsetLeft - viewportElement.scrollLeft

                    }

                    // cradlePositionData.targetAxisReferenceIndex = itemindex
                    cradlePositionData.targetAxisPixelOffset = axisVisiblePixelOffset

                }

                if ((cradleState == 'repositioningRender') || (cradleState == 'repositioningContinuation')) {

                    this.calcImpliedRepositioningData()
                    if (cradleState == 'repositioningRender') stateHandler.setCradleState('repositioningContinuation')

                }

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this.onAfterScroll()

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        return false

    }


    private onAfterScroll = () => {

        this.isScrolling = false

        const {stateHandler, contentHandler, cacheHandler} = this.cradleParameters.handlersRef.current
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current

        const cradleState = stateHandler.cradleStateRef.current

        switch (cradleState) {

            case 'repositioningRender': 
            case 'repositioningContinuation':
            {

                this.updateBlockScrollPos()

                stateHandler.setCradleState('doreposition')

                break
            }

            default: {

                if ((this.scrollData.start != this.scrollData.current) || 
                    (this.scrollData.current != this.scrollData.previous)) {

                    if (stateHandler.isMountedRef.current) {

                        this.updateReferenceData()
                        
                    }

                }
            }

        }

        // const {scaffoldHandler} = this.cradleParameters.handlersRef.current
        // const { cradlePositionData } = scaffoldHandler
        const { cache } = cradleInheritedProperties

        if (cache == 'keepload') {
            contentHandler.pareCacheToMax()
        }

    }

    // after scroll, but not after repositioning
    private updateReferenceData = () => {

        const { stateHandler, scaffoldHandler } 
            = this.cradleParameters.handlersRef.current

        const cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current

        if (!stateHandler.isMountedRef.current) return

        let axisVisiblePixelOffset
        const cradleElements = scaffoldHandler.elements

        const viewportElement = viewportInterruptProperties.elementRef.current
        if (cradleProps.orientation == 'vertical') {
            // console.log('scrollTop in updateReferenceData',viewportElement.scrollTop)
            axisVisiblePixelOffset = cradleElements.axisRef.current.offsetTop - 
                viewportElement.scrollTop
                
        } else {

            axisVisiblePixelOffset = cradleElements.axisRef.current.offsetLeft - 
                viewportElement.scrollLeft

        }

        const { cradlePositionData } = scaffoldHandler

        cradlePositionData.targetAxisPixelOffset = axisVisiblePixelOffset

        if (!viewportInterruptProperties.isResizing) {

            this.updateBlockScrollPos()

        }

    }

    // called from finishreposition state change call above
    // called from updateReferenceData
    private updateBlockScrollPos = () => {

        const cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const {scaffoldHandler} = this.cradleParameters.handlersRef.current
        const { cradlePositionData } = scaffoldHandler

        const viewportElement = viewportInterruptProperties.elementRef.current

        if (!((viewportElement.clientWidth == 0)  && (viewportElement.clientHeight == 0))) {// in cache

            if (cradleProps.orientation == 'vertical') {

                cradlePositionData.blockScrollPos = viewportElement.scrollTop

            } else {

                cradlePositionData.blockScrollPos = viewportElement.scrollLeft
            }
        }

    }

    private calcImpliedRepositioningData = () => {

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
        const cradleProps = this.cradleParameters.cradleInheritedPropertiesRef.current
        const cradleConfig = this.cradleParameters.cradleInternalPropertiesRef.current

        const {crosscount} = cradleConfig
        const viewportElement = viewportInterruptProperties.elementRef.current
        const {orientation, listsize} = cradleProps
        let scrollPos, cellLength
        if (orientation == 'vertical') {

            scrollPos = viewportElement.scrollTop
            cellLength = cradleProps.cellHeight + cradleProps.gap
            // console.log('scrollPos in calcImpliedRepositioningData', scrollPos)

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
        const diff = axisReferenceIndex % crosscount
        axisReferenceIndex -= diff

        if (axisReferenceIndex == 0) axisPixelOffset = 0 // defensive

        const { cradlePositionData } = this.cradleParameters.handlersRef.current.scaffoldHandler
        cradlePositionData.targetAxisReferenceIndex = axisReferenceIndex
        cradlePositionData.targetAxisPixelOffset = axisPixelOffset

    }

}
