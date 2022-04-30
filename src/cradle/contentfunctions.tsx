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
        // padding,
        runwaycount 
    } = cradleInheritedProperties

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

        viewportheadgaplength = -(viewportaxisoffset - cellLength)

    } else {

        viewporttailgaplength = -viewportaxisoffset

    }

    console.log('1. cellLength, viewportaxisoffset, viewportheadgaplength, viewporttailgaplength',
        cellLength, viewportaxisoffset, viewportheadgaplength, viewporttailgaplength)

    // -------[ 1. calculate the axis overshoot item & row counts, if any ]-------
    
    // overshoot lengths are always positive
    let headovershootrowcount = Math.floor(viewportheadgaplength/cellLength)
    let tailovershootrowcount = Math.floor(viewporttailgaplength/cellLength)

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

        tailaddshiftitemcount = shiftinginstruction * crosscount //shiftingintersections.length

    } else { // scrollviewportbackward, viewport toward head, add head items, shift negative

        headaddshiftitemcount = -shiftinginstruction * crosscount//shiftingintersections.length

    }

    console.log('2.a headaddshiftitemcount, tailaddshiftitemcount', 
        headaddshiftitemcount, tailaddshiftitemcount)

    console.log('2.b headovershootrowcount, headovershootitemcount, tailovershootrowcount, tailovershootitemcount', 
        headovershootrowcount, headovershootitemcount, tailovershootrowcount, tailovershootitemcount)

    // negative value shifted toward head; positive value shifted toward tail
    // one of the two expressions in the following line will be 0
    let axisreferenceshiftitemcount = 
        -(tailaddshiftitemcount - tailovershootitemcount) + 
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

    console.log('3. preliminary axisreferenceshiftitemcount, cradlereferenceshiftitemcount, axisreferencerowshift, cradlereferencerowshift',
        axisreferenceshiftitemcount, cradlereferenceshiftitemcount, axisreferencerowshift, cradlereferencerowshift)

    // ----------------[ 3. calc new cradle reference index and axis reference index ]-----------------

    const previouscradlereferenceindex = (cradlecontentlist[0]?.props.index || 0)
    const previouscradlerowoffset = Math.round(previouscradlereferenceindex/crosscount)
    const previousaxisreferenceindex = (tailcontentlist[0]?.props.index || 0)
    // const previousaxisreferencerowoffset = Math.round(previousaxisreferenceindex/crosscount)

    console.log('4. previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount',
        previouscradlereferenceindex, previouscradlerowoffset, previousaxisreferenceindex, cradleRowcount, listRowcount)

    // computed shifted cradle end row, looking for overshoot
    let rowovershoot
    let computedNextCradleEndrowOffset = (previouscradlerowoffset + cradleRowcount + cradlereferencerowshift - 1)
    if (isScrollingviewportforward) { // scroll viewport toward tail, shift is positive, add to tail

        rowovershoot = Math.max(0,computedNextCradleEndrowOffset - listRowcount) // overshoot amount 

    } else { // scroll viewport backward, scroll viewport toward head, shift is negative, add to head

        rowovershoot = Math.min(0,previouscradlerowoffset + cradlereferencerowshift)

    }

    if (rowovershoot) {
        cradlereferencerowshift -= rowovershoot
        cradlereferenceshiftitemcount -= (rowovershoot * crosscount)
    }

    console.log('5. rowovershoot, computedNextCradleEndrowOffset, cradlereferencerowshift, cradlereferenceshiftitemcount',
        rowovershoot,computedNextCradleEndrowOffset, cradlereferencerowshift, cradlereferenceshiftitemcount)

    let proposedcradlereferenceindex = previouscradlereferenceindex + cradlereferenceshiftitemcount
    let proposedaxisreferenceindex = previousaxisreferenceindex + axisreferenceshiftitemcount

    console.log('6. proposedcradlereferenceindex, proposedaxisreferenceindex',
        proposedcradlereferenceindex, proposedaxisreferenceindex)

    const runwayrows = (proposedaxisreferenceindex - proposedcradlereferenceindex)/crosscount
    if ((runwayrows) < runwaycount) {
        const diff = runwaycount - runwayrows
        proposedcradlereferenceindex -= (diff * crosscount)
    }

    console.log('6.b proposedcradlereferenceindex adjusted for runwaycount; runwayrows', 
        proposedcradlereferenceindex, runwayrows)

    if (proposedcradlereferenceindex < 0) {
        cradlereferenceshiftitemcount += proposedcradlereferenceindex
        cradlereferenceshiftitemcount = Math.max(0,cradlereferenceshiftitemcount)
        const x = cradlereferencerowshift
        cradlereferencerowshift = cradlereferenceshiftitemcount/crosscount
        const diff = x - cradlereferencerowshift
        proposedcradlereferenceindex = 0
        computedNextCradleEndrowOffset += diff
    }
    if (proposedaxisreferenceindex < 0) {
        axisreferenceshiftitemcount += proposedaxisreferenceindex
        axisreferencerowshift = axisreferenceshiftitemcount/crosscount
        proposedaxisreferenceindex = 0
    }
    console.log('6.c revised cradlereferenceshiftitemcount, cradlereferencerowshift, proposedcradlereferenceindex, computedNextCradleEndrowOffset',
        cradlereferenceshiftitemcount, cradlereferencerowshift, proposedcradlereferenceindex, computedNextCradleEndrowOffset)
    console.log('6.d revised axisreferenceshiftitemcount, axisreferencerowshift, proposedaxisreferenceindex',
        axisreferenceshiftitemcount, axisreferencerowshift, proposedaxisreferenceindex)

    if ((computedNextCradleEndrowOffset) >= (listRowcount)) {
        EOD = true
    }

    if ((previouscradlerowoffset + cradlereferencerowshift) <= 0) { // undershoot, past start of dataset
        BOD = true
    }

    console.log('7. EOD, BOD', EOD, BOD)

    // -------------[ 4. calculate new axis pixel position ]------------------

    const axisposshift = axisreferencerowshift * cellLength

    let newaxisposoffset = viewportaxisoffset + axisposshift

    // ---------------------[ 5. return required values ]-------------------

    const partialrowfreespaces = (cradlecontentlist.length % crosscount)
    const partialrowitems = partialrowfreespaces?(crosscount - partialrowfreespaces):0
    const cradleAvailableContentCount = (cradlecontentlist.length + partialrowitems) // cradleRowcount * crosscount

    let newCradleActualContentCount = Math.min(cradleAvailableContentCount, (listsize - proposedcradlereferenceindex))
    let newheadcount, newtailcount, headchangecount, tailchangecount

    newheadcount = proposedaxisreferenceindex - proposedcradlereferenceindex
    newtailcount = newCradleActualContentCount - newheadcount

    return [
        proposedcradlereferenceindex, 
        cradlereferenceshiftitemcount, 
        proposedaxisreferenceindex, 
        axisreferenceshiftitemcount, 
        newaxisposoffset, 
        newCradleActualContentCount,
        headchangecount,
        tailchangecount, 
    ]

}

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
        callbacks = {callbacks}
        getItem = {getItem}
        listsize = {listsize}
        placeholder = { placeholder }
        instanceID = {instanceID}
        scrollerName = { scrollerName }
        scrollerID = { scrollerID }
    />    

}

