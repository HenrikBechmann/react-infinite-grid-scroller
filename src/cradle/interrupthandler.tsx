// interruptshandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

'use strict'

/*
    TODO: trigger reposition if triggerline entries come back with isIntersecting the same for both
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

    // TODO: stub
    private cradleresizeobservercallback = (entries) => {

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
            scrollHandler
        } = this.cradleParameters.handlersRef.current

        if (stateHandler.isMountedRef.current) {
            const { scrollData } = scrollHandler
            if ((scrollData.start != scrollData.current) ||
                (scrollData.current != scrollData.previous)) {

                scrollData.previousupdate = scrollData.currentupdate
                scrollData.currentupdate = scrollData.current

                contentHandler.updateCradleContent(entries,'triggerlinesObserver')

            }
        }
    }

    private cradleIntersectionObserverCallback = (entries) => {

        const signals = this.signals
        const { stateHandler, contentHandler } = this.cradleParameters.handlersRef.current

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

            if (
                !viewportInterruptProperties.isResizing &&
                !viewportInterruptProperties.portal?.isReparenting &&
                !(cradleState == 'repositioningRender') && 
                !(cradleState == 'repositioningContinuation') &&
                !(cradleState == 'renderupdatedcontent') && // TODO: *TEST*
                !(cradleState == 'finishresize') &&
                !(cradleState == 'doreposition') && 
                !(cradleState == 'pivot')
                ) 
            {
                const element = viewportInterruptProperties.elementref.current
                if (!element) {
                    console.log('SYSTEM: viewport element not set in cradleIntersectionObserverCallback',
                        this.cradleParameters.cradleInheritedPropertiesRef.current.scrollerID,viewportInterruptProperties)
                    return
                }
                // TODO this is a duplicate setting procedure with viewport.tsx
                const rect = element.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top
                viewportInterruptProperties.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker

                const cradleContent = contentHandler.content
                cradleContent.headCellComponents = []
                cradleContent.tailCellComponents = []

                stateHandler.setCradleState('startreposition')

            }
        }

    }

   // for adjusting to content re-sizing
   public cradleResize = {
      observer:null,
      callback:this.cradleresizeobservercallback,
        connectElements:() => {
            const observer = this.cradleResize.observer
            const cradleElements = this.cradleParameters.handlersRef.current.scaffoldHandler.elements
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
            const cradleElements = this.cradleParameters.handlersRef.current.scaffoldHandler.elements
            observer.observe(cradleElements.headRef.current)
            observer.observe(cradleElements.tailRef.current)
        },
        createObserver:() => {
            let viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.cradleIntersect.observer = new IntersectionObserver(
                this.cradleIntersect.callback,
                {root:viewportInterruptProperties.elementref.current, threshold:0}
            )    
            return this.cradleIntersect.observer
        }
    }

   public axisTriggerlinesIntersect = {
        observer:null,
        callback:this.axisTriggerlinesObserverCallback,
        connectElements:() => {
            const observer = this.axisTriggerlinesIntersect.observer
            const cradleElements = this.cradleParameters.handlersRef.current.scaffoldHandler.elements
            observer.observe(cradleElements.headTriggerlineRef.current)
            observer.observe(cradleElements.tailTriggerlineRef.current)
        },
        createObserver:() => {
            let viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.axisTriggerlinesIntersect.observer = new IntersectionObserver(
                this.axisTriggerlinesIntersect.callback,
                {root:viewportInterruptProperties.elementref.current, threshold:0}
            )
            return this.axisTriggerlinesIntersect.observer
        }
    }

    public signals = {
        repositioningRequired: false,
        pauseTriggerlinesObserver: false, 
        pauseCradleIntersectionObserver:false,
        pauseCradleResizeObserver: false,
        pauseScrollingEffects: false,
    }

}
