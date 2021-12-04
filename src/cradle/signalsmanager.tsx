// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

const signalsbaseline = {
    pauseCellObserver: true,
    pauseCradleIntersectionObserver:true,
    pauseCradleResizeObserver: true,
    pauseScrollingEffects: true,
    isTailCradleInView:true,
    isHeadCradleInView:true,
    isCradleInView:true,
}

export default class SignalsManager {

    constructor(commonPropsRef) {

       this.commonProps = commonPropsRef.current
       this.resetSignals()

    }

    commonProps

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
