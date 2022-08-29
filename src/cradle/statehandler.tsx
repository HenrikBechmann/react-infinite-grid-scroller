// statehandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

export default class StateHandler {

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       const internalProperties = cradleParameters.cradleInternalPropertiesRef.current

       this.setCradleState = internalProperties.setCradleState
       this.cradleStateRef = internalProperties.cradleStateRef
       this.isMountedRef = internalProperties.isMountedRef
       
    }

    private cradleParameters

    public cradleStateRef
    public setCradleState
    public isMountedRef

}
