// contentfunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React from 'react'

import CellShell from '../cellshell'

// ======================[ for setCradleContent ]===========================

export const getContentListRequirements = ({ // called from setCradleContent only

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
        listsize
    } = cradleInheritedProperties

    const {

        crosscount,
        cradleRowcount,
        runwayRowcount,
        listRowcount,

    } = cradleInternalProperties
    
    // align axis reference to first row item
    targetAxisReferenceIndex -= (targetAxisReferenceIndex % crosscount)
    // derive target row
    let targetAxisRowOffset = targetAxisReferenceIndex/crosscount

    const listEndRowOffset = (listRowcount - 1)

    // check for end list out-of-bounds
    if (targetAxisRowOffset > listEndRowOffset) {
        targetAxisRowOffset = listEndRowOffset
        targetAxisReferenceIndex = targetAxisRowOffset * crosscount
    }

    // -----------------------[ calc cradleReferenceRow & Index ]------------------------
    // leading edge
    // let targetCradleReferenceIndex = Math.max(0,targetAxisReferenceIndex - leadingrunwayitemcount)
    let targetCradleRowOffset = Math.max(0,targetAxisRowOffset - runwayRowcount)

    // trailing edge
    let targetCradleEndRowOffset = targetCradleRowOffset + (cradleRowcount - 1)

    if (targetCradleEndRowOffset > (listRowcount - 1)) {
        const diff = ((listRowcount - 1) - targetCradleEndRowOffset)
        targetCradleRowOffset -= diff
        targetCradleEndRowOffset -= diff
    }

    const targetCradleReferenceIndex = targetCradleRowOffset * crosscount

    // ---------------------[ calc cradle content count ]---------------------

    let newCradleContentCount = cradleRowcount * crosscount
    if (targetCradleEndRowOffset == listEndRowOffset) {
        const endrowremaindercount = listsize % crosscount
        if (endrowremaindercount) {
            newCradleContentCount -= (crosscount - endrowremaindercount)
        }
    }

    // --------------------[ calc css positioning ]-----------------------

    const isVertical = (orientation == 'vertical')
    const cellLength = 
        isVertical?
            (cellHeight + gap):
            (cellWidth + gap)

    const targetScrollblockPixelOffset = 
        (targetAxisRowOffset * cellLength) - (targetAxisPixelOffset)

    // ----------------------[ return required values ]---------------------

    return {
        targetCradleReferenceIndex, 
        targetAxisReferenceIndex, 
        targetAxisPixelOffset, 
        targetScrollblockPixelOffset, 
        newCradleContentCount, 
    } 

}

