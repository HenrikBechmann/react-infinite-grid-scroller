// contentfunctions.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module supports the contenthandler module. The functions in this module perform
    the detailed calculations and processes required by the contenthandler.

    getContentListRequirements is called by the contenthandler's setCradleContent function.

    getShiftInstruction and calcContentShift are called by contentHandler's updateCradleContent
    function. 
    
    getCellFrameComponentList, allocateContentList, and deletePortals functions are shared by both. 

    createCellFrame is called internally by getCellFrameComponentList as needed.
*/

import React from 'react'

import CellFrame from '../CellFrame'

// ======================[ for setCradleContent ]===========================

export const getContentListRequirements = ({ // called from setCradleContent only

        // index
        targetAxisReferenceIndex, // from user, or from pivot
        // pixels
        baseRowLength,
        targetAxisViewportPixelOffset,
        // resources
        cradleInheritedProperties,
        cradleInternalProperties,

    }) => {

    const { 
        // orientation, 
        // cellHeight, 
        // cellWidth, 
        // gap,
        padding,
    } = cradleInheritedProperties

    const {

        crosscount,
        cradleRowcount,
        runwayRowcount,
        listRowcount,
        listsize,
        viewportVisibleRowcount,

    } = cradleInternalProperties
    
    // align axis reference to first row item
    targetAxisReferenceIndex = Math.min(targetAxisReferenceIndex,listsize - 1)
    targetAxisReferenceIndex -= (targetAxisReferenceIndex % crosscount)

    // derive target row
    let targetAxisRowOffset = Math.ceil(targetAxisReferenceIndex/crosscount)

    const maxAxisRowOffset = Math.max(0,listRowcount - viewportVisibleRowcount)
    if (targetAxisRowOffset > maxAxisRowOffset) {
        targetAxisRowOffset = maxAxisRowOffset
        targetAxisReferenceIndex = targetAxisRowOffset * crosscount
    }

    // -----------------------[ calc cradleReferenceRow & Index ]------------------------

    // leading edge
    let targetCradleRowOffset = Math.max(0,targetAxisRowOffset - runwayRowcount)

    // trailing edge
    let targetCradleEndRowOffset = targetCradleRowOffset + (cradleRowcount - 1)

    const listEndRowOffset = (listRowcount - 1)

    if (targetCradleEndRowOffset > (listEndRowOffset)) {
        const diff = (targetCradleEndRowOffset - listEndRowOffset)
        targetCradleRowOffset -= diff
        targetCradleEndRowOffset -= diff
    }

    const targetCradleReferenceIndex = targetCradleRowOffset * crosscount

    // ---------------------[ calc cradle content count ]---------------------

    let newCradleContentCount = cradleRowcount * crosscount
    if (targetCradleEndRowOffset == listEndRowOffset) {
        const endRowRemainderCount = listsize % crosscount
        if (endRowRemainderCount) {
            newCradleContentCount -= (crosscount - endRowRemainderCount)
        }
    }

    // --------------------[ calc css positioning ]-----------------------

    const targetScrollblockViewportPixelOffset = 
        (targetAxisRowOffset * baseRowLength) + padding - targetAxisViewportPixelOffset

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

    getShiftInstruction determines whether items (and/or the axis) should be moved to the head or tail 
    ('tohead' or 'totail') or if no shift ('none') is required, to restore the straddling
    position of the two trigger lines.

*/

export const getShiftInstruction = ({

    orientation,
    triggerlineEntries,
    triggerlineSpan,
    scrollerID, // for debug
    
    // isFirstRowTriggerConfig is true if the triggerlines are with the first tail row instead of the
    // last headrow. That happens (workaround) when there are no head rows
    isFirstRowTriggerConfig, 

}) => {

    const triggerData = {
        headOffset:null,
        tailOffset:null,
        span:triggerlineSpan,
        isFirstRowTriggerConfig
    }

    const entry = triggerlineEntries.at(-1) // most recent; either triggerline will do
    const referencename = entry.target.dataset.type
    const span = triggerlineSpan

    const rootpos = 
        (orientation == 'vertical')?
            entry.rootBounds.y:
            entry.rootBounds.x

    const entrypos = 
        (orientation == 'vertical')?
            entry.boundingClientRect.y:
            entry.boundingClientRect.x

    const viewportTriggerOffset = entrypos - rootpos

    if (referencename == 'headtrigger') {

        triggerData.headOffset = viewportTriggerOffset
        triggerData.tailOffset = viewportTriggerOffset + span

    } else { // tailtrigger

        triggerData.tailOffset = viewportTriggerOffset
        triggerData.headOffset = viewportTriggerOffset - span

    }

    let shiftinstruction
    
    if (isFirstRowTriggerConfig) {

        if (triggerData.headOffset <= 0) {

            shiftinstruction = 'totail'

        } else {

            shiftinstruction = 'none'

        }

    } else {

        if (triggerData.tailOffset <=0) {

            shiftinstruction = 'totail'

        } else if (triggerData.headOffset >=0) {

            shiftinstruction = 'tohead'

        } else {

            shiftinstruction = 'none'

        }

    }

    return [shiftinstruction, triggerData]

}

/*

    The basic goal here is to determine the number and direction of rows to shift between
    the head and tail grids (which dtermines the new location of the axis), and also to
    calculate the rolling addition and deletion of cradle content to accommodate the changes.

    The number of rows to shift is determined by the pixel shift required to restore the 
    triggerlines to their straddle configuration around the head (top or left) of the viewport.

    Adjustments are made to accommodate special requirements at the start and end of the virtual list.

*/
export const calcContentShift = ({

    shiftinstruction,
    triggerData,
    scrollPos,
    scrollblockElement,

    cradleInheritedProperties,
    cradleInternalProperties,
    cradleContent,
    cradleElements,

}) => {

    // ------------------------[ 1. initialize ]-----------------------

    const { 

        gap,
        orientation,
        cellHeight,
        cellWidth,

    } = cradleInheritedProperties

    const axisElement = cradleElements.axisRef.current,
        headGridElement = cradleElements.headRef.current,
        tailGridElement = cradleElements.tailRef.current

    const {

        cradleModelComponents:cradlecontentlist, 
        tailModelComponents:tailcontentlist,

    } = cradleContent

    const { 

        crosscount,
        cradleRowcount,
        listsize,
        listRowcount,
        viewportRowcount,
        runwayRowcount,

    } = cradleInternalProperties

    const referenceGridElement = 
        (shiftinstruction == 'totail')?
            tailGridElement:
            headGridElement

    const gridRowLengths = getGridRowLengths(referenceGridElement, orientation, crosscount, gap)

    if (shiftinstruction == 'tohead') {

        gridRowLengths.reverse()

    }

    const gridRowSpans = getGridRowSpans(gridRowLengths)

    const triggerReferencePos = 
        (shiftinstruction == 'tohead')? // block scrolling tailward
        triggerData.headOffset:
        triggerData.tailOffset

    // ----------------------------[ 2. calculate base row shift ]--------------------------

    let spanRowPtr
    if (shiftinstruction == 'tohead') {

        spanRowPtr = gridRowSpans.findIndex((span) => (triggerReferencePos - span) <=0 )
    
    } else {

        spanRowPtr = gridRowSpans.findIndex((span) => (triggerReferencePos + span) >=0 )

    }

    let spanAxisPixelShift
    if (spanRowPtr == -1 ) { // overshoot of instantiated rows; continue with virtual rows
        console.log('CALCULATING OVERSHOOT')

        let spanPtr
        if (gridRowSpans.length == 0) { // must be list boundary
            spanPtr = -1
            spanAxisPixelShift = 0

        } else {

            const baseRowLength =
                ((orientation == 'vertical')?
                    cellHeight:
                    cellWidth) 
                + gap

            spanPtr = gridRowSpans.length - 1
            let overshootPixelShift = // set base of working total
                (shiftinstruction == 'totail')?
                    -gridRowSpans.at(-1):// - triggerlineOffset: // positive value
                    gridRowSpans.at(-1)// + triggerlineOffset // negative value

            if (shiftinstruction == 'totail') {

                while (overshootPixelShift > triggerReferencePos) {
                    overshootPixelShift -= baseRowLength
                    ++spanPtr
                }

                spanAxisPixelShift = overshootPixelShift //+ triggerlineOffset

            } else {

                while (overshootPixelShift < triggerReferencePos) {
                    overshootPixelShift += baseRowLength
                    ++spanPtr
                }

                spanAxisPixelShift = overshootPixelShift //- triggerlineOffset
            }

        }

        spanRowPtr = spanPtr

    } else { // final values found in instantiated rows

        spanAxisPixelShift = 
            (shiftinstruction == 'totail')?
                gridRowSpans[spanRowPtr] :
                -gridRowSpans[spanRowPtr]

    }

    const spanRowShift = // pick up row shift with or without overshoot
        (shiftinstruction == 'totail')?
            spanRowPtr + 1:
            -(spanRowPtr + 1)

    // the following two values, and no other calcs, are carried forward in the function.
    // for axisReferenceRowshift:
    // negative for moving rows out of head into tail;
    // positive for moving rows out of tail into head
    const axisReferenceRowshift = spanRowShift
    const axisPixelShift = spanAxisPixelShift 

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

    // // currentViewportAxisOffset will be negative (above viewport edge) for scroll block headward 
    // //     and positive for scroll block tailward
    // // the pixel distance between the viewport frame and the axis, toward the head
    const currentViewportAxisOffset = 
        scrollblockAxisOffset + scrollblockOffset - scrollPos

    // ------------[ 4. calc new cradle and axis reference row offsets ]-------------

    // base value for cradle reference shift; may change if beyond list bounds
    let cradleReferenceRowshift = axisReferenceRowshift

    const previousCradleReferenceIndex = (cradlecontentlist[0]?.props.index || 0)
    const previousCradleRowOffset = Math.ceil(previousCradleReferenceIndex/crosscount)

    const previousAxisReferenceIndex = (tailcontentlist[0]?.props.index || 0)
    const previousAxisRowOffset = Math.ceil(previousAxisReferenceIndex/crosscount)

    // base values
    let newCradleReferenceRowOffset = previousCradleRowOffset + cradleReferenceRowshift
    let newAxisReferenceRowOffset = previousAxisRowOffset + axisReferenceRowshift

    // Note: sections 5 and 6 deal entirely with row calculations; no pixels

    // --------[ 5. adjust cradle contents for start and end of list ]-------
    // ...to maintain constant number of cradle rows

    const listEndrowOffset = (listRowcount - 1)

    if (shiftinstruction == 'totail') {

        // a. if scrolling the block headward near the start of the list, new cradle row offset and
        // cradle row shift count has to be adjusted to accommodate the leading runway
        // b. if scrolling the block headward (revealing tail of list), as the cradle last row offset 
        // approaches max listrow, new cradle offset and cradle row shift have to be adjusted to prevent 
        // shortening of cradle content.

        // start of list adjustment
        const targetCradleReferenceRowOffset = 
            Math.max(0, (newAxisReferenceRowOffset - runwayRowcount - 1)) // extra row for visibility

        const headrowDiff = newCradleReferenceRowOffset - targetCradleReferenceRowOffset
        if (headrowDiff > 0) {

            newCradleReferenceRowOffset -= headrowDiff
            cradleReferenceRowshift -= headrowDiff

        }
        // end of list adjustment: case of being in bounds of trailing runway (end of list)
        const targetCradleEndrowOffset = newCradleReferenceRowOffset + (cradleRowcount - 1)
        const tailrowdiff = Math.max(0,targetCradleEndrowOffset - listEndrowOffset)
        if (tailrowdiff > 0) {

            newCradleReferenceRowOffset -= tailrowdiff
            cradleReferenceRowshift -= tailrowdiff

        }

    } else { // shiftinstruction == 'tohead' 

        // c. if scrolling the block tailward (toward revealing head of list), as the cradlerowoffset hits 0, 
        // cradle changes have to be adjusted to prevent shortening of cradle content
        // d. if scrolling headward near the start of the list, cradle changes have to be adjusted to accomodate
        // the trailing runway

        if (newCradleReferenceRowOffset < 0) {

            cradleReferenceRowshift -= newCradleReferenceRowOffset
            newCradleReferenceRowOffset = 0

        }
        // case of in bounds of trailing runway (end of list)
        const computedNextCradleEndrowOffset = 
            (previousCradleRowOffset + (cradleRowcount -1) + cradleReferenceRowshift)
        const targetCradleEndrowoffset = Math.min(listEndrowOffset, 
            (newAxisReferenceRowOffset + (viewportRowcount - 1) + (runwayRowcount - 1)))
        const tailrowdiff = Math.max(0, targetCradleEndrowoffset - computedNextCradleEndrowOffset)

        if (tailrowdiff > 0) {

            cradleReferenceRowshift += tailrowdiff
            newCradleReferenceRowOffset += tailrowdiff

        }

    }

    // ----------------------[ 6. map rows to item references ]----------------------

    const newCradleReferenceIndex = (newCradleReferenceRowOffset * crosscount)
    const cradleReferenceItemShift = (cradleReferenceRowshift * crosscount)

    const newAxisReferenceIndex = newAxisReferenceRowOffset * crosscount
    const axisReferenceItemShift = axisReferenceRowshift * crosscount

    let newCradleContentCount = cradleRowcount * crosscount // base count
    const includesLastRow = ((newCradleReferenceRowOffset + cradleRowcount) >= listRowcount)
    if (includesLastRow) {
        const partialspaces = listsize % crosscount
        const itemsShortfall = 
            (partialspaces == 0)?
                0:
                crosscount - partialspaces
        newCradleContentCount -= itemsShortfall
    }

    // create head and tail change counts
    const changeOfCradleContentCount = cradlecontentlist.length - newCradleContentCount

    const listStartChangeCount = -(cradleReferenceItemShift)
    const listEndChangeCount = -listStartChangeCount - changeOfCradleContentCount

    // -------------[ 7. calculate new axis pixel position ]------------------

    const newAxisPixelOffset = currentViewportAxisOffset + axisPixelShift

    // ---------------------[ 8. return required values ]-------------------

    return {

        newCradleReferenceIndex, 
        cradleReferenceItemShift, 
        newAxisReferenceIndex, 
        axisReferenceItemShift, 

        newAxisPixelOffset,

        newCradleContentCount,
        listStartChangeCount,
        listEndChangeCount
    }

}

export const getGridRowLengths = (grid, orientation, crosscount, gap) => {

    const rowLengths = []
    const elementList = grid.childNodes

    let elementPtr = 0
    let element = elementList[elementPtr]
    let span = 0

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

export const getGridRowSpans = (rowLengths) => {

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
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.
export const getCellFrameComponentList = ({ 

        cradleInheritedProperties,
        cradleInternalProperties,
        cacheHandler,
        cradleContentCount,
        cradleReferenceIndex, 
        listStartChangeCount, 
        listEndChangeCount, 
        workingContentList:contentlist,
        instanceIdCounterRef,
        styles,
    }) => {

    const localContentlist = [...contentlist]
    const lastindexoffset = cradleReferenceIndex + localContentlist.length - 1

    const headContentlist = [], tailContentlist = []

    let deletedtailitems = [], deletedheaditems = []

    if (listStartChangeCount >= 0) { // acquire new items

        for (let newindex = cradleReferenceIndex - listStartChangeCount; newindex < (cradleReferenceIndex); newindex++) {

            headContentlist.push(
                createCellFrame(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheHandler,
                        placeholderFrameStyles:styles.placeholderframe,
                        placeholderContentStyles:styles.placeholdercontent,
                    }
                )
            )

        }

    } else {

        deletedheaditems = localContentlist.splice( 0, -listStartChangeCount )

    }

    if (listEndChangeCount >= 0) { // acquire new items

        for (let newindex = lastindexoffset + 1; newindex < (lastindexoffset + 1 + listEndChangeCount); newindex++) {

            tailContentlist.push(
                createCellFrame(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheHandler,
                        placeholderFrameStyles:styles.placeholderframe,
                        placeholderContentStyles:styles.placeholdercontent,
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

// butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        axisReferenceIndex, // first tail item
        layoutHandler,

    }
) => {

    const { triggercellIndex } = layoutHandler

    const offsetindex = contentlist[0]?.props.index
    const highindex = offsetindex + contentlist.length

    const headitemcount = (axisReferenceIndex - offsetindex)

    const targetTriggercellIndex = 
        (headitemcount == 0)?
            axisReferenceIndex:
            axisReferenceIndex - 1

    layoutHandler.triggercellIsInTail = 
        (headitemcount == 0)?
            true:
            false

    if ((triggercellIndex !== undefined) && (offsetindex !== undefined) && 
       (triggercellIndex != targetTriggercellIndex)) {
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
    // if !triggercellComponent, is temporarily out of scope; will recycle
    if (triggercellComponent && ((triggercellIndex === undefined) || 
        (triggercellIndex != targetTriggercellIndex  ||
        !triggercellComponent.props.isTriggecell))) {    
        contentlist[triggercellPtr] = React.cloneElement(triggercellComponent, {isTriggercell:true})
        layoutHandler.triggercellIndex = targetTriggercellIndex
    } else { // defensive
        console.log('FAILURE TO REGISTER TRIGGERCELL: \n',
            'triggercellComponent, triggercellIndex, targetTriggercellIndex, triggercellComponent?.props.isTriggecell\n', 
            triggercellComponent, triggercellIndex, targetTriggercellIndex, triggercellComponent?.props.isTriggecell)
    }

    const headlist = contentlist.slice(0,headitemcount)
    const taillist = contentlist.slice(headitemcount)

    return [ headlist, taillist ]

}

export const deletePortals = (cacheHandler, deleteList, deleteListCallback) => {

    const dlist = deleteList.map((item)=>{

        return item.props.index
        
    })

    cacheHandler.deletePortal(dlist, deleteListCallback)
}

// =====================[ internal, acquire item ]======================

const createCellFrame = ({
    index, 
    cradleInheritedProperties,
    cradleInternalProperties,
    instanceIdCounterRef,
    cacheHandler,
    placeholderFrameStyles,
    placeholderContentStyles,
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

    } = cradleInheritedProperties

    const { listsize } = cradleInternalProperties

    // get new or existing itemID
    const itemID = cacheHandler.getNewOrExistingItemID(index)

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
        placeholderFrameStyles = { placeholderFrameStyles }
        placeholderContentStyles = { placeholderContentStyles }
    />

}
