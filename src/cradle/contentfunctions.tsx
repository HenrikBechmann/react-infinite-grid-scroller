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
        console.log('SYSTEM ISSUE: MORE THAN ONE BREAKLINE ENTRY', breaklineEntries.length, breaklineEntries)
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

// A negative shift instruction is into the head, a positive shift is into the tail
// called only from updateCradleContent
export const calcContentShift = ({

    shiftinstruction,
    cradleInheritedProperties,
    cradleInternalProperties,
    cradleContent,
    cradleElements,
    scrollPos,
    // viewportElement,

}) => {

    const isScrollingviewportforward = (shiftinstruction < 0)

    // ------------------------[ initialize ]-----------------------

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
        // headElement = cradleElements.headRef.current,
        // tailElement = cradleElements.tailRef.current

    const {cradleModel:cradlecontentlist, 
        headModelComponents:headcontentlist, 
        tailModelComponents:tailcontentlist
    } = cradleContent

    const { crosscount,
        cradleRowcount,
        listRowcount,
        // viewportRowcount
    } = cradleInternalProperties

    const cellLength = ((orientation == 'vertical')?cellHeight:cellWidth) + gap

    // -----------[ 1. calculate the forward or backward values for input ]-------------------

    const viewportaxisoffset = // the pixel distance between the viewport frame and the axis, toward the head
        ((orientation == 'vertical')?axisElement.offsetTop:(axisElement.offsetLeft)) - scrollPos

    // }

    // the gap between the cell about to be moved, and the viewport edge
    // reference cell forward end for scrolling forward or backward end for moving backward
    const viewportaxisbackwardgaplength = (!isScrollingviewportforward)?(viewportaxisoffset - cellLength):0
    const viewportaxisforwardgaplength = (isScrollingviewportforward)?-viewportaxisoffset:0

    // console.log('1. cellLength, viewportaxisoffset, viewportbackwardgaplength, viewportforwardgaplength',
    //     cellLength, viewportaxisoffset, viewportaxisbackwardgaplength, viewportaxisforwardgaplength)

    // -------[ 2. calculate the axis overshoot (more than one row) item & row counts, if any ]-------
    
    // these overshoot numbers guaranteed to be 0 or positive
    const forwardovershootrowcount = 
        Math.max(0,Math.floor(viewportaxisforwardgaplength/cellLength))
    const backwardovershootrowcount = 
        Math.max(0,Math.floor(viewportaxisbackwardgaplength/cellLength))

    const forwardovershootitemcount = forwardovershootrowcount * crosscount
    const backwardovershootitemcount = backwardovershootrowcount * crosscount

    // console.log('2.a forwardovershootrowcount, forwardovershootitemcount, backwardovershootrowcount, backwardovershootitemcount', 
    //     forwardovershootrowcount, forwardovershootitemcount, backwardovershootrowcount, backwardovershootitemcount)

    // -----------------[ 3. combine item & row shift counts including base and overshoot ]-------------

    /*
        shift item count is the number of items the virtual cradle shifts, according to observer
        shift negative closer to head, shift positive closer to tail
        cradle reference is the first content item
        axis reference is the first tail item
    */

    // allocate a base shift to head or tail
    const headblockaddshiftitemcount = (isScrollingviewportforward)?crosscount:0
    const tailblockaddshiftitemcount = (!isScrollingviewportforward)?crosscount:0

    // console.log('2.b base headblockaddshiftitemcount, tailblockaddshiftitemcount', 
    //     headblockaddshiftitemcount, tailblockaddshiftitemcount)

    // consolidate head and tail information into single axis and cradle reference shifts
    // negative value shifted toward tail; positive value shifted toward head
    // one of the two expressions in the following line will be 0
    let axisreferenceitemshift = 
        -(tailblockaddshiftitemcount + backwardovershootitemcount) + 
        (headblockaddshiftitemcount + forwardovershootitemcount)

    // base value for cradle reference shift; may change if beyond list count
    let cradlereferenceitemshift = axisreferenceitemshift

    let cradlereferencerowshift = 
        (cradlereferenceitemshift > 0)
            ?Math.ceil(cradlereferenceitemshift/crosscount)
            :Math.floor(cradlereferenceitemshift/crosscount)
    cradlereferenceitemshift = Math.round(cradlereferencerowshift * crosscount)

    let axisreferencerowshift = 
        (axisreferenceitemshift > 0) // could include partial row from shiftingintersections
            ?Math.ceil(axisreferenceitemshift/crosscount)
            :Math.floor(axisreferenceitemshift/crosscount)
    axisreferenceitemshift = Math.round(axisreferencerowshift * crosscount)

    // console.log('3. preliminary axisreferenceitemshift, cradlereferenceitemshift, axisreferencerowshift, cradlereferencerowshift',
    //     axisreferenceitemshift, cradlereferenceitemshift, axisreferencerowshift, cradlereferencerowshift)

    // ----------------[ 4. calc new cradle reference index and axis reference index ]-----------------

    const previouscradlereferenceindex = (cradlecontentlist[0]?.props.index || 0)
    const previouscradlerowoffset = Math.round(previouscradlereferenceindex/crosscount)
    const previousaxisreferenceindex = (tailcontentlist[0]?.props.index || 0)
    const previouslastindex = (cradlecontentlist.at(-1)?.props.index || 0)
    // const previousaxisreferencerowoffset = Math.round(previousaxisreferenceindex/crosscount)

    // console.log('4. previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount',
    //     previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount)

    // computed shifted cradle end row, looking for overshoot
    let computedNextCradleEndrowOffset = (previouscradlerowoffset + cradleRowcount + cradlereferencerowshift - 1)

    // adjust for overshoot end of list
    const listovershoot = (isScrollingviewportforward)
        ?(Math.max(0,computedNextCradleEndrowOffset - listRowcount))
        :(Math.min(0,previouscradlerowoffset + cradlereferencerowshift))

    if (listovershoot) {
        cradlereferencerowshift -= listovershoot
        cradlereferenceitemshift -= (listovershoot * crosscount)
    }

    // console.log('5. listovershoot, computedNextCradleEndrowOffset, cradlereferencerowshift, cradlereferenceitemshift',
    //     listovershoot,computedNextCradleEndrowOffset, cradlereferencerowshift, cradlereferenceitemshift)

    let newcradlereferenceindex = previouscradlereferenceindex + cradlereferenceitemshift
    let newaxisreferenceindex = previousaxisreferenceindex + axisreferenceitemshift

    // console.log('6.a proposedcradlereferenceindex, proposedaxisreferenceindex',
    //     newcradlereferenceindex, newaxisreferenceindex)

    // console.log('6.b runwaycount, viewportRowcount, newaxisreferenceindex, tailrunwayrows', 
    //     runwaycount, viewportRowcount)

    // adjust for undershoot start of list
    if (newcradlereferenceindex < 0) {
        cradlereferenceitemshift += newcradlereferenceindex
        cradlereferenceitemshift = Math.max(0,cradlereferenceitemshift)
        const prev = cradlereferencerowshift
        cradlereferencerowshift = cradlereferenceitemshift/crosscount
        const diff = prev - cradlereferencerowshift
        newcradlereferenceindex = 0
        computedNextCradleEndrowOffset += diff
    }
    // --------[ 5. adjust start and end of list to maintain constant number of cradle rows ]-------

    // create updated cradle content count
    let newCradleContentCount = cradleRowcount * crosscount // base count
    const includesLastRow = (computedNextCradleEndrowOffset >= listRowcount)
    if (includesLastRow) {
        const partialspaces = listsize % crosscount
        const itemsShortfall = crosscount - partialspaces
        newCradleContentCount -= itemsShortfall
    }

    // create base head and tail change counts
    const changeOfCradleContentCount = cradlecontentlist.length - newCradleContentCount
    let headchangecount = -cradlereferenceitemshift
    let tailchangecount = -headchangecount - (changeOfCradleContentCount)

    console.log('7. newCradleContentCount, base headchangecount & tailchangecount',
        newCradleContentCount, headchangecount, tailchangecount)

    // a. if scrolling forward (toward tail of list), as the cradle index approaches listCount less 
    // newCradleContent count, headchangecount has to be adjusted to prevent shortening of cradle content.
    // b. if scrolling forward near the start of the list, headchangecount has to be adjusted to
    // accommodate the leading runway

    if (isScrollingviewportforward) {
        // case of in bounds of leading runway
        const targetcradlereferenceindex = newaxisreferenceindex - 
            ((runwaycount * crosscount) + crosscount)
        const diff = newcradlereferenceindex - targetcradlereferenceindex
        if (diff != 0) {
            newcradlereferenceindex -= diff
            headchangecount -= diff
            cradlereferenceitemshift -= diff
            tailchangecount += diff
        }
        console.log('scrolling forward in lead runway scope\
            targetcradlereferenceindex, diff, newcradlereferenceindex, headchangecount, cradlereferenceitemshift, tailchangecount',
            targetcradlereferenceindex, diff, newcradlereferenceindex, headchangecount, cradlereferenceitemshift, tailchangecount)
    }

    // c. if scrolling backward (toward head of list), as the cradleindex hits 0, tailchagecount has to 
    // be adjusted to prevent shortening of cradle content
    // d. if scrolling backward near the end of the list, tailchangecount has to be adjusted to accomodate
    // the trailing runway

    if (!isScrollingviewportforward) {

    }

    // -------------[ 5. calculate new axis pixel position ]------------------

    const axisposshift = axisreferencerowshift * cellLength

    let newaxisposoffset = viewportaxisoffset + axisposshift

    // console.log('10. axisposshift, newaxisposoffset',axisposshift, newaxisposoffset)

    // ---------------------[ 6. return required values ]-------------------

    return [
        newcradlereferenceindex, 
        cradlereferenceitemshift, 
        newaxisreferenceindex, 
        axisreferenceitemshift, 
        newaxisposoffset, 
        newCradleContentCount,
        headchangecount,
        tailchangecount
    ]

}

