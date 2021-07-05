// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class SignalsManager extends CradleManagement {

    constructor(commonPropsRef,signalsbaseline) {

       super(commonPropsRef)
       this.signalsBaseline = signalsbaseline
       this._currentsignals = Object.assign({},signalsbaseline)

    }

    signalsBaseline

    private _currentsignals

}
