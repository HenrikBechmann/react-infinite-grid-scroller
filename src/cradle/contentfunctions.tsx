// contentfunctions.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module supports the contenthandler module. The functions in this module perform
    the detailed calculations and processes required by the contenthandler.

    calculateContentListRequirements is called by the contenthandler's setCradleContent function.

    generateShiftInstruction and calcContentShift are called by contentHandler's updateCradleContent
    function. 
    
    getCellFrameComponentList, allocateContentList, and deletePortals functions are shared by both. 

    createCellFrame is called internally by getCellFrameComponentList as needed.
*/

import React from 'react'

import CellFrame from '../CellFrame'

import { isSafariIOS } from '../InfiniteGridScroller'

// ======================[ for setCradleContent ]===========================

export const calculateContentListRequirements = ({ // called from setCradleContent only

        // index
        targetAxisReferenceIndex, // from user, or from pivot
        // pixels
        baseRowPixelLength,
        targetAxisViewportPixelOffset,
        // resources
        cradleInheritedProperties,
        cradleInternalProperties,

    }) => {

    const 
        { 

            padding,

        } = cradleInheritedProperties,

        {

            cradleContentProps,
            virtualListProps,

        } = cradleInternalProperties,

        {

            cradleRowcount,
            runwayRowcount,

        } = cradleContentProps,

        {

            lowindex:listlowindex, 
            highindex:listhighindex, 
            // size:listsize, 
            crosscount, 
            rowcount:listRowcount,
            baserowblanks,
            endrowblanks,
            rowshift:rangerowshift,

        } = virtualListProps

    // align axis reference to list scope
    targetAxisReferenceIndex = Math.min(targetAxisReferenceIndex, listhighindex)
    targetAxisReferenceIndex = Math.max(targetAxisReferenceIndex, listlowindex)

    // derive target row
    const targetAxisReferenceRow = Math.floor(targetAxisReferenceIndex/crosscount)

    // -----------------------[ calc cradleReferenceRow & Index ]------------------------

    // leading edge
    let 
        targetCradleReferenceRow = Math.max(rangerowshift,targetAxisReferenceRow - runwayRowcount),
        // trailing edge
        targetCradleEndRow = targetCradleReferenceRow + (cradleRowcount - 1)

    const listEndRowOffset = (listRowcount - 1) + rangerowshift

    if (targetCradleEndRow > (listEndRowOffset)) {
        const diff = (targetCradleEndRow - listEndRowOffset)
        targetCradleReferenceRow -= diff
        targetCradleEndRow -= diff
    }

    let targetCradleReferenceIndex = (targetCradleReferenceRow * crosscount)
    targetCradleReferenceIndex = Math.max(targetCradleReferenceIndex,listlowindex)

    // ---------------------[ calc cradle content count ]---------------------

    let newCradleContentCount = cradleRowcount * crosscount
    if (targetCradleEndRow == listEndRowOffset) {
        if (endrowblanks) {
            newCradleContentCount -= endrowblanks// endRowRemainderCount)
        }
    }
    if (targetCradleReferenceRow == rangerowshift) { // first row
        if (baserowblanks) {
            newCradleContentCount -= baserowblanks
        }
    }

    // --------------------[ calc css positioning ]-----------------------

    const targetScrollblockViewportPixelOffset = 
        ((targetAxisReferenceRow - rangerowshift) * baseRowPixelLength) + padding - targetAxisViewportPixelOffset

    // ----------------------[ return required values ]---------------------

    return {
        targetCradleReferenceIndex, 
        targetAxisReferenceIndex,
        targetScrollblockViewportPixelOffset, 
        newCradleContentCount, 
    } 

}

// ======================[ for updateCradleContent ]===========================

