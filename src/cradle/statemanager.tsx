// statemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlesuper'

export default class StateManager extends CradleManagement{

    constructor(commonPropsRef,cradleStateRef,setCradleState,isMounted) {

       super(commonPropsRef)

       this.setCradleState = setCradleState
       this.cradleStateRef = cradleStateRef
       this.isMounted = isMounted
       
    }

    cradleStateRef
    setCradleState
    isMounted

}
