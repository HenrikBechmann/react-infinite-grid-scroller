// cradlefunctions.tsx
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
        visibletargetindexoffset:referenceoffset,
        targetViewportOffset,
        viewportElement,

    }) => {

    let { 
        orientation, 
        cellHeight, 
        cellWidth, 
        runwaycount,
        gap,
        padding,
        listsize
    } = cradleInheritedProperties

    let {

        crosscount,
        cradleRowcount,
        viewportRowcount

    } = cradleInternalProperties
    // reconcile axisReferenceIndex to crosscount context
    let diff = referenceoffset % crosscount
    referenceoffset -= diff

    // -------------[ calc basic inputs: cellLength, contentCount. ]----------

    let cellLength,viewportlength
    if (orientation == 'vertical') {
        cellLength = cellHeight + gap
        viewportlength = viewportElement.offsetHeight
    } else {
        cellLength = cellWidth + gap
        viewportlength = viewportElement.offsetWidth
    }
    // let viewportrows = Math.floor(viewportlength / cellLength)

    let viewportrows = viewportRowcount

    let cradleAvailableContentCount = cradleRowcount * crosscount 

    // -----------------------[ calc leadingitemcount, referenceoffset ]-----------------------

    let runwayitemcount = runwaycount * crosscount
    runwayitemcount = Math.min(runwayitemcount, referenceoffset) // for list head

    // -----------------------[ calc cradleFirstIndex ]------------------------
    // leading edge
    let cradleFirstIndex = referenceoffset - runwayitemcount

    // ------------[ adjust cradleFirstIndex for underflow ]------------

    diff = 0 // reset
    let indexshift = 0 // adjustment if overshoot head
    if (cradleFirstIndex < 0) {
        diff = cradleFirstIndex
        indexshift = Math.floor(cradleFirstIndex / crosscount) * crosscount
        cradleFirstIndex += indexshift
    }

    // ------------[ adjust cradleFirstIndex and contentCount for listsize overflow ]------------

    let axisPosOffset = targetViewportOffset % cellLength

    // --------------------[ calc css positioning ]-----------------------

    let targetrowoffset = Math.ceil(referenceoffset/crosscount)
    let scrollblockOffset = (targetrowoffset * cellLength) + padding // gap
    let axisAdjustment
    let cradleContentCount = cradleAvailableContentCount

    if (targetrowoffset == 0) {
        scrollblockOffset = 0
        axisPosOffset = 0 // padding
        axisAdjustment = padding
    } else {
        axisAdjustment = 0; //gap;

        [cradleFirstIndex, cradleContentCount, referenceoffset, scrollblockOffset, axisPosOffset] = 
            adjustAxisOffsetForMaxRefIndex({
            referenceoffset,
            axisPosOffset,
            scrollblockOffset,            
            targetrowoffset,
            viewportlength,
            listsize,
            viewportrows,
            crosscount,
            cellLength,
            padding,
            gap,
            cradleFirstIndex,
            cradleAvailableContentCount,
        })
    }

    return {
        cradleFirstIndex, 
        referenceoffset, 
        cradleContentCount, 
        scrollblockOffset, 
        axisPosOffset, 
        axisAdjustment
    } // summarize requirements message

}

const adjustAxisOffsetForMaxRefIndex = ({

    listsize,
    crosscount,
    cradleAvailableContentCount,

    cradleFirstIndex,
    referenceoffset,
    targetrowoffset,

    scrollblockOffset,
    axisPosOffset,

    viewportlength,
    viewportrows,

    cellLength,
    padding,
    gap,

}) => {

    let activelistitemcount = cradleFirstIndex + cradleAvailableContentCount
    let activelistrowcount = Math.ceil(activelistitemcount/crosscount)
    let listRowcount = Math.ceil(listsize/crosscount)

    if (activelistrowcount > listRowcount) {
        let diffrows = activelistrowcount - listRowcount
        let diff = diffrows * crosscount
        cradleFirstIndex -= diff
        activelistrowcount -= diffrows
    }

    // let testlistrowcount = Math.ceil((cradleFirstIndex + contentCount + 1)/crosscount)
    let cradleActualContentCount = cradleAvailableContentCount
    if (activelistrowcount == listRowcount) {
        let diff = listsize % crosscount
        if (diff) {
            cradleActualContentCount -= (crosscount - diff)
        }
    }

    let maxrefindexrowoffset = Math.ceil(listsize/crosscount) - viewportrows + 1
    // console.log('targetrowoffset, maxrefindexrowoffset', targetrowoffset, maxrefindexrowoffset)
    if (targetrowoffset > maxrefindexrowoffset) {

        let diff = targetrowoffset - maxrefindexrowoffset
        targetrowoffset -= diff // maxrefindexrowoffset

        referenceoffset = (targetrowoffset * crosscount)

        scrollblockOffset = (targetrowoffset * cellLength) + padding

        axisPosOffset = viewportlength - ((viewportrows - 1) * cellLength) - gap

    }

    return [cradleFirstIndex, cradleActualContentCount, referenceoffset, scrollblockOffset, axisPosOffset]

}

// ======================[ for updateCradleContent ]===========================

