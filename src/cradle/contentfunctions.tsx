// contentfunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React from 'react'

import CellShell from '../cellshell'

// ======================[ for setCradleContent ]===========================

export const getContentListRequirements = ({ // called from setCradleContent only

        rowLength,
        cradleInheritedProperties,
        cradleInternalProperties,
        targetAxisReferenceIndex, // from user, or from pivot
        targetAxisPixelOffset,
        viewportElement,

    }) => {

    const { 
        orientation, 
        cellHeight, 
        cellWidth, 
        gap,
        listsize,
    } = cradleInheritedProperties

    const {

        crosscount,
        cradleRowcount,
        runwayRowcount,
        listRowcount,
        viewportVisibleRowcount,

    } = cradleInternalProperties
    
    // align axis reference to first row item
    // const origrefindex = targetAxisReferenceIndex
    targetAxisReferenceIndex = Math.min(targetAxisReferenceIndex,listsize - 1)
    targetAxisReferenceIndex -= (targetAxisReferenceIndex % crosscount)

    // derive target row
    let targetAxisRowOffset = Math.ceil(targetAxisReferenceIndex/crosscount)
    const maxAxisRowOffset = listRowcount - viewportVisibleRowcount
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

    const targetScrollblockPixelOffset = 
        (targetAxisRowOffset * rowLength) - (targetAxisPixelOffset)

    // ----------------------[ return required values ]---------------------

    return {
        targetCradleReferenceIndex, 
        targetAxisReferenceIndex,
        targetAxisRowOffset,
        targetScrollblockPixelOffset, 
        newCradleContentCount, 
    } 

}

// ======================[ for updateCradleContent ]===========================

// -1 = shift row to head. 1 = shift row to tail. 0 = do not shift a row.
export const getShiftInstruction = ({

    orientation,
    triggerlineEntries,

}) => {

    const entries = triggerlineEntries.filter(entry => {
        // const isIntersecting = entry.isIntersecting
        const triggerlinename = entry.target.dataset.type
        const rootboundpos = 
            (orientation == 'vertical')?
                entry.rootBounds.y:
                entry.rootBounds.x
        const entryboundpos = 
            (orientation == 'vertical')?
                entry.boundingClientRect.y:
                entry.boundingClientRect.x
        return ((triggerlinename == 'triggerline-tail') && (entryboundpos <= rootboundpos)) || 
            ((triggerlinename == 'triggerline-head') && (entryboundpos >= rootboundpos))
    })

    if (entries.length == 0) return 0

    const entry = entries[entries.length-1] // if more than one take the last
    // const isIntersecting = entry.isIntersecting
    const triggerlinename = entry.target.dataset.type

    let retval
    if (triggerlinename == 'triggerline-tail') {
        retval = -1 // shift row to head
    } else if (triggerlinename == 'triggerline-head') {
        retval = 1 // shift row to tail
    } else {
        retval = 0 // do not shift a row
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
        listsize,
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
export const getCellShellComponentList = ({ 

        cradleInheritedProperties,
        cradleContentCount,
        cradleReferenceIndex, 
        listStartChangeCount, 
        listEndChangeCount, 
        workingContentList:contentlist,
        // callbacks,
        instanceIdCounterRef,
    }) => {

    const localContentlist = [...contentlist]
    const lastindexoffset = cradleReferenceIndex + localContentlist.length - 1

    const headContentlist = [], tailContentlist = []

    let deletedtailitems = [], deletedheaditems = []

    if (listStartChangeCount >= 0) { // acquire new items

        for (let newindex = cradleReferenceIndex - listStartChangeCount; newindex < (cradleReferenceIndex); newindex++) {

            headContentlist.push(
                acquireItem(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        // callbacks, 
                        instanceIdCounterRef,
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
                acquireItem(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        // callbacks, 
                        instanceIdCounterRef,
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

export const deletePortals = (cacheHandler, deleteList) => {

    // console.log('inside deletePortals',deleteList)
    for (let item of deleteList) {
        cacheHandler.deletePortal(item.props.index)
    }
    if (deleteList.length) cacheHandler.renderPortalList()
}

// =====================[ acquire item ]======================

const acquireItem = ({
    index, 
    cradleInheritedProperties,
    // callbacks, 
    instanceIdCounterRef,

}) => {
    const instanceID = instanceIdCounterRef.current++

    const { 
        
        orientation,
        cellHeight,
        cellWidth,
        getItem,
        placeholder,
        listsize,
        scrollerName,
        scrollerID 

    } = cradleInheritedProperties

    return <CellShell 
        key = {index} 
        orientation = { orientation }
        cellHeight = { cellHeight }
        cellWidth = { cellWidth }
        index = { index }
        // callbacks = {callbacks}
        getItem = {getItem}
        listsize = {listsize}
        placeholder = { placeholder }
        instanceID = {instanceID}
        scrollerName = { scrollerName }
        scrollerID = { scrollerID }
    />

}
