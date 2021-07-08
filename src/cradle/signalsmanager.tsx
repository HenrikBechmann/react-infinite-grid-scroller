// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class SignalsManager extends CradleManagement {

    constructor(commonPropsRef) {

       super(commonPropsRef)
       this.resetSignals()

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

    private _signalsbaseline = {
        pauseCellObserver: true,
        pauseCradleIntersectionObserver:true,
        pauseCradleResizeObserver: true,
        pauseScrollingEffects: true,
        isTailCradleInView:true,
        isHeadCradleInView:true,
        isCradleInView:true,
    }

    resetSignals = () => {

        this.signals = Object.assign({},this._signalsbaseline) //clone 

    }

}
