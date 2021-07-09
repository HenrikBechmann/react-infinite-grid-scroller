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

       this.cellReferenceData.scrollReferenceIndex = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cellReferenceData.scrollSpineOffset = padding
       this.cellReferenceData.readyReferenceIndex = this.cellReferenceData.scrollReferenceIndex
       this.cellReferenceData.readySpineOffset = this.cellReferenceData.scrollSpineOffset
       this.cellReferenceData.nextReferenceIndex = this.cellReferenceData.readyReferenceIndex
       this.cellReferenceData.nextSpineOffset = this.cellReferenceData.readySpineOffset

    }

   cellReferenceData = {

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