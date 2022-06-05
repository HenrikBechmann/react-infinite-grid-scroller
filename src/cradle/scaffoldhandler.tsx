// cradlehandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class ScaffoldHandler { 

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

        const {
            axisRef, 
            headRef, 
            tailRef,
            headTriggerlineRef,
            tailTriggerlineRef
        } = cradleParameters.cradleInternalPropertiesRef.current.cradleElementsRef.current
        this.elements = {
            axisRef,
            headRef,
            tailRef,
            headTriggerlineRef,
            tailTriggerlineRef
        }

        const {
            defaultVisibleIndex, 
            listsize, 
            padding
        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        // progression of references: scroll->next
        this.cradlePositionData.scrollImpliedAxisReferenceIndex = 
            (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
        this.cradlePositionData.scrollImpliedAxisPixelOffset = 0 // padding
        this.cradlePositionData.targetAxisReferenceIndex = 
            this.cradlePositionData.scrollImpliedAxisReferenceIndex
        this.cradlePositionData.targetAxisPixelOffset = 
            this.cradlePositionData.scrollImpliedAxisPixelOffset

    }

    cradleParameters

    cradlePositionData = {

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