/*
    the two triggerlines must straddle the head of the viewport (top or left) so that
    cradle motion can be detected. Motion is most often caused by scrolling, but
    can also occur with change of size of cradle content rows.

    generateShiftInstruction determines whether the axis should be moved toward the head or tail
        to restore the straddling position of the two trigger lines. Lots of relative motion.

    'moveaxisheadward' (scrolling down or right) means moving the axis up or left, adjacent items down
         or right to the tail, dropping trailing tail items, and adding leading head items as necessary
         to maintain number of cradle rows of content constant.

    'moveaxistailward' (scrolling up or left) means moving the axis down or right, adjacent items up
         or left to the head, dropping trailing head items, and adding leading tail items as necessary
         to maintain number of cradle rows of content constant.

    'none' means no shift is required
*/

export const generateShiftInstruction = ({

    orientation,
    triggerlineEntries,
    triggerlineSpan,
    scrollerID, // for debug
    
    // isFirstRowTriggerConfig is true if the triggerlines are with the first tail row instead of the
    // last headrow. That happens (workaround) when there are no head rows
    isFirstRowTriggerConfig, // boolean

    // Safari doesn't measure zoomed values for rootbounds in triggerlineEntries, so we take a direct reading
    viewportBoundingRect, 
    triggerHistoryRef,

}) => {

    // ---------------------[ collect resources ]----------------
    const 
        triggerConfigData = {
            headOffset:null,
            tailOffset:null,
            span:triggerlineSpan,
            isFirstRowTriggerConfig
        },

        // most recent observer record; either triggerline will do
        entry = triggerlineEntries[triggerlineEntries.length - 1], //.at(-1) at not available in iOS 15
        referencename = entry.target.dataset.type, // headtrigger or tailtrigger

        span = triggerlineSpan, // current pixel distance between triggers

        // --- identify viewportpos...
        intersectrootpos = // the viewport measured by the observer
            (orientation == 'vertical')?
                Math.trunc(entry.rootBounds.y):
                Math.trunc(entry.rootBounds.x),

        boundingrootpos = // the viewport measured directly
            (orientation == 'vertical')?
                Math.trunc(viewportBoundingRect.y):
                Math.trunc(viewportBoundingRect.x),

        // this selection is redundant, but documents what's going on
        viewportpos = // the viewportpos selection, to accommodate Safari zooming anomaly
            (intersectrootpos == boundingrootpos)?
            intersectrootpos:
            boundingrootpos, // we're in Safari, zoomed
        // --- end of identify viewportpos


        triggerpos = 
            (orientation == 'vertical')?
                Math.trunc(entry.boundingClientRect.y):
                Math.trunc(entry.boundingClientRect.x),

        // get the triggeroffset, which controls the determination of the shift instruction
        triggerOffset = triggerpos - viewportpos,

        triggerHistory = triggerHistoryRef.current

    entry.referencename = referencename // for debug

    // -------------- [ set the offset data for both triggers ] ------------

    if (referencename == 'headtrigger') {

        triggerConfigData.headOffset = triggerOffset
        triggerConfigData.tailOffset = triggerOffset + span

    } else { // tailtrigger

        triggerConfigData.headOffset = triggerOffset - span
        triggerConfigData.tailOffset = triggerOffset

    }

    // -------------------[ calculate shift instruction ]--------------

    let shiftinstruction

    // --------------[ FILTER OUT INFINITE RECURSION ]--------------
    
    // since triggers are moved and can share the 0 (zero) offset, an infinite loop can occur
    // between the head and tail triggers. The following short-circuits that.
    
    // Identify case of trigger at border
    if (
            (isSafariIOS && // either trigger offset is exactly 0

                (triggerConfigData.headOffset == 0 || triggerConfigData.tailOffset == 0)

            ) 

        ||

            (!isSafariIOS && // either trigger offset is within range of 0

                (
                    (triggerConfigData.headOffset >= -1 && triggerConfigData.headOffset <= 1) 

                    || 
                    
                    (triggerConfigData.tailOffset >= -1 && triggerConfigData.tailOffset <= 1)

                )
            )

        ) {

        // some browsers do an infinite loop with the same previousTriggerNameAtBorder;
        // usually alternates
        // so if this is a repeat of the same at-border, short-circuit and cancel
        if (triggerHistory.previousTriggerNameAtBorder) {

            triggerHistory.previousTriggerNameAtBorder = null

            shiftinstruction = 'none'
            
        } else { // record this instance, to prevent a repeat next time

            if ((triggerConfigData.headOffset >= -1) && (triggerConfigData.headOffset <= 1)) {

                triggerHistory.previousTriggerNameAtBorder = 'headtrigger'

            } else {

                triggerHistory.previousTriggerNameAtBorder = 'tailtrigger'

            }

        }

    } else { // otherwise if not at-border clear record of previous trigger at border

        if (triggerHistory.previousTriggerNameAtBorder) {

            triggerHistory.previousTriggerNameAtBorder = null

        }
    }

    if (shiftinstruction) { // will be 'none', owing to repeat of trigger at border

        return [shiftinstruction, 0]

    }

    // --------------[ END OF FILTER OUT INFINITE RECURSION ]--------------

    // now safely calculate the shift instruction
    // the head offset should always be placed above the border; the tail below
    if (isFirstRowTriggerConfig) {

        if (triggerConfigData.headOffset <= 0) {

            shiftinstruction = 'moveaxistailward'

        } else {

            shiftinstruction = 'none'

        }

    } else {

        if (triggerConfigData.tailOffset <= 0) {

            shiftinstruction = 'moveaxistailward'

        } else if (triggerConfigData.headOffset >= 0) {

            shiftinstruction = 'moveaxisheadward'

        } else {

            shiftinstruction = 'none'

        }

    }

    const triggerViewportReferencePixelPos = // used to calculate required pixel shift
        (shiftinstruction == 'moveaxistailward')? // block is scrolling up or left
            triggerConfigData.tailOffset: // needs to move up or left toward head
            triggerConfigData.headOffset // needs to move down or right toward tail

    return [shiftinstruction, triggerViewportReferencePixelPos]

}

