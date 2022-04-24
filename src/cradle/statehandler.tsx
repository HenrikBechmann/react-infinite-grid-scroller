// statehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StateHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       this.setCradleState = cradleParameters.setCradleState
       this.cradleStateRef = cradleParameters.cradleStateRef
       this.isMountedRef = cradleParameters.isMountedRef
       
    }

    cradleParameters

    cradleStateRef
    setCradleState
    isMountedRef

}
