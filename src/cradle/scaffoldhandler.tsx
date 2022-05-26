// cradlehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class ScaffoldHandler { 

    constructor(cradleParameters) {

       this.cradleParameters = cradleParameters

       const {
          axisRef, 
          headRef, 
          tailRef,
          headBreaklineRef,
          tailBreaklineRef
       } = cradleParameters.cradleInternalPropertiesRef.current.cradleElementsRef.current
       this.elements = {
          axisRef,
          headRef,
          tailRef,
          headBreaklineRef,
          tailBreaklineRef
       }

       const {
          defaultVisibleIndex, 
          listsize, 
          padding
       } = this.cradleParameters.cradleInheritedPropertiesRef.current

       // progression of references: scroll->next
       this.cradleReferenceData.scrollImpliedAxisReferenceIndex = 
          (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cradleReferenceData.scrollImpliedAxisPixelOffset = 0 // padding
       this.cradleReferenceData.targetAxisReferenceIndex = 
          this.cradleReferenceData.scrollImpliedAxisReferenceIndex
       this.cradleReferenceData.targetAxisPixelOffset = 
          this.cradleReferenceData.scrollImpliedAxisPixelOffset

    }

    cradleParameters // standard for handlers, but not used here yet

   /* 
      ItemIndexReference is the sequential index of first item of the cradle tail
      CradlePixelOffset is the pixel offset of the cradle axis from the edge of the viewport
      blockScrollPos is the scrollPos of the scrollblock in relation to the viewport
      progression is scroll -> next
   */
   cradleReferenceData = {

      scrollImpliedAxisReferenceIndex:null,
      scrollImpliedAxisPixelOffset:null,

      targetAxisReferenceIndex:null,
      targetAxisPixelOffset:null,

      // to set scrollPos after doreposition, or
      // to restore scrollTop or scrollLeft after clobbered by DOM
      blockScrollPos:null, 
      blockScrollProperty:null,

   }

   elements

}