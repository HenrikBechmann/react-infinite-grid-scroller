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

       this.cellReferenceData.scrollReferenceItemIndex = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cellReferenceData.scrollSpinePixelOffset = padding
       this.cellReferenceData.readyReferenceItemIndex = this.cellReferenceData.scrollReferenceItemIndex
       this.cellReferenceData.readySpinePixelOffset = this.cellReferenceData.scrollSpinePixelOffset
       this.cellReferenceData.nextReferenceItemIndex = this.cellReferenceData.readyReferenceItemIndex
       this.cellReferenceData.nextSpinePixelOffset = this.cellReferenceData.readySpinePixelOffset

    }

   cellReferenceData = {

      scrollReferenceItemIndex:null,
      scrollSpinePixelOffset:null,

      readyReferenceItemIndex:null,
      readySpinePixelOffset:null,

      nextReferenceItemIndex:null,
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