// layouthandler.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

/*
    This module holds references to 
    - the structural elements of the cradle
    - the key control values of the cradle

    The structural elements are the axis, head (grid), tail (grid), 
        and the head and tail triggerlines
    The key control values are the trackingBlockScrollPos & trackingXBlockScrollPos (scrollTop or scrollLeft), the block scroll
        property ("scrollTop" or "scrollLeft"), the targetAxisReferencePosition (first index of the
        tail block), and the targetPixelOffsetAxisFromViewport (pixels offset from the edge of the 
        viewport)
*/

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

        let {

            startingIndex, 
            orientation,

        } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const 
            { 
            
                virtualListProps,
                cradlePositionData,

            } = this.cradleParameters.cradleInternalPropertiesRef.current,
            { 

                size:listsize,
                lowindex,
                highindex,

            } = virtualListProps

        this.cradlePositionData = cradlePositionData

    } // constructor

    private cradleParameters

    public elements

    public get scrollerID() { // for debug
        return this.cradleParameters.cradleInheritedPropertiesRef.current.scrollerID
    }

    // control list boundary notifications

    public SOLSignal = false
    public EOLSignal = false

    public boundaryNotificationsRequired = () => {
        let trigger = false
        if (this.SOLSignal || this.EOLSignal) {
            trigger = true
        }
        return trigger
    }

    public cancelBoundaryNotifications = () => {

        this.SOLSignal = false
        this.EOLSignal = false

    }

    // triggerline control

    public get triggerlineSpan() {

        const 
            {
                orientation, 
            } = this.cradleParameters.cradleInheritedPropertiesRef.current,

            span = (orientation == 'vertical')
                ? this.elements.triggercellTriggerlineTailRef.current.offsetTop - 
                    this.elements.triggercellTriggerlineHeadRef.current.offsetTop
                // horizontal
                : this.elements.triggercellTriggerlineTailRef.current.offsetLeft - 
                    this.elements.triggercellTriggerlineHeadRef.current.offsetLeft

        return span
    }

    public triggercellIndex
    public triggercellIsInTail // = false

    // cradlePositionData controls the relative positions of the scaffold elements
    public cradlePositionData = {

        /*
            "block" = cradleblock, which is the element that is scrolled

            trackingBlockScrollPos is set by scrollHandler during and after scrolling,
            and by setCradleContent in contentHandler, which repositions the cradle.

            trackingBlockScrollPos is used by
                - cradle initialization in response to reparenting interrupt
                - setCradleContent

        */
        trackingBlockScrollPos:null, // the edge of the viewport
        trackingXBlockScrollPos:null, // the cross position for oversized scrollBlock

        /*
            values can be "scrollTop" or "scrollLeft" (of the viewport element) depending on orientation

            blockScrollProperty is set by the orientation reconfiguration effect in cradle module.

            it is used where trackingBlockScrollPos is used above.
        */
        blockScrollProperty: null,
        blockXScrollProperty: null,

        /*
            targetAxisReferencePosition is set by
                - setCradleContent
                - updateCradleContent
                - layoutHandler (initialization)
                - scrollHandler (during and after scroll)
                - host scrollToIndex call

            targetAxisReferencePosition is used by
                - scrollTrackerArgs in cradle module
                - requestedAxisReferenceIndex in setCradleContent
        */
        targetAxisReferencePosition:null,

        /*
            targetPixelOffsetAxisFromViewport is set by
                - setCradleContent
                - updateCradleContent
                - layoutHandler (initialization)
                - scrollHandler (during and after scroll)
                - pivot effect (change of orientation) in cradle module

            targetPixelOffsetAxisFromViewport is used by
                - previousAxisOffset in pivot effect
                - setCradleContent

        */
        targetPixelOffsetAxisFromViewport:null, // pixels into the viewport

    }

    // called by interruptHandler
    public restoreBaseScrollblockConfig = () => {

        const 
            viewportContext = this.cradleParameters.viewportContextRef.current,
            viewportElement = viewportContext.elementRef.current,
            scrollblockElement = viewportElement.firstChild,

            { 

                // scrollerID, 
                orientation, 
                // gap,
                cellHeight,
                cellWidth,
                layout 

            } = this.cradleParameters.cradleInheritedPropertiesRef.current,

            {
                virtualListProps,
                paddingProps,
                gapProps,

            } = this.cradleParameters.cradleInternalPropertiesRef.current,

            {

                rowcount:listRowcount,
                crosscount,

            } = virtualListProps,

            { 

                // stateHandler, 
                // serviceHandler, 
                scrollHandler, 
                layoutHandler 

            } = this.cradleParameters.handlersRef.current,

            gaplength = 
                orientation == 'vertical'
                    ? gapProps.column
                    : gapProps.row,

            cellLength = 
                ((orientation == 'vertical')
                    ? cellHeight
                    : cellWidth) 
                + gaplength,

            paddingLength = 
                orientation == 'vertical'
                    ? paddingProps.top + paddingProps.bottom
                    : paddingProps.left + paddingProps.right,

            blocklength = (listRowcount * cellLength) - gaplength // final cell has no trailing gap
                + paddingLength // leading and trailing padding

        if (orientation == 'vertical') {

            scrollblockElement.style.top = null
            scrollblockElement.style.height = blocklength + 'px'

        } else {

            scrollblockElement.style.left = null
            scrollblockElement.style.width = blocklength + 'px'

        }

        const 
            { cradlePositionData } = this, // layoutHandler,
            axisReferencePosition = cradlePositionData.targetAxisReferencePosition,
            rowReferencePosition = Math.ceil(axisReferencePosition/crosscount),
            paddingOffset = 
                orientation == 'vertical'
                    ? paddingProps.top
                    : paddingProps.left,
            calculatedBlockScrollPos = 
                (rowReferencePosition * cellLength) + paddingOffset


        if (layout == 'variable') { // scrollPos overwritten by Safari iOS momentum engine

            const 
                originalScrollPos = 
                    (orientation == 'vertical')
                        ? viewportElement.scrollTop
                        : viewportElement.scrollLeft,

                scrollShift = calculatedBlockScrollPos - originalScrollPos

            if (orientation == 'vertical') {

                scrollblockElement.style.top = scrollShift

            } else {

                scrollblockElement.style.left = scrollShift

            }


        } else {

            const 
                scrollTop = viewportElement.scrollTop,
                scrollLeft = viewportElement.scrollLeft

            let scrollOptions
            if (cradlePositionData.blockScrollProperty == 'scrollTop') {
                scrollOptions = {
                    top:cradlePositionData.trackingBlockScrollPos,
                    left:scrollLeft,
                    behavior:'instant',
                }
            } else {
                scrollOptions = {
                    left:cradlePositionData.trackingBlockScrollPos,
                    top:scrollTop,
                    behavior:'instant',
                }            
            }

            viewportElement.scroll(scrollOptions)

        }
        cradlePositionData.trackingBlockScrollPos = calculatedBlockScrollPos
        scrollHandler.resetScrollData(calculatedBlockScrollPos)

    }

}