/*
    The basic goal of calculateShiftSpecs is to determine the number and direction of rows to shift between
    the head and tail grids (which determines the new location of the axis), and also to
    calculate the rolling addition and deletion of cradle content to accommodate the changes.

    The number of rows to shift is determined by the pixel shift required to restore the 
    triggerlines to their straddle configuration around the head (top or left) of the viewport.

    Adjustments are made to accommodate special requirements at the start and end of the virtual list.

    DOM measurements are used where available (to accommodate variable dimension rows), and standard
    units (cellHeight, cellWidth) used for estimates where necessary.
*/

// rowshift is at least 1 by the time this function is reached
// ie. a shiftinstruction of 'moveaxisheadward' or 'moveaxistailward'
export const calculateShiftSpecs = ({

    // direction of change
    shiftinstruction,
    triggerViewportReferencePixelPos,

    // positional
    scrollPos,
    scrollblockElement,

    // property repos
    cradleInheritedProperties,
    cradleContentProps,
    virtualListProps,

    // cradle repos
    cradleContent,
    cradleElements,

}) => {

    // ------------------------[ 1. initialize ]-----------------------

    // cradle elements
    const 
        axisElement = cradleElements.axisRef.current,
        headGridElement = cradleElements.headRef.current,
        tailGridElement = cradleElements.tailRef.current,

        // configuration data
        { 

            gap,
            padding,
            orientation,
            cellHeight,
            cellWidth,
            layout,
            scrollerID, // debug

        } = cradleInheritedProperties,

        // cradle contents
        {

            cradleModelComponents:cradlecontentlist, 
            tailModelComponents:tailcontentlist,

        } = cradleContent,

        { 

            cradleRowcount,
            viewportRowcount,
            runwayRowcount,

        } = cradleContentProps,

        {

            crosscount, 
            rowcount:listRowcount, 
            // size:listsize,
            lowindex:listlowindex,
            baserowblanks,
            endrowblanks,
            rowshift:rangerowshift,
            
        } = virtualListProps,

        // normalize
        previousCradleReferenceIndex = (cradlecontentlist[0]?.props.index || 0),
        previousCradleReferenceRow = Math.floor(previousCradleReferenceIndex/crosscount),

        previousAxisReferenceIndex = (tailcontentlist[0]?.props.index || 0),
        previousAxisReferenceRow = Math.floor(previousAxisReferenceIndex/crosscount),

        listEndRow = (listRowcount - 1) + rangerowshift,

        baseRowPixelLength =
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth) 
            + gap

    let 
        foundGridSpanRowShiftIncrement,
        gridSpanAxisPixelShift = 0, // in relation to viewport head boundary
        byPixelMeasureGridRowShiftCount = 0,
        isListBoundary = false,
        totalPixelShift,
        finalVariableRowLength // special case

    // ----------------------------[ 2. calculate base row shift ]--------------------------

    // measure exising variable rows for pixel length
    if (layout == 'variable') { 

        const 
            engagedGridElement = // moving axis (and triggers) toward the reference grid element
                (shiftinstruction == 'moveaxistailward')? // scrolling up or left
                    tailGridElement:
                    headGridElement,

            gridRowPixelLengthsList = getGridRowLengths(engagedGridElement, orientation, crosscount, gap)

        if (shiftinstruction == 'moveaxisheadward') { // scrolling down or right; move triggerlines up or left

            gridRowPixelLengthsList.reverse() // head grid row lengths listed from axis toward head

        }

        const gridRowCumulativePixelLengthsList = getGridRowAggregateSpans(gridRowPixelLengthsList) // count pixels where available

        // first try to find position based on known (instantiated) rows
        if (shiftinstruction == 'moveaxistailward') { // scroll up

            // tail trigger needs to move down or right until position relative to viewport top or left is positive
            foundGridSpanRowShiftIncrement = gridRowCumulativePixelLengthsList.findIndex((cumulativepixellength) => 
                (triggerViewportReferencePixelPos + cumulativepixellength) >= 0 )
        
        } else { // 'moveaxisheadward', scrolldown

            // head trigger needs to move up or left until position relative to viewport top or left is negative
            foundGridSpanRowShiftIncrement = gridRowCumulativePixelLengthsList.findIndex((cumulativepixellength) => 
                (triggerViewportReferencePixelPos - cumulativepixellength) <= 0)

        }

        if (foundGridSpanRowShiftIncrement != -1) { // found measureed row for shift

            gridSpanAxisPixelShift = 
                (shiftinstruction == 'moveaxistailward')?
                    gridRowCumulativePixelLengthsList[foundGridSpanRowShiftIncrement]: // move axis toward tail from viewport boundary (positive)
                    -gridRowCumulativePixelLengthsList[foundGridSpanRowShiftIncrement] // move axis toward head from viewport boundary (negative)

        } else { // no foundGridSpanRowShiftIncrement; either in boundary, or shy of target

            isListBoundary = (gridRowCumulativePixelLengthsList.length == 0) // boundary at head of list

            if (!isListBoundary) { // interim working result

                byPixelMeasureGridRowShiftCount = gridRowCumulativePixelLengthsList.length - 1 // base: failed measured row ptr
                totalPixelShift = gridRowCumulativePixelLengthsList[byPixelMeasureGridRowShiftCount] // set base of working overshoot
                finalVariableRowLength = gridRowPixelLengthsList.at(-1) // for oversize cell adjustment below

            } else { // else if isListBoundary row and pixel shifts remain at default of 0 each

                byPixelMeasureGridRowShiftCount = 0
                totalPixelShift = 0

            }

        }

    } else { // layout == 'uniform'; use only defined lengths

        foundGridSpanRowShiftIncrement = -1 // "not found", ie not applicable

        // these are the defaults
        byPixelMeasureGridRowShiftCount = 0
        totalPixelShift = 0

    }

    // uniform layout, or overshoot of instantiated rows; continue with virtual base rows
    if (foundGridSpanRowShiftIncrement == -1 ) { 

        if (!isListBoundary) {

            if (shiftinstruction == 'moveaxistailward') { // scrolling up/left

                do {

                    totalPixelShift += baseRowPixelLength
                    byPixelMeasureGridRowShiftCount++

                } while ((triggerViewportReferencePixelPos + totalPixelShift) < 0) 

                gridSpanAxisPixelShift = totalPixelShift

            } else { // moveaxisheadward; scrolling down/right

                do {

                    totalPixelShift += baseRowPixelLength
                    byPixelMeasureGridRowShiftCount++

                    if ((previousAxisReferenceRow - rangerowshift - byPixelMeasureGridRowShiftCount) == 0) { // stop cycling at head limit

                        break
                    }

                } while ((triggerViewportReferencePixelPos - totalPixelShift) > 0)

                gridSpanAxisPixelShift = -totalPixelShift

            }

        }

        // byPixelMeasureGridRowCount is one greater than foundGridSpanRowIncrement with actual measurements above
        // this -1 makes them compatible for span conversion (next step)
        foundGridSpanRowShiftIncrement = byPixelMeasureGridRowShiftCount - 1

    }

    const gridSpanRowShift = // pick up row shift with or without overshoot
        (shiftinstruction == 'moveaxistailward')?
            foundGridSpanRowShiftIncrement + 1:
            -(foundGridSpanRowShiftIncrement + 1)

    // the following two values (axisReferenceRowShift & axisPixelShift), and no other calcs, 
    //     are carried forward in this function.
    // for axisReferenceRowshift:
    // negative for moving rows out of head into tail;
    // positive for moving rows out of tail into head
    let axisReferenceRowShift = gridSpanRowShift,
        axisPixelShift = gridSpanAxisPixelShift 

    // this can only happen with oversized cellLength (ie > viewportLength)
    //     and only using measured length
    // axis must be no farther than 1 back of the last row end position
    if ((previousAxisReferenceRow + axisReferenceRowShift) > listEndRow) {

        axisReferenceRowShift -= 1
        if (layout == 'variable') {
            axisPixelShift -= finalVariableRowLength
        } else {
            axisPixelShift -= baseRowPixelLength
        }

    }

    // -----------[ 3. calculate current viewport axis pixel offset ]-------------------
    // gaps beyond rendered rows can be caused by rapid scrolling

    const 
        scrollblockAxisPixelOffset = 
            (orientation == 'vertical')?
                axisElement.offsetTop:
                axisElement.offsetLeft,

        scrollblockPixelOffset = // to capture current top/left adjustment to viewport for variable layout
            (orientation == 'vertical')?
                scrollblockElement.offsetTop:
                scrollblockElement.offsetLeft,

        // currentViewportAxisOffset will be negative (above viewport edge) for scroll block headward 
        //     and positive for scroll block tailward
        // the pixel distance between the viewport frame and the axis, toward the head
        currentViewportAxisPixelOffset = 
            scrollblockAxisPixelOffset + scrollblockPixelOffset - scrollPos

    // -------------[ 4. calculate new axis pixel position ]------------------

    let newAxisViewportPixelOffset = currentViewportAxisPixelOffset + axisPixelShift

    // Note: sections 5, 6 and 7 deal entirely with row calculations; no pixels

    // ------------[ 5. calc new cradle and axis reference row offsets ]-------------

    // base value for cradle reference shift; may change if beyond list bounds
    let cradleReferenceRowshift = axisReferenceRowShift

    // base values
    let newCradleReferenceRow = previousCradleReferenceRow + cradleReferenceRowshift
    const newAxisReferenceRow = previousAxisReferenceRow + axisReferenceRowShift


    // --------[ 6. adjust cradle contents for start and end of list ]-------
    // ...to maintain constant number of cradle rows

    if (shiftinstruction == 'moveaxistailward') { // scrolling up/left

        // a. if scrolling the block headward near the start of the list, new cradle row offset and
        // cradle row shift count has to be adjusted to accommodate the leading runway

        // b. if scrolling the block headward (revealing tail of list), as the cradle last row offset 
        // approaches max listrow, new cradle offset and cradle row shift have to be adjusted to prevent 
        // shortening of cradle content.

        // --- start of list adjustment
        const 
            targetCradleReferenceRow = 
                Math.max(rangerowshift, (newAxisReferenceRow - runwayRowcount - 1)), // extra row for visibility
            headrowDiff = newCradleReferenceRow - targetCradleReferenceRow

        if (headrowDiff > 0) {

            newCradleReferenceRow -= headrowDiff
            cradleReferenceRowshift -= headrowDiff

        }

        // --- end of list adjustment: case of being in bounds of trailing runway (end of list)
        const 
            targetCradleEndrow = newCradleReferenceRow + (cradleRowcount - 1),
            tailrowdiff = targetCradleEndrow - listEndRow

        if (tailrowdiff > 0) {

            cradleReferenceRowshift -= tailrowdiff
            newCradleReferenceRow -= tailrowdiff

        }

    } else { // shiftinstruction == 'moveaxisheadward'; scrolling down/right

        // c. if scrolling the block down or right (toward revealing head of list), as the cradlerowoffset 
        // hits 0, cradle changes have to be adjusted to prevent shortening of cradle content

        // d. if scrolling headward near the end of the list, cradle changes have to be adjusted to 
        // accomodate the trailing runway

        // --- start of list adjustment

        if (newCradleReferenceRow < rangerowshift) {

            const diff = rangerowshift - newCradleReferenceRow
            cradleReferenceRowshift += diff
            newCradleReferenceRow += diff

        }

        if (layout == 'variable' && newAxisReferenceRow == rangerowshift) { // start of list
            newAxisViewportPixelOffset = padding
        }

        // --- end of list adjustment; case of in bounds of trailing runway

        const 
            computedNextCradleEndRow = 
                (previousCradleReferenceRow + (cradleRowcount -1) + cradleReferenceRowshift),
            targetCradleEndRow = 
                newAxisReferenceRow + (viewportRowcount - 1) + (runwayRowcount - 1)

        let tailrowdiff =  computedNextCradleEndRow - targetCradleEndRow

        if (tailrowdiff < 0) {

            tailrowdiff = Math.max(tailrowdiff, cradleReferenceRowshift)

            cradleReferenceRowshift -= tailrowdiff
            newCradleReferenceRow -= tailrowdiff

        }

    }

    // ----------------------[ 7. map rows to item references ]----------------------

    const 
        newCradleReferenceIndex = Math.max(listlowindex, newCradleReferenceRow * crosscount),
        cradleReferenceItemShift = newCradleReferenceIndex - previousCradleReferenceIndex,

        newAxisReferenceIndex = Math.max(listlowindex, newAxisReferenceRow * crosscount),
        axisReferenceItemShift = newAxisReferenceIndex - previousAxisReferenceIndex,

        includesLastRow = ((newCradleReferenceRow + cradleRowcount - rangerowshift) >= listRowcount),

        includesFirstRow = (newCradleReferenceRow == rangerowshift)

    let newCradleContentCount = cradleRowcount * crosscount // base count

    if (includesLastRow) {

        newCradleContentCount -= endrowblanks

    }

    if (includesFirstRow) {

        newCradleContentCount -= baserowblanks

    }

    // create head and tail change counts
    const 
        changeOfCradleContentCount = cradlecontentlist.length - newCradleContentCount,
        listStartChangeCount = -(cradleReferenceItemShift),
        listEndChangeCount = -listStartChangeCount - changeOfCradleContentCount

    // ---------------------[ 8. return required values ]-------------------

    return {

        // newCradleReferenceIndex, 
        cradleReferenceItemShift, 
        newAxisReferenceIndex, 
        axisReferenceItemShift, 

        newAxisViewportPixelOffset,

        newCradleContentCount,
        listStartChangeCount,
        listEndChangeCount
    }

}