// BUG: TODO scroll stopped right at head window forward does not trigger intersection in opposite direction
// -1 = shift row to head. 1 = shift row to tail. 0 = do not shift a row.
export const getShiftInstruction = ({

    isScrollingviewportforward,
    breaklineEntries,

}) => {

    // console.log('breaklineEntries', breaklineEntries)

    const entries = breaklineEntries.filter(entry => {
        const isIntersecting = entry.isIntersecting
        const breaklinename = entry.target.dataset.type
        return ((!isIntersecting) && isScrollingviewportforward && (breaklinename == 'breakline-tail')) ||
            (isIntersecting && (!isScrollingviewportforward) && (breaklinename == 'breakline-head'))
    })

    if (entries.length == 0) return 0

    if (entries.length > 1) {
        console.log('SYSTEM ISSUE: MORE THAN ONE BREAKLINE OBSERVER ENTRY', breaklineEntries.length, breaklineEntries)
        debugger
    }

    const [entry] = entries
    const isIntersecting = entry.isIntersecting
    const breaklinename = entry.target.dataset.type

    if ((!isIntersecting) && isScrollingviewportforward && (breaklinename == 'breakline-tail')) {
        return -1 // shift row to head
    } else if (isIntersecting && (!isScrollingviewportforward) && (breaklinename == 'breakline-head')) {
        return 1 // shift row to tail
    } else {
        return 0 // do not shift a row
    }

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
        runwaycount,

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

    } = cradleInternalProperties

    const cellLength = ((orientation == 'vertical')?cellHeight:cellWidth) + gap

    // -----------[ 2. calculate the forward or backward gaps for input ]-------------------
    // gaps can be caused by rapid scrolling

    const viewportaxisoffset = // the pixel distance between the viewport frame and the axis, toward the head
        ((orientation == 'vertical')?axisElement.offsetTop:(axisElement.offsetLeft)) - scrollPos

    // the gap between the cell about to be moved, and the viewport edge
    // reference cell forward end for scrolling forward or back end for scrolling backward
    const viewportaxisbackwardgaplength = (!isScrollingviewportforward)?(viewportaxisoffset - cellLength):0
    const viewportaxisforwardgaplength = (isScrollingviewportforward)?-viewportaxisoffset:0

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
    const headblockaddshiftrowcount = (isScrollingviewportforward)?1:0
    const tailblockaddshiftrowcount = (!isScrollingviewportforward)?1:0

    // consolidate head and tail information into single axis and cradle reference shifts
    // - negative value shifted toward tail; positive value shifted toward head
    // - one of the two expressions in the following line will be 0
    const axisreferencerowshift = 
        - (tailblockaddshiftrowcount + backwardovershootrowcount) + 
        (headblockaddshiftrowcount + forwardovershootrowcount)

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

        const targetcradlereferencerowoffset = Math.max(0,(newaxisreferencerowoffset - (runwaycount - 1)))
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
        const computedNextCradleEndrowOffset = (previouscradlerowoffset + (cradleRowcount -1) + cradlereferencerowshift)
        const targetcradleEndrowoffset = Math.min((listRowcount - 1), (newaxisreferencerowoffset + (viewportRowcount - 1) + (runwaycount - 1)))
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
        const itemsShortfall = (partialspaces == 0)?0:crosscount - partialspaces
        newcradlecontentcount -= itemsShortfall
    }

    // create head and tail change counts
    const changeOfCradleContentCount = cradlecontentlist.length - newcradlecontentcount
    let headchangecount = -(cradlereferencerowshift * crosscount)
    let tailchangecount = -headchangecount - (changeOfCradleContentCount)

    // -------------[ 8. calculate new axis pixel position; adjust for overshoot ]------------------

    let axisposshift = axisreferencerowshift * cellLength

    let newaxisposoffset = viewportaxisoffset + axisposshift

    // ---------------------[ 9. return required values ]-------------------

    return [
        newcradlereferenceindex, 
        cradlereferenceitemshift, 
        newaxisreferenceindex, 
        axisreferenceitemshift, 
        newaxisposoffset, 
        newcradlecontentcount,
        headchangecount,
        tailchangecount
    ]

}


// =====================[ shared by both setCradleContent and updateCradleContent ]====================

// update content
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.
export const getUICellShellList = ({ 

        cradleInheritedProperties,
        cradleInternalProperties,
        cradleContentCount,
        cradleFirstIndex, 
        headchangecount, 
        tailchangecount, 
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
    let tailindexoffset = cradleFirstIndex + contentlist.length
    // let headindexoffset = cradleFirstIndex
    // let returnContentlist

    let headContentlist = []

    let topconstraint = cradleFirstIndex - headchangecount,
    bottomconstraint = (cradleFirstIndex - headchangecount) + (cradleContentCount + 1) // TODO: validate "+1"

    let deletedtailitems = [], deletedheaditems = []

    if (headchangecount >= 0) {

        for (let index = cradleFirstIndex - headchangecount; index < (cradleFirstIndex); index++) {

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

        deletedheaditems = localContentlist.splice( 0, -headchangecount )

    }

    let tailContentlist = []

    if (tailchangecount >= 0) {

        for (let index = tailindexoffset; index < (tailindexoffset + tailchangecount); index++) {

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

        deletedtailitems = localContentlist.splice(tailchangecount,-tailchangecount)

    }

    let deleteditems = deletedheaditems.concat(deletedtailitems)

    let componentList = headContentlist.concat(localContentlist,tailContentlist)

    return [componentList,deleteditems]

}

// butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        axisreferenceindex, // first tail item

    }
) => {

    let offsetindex = contentlist[0]?.props.index // TODO: Cannot read property 'props' of undefined

    let headitemcount

    headitemcount = (axisreferenceindex - offsetindex)

    let headlist = contentlist.slice(0,headitemcount)
    let taillist = contentlist.slice(headitemcount)

    return [headlist,taillist]

}

export const deleteAndRerenderPortals = (portalHandler, deleteList) => {

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
        orientation = {orientation}
        cellHeight = { cellHeight }
        cellWidth = { cellWidth }
        index = {index}
        callbacks = {callbacks}
        getItem = {getItem}
        listsize = {listsize}
        placeholder = { placeholder }
        instanceID = {instanceID}
        scrollerName = { scrollerName }
        scrollerID = { scrollerID }
    />    

}

