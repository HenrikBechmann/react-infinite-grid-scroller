// statemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StateManager {

    constructor(commonProps,cradleStateRef,setCradleState,isMounted) {

       this.commonProps = commonProps

       this.setCradleState = setCradleState
       this.cradleStateRef = cradleStateRef
       this.isMounted = isMounted
       
    }

    commonProps

    cradleStateRef
    setCradleState
    isMounted

}
