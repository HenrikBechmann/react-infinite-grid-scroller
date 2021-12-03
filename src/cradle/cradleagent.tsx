// cradlemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlesuper'

export default class CradleAgent extends CradleManagement{

    constructor(commonPropsRef, cradleElements) {

       super(commonPropsRef)

       // console.log('CALLING CradleAgent CONSTRUCTOR')

       let elements = this.elements
       elements.spineRef = cradleElements.spine
       elements.headRef = cradleElements.head
       elements.tailRef = cradleElements.tail

       let {defaultVisibleIndex, listsize, padding} = commonPropsRef.current.cradlePropsRef.current

       // console.log('commonPropsRef.current.cradlePropsRef.current in CradleAgent constructor',commonPropsRef.current.cradlePropsRef.current)

       this.cradleReferenceData.scrollItemIndexReference = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cradleReferenceData.scrollSpinePixelOffset = padding
       this.cradleReferenceData.readyItemIndexReference = this.cradleReferenceData.scrollItemIndexReference
       this.cradleReferenceData.readySpinePixelOffset = this.cradleReferenceData.scrollSpinePixelOffset
       this.cradleReferenceData.nextItemIndexReference = this.cradleReferenceData.readyItemIndexReference
       this.cradleReferenceData.nextSpinePixelOffset = this.cradleReferenceData.readySpinePixelOffset

    }

   cradleReferenceData = {

      scrollItemIndexReference:null,
      scrollSpinePixelOffset:null,

      readyItemIndexReference:null,
      readySpinePixelOffset:null,

      nextItemIndexReference:null,
      nextSpinePixelOffset:null,

   }    

   // TODO: wrap this in blockScrollPosData
   blockScrollPosData = {
       blockScrollPos:null,
       blockScrollProperty:null
   }

    elements = {
       spineRef:null, 
       headRef:null, 
       tailRef:null
    }

}