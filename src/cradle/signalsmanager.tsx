// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleParent from './cradleparent'

const signalsbaseline = {
    pauseCellObserver: true,
    pauseCradleIntersectionObserver:true,
    pauseCradleResizeObserver: true,
    pauseScrollingEffects: true,
    isTailCradleInView:true,
    isHeadCradleInView:true,
    isCradleInView:true,
}

export default class SignalsManager extends CradleParent {

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

    resetSignals = () => {

        this.signals = Object.assign({},signalsbaseline) //clone 

    }

}
