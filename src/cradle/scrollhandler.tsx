// scrollhandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds the response to scrolling. It also triggers an onAfterScroll event (after a timeout)
    It's main job is to maintain records of scrollPos, targetAxisReferencePosition, and 
        targetAxisViewportPixelOffset
*/

export default class ScrollHandler {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    private _iOSscrolltimerid
    private _iOSsetTimeoutTimerid

    private _onIOSonAfterScrollTimeout

    private _isIOSscrolling = false

    public iOSonScroll = () => {

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler

        if (signals.pauseScrollingEffects) {

            return

        }

        if (!this._isIOSscrolling) {

            this._isIOSscrolling = true

            this._onIOSonAfterScrollTimeout = 1000 // iOS sometimes likes to pause before commencing scrolling

            clearTimeout(this._onIOSonAfterScrollTimeout)

            this._iOSsetTimeoutTimerid = setTimeout(()=>{
                this._onIOSonAfterScrollTimeout = 250 // back to more responsive once underway
            },900)

        }

        const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current
        const viewportElement = ViewportContextProperties.elementRef.current

        clearTimeout(this._iOSscrolltimerid)

        const orientation = this.cradleParameters.cradleInheritedPropertiesRef.current.orientation
        const scrollblockElement = viewportElement.firstChild

        let scrollblockLength, viewportLength, blockScrollPos, scrollblockOffset
        
        if (orientation == 'vertical') {

            scrollblockLength = viewportElement.scrollHeight
            viewportLength =  viewportElement.offsetHeight
            blockScrollPos = viewportElement.scrollTop
            scrollblockOffset = scrollblockElement.offsetTop

        } else {

            scrollblockLength = viewportElement.scrollWidth
            viewportLength =  viewportElement.offsetWidth
            blockScrollPos = viewportElement.scrollLeft
            scrollblockOffset = scrollblockElement.offsetLeft

        }

        if ((( blockScrollPos - scrollblockOffset) < 0) || // overshoot start
            (scrollblockLength < (blockScrollPos - scrollblockOffset + viewportLength))) { // overshoot end

            this.iOSonAfterScroll() // immediate halt and adjust

        } else {

            this._iOSscrolltimerid = setTimeout(() => {

                this.iOSonAfterScroll() // deferred halt and adjust

            },this._onIOSonAfterScrollTimeout)

        }
    }

    private iOSonAfterScroll = () => {

        this._isIOSscrolling = false

        const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current
        const viewportElement = ViewportContextProperties.elementRef.current
        const scrollblockElement = viewportElement.firstChild

        const orientation = this.cradleParameters.cradleInheritedPropertiesRef.current.orientation

        const scrollblockOffset = 
            (orientation == 'vertical')?
                scrollblockElement.offsetTop:
                scrollblockElement.offsetLeft

        const blockScrollPos =
            (orientation == 'vertical')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft

        viewportElement.style.overflow = 'hidden'

        if (orientation == 'vertical') {

            viewportElement.scrollTop = blockScrollPos - scrollblockOffset
            scrollblockElement.style.top = null

        } else { // orientation == horizontal

            viewportElement.scrollLeft = blockScrollPos - scrollblockOffset
            scrollblockElement.style.left = null

        }

        viewportElement.style.overflow = 'scroll'

    }

    private cradleParameters

    public scrollData = {start:0, current:0, previous:0, previousupdate:0, currentupdate:0}

    private _scrolltimerid = null

    private isScrolling = false

    public resetScrollData = (scrollPosition) => {
        const { scrollData } = this
        scrollData.start = 
        scrollData.current = 
        scrollData.previous = 
        scrollData.previousupdate = 
        scrollData.currentupdate = scrollPosition
    }