// export const calcHeadAndTailChanges = ({

//         cradleInheritedProperties,
//         cradleInternalProperties,
//         cradleContent,
//         cradleshiftcount,
//         isScrollingviewportforward,
//         cradleFirstIndex,

//     }) => {

//     let listsize = cradleInheritedProperties.listsize

//     let headcontent = cradleContent.headModelComponents
//     let tailcontent = cradleContent.tailModelComponents

//     const { crosscount, cradleRowcount } = cradleInternalProperties

//     cradleshiftcount = Math.abs(cradleshiftcount) 
//     const rowshiftcount = Math.ceil(cradleshiftcount/crosscount) //+ boundaryrowcount

//     let headrowcount, tailrowcount
//     headrowcount = Math.ceil(headcontent.length/crosscount)
//     tailrowcount = Math.ceil(tailcontent.length/crosscount)

//     let pendingcontentoffset // lookahead to new cradleFirstIndex

//     let headchangecount, tailchangecount // the output instructions for getUICellShellList

//     // anticipaate add to one end, clip from the other        
//     let additemcount = 0
//     let cliprowcount = 0, clipitemcount = 0

//     if (isScrollingviewportforward) { // clip from head; add to tail; scroll forward tail is direction of scroll

//         // adjust clipitemcount
//         if ((headrowcount + rowshiftcount) > (cradleInheritedProperties.runwaycount)) {

