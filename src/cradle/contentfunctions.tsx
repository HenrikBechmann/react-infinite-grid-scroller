// contentfunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React from 'react'

import CellFrame from '../CellFrame'

// ======================[ for setCradleContent ]===========================

export const getContentListRequirements = ({ // called from setCradleContent only

        rowLength,
        cradleInheritedProperties,
        cradleInternalProperties,
        targetAxisReferenceIndex, // from user, or from pivot
        targetAxisViewportPixelOffset,

    }) => {

    const { 
        orientation, 
        cellHeight, 
        cellWidth, 
        gap,
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
    // const origrefindex = targetAxisReferenceIndex
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
    // let targetCradleReferenceIndex = Math.max(0,targetAxisReferenceIndex - leadingrunwayitemcount)
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
        (targetAxisRowOffset * rowLength) + padding - targetAxisViewportPixelOffset

    // ----------------------[ return required values ]---------------------

    return {
        targetCradleReferenceIndex, 
        targetAxisReferenceIndex,
        targetAxisRowOffset,
        targetScrollblockViewportPixelOffset, 
        newCradleContentCount, 
    } 

}

// ======================[ for updateCradleContent ]===========================

// -1 = shift row to head. 1 = shift row to tail. 0 = do not shift a row.
export const getShiftInstruction = ({
    isViewportScrollingForward,
    orientation,
    triggerlineEntries,
    triggerlineRecord,
    triggerlineSpan,
    scrollerID, // for debug

}) => {
    if (isViewportScrollingForward != triggerlineRecord.wasViewportScrollingForward) {
        triggerlineRecord.wasViewportScrollingForward = isViewportScrollingForward
        triggerlineRecord.driver = 
            isViewportScrollingForward?
            'triggerline-tail':
            'triggerline-head'
        triggerlineRecord.offset = null
    }
    const entries = triggerlineEntries.filter(entry => {
        // const isIntersecting = entry.isIntersecting
        const triggerlinename = entry.target.dataset.type
        entry.triggerlinename = triggerlinename
        entry.scrollingforward = isViewportScrollingForward
        const rootpos = 
            (orientation == 'vertical')?
                entry.rootBounds.y:
                entry.rootBounds.x
        const entrypos = 
            (orientation == 'vertical')?
                entry.boundingClientRect.y:
                entry.boundingClientRect.x
        entry.viewportoffset = entrypos - rootpos
        return ((isViewportScrollingForward) && (triggerlinename == 'triggerline-tail') && (entrypos <= rootpos)) || 
            ((!isViewportScrollingForward) && (triggerlinename == 'triggerline-head') && (entrypos >= rootpos))
    })

    // if ((entries.length == 0) && (triggerlineEntries.length == 2)) { // reconnecting

    //     return 0
    // }

    if (entries.length == 0) {

        const counterentries = triggerlineEntries.filter(entry => entry.triggerlinename != triggerlineRecord.driver)

        if (counterentries.length == 0) return 0

        // console.log('counterentries','-'+scrollerID+'-', [...counterentries])

        // check for implied trigger - trigger can be bypassed with heavy components
        const counterentry =  counterentries.pop() //dtriggerlineEntries[0]
        const countertriggerlinename = counterentry.triggerlinename

        let impliedoffset
        if (countertriggerlinename != triggerlineRecord.driver) { // should always be true
            if (countertriggerlinename == 'triggerline-head') {
                impliedoffset = counterentry.viewportoffset + triggerlineSpan
                if (impliedoffset <= 0) {
                    triggerlineRecord.offset = impliedoffset
                    // console.log('returning -1')
                    return -1
                }
            } else { // countertriggerlinename == 'triggerline-tail'
                impliedoffset = counterentry.viewportoffset - triggerlineSpan
                if (impliedoffset >= 0) {
                    triggerlineRecord.offset = impliedoffset
                    // console.log('returning 1')
                    return 1
                }
            }
        }

        // console.log('returning 0')
        return 0

    }

    const entry = entries[0] // assume one record gets filtered; only paired above on reconnect

    triggerlineRecord.offset = entry.viewportoffset

    let retval
    if (!isViewportScrollingForward) {
        retval = 1 // shift row to tail
    } else {
        retval = -1 // shift row to head
    }
    return retval

}

// A negative shift instruction is into the head, a positive shift is into the tail.
// called only from updateCradleContent
export const calcContentShift = ({

    shiftinstruction,
    cradleInheritedProperties,
    cradleInternalProperties,
    cradleContent,
    cradleElements,
    scrollPos, // of cradle against viewport; where the cradle motion intersects the viewport
    // viewportElement,

}) => {

    // ------------------------[ 1. initialize ]-----------------------

    const isScrollingViewportForward = (shiftinstruction < 0)

    const { 

        gap,
        orientation,
        cellHeight,
        cellWidth,
        triggerlineOffset,

    } = cradleInheritedProperties

    const axisElement = cradleElements.axisRef.current

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

    const rowLength = 
        ((orientation == 'vertical')?
            cellHeight:
            cellWidth) 
        + gap

    // -----------[ 2. calculate axis reference row shift ]-------------------
    // extra gaps can be caused by rapid scrolling

    const cradleAxisOffset = 
        (orientation == 'vertical')?
            axisElement.offsetTop:
            axisElement.offsetLeft

    // viewportAxisOffset will be negative for scroll forward and positive for scroll backward
    const viewportAxisOffset = // the pixel distance between the viewport frame and the axis, toward the head
        cradleAxisOffset - scrollPos

    const triggerAxisOffset = 
        (isScrollingViewportForward)?
            // scroll forward engages the tail triggerline which is below the axis
            // the tail triggerline must be placed to intersect to re-trigger
            viewportAxisOffset + triggerlineOffset:
            // scrollbackward engages the head triggerline which is above the axis
            // the head triggerline muse be placed not to intersect to retrigger
            viewportAxisOffset - (rowLength - triggerlineOffset)

    // negative for moving rows out of head into tail;
    // positive for moving rows out of tail into head
    // +/- 1 gurantees boundary location results in move
    const triggerRowShift = 
        (isScrollingViewportForward)?
            Math.floor((triggerAxisOffset?triggerAxisOffset: -1)/rowLength):
            Math.ceil((triggerAxisOffset?triggerAxisOffset: 1)/rowLength)

    let axisReferenceRowshift = -triggerRowShift

    // ------------[ 5. calc new cradle and axis reference row offset ]-------------

    // base value for cradle reference shift; may change if beyond list bounds
    let cradleReferenceRowshift = axisReferenceRowshift

    const previousCradleReferenceIndex = (cradlecontentlist[0]?.props.index || 0)
    const previousCradleRowOffset = Math.ceil(previousCradleReferenceIndex/crosscount)

    const previousAxisReferenceIndex = (tailcontentlist[0]?.props.index || 0)
    const previousAxisRowOffset = Math.ceil(previousAxisReferenceIndex/crosscount)

    // base values
    let newCradleReferenceRowOffset = previousCradleRowOffset + cradleReferenceRowshift
    let newAxisReferenceRowOffset = previousAxisRowOffset + axisReferenceRowshift

    // --------[ 6. adjust cradle contents for start and end of list ]-------
    // ...to maintain constant number of cradle rows

    const listEndrowOffset = (listRowcount - 1)

    if (isScrollingViewportForward) {

        // a. if scrolling forward near the start of the list, new cradle row offset and
        // cradle row shift count has to be adjusted to accommodate the leading runway
        // b. if scrolling forward (toward tail of list), as the cradle last row offset approaches 
        // listrow new cradle offset and cradle row shift have to be adjusted to prevent shortening 
        // of cradle content.

        const targetCradleReferenceRowOffset = 
            Math.max(0, 
                (
                    newAxisReferenceRowOffset - 
                        runwayRowcount + 
                        (runwayRowcount?-1:0) // one row is visible, not runway
                )
            )

        const headrowDiff = newCradleReferenceRowOffset - targetCradleReferenceRowOffset
        if (headrowDiff > 0) {

            newCradleReferenceRowOffset -= headrowDiff
            cradleReferenceRowshift -= headrowDiff

        }
        // case of being in bounds of trailing runway (end of list)
        const targetCradleEndrowOffset = newCradleReferenceRowOffset + (cradleRowcount - 1)
        const tailrowdiff = Math.max(0,targetCradleEndrowOffset - listEndrowOffset)
        if (tailrowdiff > 0) {

            newCradleReferenceRowOffset -= tailrowdiff
            cradleReferenceRowshift -= tailrowdiff

        }
    } else { // !isScrollingViewportForward = scroll backward

        // c. if scrolling backward (toward head of list), as the cradlerowoffset hits 0, cradle changes have
        // to be adjusted to prevent shortening of cradle content
        // d. if scrolling backward near the end of the list, cradle changes has to be adjusted to accomodate
        // the trailing runway

        if (newCradleReferenceRowOffset < 0) {

            cradleReferenceRowshift -= newCradleReferenceRowOffset
            newCradleReferenceRowOffset = 0

        }
        // case of in bounds of trailing runway (end of list)
        const computedNextCradleEndrowOffset = 
            (previousCradleRowOffset + (cradleRowcount -1) + cradleReferenceRowshift)
        const targetcradleEndrowoffset = Math.min(listEndrowOffset, 
            (newAxisReferenceRowOffset + (viewportRowcount - 1) + (runwayRowcount - 1)))
        const tailrowdiff = Math.max(0, targetcradleEndrowoffset - computedNextCradleEndrowOffset)

        if (tailrowdiff > 0) {

            cradleReferenceRowshift += tailrowdiff
            newCradleReferenceRowOffset += tailrowdiff

        }

    }

    // ----------------------[ 7. map rows to item references ]----------------------

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
    const listEndChangeCount = -listStartChangeCount - (changeOfCradleContentCount)

    // -------------[ 8. calculate new axis pixel position ]------------------

    const newAxisPixelOffset = viewportAxisOffset + (axisReferenceRowshift * rowLength)

    // ---------------------[ 9. return required values ]-------------------

//     console.log('calcContentShift',
// `
//         newCradleReferenceIndex, 
//         cradleReferenceItemShift, 
//         newAxisReferenceIndex, 
//         axisReferenceItemShift, 
//         newAxisPixelOffset, 
//         newCradleContentCount,
//         listStartChangeCount,
//         listEndChangeCount
// `,
//         newCradleReferenceIndex, 
//         cradleReferenceItemShift, 
//         newAxisReferenceIndex, 
//         axisReferenceItemShift, 
//         newAxisPixelOffset, 
//         newCradleContentCount,
//         listStartChangeCount,
//         listEndChangeCount
// )

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
    }) => {

    const localContentlist = [...contentlist]
    const lastindexoffset = cradleReferenceIndex + localContentlist.length - 1

    const headContentlist = [], tailContentlist = []

    let deletedtailitems = [], deletedheaditems = []

    if (listStartChangeCount >= 0) { // acquire new items

        for (let newindex = cradleReferenceIndex - listStartChangeCount; newindex < (cradleReferenceIndex); newindex++) {

            headContentlist.push(
                createCell(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheHandler,
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
                createCell(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheHandler,
                    }
                )
            )
            
        }

    } else {

        deletedtailitems = localContentlist.splice(listEndChangeCount,-listEndChangeCount)

    }

    const deletedItems = deletedheaditems.concat(deletedtailitems)

    const componentList = headContentlist.concat(localContentlist,tailContentlist)

    return [componentList,deletedItems]

}

// butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        axisReferenceIndex, // first tail item

    }
) => {

    const offsetindex = contentlist[0]?.props.index // TODO: Cannot read property 'props' of undefined

    const headitemcount = (axisReferenceIndex - offsetindex)

    const headlist = contentlist.slice(0,headitemcount)
    const taillist = contentlist.slice(headitemcount)

    return [headlist,taillist]

}

export const deletePortals = (cacheHandler, deleteList, deleteListCallback) => {

    const dlist = deleteList.map((item)=>{

        return item.props.index
        
    })

    cacheHandler.deletePortal(dlist, deleteListCallback)
}

// =====================[ acquire item ]======================

const createCell = ({
    index, 
    cradleInheritedProperties,
    cradleInternalProperties,
    instanceIdCounterRef,
    cacheHandler,

}) => {
    const instanceID = instanceIdCounterRef.current++

    const { 
        
        orientation,
        cellHeight,
        cellWidth,
        getItem,
        placeholder,
        scrollerID 

    } = cradleInheritedProperties

    const { listsize } = cradleInternalProperties

    // get new or existing itemID
    const itemID = cacheHandler.getNewOrExistingItemID(index)

    return <CellFrame 
        key = { instanceID } 
        orientation = { orientation }
        cellHeight = { cellHeight }
        cellWidth = { cellWidth }
        index = { index }
        getItem = { getItem }
        listsize = { listsize }
        placeholder = { placeholder }
        itemID = { itemID }
        instanceID = { instanceID }
        scrollerID = { scrollerID }
    />

}