    public onScroll = (e) => {

        const { 

            scrollerID, // debug
            ONAFTERSCROLL_TIMEOUT 

        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current
        // const viewportElement = ViewportContextProperties.elementRef.current

        const viewportElement = e.currentTarget

        const orientation = this.cradleParameters.cradleInheritedPropertiesRef.current.orientation
        const scrollPositionCurrent = 
            (orientation == 'vertical')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft

        const scrollXPositionCurrent = 
            (orientation == 'horizontal')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft

        clearTimeout(this._scrolltimerid)

        if ((viewportElement.clientWidth == 0  && viewportElement.clientHeight == 0)) {// in cache

            return

        }

        if (scrollPositionCurrent < 0) { // for Safari

            return 

        }

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler

        if (signals.pauseScrollingEffects) {

            return

        }

        if (!this.isScrolling) {

            this.isScrolling = true
            this.scrollData.start = scrollPositionCurrent
            this.scrollData.currentupdate = scrollPositionCurrent

        }

        const { layoutHandler } = this.cradleParameters.handlersRef.current
        const { cradlePositionData } = layoutHandler

        // keep up to date in case of reparenting interrupt
        cradlePositionData.blockScrollPos = scrollPositionCurrent
        cradlePositionData.blockXScrollPos = scrollXPositionCurrent

        this.scrollData.previous = this.scrollData.current
        this.scrollData.current = scrollPositionCurrent

        const {stateHandler} = this.cradleParameters.handlersRef.current
        const cradleState = stateHandler.cradleStateRef.current

        // const { contentHandler, serviceHandler } = this.cradleParameters.handlersRef.current

        if (!ViewportContextProperties.isResizing) {

            if ((cradleState == 'repositioningRender') || (cradleState == 'repositioningContinuation')) {

                // scrollerID == 1 && console.log('onScroll.calcImpliedRepositioningData: cradleState', cradleState)

                this.calcImpliedRepositioningData('onScroll')

            }

        }

        this._scrolltimerid = setTimeout(() => {

            this.onAfterScroll()

        },ONAFTERSCROLL_TIMEOUT)

        return false

    }


    private onAfterScroll = () => {

        this.isScrolling = false

        const { stateHandler, contentHandler, serviceHandler } = 
            this.cradleParameters.handlersRef.current

        // const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current,
        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current

        const cradleState = stateHandler.cradleStateRef.current

        switch (cradleState) {

            case 'repositioningRender': 
            case 'repositioningContinuation':
            {

                this.updateBlockScrollPos()

                const { repositioningFlagCallback } = serviceHandler.callbacks
                repositioningFlagCallback && repositioningFlagCallback(false)
                stateHandler.setCradleState('finishreposition')

                break
            }

            default: {

                if ((this.scrollData.start != this.scrollData.current) || 
                    (this.scrollData.current != this.scrollData.previous)) {

                    if (stateHandler.isMountedRef.current) {

                        this.updateReferenceData()
                        
                    }

                }

                break
            }

        }

        const { cache } = cradleInheritedProperties

        if (cache == 'keepload') {
            contentHandler.pareCacheToMax()
        }

    }

    // after scroll, but not after repositioning
    private updateReferenceData = () => {

        const { stateHandler, layoutHandler } 
            = this.cradleParameters.handlersRef.current

        const cradleSpecs = this.cradleParameters.cradleInheritedPropertiesRef.current,
            ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current

        if (!stateHandler.isMountedRef.current) return

        const cradleElements = layoutHandler.elements

        const axisElement = cradleElements.axisRef.current,
            viewportElement = ViewportContextProperties.elementRef.current,
            scrollblockElement = viewportElement.firstChild

        let axisViewportPixelOffset
        if (cradleSpecs.orientation == 'vertical') {

            axisViewportPixelOffset = 
                axisElement.offsetTop + scrollblockElement.offsetTop - viewportElement.scrollTop
                
        } else {

            axisViewportPixelOffset = 
                axisElement.offsetLeft + scrollblockElement.offsetLeft - viewportElement.scrollLeft

        }

        const { cradlePositionData } = layoutHandler

        cradlePositionData.targetAxisViewportPixelOffset = axisViewportPixelOffset

        if (!ViewportContextProperties.isResizing) {

            this.updateBlockScrollPos()

        }

    }

    // called from finishreposition state change call above
    // called from updateReferenceData
    private updateBlockScrollPos = () => {

        const cradleSpecs = this.cradleParameters.cradleInheritedPropertiesRef.current
        const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current
        const {layoutHandler} = this.cradleParameters.handlersRef.current
        const { cradlePositionData } = layoutHandler

        const viewportElement = ViewportContextProperties.elementRef.current

        if (!((viewportElement.clientWidth == 0)  && (viewportElement.clientHeight == 0))) {// in cache

            if (cradleSpecs.orientation == 'vertical') {

                cradlePositionData.blockScrollPos = viewportElement.scrollTop
                cradlePositionData.blockXScrollPos = viewportElement.scrollLeft

            } else {

                cradlePositionData.blockScrollPos = viewportElement.scrollLeft
                cradlePositionData.blockXScrollPos = viewportElement.scrollTop

            }

        }

    }

    public calcImpliedRepositioningData = (source) => {

        const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current,
            cradleSpecs = this.cradleParameters.cradleInheritedPropertiesRef.current,
            { virtualListProps } = this.cradleParameters.cradleInternalPropertiesRef.current

        const viewportElement = ViewportContextProperties.elementRef.current,
            scrollblockElement = viewportElement.firstChild

        const { orientation } = cradleSpecs

        const { crosscount, size:listsize } = virtualListProps

        let scrollPos, cellLength, scrollblockOffset
        if (orientation == 'vertical') {

            scrollPos = viewportElement.scrollTop
            cellLength = cradleSpecs.cellHeight + cradleSpecs.gap
            scrollblockOffset = scrollblockElement.offsetTop

        } else {

            scrollPos = viewportElement.scrollLeft
            cellLength = cradleSpecs.cellWidth + cradleSpecs.gap
            scrollblockOffset = scrollblockElement.offsetLeft

        }

        // console.log('running calcImpliedRepositioningData: source, scrollPos, scrollblockOffset\n',
        //     source, scrollPos, scrollblockOffset)

        let axisPixelOffset = cellLength - ((scrollPos + scrollblockOffset) % cellLength)
        if (axisPixelOffset == (cellLength + cradleSpecs.padding)) {
            axisPixelOffset = 0
        }

        const axisRowPosition = Math.ceil((scrollPos - cradleSpecs.padding)/cellLength)

        let axisReferencePosition = axisRowPosition * crosscount
        axisReferencePosition = Math.min(axisReferencePosition,listsize - 1)

        const diff = axisReferencePosition % crosscount
        axisReferencePosition -= diff

        if (axisReferencePosition == 0) axisPixelOffset = 0 // defensive

        const { cradlePositionData } = this.cradleParameters.handlersRef.current.layoutHandler

        cradlePositionData.targetAxisReferencePosition = axisReferencePosition
        cradlePositionData.targetAxisViewportPixelOffset = axisPixelOffset

    }

}
