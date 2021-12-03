// wingsmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import { ResizeObserver } from '@juggle/resize-observer'

const ResizeObserverClass = window['ResizeObserver'] || ResizeObserver

import CradleManagement from './cradlesuper'

export default class ObserversAgent extends CradleManagement{

   constructor(commonPropsRef) {

      super(commonPropsRef)

   }

   // TODO: stub
   cradleresizeobservercallback = (entries) => {

       let signalsAgent = this._managersRef.current.signals
       if (signalsAgent.signals.pauseCradleResizeObserver) return

   }

    cradleIntersectionObserverCallback = (entries) => {

        let signalsAgent = this._managersRef.current.signals
        let signals = signalsAgent.signals
        let stateAgent = this._managersRef.current.state
        let contentAgent = this._managersRef.current.content

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

        let viewportData = this._viewportdataRef.current
        if (!signals.isCradleInView) 
        {
            let cradleState = stateAgent.cradleStateRef.current        
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
                        this._cradlePropsRef.current.scrollerID,viewportData)
                    return
                }
                const rect = element.getBoundingClientRect()
                const {top, right, bottom, left} = rect
                const width = right - left, height = bottom - top
                viewportData.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
                signals.pauseCellObserver = true
                // pauseCradleIntersectionObserverRef.current = true
                const cradleContent = contentAgent.content
                cradleContent.headModel = []
                cradleContent.tailModel = []
                cradleContent.headView = []
                cradleContent.tailView = []
                stateAgent.setCradleState('repositioning')

            }
        }

    }

    // the async callback from IntersectionObserver.
    cellobservercallback = (entries)=>{

        let viewportData = this._viewportdataRef.current

        const testrootbounds = entries[0].rootBounds
        if ((testrootbounds.width == 0) && (testrootbounds.height == 0)) { // reparenting

            return

        }

        let signalsAgent = this._managersRef.current.signals
        let contentAgent = this._managersRef.current.content
        let stateAgent = this._managersRef.current.state

        let movedentries = []

        for (let entry of entries) {
            if (entry.target.dataset.initialized) {

                movedentries.push(entry)

            } else {

                entry.target.dataset.initialized = true

            }
        }

        if (signalsAgent.signals.pauseCellObserver) {

            return

        }

        stateAgent.isMounted.current && contentAgent.updateCradleContent(movedentries,'cellObserver')

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
            let viewportData = this._viewportdataRef.current
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
            let viewportData = this._viewportdataRef.current
            this.cellIntersect.observer = new IntersectionObserver(

                this.cellobservercallback,
                {
                    root:viewportData.elementref.current, 
                    threshold:this._cradleconfigRef.current.cellObserverThreshold,
                } 
            )
            return this.cellIntersect.observer
        }

    }

}
