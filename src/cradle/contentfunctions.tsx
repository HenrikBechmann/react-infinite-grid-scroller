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

    let { orientation, 
        cellHeight, 
        cellWidth, 
        runwaycount,
        gap,
        padding,
        listsize} = cradleInheritedProperties

    let {crosscount,
        cradleRowcount,
        viewportRowcount} = cradleInternalProperties
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

    return {cradleFirstIndex, referenceoffset, cradleContentCount, scrollblockOffset, axisPosOffset, axisAdjustment} // summarize requirements message

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

// -1 = shift row to head. 1 = shift row to tail. 0 = do not shift a row.
export const getShiftInstruction = ({

    isScrollingviewportforward,
    breaklineEntries,

}) => {


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
    scrollPos, // of cradle against viewport; where the cradle intersects the viewport
    // viewportElement,

}) => {

    const isScrollingviewportforward = (shiftinstruction < 0)

    // ------------------------[ 1. initialize ]-----------------------

    const { gap,
        orientation,
        cellHeight,
        cellWidth,
        listsize,
        // padding,
        runwaycount,
        // breaklineOffset,
    } = cradleInheritedProperties

    const axisElement = cradleElements.axisRef.current

    const {cradleModel:cradlecontentlist, 
        // headModelComponents:headcontentlist, 
        tailModelComponents:tailcontentlist
    } = cradleContent

    const { crosscount,
        cradleRowcount,
        listRowcount,
        viewportRowcount,
    } = cradleInternalProperties

    const cellLength = ((orientation == 'vertical')?cellHeight:cellWidth) + gap

    // -----------[ 2. calculate the forward or backward gaps for input ]-------------------

    const viewportaxisoffset = // the pixel distance between the viewport frame and the axis, toward the head
        ((orientation == 'vertical')?axisElement.offsetTop:(axisElement.offsetLeft)) - scrollPos

    // the gap between the cell about to be moved, and the viewport edge
    // reference cell forward end for scrolling forward or backward end for moving backward
    const viewportaxisbackwardgaplength = (!isScrollingviewportforward)?(viewportaxisoffset - cellLength):0
    const viewportaxisforwardgaplength = (isScrollingviewportforward)?-viewportaxisoffset:0

    // console.log('1. cellLength, viewportaxisoffset, viewportbackwardgaplength, viewportforwardgaplength',
    //     cellLength, viewportaxisoffset, viewportaxisbackwardgaplength, viewportaxisforwardgaplength)

    // -------[ 3. calculate the axis overshoot (more than one row) item & row counts, if any ]-------
    
    // these overshoot numbers guaranteed to be 0 or positive
    const forwardovershootrowcount = 
        Math.max(0,Math.floor(viewportaxisforwardgaplength/cellLength))
    const backwardovershootrowcount = 
        Math.max(0,Math.floor(viewportaxisbackwardgaplength/cellLength))

    // console.log('2.a forwardovershootrowcount, backwardovershootrowcount', 
    //     forwardovershootrowcount, backwardovershootrowcount)

    // -----------------[ 4. combine item & row shift counts including base and overshoot ]-------------

    /*
        shift item count is the number of items the virtual cradle shifts, according to observer
        shift negative closer to head, shift positive closer to tail
        cradle reference is the first content item
        axis reference is the first tail item
    */

    // allocate a base shift to head or tail
    const headblockaddshiftrowcount = (isScrollingviewportforward)?1:0
    const tailblockaddshiftrowcount = (!isScrollingviewportforward)?1:0

    // console.log('2.b base headblockaddshiftrowcount, tailblockaddshiftrowcount', 
    //     headblockaddshiftrowcount, tailblockaddshiftrowcount)

    // consolidate head and tail information into single axis and cradle reference shifts
    // negative value shifted toward tail; positive value shifted toward head
    // one of the two expressions in the following line will be 0
    let axisreferencerowshift = 
        - (tailblockaddshiftrowcount + backwardovershootrowcount) + 
        (headblockaddshiftrowcount + forwardovershootrowcount)

    // base value for cradle reference shift; may change if beyond list count
    // let cradlereferenceitemshift = axisreferenceitemshift
    let cradlereferencerowshift = axisreferencerowshift

    // console.log('3. preliminary axisreferencerowshift, cradlereferencerowshift',
    //     axisreferencerowshift, cradlereferencerowshift)

    // ----------------[ 5. calc new cradle reference index and axis reference index ]-----------------

    const previouscradlereferenceindex = (cradlecontentlist[0]?.props.index || 0)
    const previouscradlerowoffset = Math.ceil(previouscradlereferenceindex/crosscount)

    const previousaxisreferenceindex = (tailcontentlist[0]?.props.index || 0)
    const previousaxisrowoffset = Math.ceil(previousaxisreferenceindex/crosscount)

    // console.log('4. previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount',
    //     previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount)

    // computed shifted cradle end row, looking for overshoot
    let computedNextCradleEndrowOffset = (previouscradlerowoffset + (cradleRowcount -1) + cradlereferencerowshift)

    // adjust for overshoot end of list
    const listovershoot = (isScrollingviewportforward)
        ?(Math.max(0,computedNextCradleEndrowOffset - listRowcount))
        :(Math.min(0,previouscradlerowoffset + cradlereferencerowshift))

    if (listovershoot) {
        cradlereferencerowshift -= listovershoot
    }

    // console.log('5. listovershoot, computedNextCradleEndrowOffset, cradlereferencerowshift',
    //     listovershoot,computedNextCradleEndrowOffset, cradlereferencerowshift)

    let newcradlereferencerowoffset = previouscradlerowoffset + cradlereferencerowshift
    let newaxisreferencerowoffset = previousaxisrowoffset + axisreferencerowshift

    // console.log('6 newcradlereferencerowoffset, newaxisreferencerowoffset',
    //     newcradlereferencerowoffset, newaxisreferencerowoffset)

    // ** TODO move to section 5 below ** adjust for undershoot start of list
    if (newcradlereferencerowoffset < 0) {
        const previousrowshift = cradlereferencerowshift
        cradlereferencerowshift += newcradlereferencerowoffset
        cradlereferencerowshift = Math.max(0,cradlereferencerowshift)
        newcradlereferencerowoffset = 0
        const rowdiff = previousrowshift - cradlereferencerowshift
        computedNextCradleEndrowOffset += rowdiff

        // console.log('adjusted cradle row counts for undershoot start of list\
        //     cradlereferencerowshift, newcradlereferencerowoffset, computedNextCradleEndrowOffset',
        //     cradlereferencerowshift, newcradlereferencerowoffset, computedNextCradleEndrowOffset)
    }


    // --------[ 6. adjust start and end of list to maintain constant number of cradle rows ]-------

    // create updated cradle content count

    // a. if scrolling forward near the start of the list, headchangecount has to be adjusted to
    // accommodate the leading runway
    // b. if scrolling forward (toward tail of list), as the cradle index approaches listCount less 
    // newCradleContent count, headchangecount has to be adjusted to prevent shortening of cradle content.

    if (isScrollingviewportforward) {
        // case of in bounds of leading runway (start of list)
        const targetcradlereferencerowoffset = Math.max(0,(newaxisreferencerowoffset - runwaycount))
        const headrowdiff = newcradlereferencerowoffset - targetcradlereferencerowoffset
        if (headrowdiff > 0) {
            newcradlereferencerowoffset -= headrowdiff
            cradlereferencerowshift -= headrowdiff
            // console.log('adjusted for forward headrowdiff\
            //     newaxisreferencerowoffset, targetcradlereferencerowoffset, runwaycount, headrowdiff, newcradlereferencerowoffset, cradlereferencerowshift',
            //     newaxisreferencerowoffset, targetcradlereferencerowoffset, runwaycount, headrowdiff, newcradlereferencerowoffset, cradlereferencerowshift)
        }
        // case of in bounds of trailing runway (end of list)
        const targetcradleEndrowoffset = newcradlereferencerowoffset + (cradleRowcount -1)
        const tailrowdiff = Math.max(0,targetcradleEndrowoffset - (listRowcount -1))
        if (tailrowdiff > 0) {
            newcradlereferencerowoffset -= tailrowdiff
            cradlereferencerowshift -= tailrowdiff
            // console.log('adjusted for forward tailrowdiff\
            //     targetcradleEndrowoffset, runwaycount, tailrowdiff, newcradlereferencerowoffset, cradlereferencerowshift',
            //     targetcradleEndrowoffset, runwaycount, tailrowdiff, newcradlereferencerowoffset, cradlereferencerowshift)
        }
    }

    // c. if scrolling backward (toward head of list), as the cradleindex hits 0, tailchagecount has to 
    // be adjusted to prevent shortening of cradle content
    // d. if scrolling backward near the end of the list, tailchangecount has to be adjusted to accomodate
    // the trailing runway

    if (!isScrollingviewportforward) {

        // case of in bounds of trailing runway (end of list)
        const targetcradleEndrowoffset = Math.min((listRowcount - 1), (newaxisreferencerowoffset + (viewportRowcount - 1) + (runwaycount - 1)))
        const tailrowdiff = Math.max(0, targetcradleEndrowoffset - computedNextCradleEndrowOffset)
        // console.log('backward trailing runway: \
        //     targetcradleEndrowoffset,newaxisreferencerowoffset, viewportRowcount, runwaycount, computedNextCradleEndrowOffset, tailrowdiff',
        //     targetcradleEndrowoffset,newaxisreferencerowoffset, viewportRowcount, runwaycount, computedNextCradleEndrowOffset, tailrowdiff)
        if (tailrowdiff > 0) {
            newcradlereferencerowoffset += tailrowdiff
            cradlereferencerowshift += tailrowdiff
            // console.log('adjusted for backward tailrowdiff\
            //     targetcradleEndrowoffset, runwaycount, tailrowdiff, newcradlereferencerowoffset, cradlereferencerowshift',
            //     targetcradleEndrowoffset, runwaycount, tailrowdiff, newcradlereferencerowoffset, cradlereferencerowshift)
        }

    }

    // ----------------------[ 7. map rows to item references ]----------------------

    let newcradlereferenceindex = (newcradlereferencerowoffset * crosscount)
    let cradlereferenceitemshift = (cradlereferencerowshift * crosscount)

    const newaxisreferenceindex = newaxisreferencerowoffset * crosscount
    const axisreferenceitemshift = axisreferencerowshift * crosscount

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

    // console.log('7. newcradlecontentcount, includesLastRow, changeOfCradleContentCount, base headch1angecount & tailchangecount',
    //     newcradlecontentcount, includesLastRow, changeOfCradleContentCount, headchangecount, tailchangecount)

    // -------------[ 8. calculate new axis pixel position ]------------------

    const axisposshift = axisreferencerowshift * cellLength

    let newaxisposoffset = viewportaxisoffset + axisposshift

    // console.log('10. axisposshift, newaxisposoffset',axisposshift, newaxisposoffset)

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

    let { crosscount,
        cradleRowcount } = cradleInternalProperties

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

