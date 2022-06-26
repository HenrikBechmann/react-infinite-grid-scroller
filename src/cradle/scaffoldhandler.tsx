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

        // progression of references: implied->target
        this.cradlePositionData.targetAxisReferenceIndex = 
            (Math.min(defaultVisibleIndex,(listsize - 1)) || 0)
        this.cradlePositionData.targetAxisPixelOffset = 0

    }

    private cradleParameters

    public triggerlineSpan

    // cradlePositionData controls the relative positions of the scaffold elements
    public cradlePositionData = {

        /*
            "block" = cradleblock, which is the element that is scrolled

            blockScrollPos is set by scrollHandler during and after scrolling,
            and by setCradleContent in contentHandler, which repositions the cradle.

            blockScrollPos is used by
                - cradle initialization in response to reparenting interrupt
                - setCradleContent

        */
        blockScrollPos:null,

        /*
            values can be "scrollTop" or "scrollLeft" (of the viewport element) depending on orientation

            blockScrollProperty is set by the orientation reconfiguration effect in cradle module.

            it is used where blockScrollPos is used above.
        */
        blockScrollProperty:null,

        /*
            targetAxisReferenceIndex is set by
                - setCradleContent
                - updateCradleContent
                - scaffoldHandler (initialization)
                - scrollHandler (during and after scroll)
                - host scrollToItem call

            targetAxisReferenceIndex is used by
                - scrollTrackerArgs in cradle module
                - requestedAxisReferenceIndex in setCradleContent
        */
        targetAxisReferenceIndex:null,

        /*
            targetAxisPixelOffset is set by
                - setCradleContent
                - updateCradleContent
                - scaffoldHandler (initialization)
                - scrollHandler (during and after scroll)
                - pivot effect (change of orientation) in cradle module

            targetAxisPixelOffset is used by
                - previousAxisOffset in pivot effect
                - setCradleContent

        */
        targetAxisPixelOffset:null,

    }

    public elements

}