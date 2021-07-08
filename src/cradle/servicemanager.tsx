// servicemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class ServiceManager extends CradleManagement{

    constructor(commonPropsRef, serviceCallsRef) {

       super(commonPropsRef)

       this.serviceCalls = serviceCallsRef.current

    }

    serviceCalls

}