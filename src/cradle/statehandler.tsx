// statehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StateHandler {

    constructor(cradleBackProps) {

       this.cradleBackProps = cradleBackProps

       this.setCradleState = cradleBackProps.setCradleState
       this.cradleStateRef = cradleBackProps.cradleStateRef
       this.isMountedRef = cradleBackProps.isMountedRef
       
    }

    cradleBackProps

    cradleStateRef
    setCradleState
    isMountedRef

}
