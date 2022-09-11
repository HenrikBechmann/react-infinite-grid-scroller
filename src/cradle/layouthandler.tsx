// layouthandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds references to 
    - the structural elements of the cradle
    - the key control values of the cradle

    The structural elements are the axis, head (grid), tail (grid), 
        and the forward and backward triggerlines
    The key control values are the blockScrollPos (scrollTop or scrollLeft), the block scroll
        property ("scrollTop" or "scrollLeft"), the targetAxisReferenceIndex (first index of the
        tail block), and the targetAxisViewportPixelOffset (pixels offset from the edge of the 
        viewport)
*/

export default class LayoutHandler { 

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

        const {
            axisRef, 
            headRef, 
            tailRef,
            axisTriggerlineRef,
            headTriggerlineRef,
            triggercellTriggerlineHeadRef,
            triggercellTriggerlineTailRef,
        } = cradleParameters.cradleInternalPropertiesRef.current.cradleElementsRef.current
        
        this.elements = {
            axisRef,
            headRef,
            tailRef,
            axisTriggerlineRef,
            headTriggerlineRef,
            triggercellTriggerlineHeadRef,
            triggercellTriggerlineTailRef,
        }

        const {
            startingIndex, 
            // padding
        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const {
            listsize,
        } = this.cradleParameters.cradleInternalPropertiesRef.current

        // progression of references: implied->target
        this.cradlePositionData.targetAxisReferenceIndex = 
            (Math.min(startingIndex,(listsize - 1)) || 0)
        this.cradlePositionData.targetAxisViewportPixelOffset = 0

    }

    private cradleParameters

    public get triggerlineSpan() {

        const {
            orientation, 
            // padding
        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        return (orientation == 'vertical')?
            this.elements.triggercellTriggerlineTailRef.current.offsetTop - 
            this.elements.triggercellTriggerlineHeadRef.current.offsetTop:
            // horizontal
            this.elements.triggercellTriggerlineTailRef.current.offsetLeft - 
            this.elements.triggercellTriggerlineHeadRef.current.offsetLeft
    }

    public triggercellIndex
    public triggercellIsInTail = false

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
        blockScrollPos:null, // the edge of the viewport

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
                - layoutHandler (initialization)
                - scrollHandler (during and after scroll)
                - host scrollToItem call

            targetAxisReferenceIndex is used by
                - scrollTrackerArgs in cradle module
                - requestedAxisReferenceIndex in setCradleContent
        */
        targetAxisReferenceIndex:null,

        /*
            targetAxisViewportPixelOffset is set by
                - setCradleContent
                - updateCradleContent
                - layoutHandler (initialization)
                - scrollHandler (during and after scroll)
                - pivot effect (change of orientation) in cradle module

            targetAxisViewportPixelOffset is used by
                - previousAxisOffset in pivot effect
                - setCradleContent

        */
        targetAxisViewportPixelOffset:null, // into the viewport

    }

    public elements

}