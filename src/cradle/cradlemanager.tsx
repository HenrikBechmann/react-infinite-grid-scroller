// cradlemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class CradleManager extends CradleManagement{

    constructor(commonPropsRef, cradleElements) {

       super(commonPropsRef)

       // console.log('CALLING CradleManager CONSTRUCTOR')

       let elements = this.elements
       elements.spineRef = cradleElements.spine
       elements.headRef = cradleElements.head
       elements.tailRef = cradleElements.tail

       let {defaultVisibleIndex, listsize, padding} = commonPropsRef.current.cradlePropsRef.current

       // console.log('commonPropsRef.current.cradlePropsRef.current in CradleManager constructor',commonPropsRef.current.cradlePropsRef.current)

       this.referenceData.scrollReferenceIndex = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.referenceData.scrollSpineOffset = padding
       this.referenceData.readyReferenceIndex = this.referenceData.scrollReferenceIndex
       this.referenceData.readySpineOffset = this.referenceData.scrollSpineOffset
       this.referenceData.nextReferenceIndex = this.referenceData.readyReferenceIndex
       this.referenceData.nextSpineOffset = this.referenceData.readySpineOffset

    }

   referenceData = {

      scrollReferenceIndex:null,
      scrollSpineOffset:null,

      readyReferenceIndex:null,
      readySpineOffset:null,

      nextReferenceIndex:null,
      nextSpineOffset:null,

   }    

   // TODO: wrap this in blockPosData
    blockScrollPos:number
    blockScrollProperty:string


    elements = {
       spineRef:null, 
       headRef:null, 
       tailRef:null
    }

}