//             let rowdiff = (headrowcount + rowshiftcount) - (cradleInheritedProperties.runwaycount)
//             cliprowcount = rowdiff
//             clipitemcount = (cliprowcount * crosscount)

//         }

//         additemcount = clipitemcount // maintain constant cradle count

//         pendingcontentoffset = cradleFirstIndex + clipitemcount // after clip

//         let proposedtailindex = pendingcontentoffset + (cradleRowcount * crosscount) - 1 // modelcontentlist.length - 1

//         // adkjust changes for list boundaries
//         if ((proposedtailindex) > (listsize -1) ) {

//             let diffitemcount = (proposedtailindex - (listsize -1)) // items outside range
//             additemcount -= diffitemcount // adjust the addcontent accordingly
            
//             let diffrows = Math.floor(diffitemcount/crosscount) // number of full rows to leave in place
//             let diffrowitems = (diffrows * crosscount)  // derived number of items to leave in place

//             clipitemcount -= diffrowitems // apply adjustment to netshift

//             if (additemcount <=0) { // nothing to do

//                 additemcount = 0

//             }
//             if (clipitemcount <=0 ) {

//                 clipitemcount = 0
                
//             }
//         }

//         headchangecount = (clipitemcount ==0)?0:-clipitemcount
//         tailchangecount = additemcount

//     } else { // scroll viewport backward, in direction of head; clip from tail, add to head

//         let intersectionindexes = []

//         // headcount will be less than minimum (runwaycount), so a shift can be accomplished[]
//         if ((headrowcount - rowshiftcount) < (cradleInheritedProperties.runwaycount)) {
//             // calculate clip for tail
//             let rowshortfall = (cradleInheritedProperties.runwaycount) - (headrowcount - rowshiftcount)

//             cliprowcount = rowshortfall
//             let tailrowitemcount = (tailcontent.length % crosscount)

//             if (tailrowitemcount == 0) tailrowitemcount = crosscount

//             clipitemcount = tailrowitemcount
//             if (tailrowcount > 1) {

//                 if (cliprowcount > tailrowcount) {
//                     cliprowcount = tailrowcount
//                 }

//                 if (cliprowcount > 1) {
//                     clipitemcount += ((cliprowcount -1) * crosscount)
//                 }

//             }

//             // compenstate with additemcount
//             additemcount = (cliprowcount * crosscount)

//         }

//         let proposedindexoffset = cradleFirstIndex - additemcount

//         if (proposedindexoffset < 0) {

//             let diffitemcount = -proposedindexoffset
//             let diffrows = Math.ceil(diffitemcount/crosscount) // number of full rows to leave in place
//             let diffrowitems = (diffrows * crosscount)

//             additemcount -= diffitemcount
//             clipitemcount -= diffrowitems

//             if (additemcount <= 0) {

//                 additemcount = 0
                
//             }

//             if (clipitemcount <= 0) {

//                 clipitemcount = 0

//             }
//         }

//         headchangecount = additemcount
//         tailchangecount = (clipitemcount == 0)?0:-clipitemcount

//     }

//     return [headchangecount,tailchangecount]

// }

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

