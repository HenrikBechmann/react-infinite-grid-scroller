// scrollhandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds the response to scrolling. It also triggers an onAfterScroll event (after a timeout)
    It's main job is to maintain records of scrollPos, targetAxisReferencePosition, and 
        targetAxisViewportPixelOffset
*/

import { isSafariIOS } from '../InfiniteGridScroller'

export default class ScrollHandler {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    private _scrollforvariabletimerid
    private _iOSsetTimeoutTimerid // special case for iOS initial scroll delay

    private _onAfterScrollForVariableTimeout

    private _isScrollingForVariable = false

    public onScrollForVariable = () => {

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler

        if (signals.pauseScrollingEffects) {

            return

        }

        if (!this._isScrollingForVariable) {

            this._isScrollingForVariable = true

            if (isSafariIOS) {
                this._onAfterScrollForVariableTimeout = 1000 // iOS sometimes likes to pause before commencing scrolling

                clearTimeout(this._iOSsetTimeoutTimerid)
                // clearTimeout(this._onAfterScrollForVariableTimeout)

                this._iOSsetTimeoutTimerid = setTimeout(()=>{
                    this._onAfterScrollForVariableTimeout = 250 // back to more responsive once underway
                },900)

            } else {

                this._onAfterScrollForVariableTimeout = 250

            }

        }

        const 
            ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current,
            viewportElement = ViewportContextProperties.elementRef.current,
            scrollblockElement = viewportElement.firstChild,
            orientation = this.cradleParameters.cradleInheritedPropertiesRef.current.orientation

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

        clearTimeout(this._scrollforvariabletimerid)

        if ((( blockScrollPos - scrollblockOffset) < 0) || // overshoot start
            (scrollblockLength < (blockScrollPos - scrollblockOffset + viewportLength))) { // overshoot end

            this.onAfterScrollForVariable() // immediate halt and adjust

        } else {

            this._scrollforvariabletimerid = setTimeout(() => {

                this.onAfterScrollForVariable() // deferred halt and adjust

            },this._onAfterScrollForVariableTimeout)

        }
    }

    private onAfterScrollForVariable = () => {

        this._isScrollingForVariable = false

        const 
            ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current,
            viewportElement = ViewportContextProperties.elementRef.current,
            scrollblockElement = viewportElement.firstChild,

            orientation = this.cradleParameters.cradleInheritedPropertiesRef.current.orientation,

            scrollblockOffset = 
                (orientation == 'vertical')?
                    scrollblockElement.offsetTop:
                    scrollblockElement.offsetLeft,

            blockScrollPos =
                (orientation == 'vertical')?
                    viewportElement.scrollTop:
                    viewportElement.scrollLeft,

            scrollTop = viewportElement.scrollTop,
            scrollLeft = viewportElement.scrollLeft

        viewportElement.style.overflow = 'hidden'

        let scrollOptions
        if (orientation == 'vertical') {

            scrollOptions = {
                top:blockScrollPos - scrollblockOffset,
                left:scrollLeft,
                behavior:'instant'
            }

            scrollblockElement.style.top = null

        } else { // orientation == horizontal

            scrollOptions = {
                top:scrollTop,
                left:blockScrollPos - scrollblockOffset,
                behavior:'instant'
            }

            scrollblockElement.style.left = null

        }

        viewportElement.scroll(scrollOptions)

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

            if (cradleState == 'repositioningRender') {

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

    // TODO update scrollTracker is in use
    public calcImpliedRepositioningData = (source) => { // source for debug

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
        cradlePositionData.targetAxisViewportPixelOffset = axisPixelOffset;

        (source == 'onScroll') && ViewportContextProperties.scrollTrackerAPIRef.current.updateReposition(axisReferencePosition)

    }

}
