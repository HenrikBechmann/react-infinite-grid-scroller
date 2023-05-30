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

    const { 
        padding,
    } = cradleInheritedProperties

    const {

        cradleContentProps,
        // cradleRowcount,
        // runwayRowcount,
        virtualListProps,

    } = cradleInternalProperties

    const {

        cradleRowcount,
        runwayRowcount,

    } = cradleContentProps

    const {

        lowindex:listlowindex, 
        highindex:listhighindex, 
        // size:listsize, 
        crosscount, 
        rowcount:listRowcount,
        baserowblanks,
        endrowblanks,
        rowshift:rangerowshift,

    } = virtualListProps

    // console.log('INITIAL targetAxisReferenceIndex, baserowblanks',targetAxisReferenceIndex, baserowblanks)

    // align axis reference to last row item
    targetAxisReferenceIndex = Math.min(targetAxisReferenceIndex, listhighindex)
    targetAxisReferenceIndex -= Math.abs((baserowblanks + targetAxisReferenceIndex) % crosscount)
    targetAxisReferenceIndex = Math.max(targetAxisReferenceIndex, listlowindex)

    // derive target row
    let targetAxisRowOffset = 
        (targetAxisReferenceIndex < 0)?
            Math.ceil(targetAxisReferenceIndex/crosscount):
            Math.floor(targetAxisReferenceIndex/crosscount)

    // console.log('REVISED targetAxisReferenceIndex, targetAxisRowOffset, rangerowshift',
    //     targetAxisReferenceIndex, targetAxisRowOffset, rangerowshift)

    // update will compensate if this is too high
    const maxAxisRowOffset = Math.max(0,listRowcount - 1) - rangerowshift
    if (targetAxisRowOffset > maxAxisRowOffset) {
        targetAxisRowOffset = maxAxisRowOffset
        targetAxisReferenceIndex = targetAxisRowOffset * crosscount
    }

    // -----------------------[ calc cradleReferenceRow & Index ]------------------------

    // leading edge
    let targetCradleRowOffset = Math.max(rangerowshift,targetAxisRowOffset - runwayRowcount)

    // trailing edge
    let targetCradleEndRowOffset = targetCradleRowOffset + (cradleRowcount - 1)

    const listEndRowOffset = (listRowcount - 1) + rangerowshift

    // console.log('targetCradleRowOffset, targetCradleEndRowOffset, listEndRowOffset, cradleRowcount',
    //     targetCradleRowOffset, targetCradleEndRowOffset, listEndRowOffset,cradleRowcount)

    if (targetCradleEndRowOffset > (listEndRowOffset)) {
        const diff = (targetCradleEndRowOffset - listEndRowOffset)
        targetCradleRowOffset -= diff
        targetCradleEndRowOffset -= diff
    }

    // console.log('revised targetCradleEndRowOffset',targetCradleEndRowOffset)

    let targetCradleReferenceIndex = targetCradleRowOffset * crosscount
    targetCradleReferenceIndex = Math.max(targetCradleReferenceIndex,listlowindex)

    // ---------------------[ calc cradle content count ]---------------------

    let newCradleContentCount = cradleRowcount * crosscount
    if (targetCradleEndRowOffset == listEndRowOffset) {
        // const endRowRemainderCount = listsize % crosscount
        // if (endRowRemainderCount) {
        if (endrowblanks) {
            newCradleContentCount -= endrowblanks// endRowRemainderCount)
        }
    }
    if (targetCradleRowOffset == rangerowshift) { // first row
        if (baserowblanks) {
            newCradleContentCount -= baserowblanks
        }
    }

    // console.log('newCradleContentCount', newCradleContentCount)

    // --------------------[ calc css positioning ]-----------------------

    const targetScrollblockViewportPixelOffset = 
        (targetAxisRowOffset * baseRowPixelLength) + padding - targetAxisViewportPixelOffset

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
    isFirstRowTriggerConfig, 

    // Safari doesn't measure zoomed values for rootbounds in triggerlineEntries, so we take a direct reading
    viewportBoundingRect, 
    triggerHistoryRef,

}) => {

    const triggerData = {
        headOffset:null,
        tailOffset:null,
        span:triggerlineSpan,
        isFirstRowTriggerConfig
    }

    // most recent; either triggerline will do
    const entry = triggerlineEntries[triggerlineEntries.length - 1] //.at(-1) at not available in iOS 15
    const referencename = entry.target.dataset.type
    entry.referencename = referencename
    const span = triggerlineSpan

    const intersectrootpos = 
        (orientation == 'vertical')?
            Math.trunc(entry.rootBounds.y):
            Math.trunc(entry.rootBounds.x)
            // entry.rootBounds.y:
            // entry.rootBounds.x

    const boundingrootpos =
        (orientation == 'vertical')?
            Math.trunc(viewportBoundingRect.y):
            Math.trunc(viewportBoundingRect.x)
            // viewportBoundingRect.y:
            // viewportBoundingRect.x

    // this selection is redundant, but documents what's going on
    const rootpos = 
        (intersectrootpos == boundingrootpos)?
        intersectrootpos:
        boundingrootpos // we're in Safari, zoomed

    const entrypos = 
        (orientation == 'vertical')?
            Math.trunc(entry.boundingClientRect.y):
            Math.trunc(entry.boundingClientRect.x)
            // entry.boundingClientRect.y:
            // entry.boundingClientRect.x

    const viewportTriggerOffset = entrypos - rootpos

    if (referencename == 'headtrigger') {

        triggerData.headOffset = viewportTriggerOffset
        triggerData.tailOffset = viewportTriggerOffset + span

    } else { // tailtrigger

        triggerData.headOffset = viewportTriggerOffset - span
        triggerData.tailOffset = viewportTriggerOffset

    }

    let shiftinstruction
    
    const triggerHistory = triggerHistoryRef.current;

    // since triggers are moved and can share the 0 (zero) offset, an infinite loop can occur
    // between the head and tail triggers. The following short-circuits that.
    // Obviously needs work to generalize...
    if ((isSafariIOS() && (triggerData.headOffset == 0 || triggerData.tailOffset == 0)) ||
        (!isSafariIOS() && (((triggerData.headOffset >= -1) && (triggerData.headOffset <= 1)) || 
        ((triggerData.tailOffset >= -1) && (triggerData.tailOffset <= 1))))) {

        // some browsers do an infinite loop with the same previousReferenceName;
        // usually alternates
        if (triggerHistory.previousReferenceName) {

            triggerHistory.previousReferenceName = null

            shiftinstruction = 'none'
            
        } else {

            if ((triggerData.headOffset >= -1) && (triggerData.headOffset <= 1)) {

            // if (triggerData.headOffset == 0) {

                triggerHistory.previousReferenceName = 'headtrigger'

            } else {

                triggerHistory.previousReferenceName = 'tailtrigger'

            }

        }

    } else {

        if (triggerHistory.previousReferenceName) {

            triggerHistory.previousReferenceName = null

        }
    }

    if (shiftinstruction) { // will be 'none'

        return [shiftinstruction, 0]//triggerViewportReferencePos]

    }

    if (isFirstRowTriggerConfig) {

        if (triggerData.headOffset <= 0) {

            shiftinstruction = 'moveaxistailward'

        } else {

            shiftinstruction = 'none'

        }

    } else {

        if (triggerData.tailOffset <= 0) {

            shiftinstruction = 'moveaxistailward'

        } else if (triggerData.headOffset >= 0) {

            shiftinstruction = 'moveaxisheadward'

        } else {

            shiftinstruction = 'none'

        }

    }

    const triggerViewportReferencePos = 
        (shiftinstruction == 'moveaxistailward')? // block is scrolling up or left
            triggerData.tailOffset: // needs to move up or left toward head
            triggerData.headOffset // needs to move down or right toward tail


    return [shiftinstruction, triggerViewportReferencePos]

}

