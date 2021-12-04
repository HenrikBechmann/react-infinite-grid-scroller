// cradlemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleManager { 

    constructor(commonProps, cradleElements) {

       this.commonProps = commonProps

       let elements = this.elements
       elements.spineRef = cradleElements.spine
       elements.headRef = cradleElements.head
       elements.tailRef = cradleElements.tail

       let {defaultVisibleIndex, listsize, padding} = this.commonProps.cradlePropsRef.current

       // progression of references: scroll->next
       this.cradleReferenceData.scrollImpliedItemIndexReference = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cradleReferenceData.scrollImpliedCradlePosOffset = padding
       this.cradleReferenceData.nextItemIndexReference = this.cradleReferenceData.scrollImpliedItemIndexReference
       this.cradleReferenceData.nextCradlePosOffset = this.cradleReferenceData.scrollImpliedCradlePosOffset

    }

    commonProps // standard for managers, but not used here yet

   /* 
      ItemIndexReference is the sequential index of first item of the cradle tail
      CradlePosOffset is the pixel offset of the cradle spine from the edge of the viewport
      blockScrollPos is the scrollPos of the scrollblock in relation to the viewport
      progression is scroll -> next
   */
   cradleReferenceData = {

      scrollImpliedItemIndexReference:null,
      scrollImpliedCradlePosOffset:null,

      nextItemIndexReference:null,
      nextCradlePosOffset:null,

      // to set scrollPos after reposition, or
      // to restore scrollTop or scrollLeft after clobbered by DOM
      blockScrollPos:null, 
      blockScrollProperty:null,

   }

   elements = {
      spineRef:null, 
      headRef:null, 
      tailRef:null
   }

}