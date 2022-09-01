// interruptshandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

import { ResizeObserver as ResizeObserverPolyfill} from '@juggle/resize-observer'

const ResizeObserver = window['ResizeObserver'] || ResizeObserverPolyfill

export default class InterruptHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

    }

    private cradleParameters

    private isTailCradleInView = false
    private isHeadCradleInView = false

    // TODO: stub
    private cradleResizeObserverCallback = (entries) => {

       // console.log('cradleResizeObserverCallback')

        const {
            stateHandler,
        } = this.cradleParameters.handlersRef.current

        // stateHandler.setCradleResizeState('resizecradle')
        if (this.signals.pauseCradleResizeObserver) return

    }

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
            if ((scrollData.start != scrollData.current) ||
                (scrollData.current != scrollData.previous)) {

                scrollData.previousupdate = scrollData.currentupdate
                scrollData.currentupdate = scrollData.current

                let isViewportScrollingForward
                if (scrollData.previousupdate == scrollData.currentupdate) {
                    isViewportScrollingForward = scrollData.previous < scrollData.current
                } else {
                    isViewportScrollingForward = (scrollData.previousupdate < scrollData.currentupdate)
                }

                const { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current

                contentHandler.updateCradleContent(isViewportScrollingForward, entries,'triggerlinesObserver')

            }
        }
    }

    private cradleIntersectionObserverCallback = (entries) => {

        const signals = this.signals
        const { stateHandler, serviceHandler } = this.cradleParameters.handlersRef.current

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

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current

        if (this.signals.repositioningRequired) // start reposition if no other interrupts are underway
        {
            const cradleState = stateHandler.cradleStateRef.current

            // TODO examine to see if could be more concise
            if (
                !viewportInterruptProperties.isResizing &&
                !viewportInterruptProperties.isReparentingRef?.current &&
                !(cradleState == 'repositioningRender') && 
                !(cradleState == 'repositioningContinuation') &&
                !(cradleState == 'renderupdatedcontent') && 
                !(cradleState == 'finishupdatedcontent') &&
                !(cradleState == 'finishresize') &&
                !(cradleState == 'reposition') && 
                !(cradleState == 'pivot')
                ) 
            {
                const element = viewportInterruptProperties.elementRef.current

                const { scrollerID } = this.cradleParameters.cradleInheritedPropertiesRef.current
                if (!element) {
                    console.log('SYSTEM: viewport element not set in cradleIntersectionObserverCallback',
                        scrollerID,viewportInterruptProperties)
                    return
                }
                // update dimensions with cradle intersection. See also dimension update in viewport.tsx for resize
                const rect = element.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top
                viewportInterruptProperties.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker

                const { repositioningFlagCallback } = serviceHandler.callbacks
                repositioningFlagCallback && repositioningFlagCallback(true)
                stateHandler.setCradleState('startreposition')

            }
        }

    }

   // for adjusting to content re-sizing
   public cradleResize = {
      observer:null,
      callback:this.cradleResizeObserverCallback,
        connectElements:() => {
            const observer = this.cradleResize.observer
            const cradleElements = this.cradleParameters.handlersRef.current.layoutHandler.elements
            observer.observe(cradleElements.headRef.current)
            observer.observe(cradleElements.tailRef.current)
        },
      createObserver:() => {

        this.cradleResize.observer = new ResizeObserver(this.cradleResize.callback)
        return this.cradleResize.observer

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
            const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.cradleIntersect.observer = new IntersectionObserver(
                this.cradleIntersect.callback,
                {root:viewportInterruptProperties.elementRef.current, threshold:0}
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
            observer.observe(cradleElements.backwardTriggerlineRef.current)
            observer.observe(cradleElements.forwardTriggerlineRef.current)
        },
        createObserver:() => {
            const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.triggerlinesIntersect.observer = new IntersectionObserver(
                this.triggerlinesIntersect.callback,
                {root:viewportInterruptProperties.elementRef.current, threshold:0}
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
        - trigger resizing
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
        - normalizesignals
    */
    public restoreInterrupts = () => {
        const { signals } = this
        signals.pauseTriggerlinesObserver = false
        signals.pauseCradleIntersectionObserver = false
        signals.pauseCradleResizeObserver = false
        signals.pauseScrollingEffects = false
    }

}
