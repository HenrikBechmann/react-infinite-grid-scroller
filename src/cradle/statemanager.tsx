// statemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StateManager {

    constructor(cradleBackProps,cradleStateRef,setCradleState,isMountedRef) {

       this.cradleBackProps = cradleBackProps

       this.setCradleState = setCradleState
       this.cradleStateRef = cradleStateRef
       this.isMountedRef = isMountedRef
       
    }

    cradleBackProps

    cradleStateRef
    setCradleState
    isMountedRef

}
