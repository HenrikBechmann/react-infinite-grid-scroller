// wingshandler.tsx
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

    // const viewportresizeobservercallback = (entries)=>{

    //     if (viewportStateRef.current == 'setup') {

    //         return

    //     }

    //     const target = entries[0].target

    //     // first register shouldn't generate interrupt
    //     if (!target.dataset.initialized) {

    //         // console.log('initializing target', target.dataset)
    //         target.dataset.initialized = true

    //         return

    //     }

    //     // generate interrupt response, if initiating resize
    //     if (!isResizingRef.current) {
    //         viewportPropertiesRef.current.isResizing = isResizingRef.current = true 
    //         // new object creation triggers a realtime interrupt message to cradle through context
    //         viewportPropertiesRef.current = Object.assign({},viewportPropertiesRef.current) 

    //         if (isMountedRef.current) setViewportState('resizing')

    //     }

    //     clearTimeout(resizeTimeridRef.current)
    //     resizeTimeridRef.current = setTimeout(() => {

    //         isResizingRef.current = false
    //         if (isMountedRef.current) {
    //             setViewportState('resized')
    //         }

    //     },RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE)

    // }

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

        const viewportProperties = this.cradleParameters.viewportPropertiesRef.current

        // if (viewportProperties.index == 6) {
        //     console.log('new repositioningRequired from intersection interrupt',this.signals.repositioningRequired)
        // }

        if (this.signals.repositioningRequired) // start reposition if no other interrupts are underway
        {
            let cradleState = stateHandler.cradleStateRef.current        
            if (
                !viewportProperties.isResizing &&
                !viewportProperties.portal?.isReparenting &&
                !(cradleState == 'resized') &&
                !(cradleState == 'repositioningA') && 
                !(cradleState == 'repositioningB') &&
                !(cradleState == 'finishreposition') &&
                // !(cradleState == 'updatepositionreferences') &&
                !(cradleState == 'doreposition') && 
                !(cradleState == 'pivot') && 
                !(cradleState == 'restorescrollposition')
                ) 
            {
                const element = viewportProperties.elementref.current
                if (!element) {
                    console.log('viewport element not set in cradleIntersectionObserverCallback',
                        this.cradleParameters.cradleInheritedPropertiesRef.current.scrollerID,viewportProperties)
                    return
                }
                // TODO this is a duplicate setting procedure with viewport.tsx
                const rect = element.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top
                viewportProperties.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
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
        
        const viewportProperties = this.cradleParameters.viewportPropertiesRef.current
        // if (viewportProperties.index == 6) {
        //         console.log('cell intersection entries for ', viewportProperties.index, entries)
        // }

        const contentHandler = this.cradleParameters.handlersRef.current.content
        const stateHandler = this.cradleParameters.handlersRef.current.state
        const scrollHandler = this.cradleParameters.handlersRef.current.scroll


        let movedentries = []

        // console.log('ENTRIES', entries)

        // debugger

        for (let entry of entries) {
            // console.log('entry dataset',Object.assign({},entry.target.dataset))
            if (entry.target.dataset.initialized) {

                // console.log('entry initialized',entry.target.dataset.initialized)
                movedentries.push(entry)

            } else {

                // console.log('INITIALIZING entry',entry.target.dataset.initialized)
                entry.target.dataset.initialized = 'true'
                // console.log('INITIALIZED entry',Object.assign({},entry.target.dataset))

            }
        }

        // TODO: moved this above initialization; no apparent difference to bug
        if (this.signals.pauseCellObserver) { 

            return

        }

        // if (viewportProperties.index == 6) {
                // console.log('movedentries for ', viewportProperties.index, movedentries)
        // }

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

   viewportResize = {
      observer:null,
      callback:null,
      createObserver:() => {

        this.viewportResize.observer = new ResizeObserver(this.viewportResize.callback)
        return this.viewportResize.observer

      }
   }

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
            let viewportProperties = this.cradleParameters.viewportPropertiesRef.current
            this.cradleIntersect.observer = new IntersectionObserver(
                this.cradleIntersect.callback,
                {root:viewportProperties.elementref.current, threshold:0}
            )
            return this.cradleIntersect.observer
        }
    }
    cellIntersect = {
        observer:null,
        callback:null,
        createObserver:() => {
            let viewportProperties = this.cradleParameters.viewportPropertiesRef.current
            this.cellIntersect.observer = new IntersectionObserver(

                this.cellintersectionobservercallback,
                {
                    root:viewportProperties.elementref.current, 
                    threshold:this.cradleParameters.cradleConfigRef.current.cellObserverThreshold,
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
