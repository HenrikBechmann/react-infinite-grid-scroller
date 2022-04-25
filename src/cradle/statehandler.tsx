// statehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StateHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       const config = cradleParameters.cradleConfigRef.current

       this.setCradleState = config.setCradleState
       this.cradleStateRef = config.cradleStateRef
       this.isMountedRef = config.isMountedRef
       
    }

    cradleParameters

    cradleStateRef
    setCradleState
    isMountedRef

}
