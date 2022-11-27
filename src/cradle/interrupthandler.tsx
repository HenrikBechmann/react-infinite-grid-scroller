// interrupthandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds the callbacks for the Cradle structure listeners:
    - cradleIntersectionObserverCallback: responds to the move of both cradle grids outside viewport
        this initiates the repositioning protocol
    - axisTriggerlinesObserverCallback: responds to crossing of tailward or headward triggerlines
        in relation to the viewport, and triggers rollover and re-allocation of cradle content

    viewportResizing interrupts are handled by viewport
*/

import { getShiftInstruction} from './contentfunctions'

export default class InterruptHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

    }

    private cradleParameters

    private isHeadCradleInView = true
    private isTailCradleInView = true

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

            const viewportElement = this.cradleParameters.ViewportContextPropertiesRef.current.elementRef.current

            const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current,
                cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current
            
            const { 
                orientation, 
                // cache,
                // styles,
                // placeholderMessages,
                // scrollerProperties, // FOR DEBUG
            } = cradleInheritedProperties

            const { 
            //     crosscount,
            //     listsize,
                triggerZeroHistoryRef,

            } = cradleInternalProperties

            const scrollPos = 
                (orientation == 'vertical')?
                    viewportElement.scrollTop:
                    viewportElement.scrollLeft

            const contentLength = 
                (orientation == 'vertical')?
                    viewportElement.scrollHeight:
                    viewportElement.scrollWidth

            const viewportLength = 
                (orientation == 'vertical')?
                    viewportElement.offsetHeight:
                    viewportElement.offsetWidth

            // first abandon option of 3; nothing to do
            // for browser top or bottom bounce

            // fractional pixels can cause this to fail, hence Math.floor)
            if ( (scrollPos >= 0) || (Math.floor(scrollPos + viewportLength) <= contentLength)) { 

                const viewportBoundingRect = viewportElement.getBoundingClientRect()

                const [shiftinstruction, triggerViewportReferencePos] = getShiftInstruction({
                    scrollerID: cradleInheritedProperties.scrollerID,
                    orientation,
                    triggerlineEntries:entries,
                    triggerlineSpan: layoutHandler.triggerlineSpan,

                    isFirstRowTriggerConfig:layoutHandler.triggercellIsInTail,

                    viewportBoundingRect, // Safari doesn't measure zoom for rootbounds in triggerlineEntries

                    triggerZeroHistoryRef,

                })

                // second abandon option of 3; nothing to do
                if (shiftinstruction != 'none') { 

                    // contentHandler.updateCradleContent(entries,'triggerlinesObserver', shiftinstruction, triggerViewportReferencePos)
                    contentHandler.updateCradleContent(shiftinstruction, triggerViewportReferencePos)

                }

            }
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

            this.isHeadCradleInView = true
            this.isTailCradleInView = true
            const cradleState = stateHandler.cradleStateRef.current

            if (

                    !ViewportContextProperties.isReparentingRef?.current &&

                    !['repositioningRender','repositioningContinuation','finishreposition',
                        'renderupdatedcontent','finishupdatedcontent',
                        'finishviewportresize'].includes(cradleState) &&

                    !ViewportContextProperties.isResizing

                ) 
            {
                
                const viewportElement = ViewportContextProperties.elementRef.current

                const { 

                    scrollerID, 
                    layout, orientation, 
                    padding, gap,
                    cellHeight, cellWidth,

                } = this.cradleParameters.cradleInheritedPropertiesRef.current
                if (!viewportElement) {
                    console.log('SYSTEM: viewport element not set in cradleIntersectionObserverCallback',
                        scrollerID,ViewportContextProperties)
                    return
                }
                const { listRowcount, crosscount } = this.cradleParameters.cradleInternalPropertiesRef.current

                // update dimensions with cradle intersection. See also dimension update in viewport.tsx for resize
                // and getViewportDimensions in Cradle for width/height
                const rect = viewportElement.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top

                // update for scrolltracker
                ViewportContextProperties.viewportDimensions = {top, right, bottom, left, width, height} 

                const { repositioningFlagCallback } = serviceHandler.callbacks
                repositioningFlagCallback && repositioningFlagCallback(true)

                if (layout == 'variable') { // restore base config to scrollblock

                    layoutHandler.restoreBaseScrollblockConfig()
                    scrollHandler.calcImpliedRepositioningData('restoreBaseScrollblockConfig')

                }
                this.signals.pauseTriggerlinesObserver = true
                if (stateHandler.isMountedRef.current) stateHandler.setCradleState('startreposition')

            } else {

                this.signals.repositioningRequired = false
                
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