// -1 = shift row to head. 1 = shift row to tail. 0 = do not shift a row.
export const getShiftInstruction = ({

    isScrollingviewportforward,
    triggerlineEntries,

}) => {

    const entries = triggerlineEntries.filter(entry => {
        const isIntersecting = entry.isIntersecting
        const triggerlinename = entry.target.dataset.type
        return ((!isIntersecting) && isScrollingviewportforward && (triggerlinename == 'triggerline-tail')) ||
            (isIntersecting && (!isScrollingviewportforward) && (triggerlinename == 'triggerline-head'))
    })

    if (entries.length == 0) return 0

    if (entries.length > 1) {
        console.log('SYSTEM ISSUE: MORE THAN ONE BREAKLINE OBSERVER ENTRY', triggerlineEntries.length, triggerlineEntries)
        debugger
    }

    const [entry] = entries
    const isIntersecting = entry.isIntersecting
    const triggerlinename = entry.target.dataset.type

    let retval
    if ((!isIntersecting) && isScrollingviewportforward && (triggerlinename == 'triggerline-tail')) {
        retval = -1 // shift row to head
    } else if (isIntersecting && (!isScrollingviewportforward) && (triggerlinename == 'triggerline-head')) {
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

}) => {

    // ------------------------[ 1. initialize ]-----------------------

    const isScrollingviewportforward = (shiftinstruction < 0)

    const { 

        gap,
        orientation,
        cellHeight,
        cellWidth,
        listsize,
        // runwayRowcountSpec,

    } = cradleInheritedProperties

    const axisElement = cradleElements.axisRef.current

    const {

        cradleModel:cradlecontentlist, 
        tailModelComponents:tailcontentlist,

    } = cradleContent

    const { 

        crosscount,
        cradleRowcount,
        listRowcount,
        viewportRowcount,
        runwayRowcount,

    } = cradleInternalProperties

    const cellLength = 
        ((orientation == 'vertical')?
            cellHeight:
            cellWidth) 
        + gap

    // -----------[ 2. calculate the forward or backward gaps for input ]-------------------
    // extra gaps can be caused by rapid scrolling

    const viewportaxisoffset = // the pixel distance between the viewport frame and the axis, toward the head
        ((orientation == 'vertical')?
            axisElement.offsetTop:
            (axisElement.offsetLeft)) 
        - scrollPos

    // the gap between the cell about to be moved, and the viewport edge
    // reference cell forward end for scrolling forward or back end for scrolling backward
    const viewportaxisbackwardgaplength = 
        (!isScrollingviewportforward)?
            (viewportaxisoffset - cellLength):
            0
    const viewportaxisforwardgaplength = 
        (isScrollingviewportforward)?
            -viewportaxisoffset:
            0

    // -------[ 3. calculate the axis overshoot (more than one row) row counts, if any ]-------
    
    // these overshoot numbers guaranteed to be 0 or positive
    const forwardovershootrowcount = 
        Math.max(0,Math.floor(viewportaxisforwardgaplength/cellLength))
    const backwardovershootrowcount = 
        Math.max(0,Math.floor(viewportaxisbackwardgaplength/cellLength))

    // -----------------[ 4. combine row shift counts of base shift and overshoot ]-------------
    
    // shift row count is the number of rows the virtual cradle shifts, according to observer
    // - shift negative closer to head, shift positive closer to tail
    
    // allocate a base shift to head or tail
    const headaddrowcount = 
        (isScrollingviewportforward)?
            1:
            0
    const tailaddrowcount = 
        (!isScrollingviewportforward)?
            1:
            0

    // consolidate head and tail information into single axis and cradle reference shifts
    // - negative value shifted toward tail; positive value shifted toward head
    // - one of the two expressions in the following line will be 0
    const axisreferencerowshift = 
        - (tailaddrowcount + backwardovershootrowcount) + 
        (headaddrowcount + forwardovershootrowcount)

    // base value for cradle reference shift; may change if beyond list count
    let cradlereferencerowshift = axisreferencerowshift

    // ------------[ 5. calc new cradle reference row offset and axis reference row offset ]-------------

    const previouscradlereferenceindex = (cradlecontentlist[0]?.props.index || 0)
    const previouscradlerowoffset = Math.ceil(previouscradlereferenceindex/crosscount)

    const previousaxisreferenceindex = (tailcontentlist[0]?.props.index || 0)
    const previousaxisrowoffset = Math.ceil(previousaxisreferenceindex/crosscount)

    let newcradlereferencerowoffset = previouscradlerowoffset + cradlereferencerowshift
    let newaxisreferencerowoffset = previousaxisrowoffset + axisreferencerowshift

    // --------[ 6. adjust cradle contents when at start and end of list ]-------
    // ...to maintain constant number of cradle rows

    if (isScrollingviewportforward) {

        // a. if scrolling forward near the start of the list, new cradle row offset and
        // cradle row shift count has to be adjusted to accommodate the leading runway
        // b. if scrolling forward (toward tail of list), as the cradle last row offset approaches 
        // listrow new cradle offset and cradle row shift have to be adjusted to prevent shortening 
        // of cradle content.

        const targetcradlereferencerowoffset = 
            Math.max(0, (newaxisreferencerowoffset - 1 - runwayRowcount))

        const headrowdiff = newcradlereferencerowoffset - targetcradlereferencerowoffset
        if (headrowdiff > 0) {

            newcradlereferencerowoffset -= headrowdiff
            cradlereferencerowshift -= headrowdiff

        }
        // case of being in bounds of trailing runway (end of list)
        const targetcradleEndrowoffset = newcradlereferencerowoffset + (cradleRowcount -1)
        const tailrowdiff = Math.max(0,targetcradleEndrowoffset - (listRowcount -1))
        if (tailrowdiff > 0) {

            newcradlereferencerowoffset -= tailrowdiff
            cradlereferencerowshift -= tailrowdiff

        }
    }

    if (!isScrollingviewportforward) {

        // c. if scrolling backward (toward head of list), as the cradlerowoffset hits 0, cradle changes have
        // to be adjusted to prevent shortening of cradle content
        // d. if scrolling backward near the end of the list, cradle changes has to be adjusted to accomodate
        // the trailing runway

        if (newcradlereferencerowoffset < 0) {

            const previousrowshift = cradlereferencerowshift
            cradlereferencerowshift += newcradlereferencerowoffset
            cradlereferencerowshift = Math.max(0,cradlereferencerowshift)
            newcradlereferencerowoffset = 0

        }
        // case of in bounds of trailing runway (end of list)
        const computedNextCradleEndrowOffset = 
            (previouscradlerowoffset + (cradleRowcount -1) + cradlereferencerowshift)
        const targetcradleEndrowoffset = Math.min((listRowcount - 1), 
            (newaxisreferencerowoffset + (viewportRowcount - 1) + (runwayRowcount - 1)))
        const tailrowdiff = Math.max(0, targetcradleEndrowoffset - computedNextCradleEndrowOffset)

        if (tailrowdiff > 0) {

            cradlereferencerowshift += tailrowdiff
            newcradlereferencerowoffset += tailrowdiff

        }

    }

    // ----------------------[ 7. map rows to item references ]----------------------

    let newcradlereferenceindex = (newcradlereferencerowoffset * crosscount)
    let cradlereferenceitemshift = (cradlereferencerowshift * crosscount)

    let newaxisreferenceindex = newaxisreferencerowoffset * crosscount
    let axisreferenceitemshift = axisreferencerowshift * crosscount

    let newcradlecontentcount = cradleRowcount * crosscount // base count
    const includesLastRow = ((newcradlereferencerowoffset + cradleRowcount) >= listRowcount)
    if (includesLastRow) {
        const partialspaces = listsize % crosscount
        const itemsShortfall = 
            (partialspaces == 0)?
                0:
                crosscount - partialspaces
        newcradlecontentcount -= itemsShortfall
    }

    // create head and tail change counts
    const changeOfCradleContentCount = cradlecontentlist.length - newcradlecontentcount
    let headchangecount = -(cradlereferencerowshift * crosscount)
    let tailchangecount = -headchangecount - (changeOfCradleContentCount)

    // -------------[ 8. calculate new axis pixel position; adjust for overshoot ]------------------

    let axisposshift = axisreferencerowshift * cellLength

    let newaxispixeloffset = viewportaxisoffset + axisposshift

    // ---------------------[ 9. return required values ]-------------------

    return {
        newcradlereferenceindex, 
        cradlereferenceitemshift, 
        newaxisreferenceindex, 
        axisreferenceitemshift, 
        newaxispixeloffset, 
        newcradlecontentcount,
        headchangecount,
        tailchangecount
    }

}

