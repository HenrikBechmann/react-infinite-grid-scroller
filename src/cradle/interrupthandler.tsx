// interrupthandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds the callbacks for the Cradle structure listeners:
    - cradleResizeObserverCallback // responds to resize of the two cradle grids
        when the cradle is in variable layout
    - cradleIntersectionObserverCallback // responds to move of both cradle grids outside viewport
        this initiates the repositioning protocol
    - axisTriggerlinesObserverCallback // responds to crossing of tailward and headward triggerlines
        in relation to the viewport, and triggers rollover and re-allocation of cradle content

    viewportResizing is handled by viewport
    scrolling interrupts handled by scrollHandler
*/

import { ResizeObserver as ResizeObserverPolyfill} from '@juggle/resize-observer'

const ResizeObserver = window['ResizeObserver'] || ResizeObserverPolyfill

export default class InterruptHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

    }

    private cradleParameters

    private isTailCradleInView = false
    private isHeadCradleInView = false

    private axisTriggerlinesObserverCallback = (entries) => {

        if (this.signals.pauseTriggerlinesObserver) { 

            return

        }

        const testrootbounds = entries[0].rootBounds
        if ((testrootbounds.width == 0) && (testrootbounds.height == 0)) { // reparenting

            return

        }

        const {
            contentHandler,
            stateHandler,
            scrollHandler,
            layoutHandler,
        } = this.cradleParameters.handlersRef.current

        if (stateHandler.isMountedRef.current) {
            const { scrollData } = scrollHandler

            scrollData.previousupdate = scrollData.currentupdate
            scrollData.currentupdate = scrollData.current

            contentHandler.updateCradleContent(entries,'triggerlinesObserver')

        }
    }

    private cradleIntersectionObserverCallback = (entries) => {

        const signals = this.signals
        const { 

            stateHandler, 
            serviceHandler, 
            scrollHandler, 
            layoutHandler 

        } = this.cradleParameters.handlersRef.current

        if (signals.pauseCradleIntersectionObserver) {

            return
        }

        for (let i = 0; i < entries.length; i++ ) {
            let entry = entries[i]
            if (entry.target.dataset.type == 'head') {
                this.isHeadCradleInView = 
                    (entry.isIntersecting || 
                        ((entry.rootBounds.width == 0) && (entry.rootBounds.height == 0)) // reparenting
                )
            } else {
                this.isTailCradleInView = 
                    (entry.isIntersecting  || 
                        ((entry.rootBounds.width == 0) && (entry.rootBounds.height == 0)) // reparenting
                )
            }
        }

        this.signals.repositioningRequired = (!this.isHeadCradleInView && !this.isTailCradleInView)

        const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current

        if (this.signals.repositioningRequired) // start reposition if no other interrupts are underway
        {

            // CHANGE
            // console.log('xxx ===> repositioning required')

            // this.signals.repositioningRequired = false
            // return

            const cradleState = stateHandler.cradleStateRef.current

            if (
                !ViewportContextProperties.isReparentingRef?.current &&

                !(cradleState == 'repositioningRender') && 
                !(cradleState == 'repositioningContinuation') &&
                !(cradleState == 'finishreposition') && 

                !(cradleState == 'renderupdatedcontent') && 
                !(cradleState == 'finishupdatedcontent') &&

                // !(cradleState == 'adjustupdateforvariability') &&
                // !(cradleState == 'adjustupdateforvariabilityafterscroll') &&

                !ViewportContextProperties.isResizing &&
                !(cradleState == 'finishviewportresize')

                ) 
            {
                const viewportElement = ViewportContextProperties.elementRef.current

                const { 

                    scrollerID, 
                    orientation, 
                    padding, 
                    gap,
                    cellHeight,
                    cellWidth,
                    layout 

                } = this.cradleParameters.cradleInheritedPropertiesRef.current
                if (!viewportElement) {
                    console.log('SYSTEM: viewport element not set in cradleIntersectionObserverCallback',
                        scrollerID,ViewportContextProperties)
                    return
                }
                const { listRowcount, crosscount } = this.cradleParameters.cradleInternalPropertiesRef.current
                // update dimensions with cradle intersection. See also dimension update in viewport.tsx for resize
                const rect = viewportElement.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top
                // update for scrolltracker
                ViewportContextProperties.viewportDimensions = {top, right, bottom, left, width, height} 

                const { repositioningFlagCallback } = serviceHandler.callbacks
                repositioningFlagCallback && repositioningFlagCallback(true)

                if (layout == 'variable') { // restore base config to scrollblock

                    const scrollblockElement = viewportElement.firstChild

                    const cellLength = 
                        ((orientation == 'vertical')?
                            cellHeight:
                            cellWidth)
                        + gap

                    const baselength = (listRowcount * cellLength) - gap // final cell has no trailing gap
                        + (padding * 2) // leading and trailing padding

                    if (orientation == 'vertical') {

                        scrollblockElement.style.top = null
                        scrollblockElement.style.height = baselength + 'px'

                    } else {

                        scrollblockElement.style.left = null
                        scrollblockElement.style.width = baselength + 'px'

                    }

                    const { cradlePositionData } = layoutHandler
                    const axisReference = cradlePositionData.targetAxisReferenceIndex
                    const rowOffset = Math.ceil(axisReference/crosscount)
                    const calculatedBlockScrollPos = 
                        (rowOffset * cellLength) + padding

                    viewportElement[cradlePositionData.blockScrollProperty] = calculatedBlockScrollPos
                    cradlePositionData.blockScrollPos = calculatedBlockScrollPos
                    scrollHandler.resetScrollData(calculatedBlockScrollPos)
                    
                    scrollHandler.calcImpliedRepositioningData()

                }

                if (stateHandler.isMountedRef.current) stateHandler.setCradleState('startreposition')

            }
        }

    }

   public cradleIntersect = {    
        observer:null,    
        callback:this.cradleIntersectionObserverCallback,
        connectElements:() => {
            const observer = this.cradleIntersect.observer
            const cradleElements = this.cradleParameters.handlersRef.current.layoutHandler.elements
            observer.observe(cradleElements.headRef.current)
            observer.observe(cradleElements.tailRef.current)
        },
        createObserver:() => {
            const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current
            this.cradleIntersect.observer = new IntersectionObserver(
                this.cradleIntersect.callback,
                {root:ViewportContextProperties.elementRef.current, threshold:0}
            )    
            return this.cradleIntersect.observer
        }
    }

   public triggerlinesIntersect = {
        observer:null,
        callback:this.axisTriggerlinesObserverCallback,
        connectElements:() => {
            const observer = this.triggerlinesIntersect.observer
            const cradleElements = this.cradleParameters.handlersRef.current.layoutHandler.elements
            if (cradleElements.triggercellTriggerlineHeadRef.current &&
                cradleElements.triggercellTriggerlineTailRef.current) {
                observer.observe(cradleElements.triggercellTriggerlineHeadRef.current)
                observer.observe(cradleElements.triggercellTriggerlineTailRef.current)
            }
        },
        createObserver:() => {
            const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current
            this.triggerlinesIntersect.observer = new IntersectionObserver(
                this.triggerlinesIntersect.callback,
                {root:ViewportContextProperties.elementRef.current, threshold:0}
            )
            return this.triggerlinesIntersect.observer
        }
    }

    public signals = {
        repositioningRequired: false,
        pauseTriggerlinesObserver: false, 
        pauseCradleIntersectionObserver:false,
        pauseCradleResizeObserver: false,
        pauseScrollingEffects: false,
    }

    /*
        invoked for 
        cradle:
        - change into cache
        - trigger cradleresizing
        - trigger reconfiguration
        - trigger pivot
        servicehandler:
        - call reload
    */
    public pauseInterrupts = () => {
        const { signals } = this
        signals.pauseTriggerlinesObserver = true
        signals.pauseCradleIntersectionObserver = true
        signals.pauseCradleResizeObserver = true
        signals.pauseScrollingEffects = true
    }
    /*
        invoked for
        cradle:
        - restoreinterrupts
    */
    public restoreInterrupts = () => {
        const { signals } = this
        signals.pauseTriggerlinesObserver = false
        signals.pauseCradleIntersectionObserver = false
        signals.pauseCradleResizeObserver = false
        signals.pauseScrollingEffects = false
    }

}
