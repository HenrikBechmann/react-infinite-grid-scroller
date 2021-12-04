// statemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StateManager {

    constructor(commonProps,cradleStateRef,setCradleState,isMountedRef) {

       this.commonProps = commonProps

       this.setCradleState = setCradleState
       this.cradleStateRef = cradleStateRef
       this.isMountedRef = isMountedRef
       
    }

    commonProps

    cradleStateRef
    setCradleState
    isMountedRef

}
