// scrollhandler.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds the response to scrolling. It also triggers an onAfterScroll event (after a timeout)
    It's main job is to maintain records of scrollPos, targetAxisReferencePosition, and 
        targetPixelOffsetAxisFromViewport
*/

import { isSafariIOS } from '../InfiniteGridScroller'

export default class ScrollHandler {

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

    }

    private _scrollforvariabletimerid
    private _iOSsetTimeoutTimerid // special case for iOS initial scroll delay

    private _onAfterScrollForVariableTimeout
    private _onAfterScrollTimeout

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

    /*

        onScroll is responsible for tracking current positioning data, for use elsewhere.
        It also triggers after scroll operations, one for normal scrolling, and a second for variable content

    */
    public onScroll = (e) => {

        const 
            { 

                scrollerID, // debug
                ONAFTERSCROLL_TIMEOUT,
                layout

            } = this.cradleParameters.cradleInheritedPropertiesRef.current,

            viewportContext = this.cradleParameters.viewportContextRef.current,

            viewportElement = e.currentTarget,
            scrollblockElement = viewportElement.firstChild,

            { orientation } = this.cradleParameters.cradleInheritedPropertiesRef.current,
            
            scrollPositionCurrent = 
                (orientation == 'vertical')
                    ? viewportElement.scrollTop
                    : viewportElement.scrollLeft,

            scrollXPositionCurrent = 
                (orientation == 'horizontal')
                    ? viewportElement.scrollTop
                    : viewportElement.scrollLeft

        clearTimeout(this._scrolltimerid)


        // filters...

        if ((viewportElement.clientWidth == 0  && viewportElement.clientHeight == 0)) {// in cache

            return

        }

        if (scrollPositionCurrent < 0) { // for Safari bounce

            return 

        }

        const { signals } = this.cradleParameters.handlersRef.current.interruptHandler

        if (signals.pauseScrollingEffects) {

            return

        }

        if (!this.isScrolling) { // started scrolling; set start position

            this.isScrolling = true

            if (isSafariIOS) {
                this._onAfterScrollTimeout = 1000 // iOS sometimes likes to pause before commencing scrolling

                clearTimeout(this._iOSsetTimeoutTimerid)

                this._iOSsetTimeoutTimerid = setTimeout(()=>{

                    this._onAfterScrollTimeout = ONAFTERSCROLL_TIMEOUT // back to more responsive once underway

                },900)

            } else {

                this._onAfterScrollTimeout = ONAFTERSCROLL_TIMEOUT

            }

            this.scrollData.start = scrollPositionCurrent
            this.scrollData.currentupdate = scrollPositionCurrent

        }

        const 
            { 
                layoutHandler,
                stateHandler
            } = this.cradleParameters.handlersRef.current,

            { cradlePositionData } = layoutHandler,
            cradleState = stateHandler.cradleStateRef.current


        // keep up to date in case of reparenting interrupt
        cradlePositionData.trackingBlockScrollPos = scrollPositionCurrent
        cradlePositionData.trackingXBlockScrollPos = scrollXPositionCurrent

        this.scrollData.previous = this.scrollData.current
        this.scrollData.current = scrollPositionCurrent

        if (!viewportContext.isResizing) {

            if (cradleState == 'repositioningRender') {

                this.calcImpliedRepositioningData('onScroll')

            }

        }

        this._scrolltimerid = setTimeout(() => {

            if ( stateHandler.isMountedRef.current ) {

                this.onAfterScroll()

            }

        },this._onAfterScrollTimeout)

        if (layout == 'variable') {

            let scrollblockLength, viewportLength, trackingBlockScrollPos, scrollblockOffset

            if (orientation == 'vertical') {

                scrollblockLength = viewportElement.scrollHeight
                viewportLength =  viewportElement.offsetHeight
                trackingBlockScrollPos = viewportElement.scrollTop
                scrollblockOffset = scrollblockElement.offsetTop

            } else {

                scrollblockLength = viewportElement.scrollWidth
                viewportLength =  viewportElement.offsetWidth
                trackingBlockScrollPos = viewportElement.scrollLeft
                scrollblockOffset = scrollblockElement.offsetLeft

            }

            clearTimeout(this._scrollforvariabletimerid)

            // immediate interrupt halt and adjustment for overshoot at start of end of scrollblock
            if ((( trackingBlockScrollPos - scrollblockOffset) < 0) // overshoot start
                || (scrollblockLength < (trackingBlockScrollPos - scrollblockOffset + viewportLength))) { // overshoot end

                this.onAfterScrollForVariable() // immediate halt and adjust

            } else { // normal timed adjustment for variable content

                this._scrollforvariabletimerid = setTimeout(() => {

                    if ( stateHandler.isMountedRef.current ) {
                        this.onAfterScrollForVariable() // deferred halt and adjust
                    }

                },this._onAfterScrollTimeout)

            }

        }

        return false

    }

    /*

        onAfterScroll finishes reposition if that is running, or
        updates reference data, and
        pares cache data for keepload

    */
    private onAfterScroll = () => {

        this.isScrolling = false

        const 
            { stateHandler, contentHandler, serviceHandler } = 
                this.cradleParameters.handlersRef.current,

            cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current,

            cradleState = stateHandler.cradleStateRef.current

        switch (cradleState) {

            case 'repositioningRender': 
            {

                this.updateBlockScrollPos()

                const { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

                const { repositioningFlagCallback } = serviceHandler.callbacks
                repositioningFlagCallback && repositioningFlagCallback(false, {
                    contextType:'repositioningFlag',
                    scrollerID,                    
                })
                stateHandler.setCradleState('finishreposition')

                break
            }

            default: {

                if ((this.scrollData.start != this.scrollData.current) 
                    || (this.scrollData.current != this.scrollData.previous)) {

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

    /*
        onAfterScrollForVariable stops scrolling in its tracks for variable content if an overshoot occurs
        in any case it moves the scrollblock to its final position in relation to the viewport
    */
    private onAfterScrollForVariable = () => {

        this.isScrolling = false

        const 
            viewportContext = this.cradleParameters.viewportContextRef.current,
            viewportElement = viewportContext.elementRef.current,
            scrollblockElement = viewportElement.firstChild,

            orientation = this.cradleParameters.cradleInheritedPropertiesRef.current.orientation,

            scrollblockOffset = 
                (orientation == 'vertical')
                    ? scrollblockElement.offsetTop
                    : scrollblockElement.offsetLeft,

            trackingBlockScrollPos =
                (orientation == 'vertical')
                    ? viewportElement.scrollTop
                    : viewportElement.scrollLeft,

            scrollTop = viewportElement.scrollTop,
            scrollLeft = viewportElement.scrollLeft

        viewportElement.style.overflow = 'hidden'

        let scrollOptions
        if (orientation == 'vertical') {

            scrollOptions = {
                top:trackingBlockScrollPos - scrollblockOffset,
                left:scrollLeft,
                behavior:'instant'
            }

            scrollblockElement.style.top = null

        } else { // orientation == horizontal

            scrollOptions = {
                top:scrollTop,
                left:trackingBlockScrollPos - scrollblockOffset,
                behavior:'instant'
            }

            scrollblockElement.style.left = null

        }

        viewportElement.scroll(scrollOptions)

        viewportElement.style.overflow = 'scroll'

    }

    // after scroll, but not after repositioning
    private updateReferenceData = () => {

        const 
            { stateHandler, layoutHandler } 
                = this.cradleParameters.handlersRef.current

        if (!stateHandler.isMountedRef.current) return

        const
            cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current,
            viewportContext = this.cradleParameters.viewportContextRef.current,
            cradleElements = layoutHandler.elements,

            axisElement = cradleElements.axisRef.current,
            viewportElement = viewportContext.elementRef.current,
            scrollblockElement = viewportElement.firstChild

        let axisViewportPixelOffset

        if (cradleInheritedProperties.orientation == 'vertical') {

            axisViewportPixelOffset = 
                axisElement.offsetTop + scrollblockElement.offsetTop - viewportElement.scrollTop
                
        } else {

            axisViewportPixelOffset = 
                axisElement.offsetLeft + scrollblockElement.offsetLeft - viewportElement.scrollLeft

        }

        const { cradlePositionData } = layoutHandler

        cradlePositionData.targetPixelOffsetAxisFromViewport = axisViewportPixelOffset

        if (!viewportContext.isResizing) {

            this.updateBlockScrollPos()

        }

    }

    // called from finishreposition state change call above
    // called from updateReferenceData
    private updateBlockScrollPos = () => {

        const 
            cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current,
            viewportContext = this.cradleParameters.viewportContextRef.current,
            {layoutHandler} = this.cradleParameters.handlersRef.current,
            { cradlePositionData } = layoutHandler,

            viewportElement = viewportContext.elementRef.current

        if (!((viewportElement.clientWidth == 0)  && (viewportElement.clientHeight == 0))) {// in cache

            if (cradleInheritedProperties.orientation == 'vertical') {

                cradlePositionData.trackingBlockScrollPos = viewportElement.scrollTop
                cradlePositionData.trackingXBlockScrollPos = viewportElement.scrollLeft

            } else {

                cradlePositionData.trackingBlockScrollPos = viewportElement.scrollLeft
                cradlePositionData.trackingXBlockScrollPos = viewportElement.scrollTop

            }

        }

    }

    // sets cradlePositionData targetAxisReferencePosition and targetPixelOffsetAxisFromViewport
    public calcImpliedRepositioningData = (source) => { // source for debug

        const 
            viewportContext = this.cradleParameters.viewportContextRef.current,
            cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current,
            { virtualListProps, paddingProps, gapProps } = this.cradleParameters.cradleInternalPropertiesRef.current,

            viewportElement = viewportContext.elementRef.current,
            scrollblockElement = viewportElement.firstChild,

            { orientation } = cradleInheritedProperties,

            { crosscount, size:listsize, lowindex } = virtualListProps,

            { serviceHandler } = this.cradleParameters.handlersRef.current,
            { repositioningIndexCallback } = serviceHandler.callbacks,

            { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

        let scrollPos, cellLength, scrollblockOffset

        if (orientation == 'vertical') {

            scrollPos = viewportElement.scrollTop
            cellLength = cradleInheritedProperties.cellHeight + gapProps.column
            scrollblockOffset = scrollblockElement.offsetTop

        } else {

            scrollPos = viewportElement.scrollLeft
            cellLength = cradleInheritedProperties.cellWidth + gapProps.row
            scrollblockOffset = scrollblockElement.offsetLeft

        }

        let axisPixelOffset = cellLength - ((scrollPos + scrollblockOffset) % cellLength)

        const paddingOffset = 
            orientation == 'vertical'
                ? paddingProps.top
                : paddingProps.left

        if (axisPixelOffset == cellLength) { // + paddingOffset)) {
            axisPixelOffset = 0
        }

        const axisRowPosition = Math.ceil((scrollPos - paddingOffset)/cellLength)

        let axisReferencePosition = axisRowPosition * crosscount
        axisReferencePosition = Math.min(axisReferencePosition,listsize - 1)

        const diff = axisReferencePosition % crosscount
        axisReferencePosition -= diff

        if (axisReferencePosition == 0) axisPixelOffset = 0 // defensive

        const { cradlePositionData } = this.cradleParameters.handlersRef.current.layoutHandler

        cradlePositionData.targetAxisReferencePosition = axisReferencePosition
        cradlePositionData.targetPixelOffsetAxisFromViewport = axisPixelOffset;

        if (source == 'onScroll') {
            repositioningIndexCallback && repositioningIndexCallback(axisReferencePosition + lowindex, {
                contextType:'repositioningIndex',
                scrollerID,
            })
            viewportContext.scrollTrackerAPIRef.current.updateReposition(axisReferencePosition)
        }

    }

}
