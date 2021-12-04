// cradlemanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleManager { 

    constructor(commonProps, cradleElements) {

       this.commonProps = commonProps

       // console.log('CALLING CradleManager CONSTRUCTOR')

       let elements = this.elements
       elements.spineRef = cradleElements.spine
       elements.headRef = cradleElements.head
       elements.tailRef = cradleElements.tail

       let {defaultVisibleIndex, listsize, padding} = this.commonProps.cradlePropsRef.current

       // console.log('commonProps.cradlePropsRef.current in CradleManager constructor',commonProps.cradlePropsRef.current)

       this.cradleReferenceData.scrollItemIndexReference = (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
       this.cradleReferenceData.scrollSpinePixelOffset = padding
       this.cradleReferenceData.readyItemIndexReference = this.cradleReferenceData.scrollItemIndexReference
       this.cradleReferenceData.readySpinePixelOffset = this.cradleReferenceData.scrollSpinePixelOffset
       this.cradleReferenceData.nextItemIndexReference = this.cradleReferenceData.readyItemIndexReference
       this.cradleReferenceData.nextSpinePixelOffset = this.cradleReferenceData.readySpinePixelOffset

    }

    commonProps

   /* 
      ItemIndexReference is the sequential index of first item of the cradle tail
      SpinePixelOffset is the pixel offset of the cradle spine from the edge of the viewport
      spinePixelPos is the pixel offset of the cradle spine from the edge of the scrollblock;
         it is blockScrollPos + SpinePixelOffset
      blockScrollPos is the scrollPos of the scrollblock in relation to the viewport
   */
   cradleReferenceData = {

      scrollItemIndexReference:null,
      scrollSpinePixelOffset:null,

      readyItemIndexReference:null,
      readySpinePixelOffset:null,

      nextItemIndexReference:null,
      nextSpinePixelOffset:null,

      currentItemIndexReference:null,
      currentSpinePixelOffset:null,

      blockScrollPos:null,
      blockScrollProperty:null,

      spinePixelPos: null

   }

   elements = {
      spineRef:null, 
      headRef:null, 
      tailRef:null
   }

}