// layouthandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds references to 
    - the structural elements of the cradle
    - the key control values of the cradle

    The structural elements are the axis, head (grid), tail (grid), 
        and the head and tail triggerlines
    The key control values are the blockScrollPos & blockXScrollPos (scrollTop or scrollLeft), the block scroll
        property ("scrollTop" or "scrollLeft"), the targetAxisReferenceIndex (first index of the
        tail block), and the targetAxisViewportPixelOffset (pixels offset from the edge of the 
        viewport)
*/

import { isSafariIOS } from '../InfiniteGridScroller'

export default class LayoutHandler { 

    constructor(cradleParameters) {

        this.cradleParameters = cradleParameters

        const {
            axisRef, 
            headRef, 
            tailRef,
            triggercellTriggerlineHeadRef,
            triggercellTriggerlineTailRef,
        } = cradleParameters.cradleInternalPropertiesRef.current.cradleElementsRef.current
        
        this.elements = {
            axisRef,
            headRef,
            tailRef,
            triggercellTriggerlineHeadRef,
            triggercellTriggerlineTailRef,
        }

        const {
            startingIndex, 
            // padding
        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const listsize = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps.size

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

        const span = (orientation == 'vertical')?
            this.elements.triggercellTriggerlineTailRef.current.offsetTop - 
            this.elements.triggercellTriggerlineHeadRef.current.offsetTop:
            // horizontal
            this.elements.triggercellTriggerlineTailRef.current.offsetLeft - 
            this.elements.triggercellTriggerlineHeadRef.current.offsetLeft

        return span
    }

    public triggercellIndex
    public triggercellIsInTail // = false

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
        blockXScrollPos:null, // the cross position for oversized scrollBlock

        /*
            values can be "scrollTop" or "scrollLeft" (of the viewport element) depending on orientation

            blockScrollProperty is set by the orientation reconfiguration effect in cradle module.

            it is used where blockScrollPos is used above.
        */
        blockScrollProperty: null,
        blockXScrollProperty: null,

        /*
            targetAxisReferenceIndex is set by
                - setCradleContent
                - updateCradleContent
                - layoutHandler (initialization)
                - scrollHandler (during and after scroll)
                - host scrollToIndex call

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
        targetAxisViewportPixelOffset:null, // pixels into the viewport

    }

    // called by interruptHandler
    public restoreBaseScrollblockConfig = () => {

        const ViewportContextProperties = this.cradleParameters.ViewportContextPropertiesRef.current
        const viewportElement = ViewportContextProperties.elementRef.current
        const scrollblockElement = viewportElement.firstChild

        const { 

            // scrollerID, 
            orientation, 
            padding, 
            gap,
            cellHeight,
            cellWidth,
            // layout 

        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const {
            rowcount:listRowcount,
            crosscount,
        } = this.cradleParameters.cradleInternalPropertiesRef.current.virtualListProps

        const { 

            // stateHandler, 
            // serviceHandler, 
            scrollHandler, 
            layoutHandler 

        } = this.cradleParameters.handlersRef.current

        const cellLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth)
            + gap

        const baselength = (listRowcount * cellLength) - gap // final cell has no trailing gap
            + (padding * 2) // leading and trailing padding

        if (orientation == 'vertical') {

            scrollblockElement.style.top = null
            scrollblockElement.style.height = baselength + 'px'

        } else {

            scrollblockElement.style.left = null
            scrollblockElement.style.width = baselength + 'px'

        }

        const { cradlePositionData } = layoutHandler
        const axisReference = cradlePositionData.targetAxisReferenceIndex
        const rowOffset = Math.ceil(axisReference/crosscount)
        const calculatedBlockScrollPos = 
            (rowOffset * cellLength) + padding


        if (isSafariIOS()) { // scrollPos overwritten by Safari iOS momentum engine

            const originalScrollPos = 
                (orientation == 'vertical')?
                    viewportElement.scrollTop:
                    viewportElement.scrollLeft

            const scrollShift = calculatedBlockScrollPos - originalScrollPos

            if (orientation == 'vertical') {

                scrollblockElement.style.top = scrollShift

            } else {

                scrollblockElement.style.left = scrollShift

            }


        } else {

            viewportElement[cradlePositionData.blockScrollProperty] = calculatedBlockScrollPos

        }
        cradlePositionData.blockScrollPos = calculatedBlockScrollPos
        scrollHandler.resetScrollData(calculatedBlockScrollPos)

    }

    public elements

}

