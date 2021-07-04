// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class SignalsManager {

    constructor({managers,viewportdata,cradleprops},signalsbaseline) {

       this.managers = managers
       this.viewportdata = viewportdata
       this.cradleprops = cradleprops
       this.signalsbaseline = signalsbaseline
       this.currentsignals = Object.assign({},signalsbaseline)

    }

    private managers
    private viewportdata
    private cradleprops
    private signalsbaseline
    private currentsignals

    get signalsBaseline() {

        return this.signalsbaseline

    }

    get signals() {
        return this.currentsignals
    }
}