// supports calcContentShift above
const getGridRowLengths = (grid, orientation, crosscount, gap) => {

    const 
        rowLengths = [],
        elementList = grid.childNodes

    let 
        elementPtr = 0,
        element = elementList[elementPtr]

    while (element) {
        const rowlength = 
            ((orientation == 'vertical')?
                element.offsetHeight:
                element.offsetWidth) 
            + gap

        rowLengths.push(rowlength)
        elementPtr += crosscount
        element = elementList[elementPtr]
    }

    return rowLengths
}

// supports calcContentShift above
const getGridRowAggregateSpans = (rowLengths) => {

    const rowSpans = []
    let span = 0
    rowLengths.forEach((value) => {
        span += value
        rowSpans.push(span)
    })

    return rowSpans
}

// =====================[ shared by both setCradleContent and updateCradleContent ]====================

// update content
// adds CellFrames at end of contentlist according to headindexcount and tailindexcount,
// or if indexcount values are <0 removes them.
export const getCellFrameComponentList = ({ 

        cradleInheritedProperties,
        cradleInternalProperties,
        cacheAPI,
        cradleContentCount,
        cradleReferenceIndex, 
        listStartChangeCount, 
        listEndChangeCount, 
        workingContentList:contentlist,
        instanceIdCounterRef,
        styles,
        placeholderMessages,

    }) => {

    const 
        localContentlist = [...contentlist],
        lastindexoffset = cradleReferenceIndex + localContentlist.length - 1,

        headContentlist = [], tailContentlist = []

    let deletedtailitems = [], deletedheaditems = []

    if (listStartChangeCount >= 0) { // acquire new items

        let 
            referenceIndex = cradleReferenceIndex,
            changeCount = listStartChangeCount
        
        if (listStartChangeCount > cradleContentCount) {
            referenceIndex = cradleReferenceIndex - (listStartChangeCount - cradleContentCount)
            changeCount = cradleContentCount
        }

        for (let newindex = referenceIndex - changeCount; newindex < referenceIndex; newindex++) {

            headContentlist.push(
                createCellFrame(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheAPI,
                        placeholderFrameStyles:styles.placeholderframe,
                        placeholderLinerStyles:styles.placeholderliner,
                        placeholderErrorFrameStyles:styles.placeholdererrorframe,
                        placeholderErrorLinerStyles:styles.placeholdererrorliner,
                        placeholderMessages,
                    }
                )
            )

        }

    } else {

        deletedheaditems = localContentlist.splice( 0, -listStartChangeCount )

    }

    if (listEndChangeCount >= 0) { // acquire new items

        let 
            referenceIndex = lastindexoffset,
            changeCount = listEndChangeCount

        if (listEndChangeCount > cradleContentCount) {
            referenceIndex = lastindexoffset + (listEndChangeCount - cradleContentCount)
            changeCount = cradleContentCount
        }

        for (let newindex = referenceIndex + 1; newindex < (referenceIndex + 1 + changeCount); newindex++) {

            tailContentlist.push(
                createCellFrame(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheAPI,
                        placeholderFrameStyles:styles.placeholderframe,
                        placeholderLinerStyles:styles.placeholderliner,
                        placeholderErrorFrameStyles:styles.placeholdererrorframe,
                        placeholderErrorLinerStyles:styles.placeholdererrorliner,
                        placeholderMessages,
                    }
                )
            )
            
        }

    } else {

        deletedtailitems = localContentlist.splice(listEndChangeCount,-listEndChangeCount)

    }

    const 
        deletedItems = [...deletedheaditems,...deletedtailitems],
        componentList = [...headContentlist,...localContentlist,...tailContentlist]

    return [componentList,deletedItems]

}

