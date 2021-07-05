// singalsmanager.txt
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class SignalsManager extends CradleManagement {

    constructor(props,signalsbaseline) {

       super(props)
       this.signalsBaseline = signalsbaseline
       this._currentsignals = Object.assign({},signalsbaseline)

    }

    signalsBaseline

    private _currentsignals

}
