// wingsmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import { ResizeObserver } from '@juggle/resize-observer'

const ResizeObserverClass = window['ResizeObserver'] || ResizeObserver

export default class InterruptManager {

   constructor(commonProps) {

      this.commonProps = commonProps

   }

   commonProps

   // TODO: stub
   cradleresizeobservercallback = (entries) => {

       let signalsManager = this.commonProps.managersRef.current.signals
       if (signalsManager.signals.pauseCradleResizeObserver) return

   }

    cradleIntersectionObserverCallback = (entries) => {

        let signalsManager = this.commonProps.managersRef.current.signals
        let signals = signalsManager.signals
        let stateManager = this.commonProps.managersRef.current.state
        let contentManager = this.commonProps.managersRef.current.content

        if (signals.pauseCradleIntersectionObserver) return

        for (let i = 0; i < entries.length; i++ ) {
            let entry = entries[i]
            if (entry.target.dataset.type == 'head') {
                signals.isHeadCradleInView = 
                    (entry.isIntersecting || 
                        ((entry.rootBounds.width == 0) && (entry.rootBounds.height == 0)) // reparenting
                )
            } else {
                signals.isTailCradleInView = 
                    (entry.isIntersecting  || 
                        ((entry.rootBounds.width == 0) && (entry.rootBounds.height == 0)) // reparenting
                )
            }
        }

        signals.isCradleInView = (signals.isHeadCradleInView || signals.isTailCradleInView);

        let viewportData = this.commonProps.viewportdataRef.current
        if (!signals.isCradleInView) 
        {
            let cradleState = stateManager.cradleStateRef.current        
            if (
                !viewportData.isResizing &&
                !(cradleState == 'resized') &&
                !(cradleState == 'repositioning') && 
                !(cradleState == 'reposition') && 
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
                stateManager.setCradleState('repositioning')

            }
        }

    }

    // the async callback from IntersectionObserver.
    cellobservercallback = (entries)=>{

        let viewportData = this.commonProps.viewportdataRef.current

        const testrootbounds = entries[0].rootBounds
        if ((testrootbounds.width == 0) && (testrootbounds.height == 0)) { // reparenting

            return

        }

        let signalsManager = this.commonProps.managersRef.current.signals
        let contentManager = this.commonProps.managersRef.current.content
        let stateManager = this.commonProps.managersRef.current.state

        let movedentries = []

        for (let entry of entries) {
            if (entry.target.dataset.initialized) {

                movedentries.push(entry)

            } else {

                entry.target.dataset.initialized = true

            }
        }

        if (signalsManager.signals.pauseCellObserver) {

            return

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

                this.cellobservercallback,
                {
                    root:viewportData.elementref.current, 
                    threshold:this.commonProps.cradleConfigRef.current.cellObserverThreshold,
                } 
            )
            return this.cellIntersect.observer
        }

    }

}