/*
    The basic goal of calcContentShoft is to determine the number and direction of rows to shift between
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
    triggerViewportReferencePos,

    // positional
    scrollPos,
    scrollblockElement,

    // property repos
    cradleInheritedProperties,
    cradleInternalProperties,

    // cradle repos
    cradleContent,
    cradleElements,

}) => {

    // ------------------------[ 1. initialize ]-----------------------

    // configuration data
    const { 

        gap,
        padding,
        orientation,
        cellHeight,
        cellWidth,
        layout,

    } = cradleInheritedProperties

    // cradle elements
    const axisElement = cradleElements.axisRef.current,
        headGridElement = cradleElements.headRef.current,
        tailGridElement = cradleElements.tailRef.current

    // cradle contents
    const {

        cradleModelComponents:cradlecontentlist, 
        tailModelComponents:tailcontentlist,
        // headModelComponents:headcontentlist

    } = cradleContent

    // more config data
    const { 

        // cradleRowcount,
        // viewportRowcount,
        // runwayRowcount,
        cradleContentProps,
        virtualListProps,

    } = cradleInternalProperties

    const { 

        cradleRowcount,
        viewportRowcount,
        runwayRowcount,

    } = cradleContentProps

    const {

        crosscount, 
        rowcount:listRowcount, 
        size:listsize,
        baserowblanks,
        endrowblanks,
        rowshift:rangerowshift,
        
    } = virtualListProps

    const previousCradleReferenceIndex = (cradlecontentlist[0]?.props.index || 0),
        previousCradleRowOffset = Math.ceil(previousCradleReferenceIndex/crosscount)

    const previousAxisReferenceIndex = (tailcontentlist[0]?.props.index || 0),
        previousAxisRowOffset = Math.ceil(previousAxisReferenceIndex/crosscount)

    const listEndrowOffset = (listRowcount - 1)
    const baseRowLength =
        ((orientation == 'vertical')?
            cellHeight:
            cellWidth) 
        + gap

    let spanRowPtr,
     spanAxisPixelShift = 0, // in relation to viewport head boundary
     inProcessRowPtr = 0,
     isListBoundary = false,
     totalPixelShift,
     finalVariableRowLength // special case

    // measure exising rows for variable length cells
    if (layout == 'variable') { 

        const referenceGridElement = // moving axis (and triggers) toward the reference grid element
            (shiftinstruction == 'moveaxistailward')? // scrolling up or left
                tailGridElement:
                headGridElement

        const gridRowLengths = getGridRowLengths(referenceGridElement, orientation, crosscount, gap)

        if (shiftinstruction == 'moveaxisheadward') { // scrolling down or right; move triggerlines up or left

            gridRowLengths.reverse() // head grid row lengths listed from axis toward head

        }

        const gridRowAggregateSpans = getGridRowAggregateSpans(gridRowLengths) // count pixels where available

        // ----------------------------[ 2. calculate base row shift ]--------------------------

        // first try to find position based on known (instantiated) rows
        if (shiftinstruction == 'moveaxistailward') { // scroll up

            // tail trigger needs to move down or right until position relative to viewport top or left is positive
            spanRowPtr = gridRowAggregateSpans.findIndex((aggregatespan) => 
                (triggerViewportReferencePos + aggregatespan) >= 0 )
        
        } else { // 'moveaxisheadward', scrolldown

            // head trigger needs to move up or left until position relative to viewport top or left is negative
            spanRowPtr = gridRowAggregateSpans.findIndex((aggregatespan) => 
                (triggerViewportReferencePos - aggregatespan) <= 0)

        }

        if (!(spanRowPtr == -1)) { // found measureed row for shift
            spanAxisPixelShift = 
                (shiftinstruction == 'moveaxistailward')?
                    gridRowAggregateSpans[spanRowPtr]: // move axis toward tail from viewport boundary (positive)
                    -gridRowAggregateSpans[spanRowPtr] // move axis toward head from viewport boundary (negative)
        } else { // either in boundary, or shy of target

            isListBoundary = (gridRowAggregateSpans.length == 0) // boundary at head of list

            if (!isListBoundary) { // interim working result

                inProcessRowPtr = gridRowAggregateSpans.length - 1 // base: failed measured row ptr
                totalPixelShift = gridRowAggregateSpans[inProcessRowPtr] // set base of working overshoot
                finalVariableRowLength = gridRowLengths.at(-1) // for oversize cell adjustment below

            } 

        }

    } else { // layout == 'uniform'; use only defined lengths

        spanRowPtr = -1 // "not found", ie not applicable

        inProcessRowPtr = 0
        totalPixelShift = 0

    }

    // uniform layout, or overshoot of instantiated rows; continue with virtual base rows
    if (spanRowPtr == -1 ) { 

        if (!isListBoundary) {

            if (shiftinstruction == 'moveaxistailward') { // scrolling up/left

                do {

                    totalPixelShift += baseRowLength
                    inProcessRowPtr++

                } while ((triggerViewportReferencePos + totalPixelShift) < 0) 

                spanAxisPixelShift = totalPixelShift

            } else { // moveaxisheadward; scrolling down/right

                do {

                    totalPixelShift += baseRowLength
                    inProcessRowPtr++

                    if ((previousAxisRowOffset - inProcessRowPtr) == 0) { // stop cycling at head limit

                        break
                    }

                } while ((triggerViewportReferencePos - totalPixelShift) > 0)

                spanAxisPixelShift = -totalPixelShift

            }

        }

        // inProcessRowPtr is one greater than spanRowPtr with actual measurements above
        // this makes them compativle for span conversion (next step)
        spanRowPtr = inProcessRowPtr - 1 

    }

    const spanRowShift = // pick up row shift with or without overshoot
        (shiftinstruction == 'moveaxistailward')?
            spanRowPtr + 1:
            -(spanRowPtr + 1)

    // the following two values (axisReferenceRowShift & axisPixelShift), and no other calcs, 
    //     are carried forward in this function.
    // for axisReferenceRowshift:
    // negative for moving rows out of head into tail;
    // positive for moving rows out of tail into head
    let axisReferenceRowShift = spanRowShift,
        axisPixelShift = spanAxisPixelShift 

    // this can only happen with oversized cellLength (ie > viewportLength)
    //     and only using measured length
    // axis must be no farther than 1 back of the last row end position
    if ((previousAxisRowOffset + axisReferenceRowShift) > listEndrowOffset) {

        axisReferenceRowShift -= 1
        if (layout == 'variable') {
            axisPixelShift -= finalVariableRowLength //gridRowLengths.at(-1)
        } else {
            axisPixelShift -= baseRowLength
        }

    }

    // -----------[ 3. calculate current viewport axis offset ]-------------------
    // gaps beyond rendered rows can be caused by rapid scrolling

    const scrollblockAxisOffset = 
        (orientation == 'vertical')?
            axisElement.offsetTop:
            axisElement.offsetLeft

    const scrollblockOffset = // to capture current top/left adjustment to viewport for variable layout
        (orientation == 'vertical')?
            scrollblockElement.offsetTop:
            scrollblockElement.offsetLeft

    // currentViewportAxisOffset will be negative (above viewport edge) for scroll block headward 
    //     and positive for scroll block tailward
    // the pixel distance between the viewport frame and the axis, toward the head
    const currentViewportAxisOffset = 
        scrollblockAxisOffset + scrollblockOffset - scrollPos

    // -------------[ 4. calculate new axis pixel position ]------------------

    let newAxisViewportPixelOffset = currentViewportAxisOffset + axisPixelShift

    // Note: sections 5, 6 and 7 deal entirely with row calculations; no pixels

    // ------------[ 5. calc new cradle and axis reference row offsets ]-------------

    // base value for cradle reference shift; may change if beyond list bounds
    let cradleReferenceRowshift = axisReferenceRowShift

    // base values
    let newCradleReferenceRowOffset = previousCradleRowOffset + cradleReferenceRowshift
    const newAxisReferenceRowOffset = previousAxisRowOffset + axisReferenceRowShift

    // --------[ 6. adjust cradle contents for start and end of list ]-------
    // ...to maintain constant number of cradle rows

    if (shiftinstruction == 'moveaxistailward') { // scrolling up/left

        // a. if scrolling the block headward near the start of the list, new cradle row offset and
        // cradle row shift count has to be adjusted to accommodate the leading runway

        // b. if scrolling the block headward (revealing tail of list), as the cradle last row offset 
        // approaches max listrow, new cradle offset and cradle row shift have to be adjusted to prevent 
        // shortening of cradle content.

        // --- start of list adjustment
        const targetCradleReferenceRowOffset = 
            Math.max(0, (newAxisReferenceRowOffset - runwayRowcount - 1)) // extra row for visibility

        const headrowDiff = newCradleReferenceRowOffset - targetCradleReferenceRowOffset
        if (headrowDiff > 0) {

            newCradleReferenceRowOffset -= headrowDiff
            cradleReferenceRowshift -= headrowDiff

        }

        // --- end of list adjustment: case of being in bounds of trailing runway (end of list)
        const targetCradleEndrowOffset = newCradleReferenceRowOffset + (cradleRowcount - 1)
        const tailrowdiff = Math.max(0,targetCradleEndrowOffset - listEndrowOffset)

        if (tailrowdiff > 0) {

            cradleReferenceRowshift -= tailrowdiff
            newCradleReferenceRowOffset -= tailrowdiff

        }

    } else { // shiftinstruction == 'moveaxisheadward'; scrolling down/right

        // c. if scrolling the block down or right (toward revealing head of list), as the cradlerowoffset 
        // hits 0, cradle changes have to be adjusted to prevent shortening of cradle content

        // d. if scrolling headward near the end of the list, cradle changes have to be adjusted to 
        // accomodate the trailing runway

        // --- start of list adjustment
        if (newCradleReferenceRowOffset < 0) {

            cradleReferenceRowshift -= newCradleReferenceRowOffset
            newCradleReferenceRowOffset = 0

        }
        if (layout == 'variable' && newAxisReferenceRowOffset == 0) {
            newAxisViewportPixelOffset = padding
        }

        // --- end of list adjustment; case of in bounds of trailing runway
        const computedNextCradleEndrowOffset = 
            (previousCradleRowOffset + (cradleRowcount -1) + cradleReferenceRowshift)

        const targetCradleEndrowOffset = Math.min(listEndrowOffset, 
            (newAxisReferenceRowOffset + (viewportRowcount - 1) + (runwayRowcount - 1)))

        const tailrowdiff = Math.max(0, targetCradleEndrowOffset - computedNextCradleEndrowOffset)

        if (tailrowdiff > 0) {

            cradleReferenceRowshift += tailrowdiff
            newCradleReferenceRowOffset += tailrowdiff

        }

    }

    // ----------------------[ 7. map rows to item references ]----------------------

    const newCradleReferenceIndex = (newCradleReferenceRowOffset * crosscount)
    const cradleReferenceItemShift = (cradleReferenceRowshift * crosscount)

    const newAxisReferenceIndex = newAxisReferenceRowOffset * crosscount
    const axisReferenceItemShift = axisReferenceRowShift * crosscount

    let newCradleContentCount = cradleRowcount * crosscount // base count
    const includesLastRow = ((newCradleReferenceRowOffset + cradleRowcount - rangerowshift) >= listRowcount)

    console.log('includesLastRow',includesLastRow)

    if (includesLastRow) {
        // const partialspaces = listsize % crosscount
        // const itemsShortfall = 
        //     (partialspaces == 0)?
        //         0:
        //         crosscount - partialspaces
        newCradleContentCount -= endrowblanks //itemsShortfall
    }
    // create head and tail change counts
    const changeOfCradleContentCount = cradlecontentlist.length - newCradleContentCount

    const listStartChangeCount = -(cradleReferenceItemShift)
    const listEndChangeCount = -listStartChangeCount - changeOfCradleContentCount

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

    const rowLengths = []
    const elementList = grid.childNodes

    let elementPtr = 0
    let element = elementList[elementPtr]

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

    const localContentlist = [...contentlist]
    const lastindexoffset = cradleReferenceIndex + localContentlist.length - 1

    const headContentlist = [], tailContentlist = []

    let deletedtailitems = [], deletedheaditems = []

    if (listStartChangeCount >= 0) { // acquire new items
        let referenceIndex = cradleReferenceIndex
        let changeCount = listStartChangeCount
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

        let referenceIndex = lastindexoffset
        let changeCount = listEndChangeCount
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

    const deletedItems = [...deletedheaditems,...deletedtailitems]

    const componentList = [...headContentlist,...localContentlist,...tailContentlist]

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

    const { triggercellIndex } = layoutHandler

    const offsetindex = contentlist[0]?.props.index,
        highindex = offsetindex + contentlist.length

    const headitemcount = (axisReferenceIndex - offsetindex)

    const targetTriggercellIndex = 
        (headitemcount == 0)?
            axisReferenceIndex:
            axisReferenceIndex - 1

    layoutHandler.triggercellIsInTail = 
        (headitemcount == 0)?
            true:
            false

    if ((triggercellIndex !== undefined) && (offsetindex !== undefined)) { //&& 
        if ((triggercellIndex >= offsetindex) && (triggercellIndex <= highindex)) {
            const triggercellPtr = triggercellIndex - offsetindex
            const triggercellComponent = contentlist[triggercellPtr]
            if (triggercellComponent) { // otherwise has been asynchronously cleared
                contentlist[triggercellPtr] = React.cloneElement(triggercellComponent, {isTriggercell:false})
            }
        }
    }

    const triggercellPtr = targetTriggercellIndex - offsetindex
    const triggercellComponent = contentlist[triggercellPtr]
    if (triggercellComponent) {

        contentlist[triggercellPtr] = React.cloneElement(triggercellComponent, {isTriggercell:true})
        layoutHandler.triggercellIndex = targetTriggercellIndex

    } else { // defensive; shouldn't happen

        console.log('FAILURE TO REGISTER TRIGGERCELL:')
        console.log('axisReferenceIndex, triggercellIndex, offsetindex, highindex, headitemcount, targetTriggercellIndex',
            axisReferenceIndex, triggercellIndex, offsetindex, highindex, headitemcount, targetTriggercellIndex)
        console.log('triggercellPtr, triggercellComponent, triggercellComponent?.props.isTriggecell, contentlist\n', 
            triggercellPtr, triggercellComponent, triggercellComponent?.props.isTriggecell, 
                {...contentlist})

    }

    const headlist = contentlist.slice(0,headitemcount)
    const taillist = contentlist.slice(headitemcount)

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

    const listsize = cradleInternalProperties.virtualListProps.size

    // get new or existing itemID
    const itemID = cacheAPI.getNewOrExistingItemID(index)

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
