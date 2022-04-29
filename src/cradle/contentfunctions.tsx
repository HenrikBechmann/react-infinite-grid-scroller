// cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React, {useContext} from 'react'

import CellShell from '../cellshell'

import { detect } from 'detect-browser'

const browser = detect()

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

    // if (axisPosOffset < 0) { // TODO: this shouldn't happen - reproduce from wide botton to narrow
    //     axisPosOffset += (orientation == 'vertical'?cellHeight:cellWidth)
    //     referenceoffset += crosscount
    //     cradleFirstIndex += crosscount
    // }

    // --------------------[ calc css positioning ]-----------------------

    let targetrowoffset = Math.ceil(referenceoffset/crosscount)
    let scrollblockOffset = (targetrowoffset * cellLength) + padding // gap
    let axisAdjustment
    let cradleActualContentCount = cradleAvailableContentCount

    if (targetrowoffset == 0) {
        scrollblockOffset = 0
        axisPosOffset = 0 // padding
        axisAdjustment = padding
    } else {
        axisAdjustment = 0; //gap;

        [cradleFirstIndex, cradleActualContentCount, referenceoffset, scrollblockOffset, axisPosOffset] = 
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

    return {cradleFirstIndex, referenceoffset, cradleActualContentCount, scrollblockOffset, axisPosOffset, axisAdjustment} // summarize requirements message

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

export const getShiftingInstruction = ({

    isScrollingviewportforward,
    breaklineEntries,

}) => {


    const entries = breaklineEntries.filter(entry => {
        const isIntersecting = entry.isIntersecting
        const breaklinename = entry.target.dataset.type
        const retval = ((!isIntersecting) && isScrollingviewportforward && (breaklinename == 'breakline-tail')) ||
            (isIntersecting && (!isScrollingviewportforward) && (breaklinename == 'breakline-head'))
        return retval
    })

    if (entries.length > 1) {
        console.log('SYSTEM ISSUE: MORE THAN ONE BREAKLINE ENTRY', breaklineEntries.length, breaklineEntries)
    }

    const [entry] = entries
    if (!entry) return 0
    const isIntersecting = entry.isIntersecting
    const breaklinename = entry.target.dataset.type
    let retval
    // TODO: calculate the grid row count required to be shifted
    if ((!isIntersecting) && isScrollingviewportforward && (breaklinename == 'breakline-tail')) {
        return -1 // shift row to head
    } else if (isIntersecting && (!isScrollingviewportforward) && (breaklinename == 'breakline-head')) {
        return 1 // shift row to tail
    } else {
        return 0 // do not shift a row
    }

}

// filter out items that not proximate to the axis
// TODO: keep last trigger position (x or y) to determine direction of scroll
// export const isolateShiftingIntersections = ({
//     intersections,
//     cradleContent,
//     cellObserverThreshold,
//     isScrollingviewportforward,
// }) => {

//     // console.log('==>> intersections',intersections)

//     const headcontent = cradleContent.headModelComponents
//     const tailcontent = cradleContent.tailModelComponents

//     let //headindexes = [], 
//         // tailindexes = [],
//         // headintersectionindexes = [],
//         // headintersections = [],
//         // tailintersectionindexes = [],
//         // tailintersections = [],
//         intersectingmetadata:any = {},
//         shiftingintersections = [],
//         shiftingindexes = [],
//         shiftingmetadata = []

//     // collect lists of current content indexes...
//     // headindexes, tailindexes
//     const headindexes = headcontent.map(component => component.props.index)
//     const tailindexes = tailcontent.map(component => component.props.index)

//     let duplicates:any = {}
//     let intersectionsptr = 0

//     // split intersections into head and tail indexes
//     for (let entry of intersections) {

//         const entryindex = parseInt(entry.target.dataset.index)
//         let newitemptr
//         let isShiftingEntry = false
//         if (isScrollingviewportforward) {

//             if (tailindexes.includes(entryindex)) {

//                 shiftingindexes.push(entryindex)
//                 shiftingintersections.push(entry)
//                 newitemptr = shiftingintersections.length - 1 // used from iobj metadata for duplicate resolution
//                 isShiftingEntry = true
//             }

//         } else { // if (scrollingviewportforward) {

//             if (headindexes.includes(entryindex)) {

//                 shiftingindexes.push(entryindex)
//                 shiftingintersections.push(entry)
//                 newitemptr = shiftingintersections.length - 1 // used for duplicate resolution
//                 isShiftingEntry = true

//             }

//         }
//         // } else {

//         //     console.log('SYSTEM ERROR: unknown intersection element, aborting isolateRelevantIntersections',entry)
//         //     return // shouldn't happen; give up

//         // }

//         // let ratio
//         // if (browser && browser.name == 'safari') {
//         //     ratio = entry.intersectionRatio
//         // } else {
//         //     ratio = Math.round(entry.intersectionRatio * 1000)/1000
//         // }

//         if (isShiftingEntry) {
//             const iobj = { // entry item metadata
//                 entryindex,
//                 // intersecting:calculatedintersecting,  // to accommodate browser differences
//                 isIntersecting:entry.isIntersecting,
//                 // threshold:Math.round(entry.intersectionRatio),
//                 intersectionRatio:entry.intersectionRatio,
//                 time:entry.time,
//                 itemptr:newitemptr,
//                 intersectionsptr,
//                 entry,
//             }
//             if (!intersectingmetadata[entryindex]) { // this is a new item
//                 intersectingmetadata[entryindex] = iobj
//             } else { // this is a duplicate intersection item
//                 if (!Array.isArray(intersectingmetadata[entryindex])) {
//                     intersectingmetadata[entryindex] = [intersectingmetadata[entryindex]] // arr
//                 }
//                 intersectingmetadata[entryindex].push(iobj)
//                 // add to duplicates list for later processing
//                 if (!duplicates[entryindex]) {
//                     duplicates[entryindex] = []
//                     duplicates[entryindex].push(intersectingmetadata[entryindex][0])
//                 }
//                 duplicates[entryindex].push(iobj)
//             }
//         }

//         intersectionsptr++

//     }

//     // console.log('scrollingviewportforward, duplicates',scrollingviewportforward, {...duplicates})

//     // console.log('headintersectionindexes, tailintersectionindexes, intersections, intersectingmetadata',
//     //     headintersectionindexes, tailintersectionindexes, intersections, intersectingmetadata)

//     // resolve duplicates. For uneven number, keep the most recent
//     // otherwise delete them; they cancel each other out.
//     // duplicate items occur with rapid back and forth scrolling
//     // an even number of items cancel out; for an odd number the most recent is valid
//     if (Object.keys(duplicates).length) { // > 0) { // there are duplicates to process

//         const intersectionsdelete = []

//         for (let duplicateindex in duplicates) {

//             const duplicatemetadatalist = duplicates[duplicateindex]

//             // replace duplicates array in interesting with selected iobj
//             // if (duplicatemetadatalist.length % 2) { // uneven; keep one
//                 // duplicatemetadatalist.sort(duplicatecomparebytime)
//                 const iobj = duplicatemetadatalist.slice(duplicatemetadatalist.length -1,1)
//                 intersectingmetadata[iobj.index] = iobj // replace any array with the metadata object
//             // } else { // remove the entry
//             //     delete intersectingmetadata[duplicatemetadatalist[0].index]
//             // }
//             for (let entrymetadata of duplicatemetadatalist) {
//                 let itemptr = entrymetadata.itemptr
//                 if (itemptr !== undefined) { // TODO: shouldn't happen
//                     intersectionsdelete.push(itemptr)
//                 }
//             }
//         }
//         // filter out deleted head and tail items
//         if (intersectionsdelete.length) {
//             shiftingindexes = shiftingindexes.filter((value, index) => {
//                 return !intersectionsdelete.includes(index)
//             })
//         }
//     }

//     shiftingindexes.sort(indexcompare)

//     shiftingintersections.sort(entrycompare)

//     // --------------------------[ ready to process! ]-----------------------------

//     // set reference points in relation to the axis
//     const referenceindex = shiftingindexes[shiftingindexes.length - 1]
//     // TODO referenceindex is 0 in other direction
//     let sectionptr = shiftingindexes.indexOf(referenceindex)

//     // collect notifications to main thread (filtered intersections)

//     // console.log('POINTERS scrollingviewportforward, headptr, tailptr', scrollingviewportforward,headptr, tailptr)

//     let returnindex // for return
//     // for scrollviewportbackward, moving toward head, add items to head, shift items to tail
//     // for scrollingviewportforward, moving toward tail, add items to tail, shift items to head
//     if (isScrollingviewportforward && (sectionptr >= 0)) {
//         returnindex = shiftingindexes[sectionptr]
//         let refindex = returnindex - 1

//         for (let ptr = sectionptr; ptr < shiftingindexes.length; ptr++) {

//             let index = shiftingindexes[ptr]

//             // test for continuity and consistency
//             if ((index - 1) == refindex) {// && (intersectingmetadata[index].isIntersecting == refintersecting)) {

//                 shiftingintersections.push(shiftingintersections[ptr])
//                 shiftingindexes.push(index)
//                 shiftingmetadata.push(intersectingmetadata[index])

//             } else {

//                 break

//             }

//             refindex = index
//             // refintersecting = intersectingmetadata[index].intersecting

//         }
//     }

//     // console.log('headintersectionindexes, tailintersectionindexes',headintersectionindexes, tailintersectionindexes)
//     // shiftingintersections.sort(entrycompare)

//     // this returns items to shift, according to scrollingviewportforward

//     // console.log('==> scrollingviewportforward, shiftingindexes, shiftingmetadata, shiftingintersections',
//     //     scrollingviewportforward ,shiftingindexes, shiftingmetadata, shiftingintersections)

//     return shiftingintersections 

// }

let indexcompare = (a,b) => {
    let retval = (a < b)?-1:1
    return retval
}

let entrycompare = (a,b) => {
    let retval = (parseInt(a.target.dataset.index) < parseInt(b.target.dataset.index))? -1:1
    return retval
}

let duplicatecomparebytime = (a,b) => {
    let retval = (a.time < b.time)?-1:1
}

// TODO: fix cradleActualContentCount
// A negative shift is toward the head, a positive shift is toward the tail
// called only from updateCradleContent
export const calcContentShift = ({

    shiftinginstruction,
    cradleInheritedProperties,
    cradleInternalProperties,
    cradleContent,
    cradleElements,
    viewportElement,

}) => {

    const isScrollingviewportforward = (shiftinginstruction < 0)
    // ------------------------[ initialize ]-----------------------

    const { gap,
        orientation,
        cellHeight,
        cellWidth,
        listsize,
        padding,
        runwaycount } = cradleInheritedProperties

    const axisElement = cradleElements.axisRef.current,
     headElement = cradleElements.headRef.current,
     tailElement = cradleElements.tailRef.current

    const {cradleModel:cradlecontentlist, 
        headModelComponents:headcontentlist, 
        tailModelComponents:tailcontentlist
    } = cradleContent

    const { crosscount,
        cradleRowcount,
        listRowcount,
        viewportRowcount
    } = cradleInternalProperties

    let BOD = false, EOD = false // beginning-of-data, end-of-data flags

    const cellLength = ((orientation == 'vertical')?cellHeight:cellWidth) + gap

    let viewportaxisoffset, // the pixel distance between the viewport frame and the axis, toward the head
        viewportlength

    let viewportheadgaplength = 0
    let viewporttailgaplength = 0

    if (orientation == 'vertical') {

        viewportaxisoffset = axisElement.offsetTop - viewportElement.scrollTop

    } else { // horizontal

        viewportaxisoffset = axisElement.offsetLeft - viewportElement.scrollLeft

    }

    if (!isScrollingviewportforward) { // scrollviewportbackward, toward head

        viewportheadgaplength = viewportaxisoffset

    } else {

        viewporttailgaplength = -viewportaxisoffset

    }

    // if ((viewportheadgaplength < 0) { //|| (viewportheadgaplength > viewportlength)) {

    //     viewportheadgaplength = 0 // no visible gap, or doreposition should have kicked in
        
    // }

    // -------[ 1. calculate axis's headblock overshoot item & row counts, if any ]-------
    
    // viewportvisiblegaplength is always positive
    let headovershootrowcount = (viewportheadgaplength == 0)?0:Math.floor(viewportheadgaplength/cellLength) // rows to fill viewport
    let tailovershootrowcount = (viewporttailgaplength == 0)?0:Math.floor(viewporttailgaplength/cellLength) // rows to fill viewport

    let headovershootitemcount = headovershootrowcount * crosscount
    let tailovershootitemcount = tailovershootrowcount * crosscount

    // -----------------[ 2. calculate item & row shift counts including overshoot ]-------------

    /*
        shift item count is the number of items the virtual cradle shifts, according to observer
        shift negative closer to head, shift positive closer to tail
        cradle reference is the first content item
        axis reference is the first tail item
    */
    let headaddshiftitemcount = 0, tailaddshiftitemcount = 0,
        headaddshiftrowcount = 0, tailaddshiftrowcount = 0
    if (!isScrollingviewportforward) { // viewport moves toward tail, add tail items, shift positive

        tailaddshiftitemcount = shiftinginstruction * cradleInternalProperties.crosscount //shiftingintersections.length

    } else { // scrollviewportbackward, viewport toward head, add head items, shift negative

        headaddshiftitemcount = -shiftinginstruction * cradleInternalProperties.crosscount//shiftingintersections.length

    }

    console.log('headaddshiftitemcount, tailaddshiftitemcount, headovershootitemcount, tailovershootitemcount', 
        headaddshiftitemcount, tailaddshiftitemcount, headovershootitemcount, tailovershootitemcount)

    // negative value shifted toward head; positive value shifted toward tail
    // one of the two expressions in the following line will be 0
    let axisreferenceshiftitemcount = 
        -(tailaddshiftitemcount + tailovershootitemcount) + 
        (headaddshiftitemcount + headovershootitemcount)

    let cradlereferenceshiftitemcount = axisreferenceshiftitemcount

    let cradlereferencerowshift = 
    (cradlereferenceshiftitemcount > 0) // could include partial row from shiftingintersections
        ?Math.ceil(cradlereferenceshiftitemcount/crosscount)
        :Math.floor(cradlereferenceshiftitemcount/crosscount)
    cradlereferenceshiftitemcount = Math.round(cradlereferencerowshift * crosscount)
    let axisreferencerowshift = 
    (axisreferenceshiftitemcount > 0) // could include partial row from shiftingintersections
        ?Math.ceil(axisreferenceshiftitemcount/crosscount)
        :Math.floor(axisreferenceshiftitemcount/crosscount)
    axisreferenceshiftitemcount = Math.round(axisreferencerowshift * crosscount)

    console.log('preliminary axisreferenceshiftitemcount, cradlereferenceshiftitemcount, axisreferencerowshift, cradlereferencerowshift',
        axisreferenceshiftitemcount, cradlereferenceshiftitemcount, axisreferencerowshift, cradlereferencerowshift)

    // ----------------[ 3. calc new cradle reference index and axis reference index ]-----------------

    const previouscradlereferenceindex = (cradlecontentlist[0]?.props.index || 0)
    const previouscradlerowoffset = Math.round(previouscradlereferenceindex/crosscount)
    const previousaxisreferenceindex = (tailcontentlist[0]?.props.index || 0)
    // const previousaxisreferencerowoffset = Math.round(previousaxisreferenceindex/crosscount)

    console.log('previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount',
        previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount)

    // computed shifted cradle end row, looking for overshoot
    let rowovershoot
    let computedcradleEndrowOffset = (previouscradlerowoffset + cradleRowcount + cradlereferencerowshift - 1)
    if (isScrollingviewportforward) { // scroll viewport toward tail, shift is positive, add to tail

        rowovershoot = computedcradleEndrowOffset - listRowcount // overshoot amount 

        if (rowovershoot > 0) {

            cradlereferencerowshift -= rowovershoot
            cradlereferenceshiftitemcount -= (rowovershoot * crosscount)

        }

    } else { // scroll viewport backward, scroll viewport toward head, shift is negative, add to head

        rowovershoot = previouscradlerowoffset + cradlereferencerowshift
        if (rowovershoot < 0) {

            cradlereferencerowshift -= rowovershoot // add back the overshoot
            cradlereferenceshiftitemcount -= (rowovershoot * crosscount)

        }

    }

    console.log('computedcradleEndrowOffset, cradlereferencerowshift, cradlereferenceshiftitemcount',
        computedcradleEndrowOffset, cradlereferencerowshift, cradlereferenceshiftitemcount)

    let newcradlereferenceindex = previouscradlereferenceindex + cradlereferenceshiftitemcount
    let newaxisreferenceindex = previousaxisreferenceindex + axisreferenceshiftitemcount

    console.log('newcradlereferenceindex, newaxisreferenceindex',
        newcradlereferenceindex, newaxisreferenceindex)

    if (newcradlereferenceindex < 0) {
        cradlereferenceshiftitemcount += newcradlereferenceindex
        // cradlereferencerowshift += Math.round(newcradlereferenceindex/crosscount)
        // computedcradleEndrow += Math.round(newcradlereferenceindex/crosscount)
        newcradlereferenceindex = 0
    }
    if (newaxisreferenceindex < 0) {
        axisreferenceshiftitemcount += newaxisreferenceindex
        // axisreferencerowshift += Math.round(newaxisreferenceindex/crosscount)
        newaxisreferenceindex = 0
    }

    if ((computedcradleEndrowOffset) >= (listRowcount)) {
        EOD = true
    }

    if ((previouscradlerowoffset + cradlereferencerowshift) <= 0) { // undershoot, past start of dataset
        BOD = true
    }

    // console.log('2. computedcradleEndrow,listRowcount,previouscradlerowoffset,cradlereferencerowshift','\n',
    //     computedcradleEndrow,listRowcount,previouscradlerowoffset,cradlereferencerowshift)

    // -------------[ 4. reconcile axisReferenceAdjustment and calc newaxisPosOffset ]------------------

    let axisreferenceitemshift = newaxisreferenceindex - previousaxisreferenceindex
    let cradlereferenceitemshift = newcradlereferenceindex - previouscradlereferenceindex

    const axisrowshift = axisreferencerowshift // Math.round(axisreferenceitemshift/crosscount)
    const axisposshift = axisrowshift * cellLength

    let newaxisposoffset = viewportaxisoffset + axisposshift

    // make necessary visibility adjustments

    let newaxisPosOffsetWorking = newaxisposoffset
    let axisReferenceAdjustment = 0

    if (Math.abs(newaxisposoffset) > cellLength) {

        newaxisPosOffsetWorking = (newaxisposoffset % cellLength)
        axisReferenceAdjustment = -(Math.ceil((newaxisposoffset - newaxisPosOffsetWorking) / cellLength) * crosscount)

    }

    if (newaxisPosOffsetWorking < 0) {
        newaxisPosOffsetWorking += cellLength
        axisReferenceAdjustment += crosscount 
    }

    if (axisReferenceAdjustment) {
        const axisRowAdjustment = Math.round(axisReferenceAdjustment/crosscount)
        newaxisreferenceindex += axisReferenceAdjustment
        axisreferenceitemshift += axisReferenceAdjustment

        if (!(BOD || EOD)) {
            newcradlereferenceindex += axisReferenceAdjustment
            cradlereferenceitemshift += axisReferenceAdjustment
        }
    }

    newaxisposoffset = newaxisPosOffsetWorking

    // ---------------------[ 5. return required values ]-------------------

    const partialrowfreespaces = (cradlecontentlist.length % crosscount)
    const partialrowitems = partialrowfreespaces?(crosscount - partialrowfreespaces):0
    const cradleAvailableContentCount = (cradlecontentlist.length + partialrowitems) // cradleRowcount * crosscount

    let newCradleActualContentCount = Math.min(cradleAvailableContentCount, (listsize - newcradlereferenceindex))
    let newheadcount, newtailcount, headchangecount, tailchangecount

    newheadcount = newaxisreferenceindex - newcradlereferenceindex
    newtailcount = newCradleActualContentCount - newheadcount

    // console.log('3. newheadcount, newtailcount, newaxisreferenceindex - newcradlereferenceindex,newCradleActualContentCount, BOD, EOD', '\n',
    //     newheadcount, newtailcount, newaxisreferenceindex, newcradlereferenceindex, newCradleActualContentCount,BOD, EOD)

    return [
        newcradlereferenceindex, 
        cradlereferenceitemshift, 
        newaxisreferenceindex, 
        axisreferenceitemshift, 
        newaxisposoffset, 
        newCradleActualContentCount,
        headchangecount,
        tailchangecount, 
    ]

}


// // TODO: fix cradleActualContentCount
// // A negative shift is toward the head, a positive shift is toward the tail
// // called only from updateCradleContent
// export const calcContentShifts = ({

//     cradleInheritedProperties,
//     cradleElements,
//     cradleContent,
//     cradleInternalProperties,
//     viewportElement,
//     // itemElements,
//     shiftingintersections,
//     isScrollingviewportforward,
//     // viewportInterruptProperties,

// }) => {

//     // ------------------------[ initialize ]-----------------------

//     const { gap,
//         orientation,
//         cellHeight,
//         cellWidth,
//         listsize,
//         padding,
//         runwaycount } = cradleInheritedProperties

//     const axisElement = cradleElements.axisRef.current,
//      headElement = cradleElements.headRef.current,
//      tailElement = cradleElements.tailRef.current

//     const {cradleModel:cradlecontentlist, 
//         headModelComponents:headcontentlist, 
//         tailModelComponents:tailcontentlist
//     } = cradleContent

//     const { crosscount,
//         cradleRowcount,
//         listRowcount,
//         viewportRowcount,
//         itemObserverThreshold } = cradleInternalProperties

//     let BOD = false, EOD = false // beginning-of-data, end-of-data flags

//     const cellLength = ((orientation == 'vertical')?cellHeight:cellWidth) + gap

//     let viewportaxisoffset // the pixel distance between the viewport frame and the axis, toward the head

//     // -------[ 1. calculate axis's headblock overshoot item & row counts, if any ]-------
    
//     let headblockoffset, tailblockoffset, viewportlength
//     let viewportvisiblegaplength = 0

//     if (orientation == 'vertical') {

//         viewportaxisoffset = axisElement.offsetTop - viewportElement.scrollTop
//         viewportlength = viewportElement.offsetHeight

//         // measure any gap between the cradle and the top viewport boundary
//         if (!isScrollingviewportforward) { // scrollviewportbackward, toward head

//             // if viewportaxisoffset is below the top by more than the height of 
//             // the headElment then a gap will be visible
//             viewportvisiblegaplength = viewportaxisoffset - headElement.offsetHeight

//         }

//     } else { // horizontal

//         viewportaxisoffset = axisElement.offsetLeft - viewportElement.scrollLeft
//         viewportlength = viewportElement.offsetWidth

//         if (!isScrollingviewportforward) { // scroll backward, toward head

//             viewportvisiblegaplength = viewportaxisoffset - headElement.offsetWidth

//         }

//     }

//     if ((viewportvisiblegaplength < 0) || (viewportvisiblegaplength > viewportlength)) {

//         viewportvisiblegaplength = 0 // no visible gap, or doreposition should have kicked in
        
//     }

//     // viewportvisiblegaplength is always positive
//     let overshootrowcount = (viewportvisiblegaplength == 0)?0:Math.ceil(viewportvisiblegaplength/cellLength) // rows to fill viewport

//     let overshootitemcount = overshootrowcount * crosscount

//     // -----------------[ 2. calculate item & row shift counts including overshoot ]-------------

//     /*
//         shift item count is the number of items the virtual cradle shifts, according to observer
//         shift negative closer to head, shift positive closer to tail
//         cradle reference is the first content item
//         axis reference is the first tail item
//     */
//     let headaddshiftitemcount = 0, tailaddshiftitemcount = 0,
//         headaddshiftrowcount = 0, tailaddshiftrowcount = 0
//     if (!isScrollingviewportforward) { // viewport moves toward tail, add tail items, shift positive

//         tailaddshiftitemcount = shiftingintersections.length

//     } else { // scrollviewportbackward, viewport toward head, add head items, shift negative

//         headaddshiftitemcount = shiftingintersections.length

//     }
//     // console.log('1. shiftingintersections.length, headaddshiftitemcount,tailaddshiftitemcount',
//     //     shiftingintersections.length,headaddshiftitemcount,tailaddshiftitemcount)
//     // negative value shifted toward head; positive value shofted toward tail
//     // one of the two expressions in the following line will be 0
//     let axisreferenceshiftitemcount = tailaddshiftitemcount - (headaddshiftitemcount + overshootitemcount)
//     let cradlereferenceshiftitemcount = tailaddshiftitemcount - (headaddshiftitemcount + overshootitemcount)

//     let cradlereferencerowshift = 
//     (cradlereferenceshiftitemcount > 0) // could include partial row from shiftingintersections
//         ?Math.ceil(cradlereferenceshiftitemcount/crosscount)
//         :Math.floor(cradlereferenceshiftitemcount/crosscount)
//     cradlereferenceshiftitemcount = Math.round(cradlereferencerowshift * crosscount)
//     let axisreferencerowshift = 
//     (axisreferenceshiftitemcount > 0) // could include partial row from shiftingintersections
//         ?Math.ceil(axisreferenceshiftitemcount/crosscount)
//         :Math.floor(axisreferenceshiftitemcount/crosscount)
//     axisreferenceshiftitemcount = Math.round(axisreferencerowshift * crosscount)

//     // ----------------[ 3. calc new cradle reference index and axis reference index ]-----------------

//     const previouscradlereferenceindex = (cradlecontentlist[0].props.index || 0)
//     const previouscradlerowoffset = Math.round(previouscradlereferenceindex/crosscount)
//     const previousaxisreferenceindex = (tailcontentlist[0]?.props.index || 0) // TODO:Uncaught TypeError: Cannot read property 'props' of undefined
//     // const previousaxisreferencerowoffset = Math.round(previousaxisreferenceindex/crosscount)

//     // computed shifted cradle end row, looking for overshoot
//     let rowovershoot
//     let computedcradleEndrow = (previouscradlerowoffset + cradleRowcount + cradlereferencerowshift - 1)
//     if (isScrollingviewportforward) { // scroll viewport toward tail, shift is positive, add to tail

//         rowovershoot = computedcradleEndrow - listRowcount // overshoot amount 

//         if (rowovershoot > 0) {

//             cradlereferencerowshift -= rowovershoot
//             cradlereferenceshiftitemcount -= (rowovershoot * crosscount)

//         }

//     } else { // scroll viewport backward, scroll viewport toward head, shift is negative, add to head

//         rowovershoot = previouscradlerowoffset + cradlereferencerowshift
//         if (rowovershoot < 0) {

//             cradlereferencerowshift -= rowovershoot // add back the overshoot
//             cradlereferenceshiftitemcount -= (rowovershoot * crosscount)

//         }

//     }

//     let newcradlereferenceindex = previouscradlereferenceindex + cradlereferenceshiftitemcount
//     let newaxisreferenceindex = previousaxisreferenceindex + axisreferenceshiftitemcount

//     if (newcradlereferenceindex < 0) {
//         cradlereferenceshiftitemcount += newcradlereferenceindex
//         // cradlereferencerowshift += Math.round(newcradlereferenceindex/crosscount)
//         // computedcradleEndrow += Math.round(newcradlereferenceindex/crosscount)
//         newcradlereferenceindex = 0
//     }
//     if (newaxisreferenceindex < 0) {
//         axisreferenceshiftitemcount += newaxisreferenceindex
//         // axisreferencerowshift += Math.round(newaxisreferenceindex/crosscount)
//         newaxisreferenceindex = 0
//     }

//     if ((computedcradleEndrow) >= (listRowcount)) {
//         EOD = true
//     }

//     if ((previouscradlerowoffset + cradlereferencerowshift) <= 0) { // undershoot, past start of dataset
//         BOD = true
//     }

//     // console.log('2. computedcradleEndrow,listRowcount,previouscradlerowoffset,cradlereferencerowshift','\n',
//     //     computedcradleEndrow,listRowcount,previouscradlerowoffset,cradlereferencerowshift)

//     // -------------[ 4. reconcile axisReferenceAdjustment and calc newaxisPosOffset ]------------------

//     let axisreferenceitemshift = newaxisreferenceindex - previousaxisreferenceindex
//     let cradlereferenceitemshift = newcradlereferenceindex - previouscradlereferenceindex

//     const axisrowshift = axisreferencerowshift // Math.round(axisreferenceitemshift/crosscount)
//     const axisposshift = axisrowshift * cellLength

//     let newaxisposoffset = viewportaxisoffset + axisposshift

//     // make necessary visibility adjustments

//     let newaxisPosOffsetWorking = newaxisposoffset
//     let axisReferenceAdjustment = 0

//     if (Math.abs(newaxisposoffset) > cellLength) {

//         newaxisPosOffsetWorking = (newaxisposoffset % cellLength)
//         axisReferenceAdjustment = -(Math.ceil((newaxisposoffset - newaxisPosOffsetWorking) / cellLength) * crosscount)

//     }

//     if (newaxisPosOffsetWorking < 0) {
//         newaxisPosOffsetWorking += cellLength
//         axisReferenceAdjustment += crosscount 
//     }

//     if (axisReferenceAdjustment) {
//         const axisRowAdjustment = Math.round(axisReferenceAdjustment/crosscount)
//         newaxisreferenceindex += axisReferenceAdjustment
//         axisreferenceitemshift += axisReferenceAdjustment

//         if (!(BOD || EOD)) {
//             newcradlereferenceindex += axisReferenceAdjustment
//             cradlereferenceitemshift += axisReferenceAdjustment
//         }
//     }

//     newaxisposoffset = newaxisPosOffsetWorking

//     // ---------------------[ 5. return required values ]-------------------

//     const partialrowfreespaces = (cradlecontentlist.length % crosscount)
//     const partialrowitems = partialrowfreespaces?(crosscount - partialrowfreespaces):0
//     const cradleAvailableContentCount = (cradlecontentlist.length + partialrowitems) // cradleRowcount * crosscount

//     let newCradleActualContentCount = Math.min(cradleAvailableContentCount, (listsize - newcradlereferenceindex))
//     let newheadcount, newtailcount, headchangecount, tailchangecount

//     newheadcount = newaxisreferenceindex - newcradlereferenceindex
//     newtailcount = newCradleActualContentCount - newheadcount

//     // console.log('3. newheadcount, newtailcount, newaxisreferenceindex - newcradlereferenceindex,newCradleActualContentCount, BOD, EOD', '\n',
//     //     newheadcount, newtailcount, newaxisreferenceindex, newcradlereferenceindex, newCradleActualContentCount,BOD, EOD)

//     return [
//         newcradlereferenceindex, 
//         cradlereferenceitemshift, 
//         newaxisreferenceindex, 
//         axisreferenceitemshift, 
//         newaxisposoffset, 
//         newCradleActualContentCount,
//         headchangecount,
//         tailchangecount, 
//     ]

// }

export const calcHeadAndTailChanges = ({

        cradleInheritedProperties,
        cradleInternalProperties,
        cradleContent,
        cradleshiftcount,
        isScrollingviewportforward,
        cradleFirstIndex,

    }) => {

    let listsize = cradleInheritedProperties.listsize

    let headcontent = cradleContent.headModelComponents
    let tailcontent = cradleContent.tailModelComponents

    const { crosscount, cradleRowcount } = cradleInternalProperties

    cradleshiftcount = Math.abs(cradleshiftcount) 
    const rowshiftcount = Math.ceil(cradleshiftcount/crosscount) //+ boundaryrowcount

    let headrowcount, tailrowcount
    headrowcount = Math.ceil(headcontent.length/crosscount)
    tailrowcount = Math.ceil(tailcontent.length/crosscount)

    let pendingcontentoffset // lookahead to new cradleFirstIndex

    let headchangecount, tailchangecount // the output instructions for getUICellShellList

    // anticipaate add to one end, clip from the other        
    let additemcount = 0
    let cliprowcount = 0, clipitemcount = 0

    if (isScrollingviewportforward) { // clip from head; add to tail; scroll forward tail is direction of scroll

        // adjust clipitemcount
        if ((headrowcount + rowshiftcount) > (cradleInheritedProperties.runwaycount)) {

            let rowdiff = (headrowcount + rowshiftcount) - (cradleInheritedProperties.runwaycount)
            cliprowcount = rowdiff
            clipitemcount = (cliprowcount * crosscount)

        }

        additemcount = clipitemcount // maintain constant cradle count

        pendingcontentoffset = cradleFirstIndex + clipitemcount // after clip

        let proposedtailindex = pendingcontentoffset + (cradleRowcount * crosscount) - 1 // modelcontentlist.length - 1

        // adkjust changes for list boundaries
        if ((proposedtailindex) > (listsize -1) ) {

            let diffitemcount = (proposedtailindex - (listsize -1)) // items outside range
            additemcount -= diffitemcount // adjust the addcontent accordingly
            
            let diffrows = Math.floor(diffitemcount/crosscount) // number of full rows to leave in place
            let diffrowitems = (diffrows * crosscount)  // derived number of items to leave in place

            clipitemcount -= diffrowitems // apply adjustment to netshift

            if (additemcount <=0) { // nothing to do

                additemcount = 0

            }
            if (clipitemcount <=0 ) {

                clipitemcount = 0
                
            }
        }

        headchangecount = (clipitemcount ==0)?0:-clipitemcount
        tailchangecount = additemcount

    } else { // scroll viewport backward, in direction of head; clip from tail, add to head

        let intersectionindexes = []

        // headcount will be less than minimum (runwaycount), so a shift can be accomplished[]
        if ((headrowcount - rowshiftcount) < (cradleInheritedProperties.runwaycount)) {
            // calculate clip for tail
            let rowshortfall = (cradleInheritedProperties.runwaycount) - (headrowcount - rowshiftcount)

            cliprowcount = rowshortfall
            let tailrowitemcount = (tailcontent.length % crosscount)

            if (tailrowitemcount == 0) tailrowitemcount = crosscount

            clipitemcount = tailrowitemcount
            if (tailrowcount > 1) {

                if (cliprowcount > tailrowcount) {
                    cliprowcount = tailrowcount
                }

                if (cliprowcount > 1) {
                    clipitemcount += ((cliprowcount -1) * crosscount)
                }

            }

            // compenstate with additemcount
            additemcount = (cliprowcount * crosscount)

        }

        let proposedindexoffset = cradleFirstIndex - additemcount

        if (proposedindexoffset < 0) {

            let diffitemcount = -proposedindexoffset
            let diffrows = Math.ceil(diffitemcount/crosscount) // number of full rows to leave in place
            let diffrowitems = (diffrows * crosscount)

            additemcount -= diffitemcount
            clipitemcount -= diffrowitems

            if (additemcount <= 0) {

                additemcount = 0
                
            }

            if (clipitemcount <= 0) {

                clipitemcount = 0

            }
        }

        headchangecount = additemcount
        tailchangecount = (clipitemcount == 0)?0:-clipitemcount

    }

    return [headchangecount,tailchangecount]

}

// =====================[ shared by both setCradleContent and updateCradleContent ]====================

// update content
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.
export const getUICellShellList = ({ 

        cradleInheritedProperties,
        cradleInternalProperties,
        cradleActualContentCount,
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
    bottomconstraint = (cradleFirstIndex - headchangecount) + (cradleActualContentCount + 1) // TODO: validate "+1"

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
        // observer = {observer}
        callbacks = {callbacks}
        getItem = {getItem}
        listsize = {listsize}
        placeholder = { placeholder }
        instanceID = {instanceID}
        scrollerName = { scrollerName }
        scrollerID = { scrollerID }
    />    

}

