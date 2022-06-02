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

        console.log('=> axisTriggerlinesObserverCallback: this.signals.pauseTriggerlinesObserver, entries',
            this.signals.pauseTriggerlinesObserver, entries)

        if (this.signals.pauseTriggerlinesObserver) { 

            return

        }

        const testrootbounds = entries[0].rootBounds
        if ((testrootbounds.width == 0) && (testrootbounds.height == 0)) { // reparenting

            return

        }

        if (entries.length == 2) {
            const [first,second] = entries
            // console.log('first.time, second.time, first.time == second.time,first, second',
            //     first.time, second.time,first.time == second.time,first,second)
            // TODO: consider using scrollHandler.isScrolling instead
            if (first.time == second.time) { // initializing, not scrolling
                return
            } else {
                console.log('WARNING: double triggerlines intersection. Contace author.')
            }
        }

        const {
            content:contentHandler,
            state:stateHandler,
            scroll:scrollHandler
        } = this.cradleParameters.handlersRef.current

        if (stateHandler.isMountedRef.current) {
            const { scrollPositions } = scrollHandler
            if ((scrollPositions.start != scrollPositions.current) ||
                (scrollPositions.current != scrollPositions.previous)) {

                scrollPositions.previousupdate = scrollPositions.currentupdate
                scrollPositions.currentupdate = scrollPositions.current

                contentHandler.updateCradleContent(entries,'triggerlinesObserver')

            }
        }
    }

    private cradleIntersectionObserverCallback = (entries) => {

        // console.log('cradleIntersectionObserverCallback')
        const signals = this.signals
        const stateHandler = this.cradleParameters.handlersRef.current.state
        const contentHandler = this.cradleParameters.handlersRef.current.content

        if (signals.pauseCradleIntersectionObserver) {
            // console.log('returning from cradle intersectionobserver for PAUSE')
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

        this.signals.repositioningRequired = (!this.isHeadCradleInView && !this.isTailCradleInView);

        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current

        if (this.signals.repositioningRequired) // start reposition if no other interrupts are underway
        {
            let cradleState = stateHandler.cradleStateRef.current
            // startreposition, reload, preparecontent, preparerender, normalizesignals, ready
            if (
                !viewportInterruptProperties.isResizing &&
                !viewportInterruptProperties.portal?.isReparenting &&
                !(cradleState == 'resized') &&
                !(cradleState == 'repositioningRender') && 
                !(cradleState == 'repositioningContinuation') &&
                !(cradleState == 'renderupdatedcontent') && // *TEST*
                !(cradleState == 'finishreposition') &&
                !(cradleState == 'doreposition') && 
                !(cradleState == 'pivot')
                ) 
            {
                const element = viewportInterruptProperties.elementref.current
                if (!element) {
                    console.log('viewport element not set in cradleIntersectionObserverCallback',
                        this.cradleParameters.cradleInheritedPropertiesRef.current.scrollerID,viewportInterruptProperties)
                    return
                }
                // TODO this is a duplicate setting procedure with viewport.tsx
                const rect = element.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top
                viewportInterruptProperties.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker

                const cradleContent = contentHandler.content
                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []
                cradleContent.headViewComponents = []
                cradleContent.tailViewComponents = []

                stateHandler.setCradleState('startreposition')

            }
        }

    }

   // for adjusting to content re-sizing
   cradleResize = {
      observer:null,
      callback:this.cradleresizeobservercallback,
      createObserver:() => {

        this.cradleResize.observer = new ResizeObserver(this.cradleResize.callback)
        return this.cradleResize.observer

      }
   }

   cradleIntersect = {
        observer:null,
        callback:this.cradleIntersectionObserverCallback,
        createObserver:() => {
            let viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.cradleIntersect.observer = new IntersectionObserver(
                this.cradleIntersect.callback,
                {root:viewportInterruptProperties.elementref.current, threshold:0}
            )
            return this.cradleIntersect.observer
        }
    }

   axisTriggerlinesIntersect = {
        observer:null,
        callback:this.axisTriggerlinesObserverCallback,
        createObserver:() => {
            let viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.axisTriggerlinesIntersect.observer = new IntersectionObserver(
                this.axisTriggerlinesIntersect.callback,
                {root:viewportInterruptProperties.elementref.current, threshold:0}
            )
            return this.axisTriggerlinesIntersect.observer
        }
    }

    signals = {
        repositioningRequired: false,
        pauseTriggerlinesObserver: false, 
        pauseCradleIntersectionObserver:false,
        pauseCradleResizeObserver: false,
        pauseScrollingEffects: false,
    }

}
