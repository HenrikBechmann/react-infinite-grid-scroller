// wingsmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import { ResizeObserver } from '@juggle/resize-observer'

const ResizeObserverClass = window['ResizeObserver'] || ResizeObserver

export default class InterruptManager {

   constructor(commonProps) {

      this.commonProps = commonProps

   }

   private commonProps

   private isTailCradleInView = false
   private isHeadCradleInView = false

   // TODO: stub
   private cradleresizeobservercallback = (entries) => {

       if (this.signals.pauseCradleResizeObserver) return

   }

    private cradleIntersectionObserverCallback = (entries) => {

        const signals = this.signals
        const stateManager = this.commonProps.managersRef.current.state
        const contentManager = this.commonProps.managersRef.current.content

        if (signals.pauseCradleIntersectionObserver) return

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

        this.states.isCradleInView = (this.isHeadCradleInView || this.isTailCradleInView);

        let viewportData = this.commonProps.viewportdataRef.current
        if (!this.states.isCradleInView) // start reposition if no other interrupts are underway
        {
            let cradleState = stateManager.cradleStateRef.current        
            if (
                !viewportData.isResizing &&
                !(cradleState == 'resized') &&
                !(cradleState == 'repositioningA') && 
                !(cradleState == 'repositioningB') &&
                !(cradleState == 'doreposition') && 
                !(cradleState == 'pivot')
                ) 
            {
                const element = viewportData.elementref.current
                if (!element) {
                    console.log('viewport element not set in cradleIntersectionObserverCallback',
                        this.commonProps.cradlePropsRef.current.scrollerID,viewportData)
                    return
                }
                const rect = element.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top
                viewportData.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
                signals.pauseCellObserver = true
                // pauseCradleIntersectionObserverRef.current = true
                const cradleContent = contentManager.content
                cradleContent.headModel = []
                cradleContent.tailModel = []
                cradleContent.headView = []
                cradleContent.tailView = []
                stateManager.setCradleState('startreposition')

            }
        }

    }

    // the async callback from IntersectionObserver.
    private cellintersectionobservercallback = (entries)=>{

        const testrootbounds = entries[0].rootBounds
        if ((testrootbounds.width == 0) && (testrootbounds.height == 0)) { // reparenting

            return

        }
        
        let viewportData = this.commonProps.viewportdataRef.current
        // if (viewportData.index == 6) {
        //         console.log('entries for ', viewportData.index, entries)
        // }

        let contentManager = this.commonProps.managersRef.current.content
        let stateManager = this.commonProps.managersRef.current.state

        // TODO: moved this above initialization; no apparent difference to bug
        if (this.signals.pauseCellObserver) { 

            return

        }

        let movedentries = []

        for (let entry of entries) {
            if (entry.target.dataset.initialized) {

                movedentries.push(entry)

            } else {

                entry.target.dataset.initialized = true

            }
        }

        if (viewportData.index == 6) {
                console.log('movedentries for ', viewportData.index, movedentries)
        }

        stateManager.isMountedRef.current && contentManager.updateCradleContent(movedentries,'cellObserver')

    }

   cradleResize = {
      observer:null,
      callback:this.cradleresizeobservercallback,
      create:() => {

        this.cradleResize.observer = new ResizeObserverClass(this.cradleResize.callback)
        return this.cradleResize.observer

      }
   }
   cradleIntersect = {
        observer:null,
        callback:this.cradleIntersectionObserverCallback,
        create:() => {
            let viewportData = this.commonProps.viewportdataRef.current
            this.cradleIntersect.observer = new IntersectionObserver(
                this.cradleIntersect.callback,
                {root:viewportData.elementref.current, threshold:0}
            )
            return this.cradleIntersect.observer
        }
    }
    cellIntersect = {
        observer:null,
        callback:null,
        create:() => {
            let viewportData = this.commonProps.viewportdataRef.current
            this.cellIntersect.observer = new IntersectionObserver(

                this.cellintersectionobservercallback,
                {
                    root:viewportData.elementref.current, 
                    threshold:this.commonProps.cradleConfigRef.current.cellObserverThreshold,
                } 
            )
            return this.cellIntersect.observer
        }

    }

    states = {
        isRepositioning:false,
        // isResizing:false,
        isReparenting:false,
        isCradleInView: false,
    }

    signals = {
        pauseCellObserver: false,
        pauseCradleIntersectionObserver:false,
        pauseCradleResizeObserver: false,
        pauseScrollingEffects: false,
    }

}