// Leading (head) all or partially hidden; tail, visible plus trailing hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        axisReferenceIndex, // first tail item
        layoutHandler,

    }
) => {

    const 
        { triggercellIndex } = layoutHandler,

        lowcontentindex = contentlist[0]?.props.index,
        highcontentindex = lowcontentindex + contentlist.length,

        headitemcount = (axisReferenceIndex - lowcontentindex),

        targetTriggercellIndex = 
            (headitemcount == 0)?
                axisReferenceIndex:
                axisReferenceIndex - 1

    layoutHandler.triggercellIsInTail = 
        (headitemcount == 0)?
            true:
            false

    if ((triggercellIndex !== undefined) && (lowcontentindex !== undefined)) { //&& 
        if ((triggercellIndex >= lowcontentindex) && (triggercellIndex <= highcontentindex)) {
            const 
                triggercellPtr = triggercellIndex - lowcontentindex,
                triggercellComponent = contentlist[triggercellPtr]
            if (triggercellComponent) { // otherwise has been asynchronously cleared
                contentlist[triggercellPtr] = React.cloneElement(triggercellComponent, {isTriggercell:false})
            }
        }
    }

    const 
        triggercellPtr = targetTriggercellIndex - lowcontentindex,
        triggercellComponent = contentlist[triggercellPtr]

    if (triggercellComponent) {

        contentlist[triggercellPtr] = React.cloneElement(triggercellComponent, {isTriggercell:true})
        layoutHandler.triggercellIndex = targetTriggercellIndex

    } else { // defensive; shouldn't happen

        console.log('FAILURE TO REGISTER TRIGGERCELL:scrollerID','-'+layoutHandler.scrollerID+'-')
        console.log('axisReferenceIndex, triggercellIndex, lowcontentindex, highcontentindex, headitemcount, targetTriggercellIndex\n',
            axisReferenceIndex, triggercellIndex, lowcontentindex, highcontentindex, headitemcount, targetTriggercellIndex)
        console.log('triggercellPtr, triggercellComponent, triggercellComponent?.props.isTriggecell, contentlist\n', 
            triggercellPtr, triggercellComponent, triggercellComponent?.props.isTriggecell, 
                {...contentlist})

    }

    const 
        headlist = contentlist.slice(0,headitemcount),
        taillist = contentlist.slice(headitemcount)

    return [ headlist, taillist ]

}

