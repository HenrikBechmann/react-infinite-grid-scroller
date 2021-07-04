// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class SignalsManager {

    constructor({managers,viewportdata,cradleprops},signalsbaseline) {

       this.signalsBaseline = signalsbaseline
       this._managers = managers
       this._viewportdata = viewportdata
       this._cradleprops = cradleprops
       this._currentsignals = Object.assign({},signalsbaseline)

    }

    signalsBaseline

    private _managers
    private _viewportdata
    private _cradleprops
    private _currentsignals

}
