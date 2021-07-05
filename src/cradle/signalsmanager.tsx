// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class SignalsManager extends CradleManagement {

    constructor(commonPropsRef,signalsbaseline) {

       super(commonPropsRef)
       this.signalsBaseline = signalsbaseline
       this.signals = Object.assign({},signalsbaseline)

    }

    signalsBaseline

   signals = {
      pauseCellObserver: null,
      pauseCradleIntersectionObserver:null,
      pauseCradleResizeObserver: null,
      pauseScrollingEffects: null,
      isTailCradleInView:null,
      isHeadCradleInView:null,
      isCradleInView:null,
   }

}