export const deletePortals = (cacheAPI, deleteList, deleteListCallback) => {

    const dlist = deleteList.map((item)=>{

        return item.props.index
        
    })

    cacheAPI.deletePortalByIndex(dlist, deleteListCallback)
}

// =====================[ internal, acquire item ]======================

const createCellFrame = ({
    index, 
    cradleInheritedProperties,
    cradleInternalProperties,
    instanceIdCounterRef,
    cacheAPI,
    placeholderFrameStyles,
    placeholderLinerStyles,
    placeholderErrorFrameStyles,
    placeholderErrorLinerStyles,
    placeholderMessages,
}) => {
    const instanceID = instanceIdCounterRef.current++

    const { 
        
        orientation,
        cellHeight,
        cellWidth,
        cellMinHeight,
        cellMinWidth,
        getItem,
        placeholder,
        scrollerID,
        layout, 
        usePlaceholder,

    } = cradleInheritedProperties

    const 
        listsize = cradleInternalProperties.virtualListProps.size,
        // get new or existing itemID
        itemID = cacheAPI.getNewOrExistingItemID(index)

    return <CellFrame 
        key = { instanceID } 
        orientation = { orientation }
        cellHeight = { cellHeight }
        cellWidth = { cellWidth }
        cellMinHeight = { cellMinHeight }
        cellMinWidth = { cellMinWidth }
        layout = { layout }
        index = { index }
        getItem = { getItem }
        listsize = { listsize }
        placeholder = { placeholder }
        itemID = { itemID }
        instanceID = { instanceID }
        scrollerID = { scrollerID }
        isTriggercell = { false }
        usePlaceholder = { usePlaceholder }
        placeholderFrameStyles = { placeholderFrameStyles }
        placeholderLinerStyles = { placeholderLinerStyles }
        placeholderErrorFrameStyles = { placeholderErrorFrameStyles }
        placeholderErrorLinerStyles = { placeholderErrorLinerStyles }
        placeholderMessages = { placeholderMessages }
        gridstartstyle = {null}
    />

}
