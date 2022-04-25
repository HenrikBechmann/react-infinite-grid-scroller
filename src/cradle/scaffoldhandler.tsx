// cradlehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class ScaffoldHandler { 

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       const {spineRef, headRef, tailRef} = 
          cradleParameters.CradleInternalPropertiesRef.current.cradleElementsRef.current
       this.elements = {
          spineRef,
          headRef,
          tailRef,
       }

       const {defaultVisibleIndex, listsize, padding} = this.cradleParameters.cradleInheritedPropertiesRef.current

       // progression of references: scroll->next
       this.cradleReferenceData.scrollImpliedItemIndexReference = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cradleReferenceData.scrollImpliedCradlePosOffset = padding
       this.cradleReferenceData.nextItemIndexReference = this.cradleReferenceData.scrollImpliedItemIndexReference
       this.cradleReferenceData.nextCradlePosOffset = this.cradleReferenceData.scrollImpliedCradlePosOffset

    }

    cradleParameters // standard for handlers, but not used here yet

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

      // to set scrollPos after doreposition, or
      // to restore scrollTop or scrollLeft after clobbered by DOM
      blockScrollPos:null, 
      blockScrollProperty:null,

   }

   elements

}