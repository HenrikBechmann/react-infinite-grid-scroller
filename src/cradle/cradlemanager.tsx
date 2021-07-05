// cradlemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class CradleManager extends CradleManagement{

    constructor(commonPropsRef, cradleElements) {

       super(commonPropsRef)
       let elements = this.elements
       elements.spineRef = cradleElements.spineRef
       elements.headRef = cradleElements.headRef
       elements.tailRef = cradleElements.tailRef

    }
    
    scrollReferenceIndex
    scrollSpineOffset
    readyReferenceIndex
    readySpineOffset
    nextReferenceIndex
    nextSpineOffset

    elements = {
       spineRef:null, 
       headRef:null, 
       tailRef:null
    }

}