// =====================[ shared by both setCradleContent and updateCradleContent ]====================

// update content
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.
export const getUICellShellList = ({ 

        cradleInheritedProperties,
        cradleInternalProperties,
        cradleContentCount,
        cradleReferenceIndex, 
        headChangeCount, 
        tailChangeCount, 
        localContentList:contentlist,
        callbacks,
        // observer,
        instanceIdCounterRef,
    }) => {

    let { 
        crosscount,
        cradleRowcount 
    } = cradleInternalProperties

    let localContentlist = [...contentlist]
    let tailindexoffset = cradleReferenceIndex + contentlist.length
    // let headindexoffset = cradleReferenceIndex
    // let returnContentlist

    let headContentlist = []

    let topconstraint = cradleReferenceIndex - headChangeCount,
    bottomconstraint = (cradleReferenceIndex - headChangeCount) + (cradleContentCount + 1) // TODO: validate "+1"

    let deletedtailitems = [], deletedheaditems = []

    if (headChangeCount >= 0) {

        for (let index = cradleReferenceIndex - headChangeCount; index < (cradleReferenceIndex); index++) {

            if (!((index >= topconstraint) && (index <= bottomconstraint))) {
                continue
            }
            headContentlist.push(
                acquireItem(
                    {
                        index, 
                        cradleInheritedProperties,
                        // observer, 
                        callbacks, 
                        instanceIdCounterRef,
                    }
                )
            )

        }

    } else {

        deletedheaditems = localContentlist.splice( 0, -headChangeCount )

    }

    let tailContentlist = []

    if (tailChangeCount >= 0) {

        for (let index = tailindexoffset; index < (tailindexoffset + tailChangeCount); index++) {

            if (!((index >= topconstraint) && (index <= bottomconstraint))) {
                continue
            }
            tailContentlist.push(
                acquireItem(
                    {
                        index, 
                        cradleInheritedProperties,
                        // observer, 
                        callbacks, 
                        instanceIdCounterRef,
                    }
                )
            )
            
        }

    } else {

        deletedtailitems = localContentlist.splice(tailChangeCount,-tailChangeCount)

    }

    let deleteditems = deletedheaditems.concat(deletedtailitems)

    let componentList = headContentlist.concat(localContentlist,tailContentlist)

    return [componentList,deleteditems]

}

// butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        axisReferenceIndex, // first tail item

    }
) => {

    let offsetindex = contentlist[0]?.props.index // TODO: Cannot read property 'props' of undefined

    let headitemcount

    headitemcount = (axisReferenceIndex - offsetindex)

    let headlist = contentlist.slice(0,headitemcount)
    let taillist = contentlist.slice(headitemcount)

    return [headlist,taillist]

}

export const deletePortals = (portalHandler, deleteList) => {

    for (let item of deleteList) {
        portalHandler.deletePortal(item.props.index)
    }
    if (deleteList.length) portalHandler.renderPortalList()
}

// =====================[ acquire item support ]======================

const acquireItem = ({
    index, 
    cradleInheritedProperties,
    // observer, 
    callbacks, 
    instanceIdCounterRef,

}) => {
    let instanceID = instanceIdCounterRef.current++

    return emitItem({
        index, 
        cradleInheritedProperties,
        // observer, 
        callbacks, 
        instanceID,
    })
}

const emitItem = ({
    index, 
    cradleInheritedProperties,
    // observer, 
    callbacks, 
    instanceID,
}) => {

    let { orientation,
        cellHeight,
        cellWidth,
        getItem,
        placeholder,
        listsize,
        scrollerName,
        scrollerID } = cradleInheritedProperties

    return <CellShell 
        key = {index} 
        orientation = { orientation }
        cellHeight = { cellHeight }
        cellWidth = { cellWidth }
        index = { index }
        callbacks = {callbacks}
        getItem = {getItem}
        listsize = {listsize}
        placeholder = { placeholder }
        instanceID = {instanceID}
        scrollerName = { scrollerName }
        scrollerID = { scrollerID }
    />    

}

