// statemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class StateManager extends CradleManagement{

    constructor(commonprops,setCradleState,cradleStateRef) {

       super(commonprops)
       this.setCradleState = setCradleState
       this.cradleStateRef = cradleStateRef
    }

    cradleStateRef
    setCradleState

}
