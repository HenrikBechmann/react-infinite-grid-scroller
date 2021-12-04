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

       // console.log('commonProps.cradlePropsRef.current in CradleManager constructor',commonProps.cradlePropsRef.current)

       // progression of references: scroll->ready->next
       this.cradleReferenceData.scrollItemIndexReference = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cradleReferenceData.scrollSpinePixelOffset = padding
       this.cradleReferenceData.nextItemIndexReference = this.cradleReferenceData.scrollItemIndexReference
       this.cradleReferenceData.nextSpinePixelOffset = this.cradleReferenceData.scrollSpinePixelOffset
       // this.cradleReferenceData.theNextItemIndexReference = this.cradleReferenceData.nextItemIndexReference
       // this.cradleReferenceData.theNextSpinePixelOffset = this.cradleReferenceData.nextSpinePixelOffset

    }

    commonProps

   /* 
      ItemIndexReference is the sequential index of first item of the cradle tail
      SpinePixelOffset is the pixel offset of the cradle spine from the edge of the viewport
      spinePixelPos is the pixel offset of the cradle spine from the edge of the scrollblock;
         it is blockScrollPos + SpinePixelOffset
      blockScrollPos is the scrollPos of the scrollblock in relation to the viewport
      progression is scroll -> ready -> next
   */
   cradleReferenceData = {

      scrollItemIndexReference:null,
      scrollSpinePixelOffset:null,

      nextItemIndexReference:null,
      nextSpinePixelOffset:null,

      // theNextItemIndexReference:null,
      // theNextSpinePixelOffset:null,

      // currentItemIndexReference:null,
      // currentSpinePixelOffset:null,

      blockScrollPos:null,
      blockScrollProperty:null,

      // spinePixelPos: null

   }

   elements = {
      spineRef:null, 
      headRef:null, 
      tailRef:null
   }

}