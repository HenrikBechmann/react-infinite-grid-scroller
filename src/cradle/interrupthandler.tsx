// interrupthandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds the callbacks for the Cradle structure listeners:
    - cradleIntersectionObserverCallback: responds to the move of both cradle grids outside viewport
        this initiates the repositioning protocol
    - axisTriggerlinesObserverCallback: responds to crossing of tailward or headward triggerlines
        in relation to the viewport, and triggers rollover and re-allocation of cradle content

    viewportResizing interrupts are handled by viewport
*/

import { getShiftInstruction } from './updatefunctions'

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

        const 
            viewportElement = this.cradleParameters.viewportContextPropertiesRef.current.elementRef.current,

            viewportBoundingRect = viewportElement.getBoundingClientRect()

        if (viewportBoundingRect.width == 0 && viewportBoundingRect.height == 0) { // reparenting or pivoting

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

            const 
                cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current,
                cradleInternalProperties = this.cradleParameters.cradleInternalPropertiesRef.current,
            
                { 

                    orientation, 

                } = cradleInheritedProperties,

                { 

                    triggerHistoryRef,
                    virtualListProps,

                } = cradleInternalProperties,

                { 
                
                    crosscount, 
                    size:listsize,
                    rowshift,

                } = virtualListProps,

                scrollPos = 
                    (orientation == 'vertical')?
                        viewportElement.scrollTop:
                        viewportElement.scrollLeft,

                contentLength = 
                    (orientation == 'vertical')?
                        viewportElement.scrollHeight:
                        viewportElement.scrollWidth,

                viewportLength = 
                    (orientation == 'vertical')?
                        viewportElement.offsetHeight:
                        viewportElement.offsetWidth

            // for browser top or bottom bounce
            // fractional pixels can cause this to fail, hence Math.floor)

            if ( (scrollPos >= 0) || (Math.floor(scrollPos + viewportLength) <= contentLength)) { 

                const [shiftinstruction, triggerViewportReferencePixelPos] = getShiftInstruction({

                    scrollerID: cradleInheritedProperties.scrollerID,
                    orientation,
                    triggerlineEntries:entries,
                    triggerlineSpan: layoutHandler.triggerlineSpan,

                    isFirstRowTriggerConfig:layoutHandler.triggercellIsInTail,

                    viewportBoundingRect, // Safari doesn't correctly measure zoom for rootbounds in triggerlineEntries

                    triggerHistoryRef,

                })

                if (shiftinstruction == 'moveaxistailward') { // filter out oversize last row

                    const 
                        lastListRowOffset = Math.ceil(listsize/crosscount) - 1 + rowshift,
                        tailcontentlist = contentHandler.content.tailModelComponents,
                        previousAxisReferenceIndex = (tailcontentlist[0]?.props.index || 0),
                        previousAxisRowOffset = Math.ceil(previousAxisReferenceIndex/crosscount)

                    if (lastListRowOffset == previousAxisRowOffset) return

                }

                // none == nothing to do
                if (shiftinstruction != 'none') {

                    this.shiftinstruction = shiftinstruction
                    this.triggerViewportReferencePixelPos = triggerViewportReferencePixelPos

                    stateHandler.setCradleState('renderupdatedcontent')

                }

            }
        }
    }

    // data transfer to updateCradleContent triggered by closing axisTriggerlinesObserverCallback setCradleState call
    public shiftinstruction
    public triggerViewportReferencePixelPos

    private cradleIntersectionObserverCallback = (entries) => {

        const signals = this.signals
        const { 

            stateHandler, 
            serviceHandler, 
            scrollHandler, 
            layoutHandler 

        } = this.cradleParameters.handlersRef.current

        if (signals.pauseCradleIntersectionObserver) {

            this.isHeadCradleInView = this.isTailCradleInView = true // experimental

            return

        }

        const { 

            scrollerID, 
            layout 

        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        for (let i = 0; i < entries.length; i++ ) {
            const entry = entries[i]
            if (entry.target.dataset.type == 'head') {
                this.isHeadCradleInView = (
                    entry.isIntersecting || 
                        ((entry.rootBounds.width == 0) && (entry.rootBounds.height == 0)) // reparenting
                )
            } else {
                this.isTailCradleInView = (
                    entry.isIntersecting  || 
                        ((entry.rootBounds.width == 0) && (entry.rootBounds.height == 0)) // reparenting
                )
            }
        }

        this.signals.repositioningRequired = (!(this.isHeadCradleInView) && !(this.isTailCradleInView))

        // console.log('repositioningRequired',this.signals.repositioningRequired)

        const viewportContextProperties = this.cradleParameters.viewportContextPropertiesRef.current

        if (this.signals.repositioningRequired) // start reposition if no other interrupts are underway
        {

            this.isHeadCradleInView = this.isTailCradleInView = true

            const cradleState = stateHandler.cradleStateRef.current

            if (

                    !['repositioningRender','finishreposition',//'repositioningContinuation','finishreposition',
                        'renderupdatedcontent','finishupdatedcontent',
                        'finishviewportresize'].includes(cradleState) &&

                    !viewportContextProperties.isResizing

                ) 
            {
                
                const viewportElement = viewportContextProperties.elementRef.current

                if (!viewportElement) { // defensive; shouldn't happen
                    console.log('SYSTEM: viewport element not set in cradleIntersectionObserverCallback (scrollerID)',
                        scrollerID,viewportContextProperties)
                    return
                }

                const { repositioningFlagCallback } = serviceHandler.callbacks
                repositioningFlagCallback && repositioningFlagCallback(true)

                if (layout == 'variable') { // restore base config to scrollblock

                    layoutHandler.restoreBaseScrollblockConfig()
                    scrollHandler.calcImpliedRepositioningData('restoreBaseScrollblockConfig')

                }
                this.signals.pauseTriggerlinesObserver = true

                if (stateHandler.isMountedRef.current) {

                    stateHandler.setCradleState('startreposition')

                }

            } else {

                this.signals.repositioningRequired = false
                
            }
        }

    }

   public cradleIntersect = {    
        observer:null,    
        callback:this.cradleIntersectionObserverCallback,
        disconnected:true,
        connectElements:() => {
            if (!this.cradleIntersect.disconnected) {
                return
            }
            const observer = this.cradleIntersect.observer
            const cradleElements = this.cradleParameters.handlersRef.current.layoutHandler.elements
            observer.observe(cradleElements.headRef.current)
            observer.observe(cradleElements.tailRef.current)
            this.cradleIntersect.disconnected = false
        },
        disconnect:() => {
            this.cradleIntersect.observer.disconnect()
            this.cradleIntersect.disconnected = true
        },
        createObserver:() => {
            const viewportContextProperties = this.cradleParameters.viewportContextPropertiesRef.current
            this.cradleIntersect.observer = new IntersectionObserver(
                this.cradleIntersect.callback,
                {root:viewportContextProperties.elementRef.current, threshold:0}
            )    
            return this.cradleIntersect.observer
        }
    }

   public triggerlinesIntersect = {
        observer:null,
        callback:this.axisTriggerlinesObserverCallback,
        disconnected:true,
        connectElements:() => {
            if (!this.triggerlinesIntersect.disconnected) {
                return
            }
            const observer = this.triggerlinesIntersect.observer
            const cradleElements = this.cradleParameters.handlersRef.current.layoutHandler.elements
            if (cradleElements.triggercellTriggerlineHeadRef.current &&
                cradleElements.triggercellTriggerlineTailRef.current) {
                observer.observe(cradleElements.triggercellTriggerlineHeadRef.current)
                observer.observe(cradleElements.triggercellTriggerlineTailRef.current)
            }
            this.triggerlinesIntersect.disconnected = false
        },
        disconnect:() => {
            this.triggerlinesIntersect.observer.disconnect()
            this.triggerlinesIntersect.disconnected = true
        },
        createObserver:() => {
            const viewportContextProperties = this.cradleParameters.viewportContextPropertiesRef.current
            this.triggerlinesIntersect.observer = new IntersectionObserver(
                this.triggerlinesIntersect.callback,
                {root:viewportContextProperties.elementRef.current, threshold:0}
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
