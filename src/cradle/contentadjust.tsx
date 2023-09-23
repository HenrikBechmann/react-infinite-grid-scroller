// contentadjust.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

export const contentAdjust = (source, cradleParameters) => {

    // ----------------------[ setup base values and references ]------------------------

    // resources...
    const
        // acquire repositories
        cradleHandlers = cradleParameters.handlersRef.current,
        viewportContextProperties = cradleParameters.viewportContextPropertiesRef.current,
        cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
        cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

        {

            layoutHandler, 
            scrollHandler, 
            interruptHandler 

        } = cradleHandlers,

        // extract resources from repositories
        { 

            elements: cradleElements, 
            cradlePositionData 

        } = layoutHandler,

        // current configurations...
        { 

            targetAxisReferencePosition: axisReferencePosition,
            targetPixelOffsetAxisFromViewport: pixelOffsetAxisFromViewport,

        } = cradlePositionData,

        // element references...
        viewportElement = viewportContextProperties.elementRef.current,
        scrollblockElement = viewportElement.firstChild,
        headGridElement = cradleElements.headRef.current,
        tailGridElement = cradleElements.tailRef.current,
        axisElement = cradleElements.axisRef.current,

        // configuration
        {

            orientation, 
            // gap, 
            cellHeight,
            cellWidth,

        } = cradleInheritedProperties,

        {

            virtualListProps,
            paddingProps,
            gapProps,

        } = cradleInternalProperties,

        { 

            crosscount, 
            rowcount:listRowcount,
            lowindex:listlowindex,
            rowshift:listrowshift,

        } = virtualListProps

    // resize observer embedded to provide access to variables
    let gridResizeObserver

    let gridResizeTimeoutID

    const gridResizeObserverCallback = () => {

        const { stateHandler } = cradleParameters.handlersRef.current

        clearTimeout(gridResizeTimeoutID)

        gridResizeTimeoutID = setTimeout(() => {

            clearTimeout(gridResizeTimeoutID) // run once

            if (!stateHandler.isMountedRef.current) return

            const
                viewportContextProperties = cradleParameters.viewportContextPropertiesRef.current,
                // { serviceHandler } = cradleHandlers,
                viewportElement = viewportContextProperties.elementRef.current,
                scrollblockElement = viewportElement.firstChild,
                cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,

                { orientation } = cradleInheritedProperties,

                scrollblockLength = 
                    orientation == 'vertical'?
                        scrollblockElement.offsetHeight:
                        scrollblockElement.offsetWidth,

                scrollblockOffset = 
                    orientation == 'vertical'?
                        scrollblockElement.offsetTop:
                        scrollblockElement.offsetLeft,

                viewportLength = 
                    orientation == 'vertical'?
                        viewportElement.offsetHeight:
                        viewportElement.offsetWidth,

                scrollTop = viewportElement.scrollTop,
                scrollLeft = viewportElement.scrollLeft,

                viewportScrollPos = 
                    orientation == 'vertical'?
                        viewportElement.scrollTop:
                        viewportElement.scrollLeft

            // check for overshoot
            if ((scrollblockLength + scrollblockOffset - viewportScrollPos) < viewportLength) { // overshoot

                if (scrollblockOffset) {
                    if (orientation == 'vertical') {
                        scrollblockElement.style.top = 0
                    } else {
                        scrollblockElement.style.left = 0
                    }
                }

                let options
                if (orientation == 'vertical') {

                    options = {
                        top:scrollblockLength - viewportLength,
                        left:scrollLeft,
                        behavior:'smooth'
                    }

                } else {

                    options = {
                        top:scrollTop,
                        left:scrollblockLength - viewportLength,
                        behavior:'smooth'
                    }

                }

                viewportElement.scroll(options)
            }

            if (gridResizeObserver) {
                gridResizeObserver.disconnect()
                gridResizeObserver = null
            }

        }, 500)
    }

    // cancel end of list reconciliation if scrolling re-starts
    if (scrollHandler.isScrolling && gridResizeObserver) {
        gridResizeObserver.disconnect()
        gridResizeObserver = undefined
        clearTimeout(gridResizeTimeoutID)
    }

    // ------------------------[ calculations ]------------------------

    const 
        axisReferenceIndex = axisReferencePosition + listlowindex,
        // rowcounts and row offsets for positioning
        // listRowcount taken from internal properties above
        headRowCount = Math.ceil(headGridElement.childNodes.length/crosscount),
        tailRowCount = Math.ceil(tailGridElement.childNodes.length/crosscount),

        // reference rows - cradle first/last; axis; list end
        axisReferenceRow = Math.floor(axisReferenceIndex/crosscount),

        cradleReferenceRow = axisReferenceRow - headRowCount,
        cradleLastRow = axisReferenceRow + (tailRowCount - 1),
        listLastRow = listRowcount - 1 + listrowshift,

        preCradleRowCount = cradleReferenceRow - listrowshift,
        postCradleRowCount = listLastRow - cradleLastRow,

        gaplength = 
            orientation == 'vertical'?
                gapProps.column:
                gapProps.row,

        // base pixel values
        baseCellLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth
            ) + gaplength,

        measuredTailPixelLength = 
            (orientation == 'vertical')?
                tailGridElement.offsetHeight:
                tailGridElement.offsetWidth,

        postCradleRowsPixelLength = (postCradleRowCount * baseCellLength),

        paddingTailOffset = 
            orientation == 'vertical'?
                paddingProps.bottom:
                paddingProps.right,

        totalPostAxisScrollblockPixelLength = 
            postCradleRowsPixelLength + measuredTailPixelLength + paddingTailOffset,

        paddingHeadOffset = 
            orientation == 'vertical'?
                paddingProps.top:
                paddingProps.left,

        // base figures used for preAxis #s for compatibility with repositioning, which uses base figures
        totalPreAxisScrollblockPixelLength = 
            ((preCradleRowCount + headRowCount) * baseCellLength) + paddingHeadOffset

    // this.latestAxisReferenceIndex = axisReferenceIndex

    // ------------------------[ layout adjustments ]----------------------

    interruptHandler.signals.pauseCradleIntersectionObserver = true

    const 
        totalScrollblockPixelLength = totalPreAxisScrollblockPixelLength + totalPostAxisScrollblockPixelLength,
        trackingBlockScrollPos = totalPreAxisScrollblockPixelLength - pixelOffsetAxisFromViewport,
        newPixelOffsetAxisFromScrollblock = trackingBlockScrollPos + pixelOffsetAxisFromViewport // ie. totalPreAxisPixelLength, but semantics

    if (orientation == 'vertical') {

        axisElement.style.top = (newPixelOffsetAxisFromScrollblock - paddingProps.top) + 'px'

        scrollblockElement.style.height = (totalScrollblockPixelLength) + 'px'

    } else { // 'horizontal'

        axisElement.style.left = (newPixelOffsetAxisFromScrollblock - paddingProps.left) + 'px'

        scrollblockElement.style.width = totalScrollblockPixelLength + 'px'

    }
    // -----------------------[ scrollPos adjustment ]-------------------------

    if (orientation == 'vertical') {

        headGridElement.style.padding = 
            headRowCount?
                `0px 0px ${gapProps.column}px 0px`:
                `0px`

    } else {

        headGridElement.style.padding = 
            headRowCount?
                `0px ${gapProps.row}px 0px 0px`:
                `0px`

    }

    // temporarily adjust scrollblockElement offset; onAfterScrollForVariable transfers shift to trackingBlockScrollPos
    const 
        startingScrollPos = 
            (orientation == 'vertical')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft,

        scrollDiff = trackingBlockScrollPos - startingScrollPos

    if (orientation == 'vertical') {

        scrollblockElement.style.top = -scrollDiff + 'px'

    } else {

        scrollblockElement.style.left = -scrollDiff + 'px'

    }

    // check for gotoIndex or resize overshoot
    if ((source == 'setcradle') && !postCradleRowCount) { 

        const tailGridElement = cradleElements.tailRef.current

        gridResizeObserver = new ResizeObserver(gridResizeObserverCallback)

        gridResizeObserver.observe(tailGridElement)

    }

}
