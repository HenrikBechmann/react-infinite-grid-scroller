// interruptshandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

'use strict'

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

    private axisHeadBreaklineObserverCallback = (entries) => {
        const isIntersecting = entries[0].isIntersecting
        if (!isIntersecting) {
            console.log('HEAD',entries)
            console.log('    isIntersecting',isIntersecting)
        }
    }

    private axisTailBreaklineObserverCallback = (entries) => {
        const isIntersecting = entries[0].isIntersecting
        if (isIntersecting) {
            console.log('TAIL',entries)
            console.log('    isIntersecting',entries[0].isIntersecting)
        }
    }

    private cradleIntersectionObserverCallback = (entries) => {

        const signals = this.signals
        const stateHandler = this.cradleParameters.handlersRef.current.state
        const contentHandler = this.cradleParameters.handlersRef.current.content

        if (signals.pauseCradleIntersectionObserver) {
            // console.log('returning from intersectionobserver for PAUSE')
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
            if (
                !viewportInterruptProperties.isResizing &&
                !viewportInterruptProperties.portal?.isReparenting &&
                !(cradleState == 'resized') &&
                !(cradleState == 'repositioningRender') && 
                !(cradleState == 'repositioningContinuation') &&
                !(cradleState == 'finishreposition') &&
                // !(cradleState == 'updatepositionreferences') &&
                !(cradleState == 'doreposition') && 
                !(cradleState == 'pivot') && 
                !(cradleState == 'restorescrollposition')
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
                signals.pauseCellObserver = true
                // pauseCradleIntersectionObserverRef.current = true
                const cradleContent = contentHandler.content
                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []
                cradleContent.headViewComponents = []
                cradleContent.tailViewComponents = []
                stateHandler.setCradleState('startreposition')

            }
        }

    }

    // the async callback from IntersectionObserver.
    private cellintersectionobservercallback = (entries)=>{

        const testrootbounds = entries[0].rootBounds
        if ((testrootbounds.width == 0) && (testrootbounds.height == 0)) { // reparenting

            return

        }
        
        const viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current

        const contentHandler = this.cradleParameters.handlersRef.current.content
        const stateHandler = this.cradleParameters.handlersRef.current.state
        const scrollHandler = this.cradleParameters.handlersRef.current.scroll


        let movedentries = []

        for (let entry of entries) {
            // console.log('entry dataset',Object.assign({},entry.target.dataset))
            if (entry.target.dataset.initialized) {

                movedentries.push(entry)

            } else {

                entry.target.dataset.initialized = 'true'

            }
        }

        // TODO: moved this above initialization; no apparent difference to bug
        if (this.signals.pauseCellObserver) { 

            return

        }

        // TODO: set scrollPositions.atLastUpdateCall
        if (stateHandler.isMountedRef.current) {
            const { scrollPositions } = scrollHandler
            if ((scrollPositions.start != scrollPositions.current) ||
                (scrollPositions.current != scrollPositions.previous)) {
                scrollPositions.previousupdate = scrollPositions.currentupdate
                scrollPositions.currentupdate = scrollPositions.current
                contentHandler.updateCradleContent(movedentries,'cellObserver')
            }
        }

    }

   // viewportResize = {
   //    observer:null,
   //    callback:null,
   //    createObserver:() => {

   //      this.viewportResize.observer = new ResizeObserver(this.viewportResize.callback)
   //      return this.viewportResize.observer

   //    }
   // }

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
   axisHeadBreaklineIntersect = {
        observer:null,
        callback:this.axisHeadBreaklineObserverCallback,
        createObserver:() => {
            let viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.axisHeadBreaklineIntersect.observer = new IntersectionObserver(
                this.axisHeadBreaklineIntersect.callback,
                {root:viewportInterruptProperties.elementref.current, threshold:0}
            )
            return this.axisHeadBreaklineIntersect.observer
        }
    }
   axisTailBreaklineIntersect = {
        observer:null,
        callback:this.axisTailBreaklineObserverCallback,
        createObserver:() => {
            let viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.axisTailBreaklineIntersect.observer = new IntersectionObserver(
                this.axisTailBreaklineIntersect.callback,
                {root:viewportInterruptProperties.elementref.current, threshold:0}
            )
            return this.axisTailBreaklineIntersect.observer
        }
    }
    cellIntersect = {
        observer:null,
        callback:null,
        createObserver:() => {
            let viewportInterruptProperties = this.cradleParameters.viewportInterruptPropertiesRef.current
            this.cellIntersect.observer = new IntersectionObserver(

                this.cellintersectionobservercallback,
                {
                    root:viewportInterruptProperties.elementref.current, 
                    threshold:this.cradleParameters.CradleInternalPropertiesRef.current.cellObserverThreshold,
                } 
            )
            return this.cellIntersect.observer
        }

    }

    signals = {
        repositioningRequired: false,
        pauseCellObserver: false,
        pauseCradleIntersectionObserver:false,
        pauseCradleResizeObserver: false,
        pauseScrollingEffects: false,
    }

}
