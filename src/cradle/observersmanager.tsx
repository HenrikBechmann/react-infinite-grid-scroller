// wingsmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import { ResizeObserver } from '@juggle/resize-observer'

const ResizeObserverClass = window['ResizeObserver'] || ResizeObserver

import CradleManagement from './cradlemanagement'

export default class ObserversManager extends CradleManagement{

   constructor(commonPropsRef) {

      super(commonPropsRef)

   }

   // TODO: stub
   cradleresizeobservercallback = (entries) => {

       let signalsManager = this._managers.current.signals
       if (signalsManager.signals.pauseCradleResizeObserver) return

   }

    cradleIntersectionObserverCallback = (entries) => {

        let signalsManager = this._managers.current.signals
        let signals = signalsManager.signals
        let stateManager = this._managers.current.state
        let contentManager = this._managers.current.content

        if (signals.pauseCradleIntersectionObserver) return
        let viewportData = this._viewportdataRef.current
        if (viewportData.portalitem?.reparenting) return

        for (let i = 0; i < entries.length; i++ ) {
            let entry = entries[i]
            if (entry.target.dataset.type == 'head') {
                signals.isHeadCradleInView = entry.isIntersecting
            } else {
                signals.isTailCradleInView = entry.isIntersecting
            }
        }

        signals.isCradleInView = (signals.isHeadCradleInView || signals.isTailCradleInView);

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
                let element = viewportData.elementref.current
                if (!element) {
                    console.log('viewport element not set in cradleIntersectionObserverCallback',
                        this._cradlePropsRef.current.scrollerID,viewportData)
                    return
                }
                let rect = element.getBoundingClientRect()
                let {top, right, bottom, left} = rect
                let width = right - left, height = bottom - top
                viewportData.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker
                signals.pauseCellObserver = true
                // pauseCradleIntersectionObserverRef.current = true
                let cradleContent = contentManager.content
                cradleContent.headModel = []
                cradleContent.tailModel = []
                cradleContent.headView = []
                cradleContent.tailView = []
                stateManager.setCradleState('repositioning')

            }
        }

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
      callback:null
   }

}
