// cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React, {useContext} from 'react'

import ItemShell from './cellshell'

import { detect } from 'detect-browser'

// import { PortalManager } from './portalmanager'

const browser = detect()

export const calcVisibleItems = ({   

        itemElementMap, 
        viewportElement, 
        cradleElements, 
        cradleProps, 
        cradleContent

    }) => {

    let headElement = cradleElements.head.current
    let spineElement = cradleElements.spine.current
    let {orientation} = cradleProps
    let headlist = cradleContent.headView

    let itemlistindexes = Array.from(itemElementMap.keys())
    itemlistindexes.sort((a,b)=>{
        return (a < b)?-1:1
    })
    let headlistindexes = []
    for (let item of headlist) {
        headlistindexes.push(parseInt(item.props.index))
    }

    let list = []
    let cradleTop = headElement.offsetTop + spineElement.offsetTop, 
        cradleLeft = headElement.offsetLeft + spineElement.offsetLeft
    let scrollblockTopOffset = -viewportElement.scrollTop, 
        scrollblockLeftOffset = -viewportElement.scrollLeft,
        viewportHeight = viewportElement.offsetHeight,
        viewportWidth = viewportElement.offsetWidth,
        viewportTopOffset = -scrollblockTopOffset,
        viewportBottomOffset = -scrollblockTopOffset + viewportHeight

    for (let index of itemlistindexes) {

        let element = itemElementMap.get(index).current
        let inheadlist = headlistindexes.includes(index)
        let top = inheadlist?(element.offsetTop):(((orientation == 'vertical')?headElement.offsetHeight:0) + element.offsetTop), 
            left = inheadlist?(element.offsetLeft):(((orientation == 'horizontal')?headElement.offsetWidth:0) + element.offsetLeft), 
            width = element.offsetWidth, 
            height = element.offsetHeight,
            right = left + width,
            bottom = top + height

        let itemTopOffset = scrollblockTopOffset + cradleTop + top, // offset from top of viewport
            itemBottomOffset = scrollblockTopOffset + cradleTop + bottom, // offset from top of viewport
            itemLeftOffset = scrollblockLeftOffset + cradleLeft + left, 
            itemRightOffset = scrollblockLeftOffset + cradleLeft + right 


        let isVisible = false // default

        let topPortion,
            bottomPortion,
            leftPortion,
            rightPortion

        if ((itemTopOffset < 0) && (itemBottomOffset > 0)) {

            (orientation == 'vertical') && (isVisible = true)
            bottomPortion = itemBottomOffset
            topPortion = bottomPortion - height

        } else if ((itemTopOffset >= 0) && (itemBottomOffset < viewportHeight)) {

            (orientation == 'vertical') && (isVisible = true)
            topPortion = height
            bottomPortion = 0

        } else if ((itemTopOffset > 0) && ((itemTopOffset - viewportHeight) < 0)) {

            (orientation == 'vertical') && (isVisible = true)
            topPortion = viewportHeight - itemTopOffset
            bottomPortion = topPortion - height

        } else {

            if (orientation == 'vertical') continue

        }

        if (itemLeftOffset < 0 && itemRightOffset > 0) {

            (orientation == 'horizontal') && (isVisible = true)
            rightPortion = itemRightOffset
            leftPortion = rightPortion - width

        } else if (itemLeftOffset >= 0 && itemRightOffset < viewportWidth) {

            (orientation == 'horizontal') && (isVisible = true)
            leftPortion = width
            rightPortion = 0

        } else if (itemLeftOffset > 0 && (itemLeftOffset - viewportWidth) < 0) {

            (orientation == 'horizontal') && (isVisible = true)
            leftPortion = viewportWidth - itemLeftOffset
            rightPortion = leftPortion - width

        } else {

            if (orientation == 'horizontal') continue

        }

        let verticalRatio = (topPortion > 0)?topPortion/height:bottomPortion/height,
            horizontalRatio = (leftPortion > 0)?leftPortion/width:rightPortion/height

        let itemData = {

            index,
            isVisible,

            top,
            right,
            bottom,
            left,
            width,
            height,

            itemTopOffset,
            itemBottomOffset,
            topPortion,
            bottomPortion,

            itemLeftOffset,
            itemRightOffset,
            leftPortion,
            rightPortion,

            verticalRatio,
            horizontalRatio,
            
        }

        list.push(itemData)

    }

    return list
}

export const getScrollReferenceIndexData = ({

        viewportData,
        cradleProps,
        cradleConfig,

    }) => {

    let {crosscount} = cradleConfig
    let viewportElement = viewportData.elementref.current
    let {orientation, listsize} = cradleProps
    let scrollPos, cellLength
    if (orientation == 'vertical') {

        scrollPos = viewportElement.scrollTop
        cellLength = cradleProps.cellHeight + cradleProps.gap

    } else {

        scrollPos = viewportElement.scrollLeft
        cellLength = cradleProps.cellWidth + cradleProps.gap

    }

    let referencescrolloffset = cellLength - (scrollPos % cellLength)
    if (referencescrolloffset == (cellLength + cradleProps.padding)) {
        referencescrolloffset = 0
    }

    let referencerowindex = Math.ceil((scrollPos - cradleProps.padding)/cellLength)
    let spineReferenceIndex = referencerowindex * crosscount
    spineReferenceIndex = Math.min(spineReferenceIndex,listsize - 1)
    let diff = spineReferenceIndex % crosscount
    spineReferenceIndex -= diff

    let referenceIndexData = {
        index:spineReferenceIndex,
        spineoffset:referencescrolloffset
    }

    if (referenceIndexData.index == 0) referenceIndexData.spineoffset = 0 // defensive

    return referenceIndexData
}

export const getContentListRequirements = ({ // called from setCradleContent only

        cradleProps,
        cradleConfig,
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
        listsize} = cradleProps

    let {crosscount,
        cradleRowcount,
        viewportRowcount} = cradleConfig
    // reconcile spineReferenceIndex to crosscount context
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

    let contentCount = cradleRowcount * crosscount 

    // -----------------------[ calc leadingitemcount, referenceoffset ]-----------------------

    let runwayitemcount = runwaycount * crosscount
    runwayitemcount = Math.min(runwayitemcount, referenceoffset) // for list head

    // -----------------------[ calc cradleReferenceIndex ]------------------------
    // leading edge
    let cradleReferenceIndex = referenceoffset - runwayitemcount

    // ------------[ adjust cradleReferenceIndex for underflow ]------------

    diff = 0 // reset
    let indexshift = 0 // adjustment if overshoot head
    if (cradleReferenceIndex < 0) {
        diff = cradleReferenceIndex
        indexshift = Math.floor(cradleReferenceIndex / crosscount) * crosscount
        cradleReferenceIndex += indexshift
    }

    // ------------[ adjust cradleReferenceIndex and contentCount for listsize overflow ]------------

    let spineOffset = targetViewportOffset % cellLength

    // if (spineOffset < 0) { // TODO: this shouldn't happen - reproduce from wide botton to narrow
    //     spineOffset += (orientation == 'vertical'?cellHeight:cellWidth)
    //     referenceoffset += crosscount
    //     cradleReferenceIndex += crosscount
    // }

    // --------------------[ calc css positioning ]-----------------------

    let targetrowoffset = Math.ceil(referenceoffset/crosscount)
    let scrollblockoffset = (targetrowoffset * cellLength) + padding // gap
    let spineadjustment

    if (targetrowoffset == 0) {
        scrollblockoffset = 0
        spineOffset = 0 // padding
        spineadjustment = padding
    } else {
        spineadjustment = 0; //gap;

        [cradleReferenceIndex, contentCount, referenceoffset, scrollblockoffset, spineOffset] = adjustSpineOffsetForMaxRefindex({
            referenceoffset,
            spineOffset,
            scrollblockoffset,            
            targetrowoffset,
            viewportlength,
            listsize,
            viewportrows,
            crosscount,
            cellLength,
            padding,
            gap,
            cradleReferenceIndex,
            contentCount,
        })
    }

    // debugger

    // console.log('cradleReferenceIndex, referenceoffset, contentCount, scrollblockoffset, spineOffset, spineadjustment',
    //     cradleReferenceIndex, referenceoffset, contentCount, scrollblockoffset, spineOffset, spineadjustment)

    return {cradleReferenceIndex, referenceoffset, contentCount, scrollblockoffset, spineOffset, spineadjustment} // summarize requirements message

}

const adjustSpineOffsetForMaxRefindex = ({

    listsize,
    crosscount,
    contentCount,

    cradleReferenceIndex,
    referenceoffset,
    targetrowoffset,

    scrollblockoffset,
    spineOffset,

    viewportlength,
    viewportrows,

    cellLength,
    padding,
    gap,

}) => {

    // debugger

    let activelistitemcount = cradleReferenceIndex + contentCount
    let activelistrowcount = Math.ceil(activelistitemcount/crosscount)
    let listRowcount = Math.ceil(listsize/crosscount)

    // memos
    // let originalcradleoffset = cradleReferenceIndex
    // let originalreferenceoffset = referenceoffset
    // let originalspineOffset = spineOffset

    if (activelistrowcount > listRowcount) {
        let diffrows = activelistrowcount - listRowcount
        let diff = diffrows * crosscount
        cradleReferenceIndex -= diff
        activelistrowcount -= diffrows
        // console.log('adjusting cradleReferemcicradlereference original, adjustment, rows, items, result', 
        //     originalcradleoffset, diff, diffrows, cradleReferenceIndex)
    }

    // let testlistrowcount = Math.ceil((cradleReferenceIndex + contentCount + 1)/crosscount)
    if (activelistrowcount == listRowcount) {
        let diff = listsize % crosscount
        if (diff) {
            contentCount -= (crosscount - diff)
        }
        // console.log('final row adjustment through activelistrowcount, listRowcount, listsize, contentCount, crosscount, diff',
        // activelistrowcount, listRowcount, listsize, contentCount, crosscount, diff)
    }

    let maxrefindexrowoffset = Math.ceil(listsize/crosscount) - viewportrows + 1
    // console.log('targetrowoffset, maxrefindexrowoffset', targetrowoffset, maxrefindexrowoffset)
    if (targetrowoffset > maxrefindexrowoffset) {

        let diff = targetrowoffset - maxrefindexrowoffset
        targetrowoffset -= diff // maxrefindexrowoffset
        // cradleReferenceIndex -= (diff * crosscount)

        referenceoffset = (targetrowoffset * crosscount)

        scrollblockoffset = (targetrowoffset * cellLength) + padding

        spineOffset = viewportlength - ((viewportrows - 1) * cellLength) - gap

        // console.log('targetrow adjustment: targetrowoffset, cradleReferenceIndex, referenceoffset, scrollblockoffset, spineOffset',
        //     targetrowoffset, cradleReferenceIndex, referenceoffset, scrollblockoffset, spineOffset)

    }

    // debugger

    return [cradleReferenceIndex, contentCount, referenceoffset, scrollblockoffset, spineOffset]

}

// filter out items that not proximate to the spine
export const isolateRelevantIntersections = ({
    intersections,
    cradleContent,
    itemObserverThreshold,
    scrollforward,
}) => {

    let headcontent = cradleContent.headModel
    let tailcontent = cradleContent.tailModel

    let headindexes = [], 
        tailindexes = [],
        headintersectionindexes = [],
        headintersections = [],
        tailintersectionindexes = [],
        tailintersections = [],
        intersecting:any = {},
        filteredintersections = []

    // collect lists of indexes...
    // headindexes, tailindexes
    for (let component of headcontent) {
        headindexes.push(component.props.index)
    }

    for (let component of tailcontent) {
        tailindexes.push(component.props.index)
    }

    let duplicates:any = {}
    let intersectionsptr = 0
    for (let entry of intersections) {

        let index = parseInt(entry.target.dataset.index)
        let headptr, tailptr
        if (tailindexes.includes(index)) {

            tailintersectionindexes.push(index)
            tailintersections.push(entry)
            tailptr = tailintersections.length - 1 // used for duplicate resolution

        } else if (headindexes.includes(index)) {

            headintersectionindexes.push(index)
            headintersections.push(entry)
            headptr = headintersections.length - 1 // used for duplicate resolution

        } else {

            console.log('error: unknown intersection element, aborting isolateRelevantIntersections',entry)
            return // shouldn't happen; give up

        }

        let ratio
        if (browser && browser.name == 'safari') {
            ratio = entry.intersectionRatio
        } else {
            ratio = Math.round(entry.intersectionRatio * 1000)/1000
        }

        let calcintersecting = (ratio >= itemObserverThreshold)
        let iobj = {
            index,
            intersecting:calcintersecting,  // to accommodate browser differences
            isIntersecting:entry.isIntersecting,
            ratio,
            originalratio:entry.intersectionRatio,
            time:entry.time,
            headptr,
            tailptr,
            intersectionsptr,
        }
        if (!intersecting[index]) { // new item
            intersecting[index] = iobj
        } else { // duplicate item
            if (!Array.isArray(intersecting[index])) {
                let arr = [intersecting[index]]
                intersecting[index] = arr
            }
            intersecting[index].push(iobj)
            if (!duplicates[index]) {
                duplicates[index] = []
                duplicates[index].push(intersecting[index][0])
            }
            duplicates[index].push(iobj)
        }
        intersectionsptr++

    }
    // resolve duplicates. For uneven number, keep the most recent
    // otherwise delete them, they cancel each other out.

    let duplicateslength = Object.keys(duplicates).length
    if (duplicateslength > 0) {
        // console.log('DUPLICATES found', duplicateslength, duplicates)
        let headintersectionsdelete = [],
            tailintersectionsdelete = []

        for (let duplicateindex in duplicates) {

            let duplicate = duplicates[duplicateindex]

            if (duplicate.length % 2) {
                duplicate.sort(duplicatecompare)
                let entry = duplicate.slice(duplicate.length -1,1)
                intersecting[entry.index] = entry
            } else {
                delete intersecting[duplicate[0].index]
                // intersectingdelete.push(duplicate[0].index)
            }
            for (let entryobj of duplicate) {
                let headptr = entryobj.headptr
                let tailptr = entryobj.tailptr
                if (headptr !== undefined) {
                    headintersectionsdelete.push(headptr)
                }
                if (tailptr !== undefined) {
                    tailintersectionsdelete.push(tailptr)
                }
            }
        }
        if (headintersectionsdelete.length) {
            headintersectionindexes = headintersectionindexes.filter((value, index) => {
                return !headintersectionsdelete.includes(index)
            })
            headintersections = headintersections.filter((value, index) => {
                return !headintersectionsdelete.includes(index)
            })
        }
        if (tailintersectionsdelete.length) {
            tailintersectionindexes = tailintersectionindexes.filter((value, index) => {
                return !tailintersectionsdelete.includes(index)
            })
            tailintersections = tailintersections.filter((value, index) => {
                return !tailintersectionsdelete.includes(index)
            })
        }
    }

    headintersectionindexes.sort(indexcompare)
    tailintersectionindexes.sort(indexcompare)

    headintersections.sort(entrycompare)
    tailintersections.sort(entrycompare)

    // set reference points in relation to the spine
    let headindex = headindexes[headindexes.length - 1]
    let tailindex = tailindexes[0]
    let headptr = headintersectionindexes.indexOf(headindex)
    let tailptr = tailintersectionindexes.indexOf(tailindex)

    // filter out items that register only because they have just been moved
    if (headptr !== (headintersectionindexes.length - 1)) { 
        headptr = -1
    }

    if (tailptr !==0) { 
        tailptr = -1
    }
    if ((headptr > -1) && (tailptr > -1)) { // edge case

        if (scrollforward) {
            headptr = -1
        } else {
            tailptr = -1
        }

    }

    // collect notifications to main thread (filtered intersections)
    // for scrollbackward
    let headrefindex, tailrefindex // for return
    if (!scrollforward && (headptr >= 0)) {
        headrefindex = headintersectionindexes[headptr]
        let refindex = headrefindex + 1
        let refintersecting = intersecting[refindex - 1].intersecting

        for (let ptr = headptr; ptr >= 0; ptr--) {

            let index = headintersectionindexes[ptr]

            // test for continuity and consistency
            if (((index + 1) == refindex) && (intersecting[index].intersecting == refintersecting)) {

                filteredintersections.push(headintersections[ptr])

            } else {

                break

            }

            refindex = index
            refintersecting = intersecting[refindex].intersecting

        }
    }
    // for scrollforward
    if (scrollforward && (tailptr >= 0)) {
        tailrefindex = tailintersectionindexes[tailptr]
        let refindex = tailrefindex - 1
        let refintersecting = intersecting[refindex + 1].intersecting

        for (let ptr = tailptr; ptr < tailintersectionindexes.length; ptr++) {

            let index = tailintersectionindexes[ptr]

            // test for continuity and consistency
            if (((index - 1) == refindex) && (intersecting[index].intersecting == refintersecting)) {

                filteredintersections.push(tailintersections[ptr])

            } else {

                break

            }

            refindex = index
            refintersecting = intersecting[index].intersecting

        }
    }

    filteredintersections.sort(entrycompare) // TODO this should be integrated into the code above

    return filteredintersections 

}

let indexcompare = (a,b) => {
    let retval = (a < b)?-1:1
    return retval
}

let entrycompare = (a,b) => {
    let retval = (parseInt(a.target.dataset.index) < parseInt(b.target.dataset.index))? -1:1
    return retval
}

let duplicatecompare = (a,b) => {
    let retval = (a.time < b.time)?-1:1
}

export const calcContentShifts = ({ // called only from updateCradleContent
    cradleProps,
    cradleElements,
    cradleContent,
    cradleConfig,
    viewportElement,
    itemElements,
    intersections,
    scrollforward,
    // source,
}) => {

    // ------------------------[ initialize ]--------------

    let { gap,
        orientation,
        cellHeight,
        cellWidth,
        listsize,
        padding,
        runwaycount } = cradleProps

    let spineElement = cradleElements.spine.current
    let headElement = cradleElements.head.current
    let tailElement = cradleElements.tail.current

    let cradlecontentlist = cradleContent.cradleModel
    let headcontentlist = cradleContent.headModel
    let tailcontentlist = cradleContent.tailModel

    let { crosscount,
        cradleRowcount,
        listRowcount,
        viewportRowcount,
        itemObserverThreshold } = cradleConfig

    let BOD = false, EOD = false // beginning-of-data, end-of-data

    // -------[ 1. calculate head overshoot row count, if any ]-------
    
    let startingspineoffset, headblockoffset, tailblockoffset, viewportlength
    let viewportvisiblegaplength = 0

    let cellLength = (orientation == 'vertical')?cellHeight + gap:cellWidth + gap

    if (orientation == 'vertical') {

        startingspineoffset = spineElement.offsetTop - viewportElement.scrollTop
        viewportlength = viewportElement.offsetHeight

        // measure any gap between the cradle and the top viewport boundary
        if (!scrollforward) {

            // if startingspineoffset is below the top by more than the height of the headElment then a gap will be visible
            viewportvisiblegaplength = startingspineoffset - headElement.offsetHeight

        }

    } else { // horizontal

        startingspineoffset = spineElement.offsetLeft - viewportElement.scrollLeft
        viewportlength = viewportElement.offsetWidth

        if (!scrollforward) {

            viewportvisiblegaplength = startingspineoffset - headElement.offsetWidth

        }
    }

    if ((viewportvisiblegaplength < 0) || (viewportvisiblegaplength > viewportlength)) viewportvisiblegaplength = 0 // no visible gap, or reposition should have kicked in

    // viewportvisiblegaplength is always positive
    let overshootrowcount = (viewportvisiblegaplength == 0)?0:Math.ceil(viewportvisiblegaplength/cellLength) // rows to fill viewport

    // extra rows for runway
    if (overshootrowcount) {
        overshootrowcount += runwaycount
    }

    let overshootitemcount = overshootrowcount * crosscount

    if (overshootitemcount) {// (!scrollforward && overshootitemcount) { // negation of values for scroll backward
        overshootitemcount = -overshootitemcount
        overshootrowcount = -overshootrowcount
    }

    // ----------------------[ 2. calculate itemshiftcount includng overshoot ]------------------------
    // shift item count is the number of items the virtual cradle shifts, according to observer notices

    let forwardcount = 0, backwardcount = 0
    if (scrollforward) {

        backwardcount = intersections.length

    } else {

        forwardcount = intersections.length

    }

    let cradleshiftcount = backwardcount - forwardcount + overshootitemcount
    let referenceshiftcount = cradleshiftcount

    let cradlerowshift = Math.ceil(cradleshiftcount/crosscount)
    let referencerowshift = cradlerowshift

    // --------------------------[ 3. calc cradleindex and referenceindex ]--------------------------

    let previouscradleindex = cradlecontentlist[0].props.index
    let previouscradlerowoffset = previouscradleindex/crosscount
    let previousreferenceindex = tailcontentlist[0]?.props.index // TODO:Uncaught TypeError: Cannot read property 'props' of undefined
    let previousreferencerowoffset = previousreferenceindex/crosscount

    let diff 
    if (scrollforward) {

        if ((previouscradlerowoffset + cradleRowcount + cradlerowshift) >= (listRowcount)) {
            EOD = true
        }

        diff = (previouscradlerowoffset + cradleRowcount + cradlerowshift) - (listRowcount)

        if (diff > 0) {

            cradlerowshift -= diff
            cradleshiftcount -= (diff * crosscount)

        }

    } else {

        if ((previouscradlerowoffset + cradlerowshift) <= 0) {
            BOD = true
        }
        diff = previouscradlerowoffset + cradlerowshift
        if (diff < 0) {

            cradlerowshift -= diff
            cradleshiftcount -= (diff * crosscount)

        }

    }

    let newcradleindex = previouscradleindex + cradleshiftcount
    let newreferenceindex = previousreferenceindex + referenceshiftcount

    if (newreferenceindex < 0) {
        referenceshiftcount += newreferenceindex
        newreferenceindex = 0
    }

    // -------------[ 4. calculate spineAdjustment and spineOffset ]------------------

    let referenceitemshiftcount = newreferenceindex - previousreferenceindex
    let cradleitemshiftcount = newcradleindex - previouscradleindex

    referencerowshift = referenceitemshiftcount/crosscount
    let referencepixelshift = referencerowshift * cellLength

    let spineOffset = startingspineoffset + referencepixelshift

    let spineOffsetTarget = spineOffset
    let spineAdjustment = 0

    if (Math.abs(spineOffset) > cellLength) {

        spineOffsetTarget = (spineOffset % cellLength)
        spineAdjustment = -(Math.ceil((spineOffset - spineOffsetTarget) / cellLength) * crosscount)

    }

    if (spineOffsetTarget < 0) {
        spineOffsetTarget += cellLength
        spineAdjustment += crosscount 
    }

    if (spineAdjustment && (BOD || EOD)) {

        newreferenceindex += spineAdjustment
        referenceitemshiftcount += spineAdjustment
        spineOffset = spineOffsetTarget

    } else if (spineAdjustment) {

        newcradleindex += spineAdjustment
        cradleitemshiftcount += spineAdjustment
        newreferenceindex += spineAdjustment
        referenceitemshiftcount += spineAdjustment
        spineOffset = spineOffsetTarget
    }

    spineOffset = spineOffsetTarget

    // ---------------------[ 5. return required values ]-------------------

    let cradleitemcount = cradleRowcount * crosscount

    return [ newcradleindex, cradleitemshiftcount, newreferenceindex, referenceitemshiftcount, spineOffset, cradleitemcount ]

}

export const calcHeadAndTailChanges = ({

        cradleProps,
        cradleConfig,
        cradleContent,
        cradleshiftcount,
        scrollforward,
        cradleReferenceIndex,

    }) => {

    let listsize = cradleProps.listsize

    let headcontent = cradleContent.headModel
    let tailcontent = cradleContent.tailModel

    let { crosscount,
    cradleRowcount } = cradleConfig

    cradleshiftcount = Math.abs(cradleshiftcount) 
    let rowshiftcount = Math.ceil(cradleshiftcount/crosscount) //+ boundaryrowcount

    let headrowcount, tailrowcount
    headrowcount = Math.ceil(headcontent.length/crosscount)
    tailrowcount = Math.ceil(tailcontent.length/crosscount)

    let pendingcontentoffset // lookahead to new cradleReferenceIndex

    let headchangecount, tailchangecount // the output instructions for getUIContentList

    // anticipaate add to one end, clip from the other        
    let additemcount = 0
    let cliprowcount = 0, clipitemcount = 0

    if (scrollforward) { // clip from head; add to tail; scroll forward head is direction of scroll

        // adjust clipitemcount
        if ((headrowcount + rowshiftcount) > (cradleProps.runwaycount)) {

            let rowdiff = (headrowcount + rowshiftcount) - (cradleProps.runwaycount)
            cliprowcount = rowdiff
            clipitemcount = (cliprowcount * crosscount)

        }

        additemcount = clipitemcount // maintain constant cradle count

        pendingcontentoffset = cradleReferenceIndex + clipitemcount // after clip

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

        headchangecount = -clipitemcount
        tailchangecount = additemcount

    } else { // scroll backward, in direction of tail; clip from tail, add to head

        let intersectionindexes = []

        // headcount will be less than minimum (runwaycount), so a shift can be accomplished[]
        if ((headrowcount - rowshiftcount) < (cradleProps.runwaycount)) {
            // calculate clip for tail
            let rowshortfall = (cradleProps.runwaycount) - (headrowcount - rowshiftcount)

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

        let proposedindexoffset = cradleReferenceIndex - additemcount

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
        tailchangecount = -clipitemcount

    }
    return [headchangecount,tailchangecount]

}

// update content
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.
export const getUIContentList = ({ 

        cradleProps,
        cradleConfig,
        contentCount,
        cradleReferenceIndex, 
        headchangecount, 
        tailchangecount, 
        localContentList:contentlist,
        callbacks,
        observer,
        instanceIdCounterRef,
    }) => {

    let { crosscount,
        cradleRowcount } = cradleConfig

    let localContentlist = [...contentlist]
    let tailindexoffset = cradleReferenceIndex + contentlist.length
    // let headindexoffset = cradleReferenceIndex
    let returnContentlist

    let headContentlist = []

    let topconstraint = cradleReferenceIndex - headchangecount,
    bottomconstraint = (cradleReferenceIndex - headchangecount) + (contentCount + 1) // TODO: validate "+1"

    let deletedtailitems = [], deletedheaditems = []
    // console.log('topconstraint, bottomconstraint, cradleReferenceIndex, contentCount, headchangecount, tailchangecount', 
    //     topconstraint, bottomconstraint, cradleReferenceIndex, contentCount, headchangecount, tailchangecount)

    if (headchangecount >= 0) {

        for (let index = cradleReferenceIndex - headchangecount; index < (cradleReferenceIndex); index++) {

            if (!((index >= topconstraint) && (index <= bottomconstraint))) {
                continue
            }
            headContentlist.push(
                acquireItem(
                    {
                        index, 
                        cradleProps,
                        observer, 
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
                        cradleProps,
                        observer, 
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

    returnContentlist = headContentlist.concat(localContentlist,tailContentlist)

    // console.log('components of getcontentlist: returnContentList, headContentlist, localContentlist, tailContentlist', 
    //     returnContentlist, headContentlist, localContentlist, tailContentlist)

    return [returnContentlist,deleteditems]
}

// butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        spineReferenceIndex, // first tail item

    }
) => {

    let offsetindex = contentlist[0]?.props.index // TODO: Cannot read property 'props' of undefined

    let headitemcount

    headitemcount = (spineReferenceIndex - offsetindex)

    let headlist = contentlist.slice(0,headitemcount)
    let taillist = contentlist.slice(headitemcount)

    return [headlist,taillist]

}

const acquireItem = ({
    index, 
    cradleProps,
    observer, 
    callbacks, 
    instanceIdCounterRef,

}) => {
    let instanceID = instanceIdCounterRef.current++

    return emitItem({
        index, 
        cradleProps,
        observer, 
        callbacks, 
        instanceID,
    })
}

const emitItem = ({
    index, 
    cradleProps,
    observer, 
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
        scrollerID } = cradleProps

    return <ItemShell
        key = {index} 
        orientation = {orientation}
        cellHeight = { cellHeight }
        cellWidth = { cellWidth }
        index = {index}
        observer = {observer}
        callbacks = {callbacks}
        getItem = {getItem}
        listsize = {listsize}
        placeholder = { placeholder }
        instanceID = {instanceID}
        scrollerName = { scrollerName }
        scrollerID = { scrollerID }
    />    

}

export const deleteAndResetPortals = (portalManager, scrollerID, deleteList) => {

    for (let item of deleteList) {
        portalManager.deletePortalListItem(scrollerID, item.props.index)
    }
    if (deleteList.length) portalManager.renderPortalList(scrollerID)
}
// ========================================================================================
// ------------------------------------[ styles ]------------------------------------------
// ========================================================================================

export const setCradleGridStyles = ({

    orientation, 
    headCradleStyles:headstylesobject, 
    tailCradleStyles:tailstylesobject,
    cellHeight, 
    cellWidth, 
    gap,
    padding, 
    crosscount, 
    viewportheight, 
    viewportwidth

}) => {

        // console.log('setCradleGridStyles orientation, crosscount',orientation, crosscount)
        // if (orientation == 'horizontal') crosscount = 8

        let headstyles = {...headstylesobject} as React.CSSProperties
        let tailstyles = {...tailstylesobject} as React.CSSProperties

        headstyles.gridGap = gap + 'px'

        tailstyles.gridGap = gap + 'px'

        if (orientation == 'horizontal') {

            headstyles.padding = `${padding}px 0 ${padding}px ${padding}px`

            headstyles.width = 'auto'
            headstyles.height = '100%'
            headstyles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            headstyles.gridTemplateRows = cellHeight?`repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:'auto'
            // headstyles.gridTemplateRows = cellHeight?`repeat(auto-fit, minmax(${cellHeight}px, 1fr))`:'auto'
            headstyles.gridTemplateColumns = 'none'

            tailstyles.padding = `${padding}px ${padding}px ${padding}px 0`

            tailstyles.width = 'auto'
            tailstyles.height = '100%'
            tailstyles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            tailstyles.gridTemplateRows = cellHeight?`repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:'auto'
            // tailstyles.gridTemplateRows = cellHeight?`repeat(auto-fit, minmax(${cellHeight}px, 1fr))`:'auto'
            tailstyles.gridTemplateColumns = 'none'

        } else if (orientation == 'vertical') {

            headstyles.padding = `${padding}px ${padding}px 0 ${padding}px`

            headstyles.width = '100%'
            headstyles.height = 'auto'
            headstyles.gridAutoFlow = 'row'
            
            headstyles.gridTemplateRows = 'none'
            headstyles.gridTemplateColumns = cellWidth?`repeat(auto-fit, minmax(${cellWidth}px, 1fr))`:'auto'

            tailstyles.padding = `0 ${padding}px ${padding}px ${padding}px`

            tailstyles.width = '100%'
            tailstyles.height = 'auto'
            tailstyles.gridAutoFlow = 'row'
            
            tailstyles.gridTemplateRows = 'none'
            tailstyles.gridTemplateColumns = cellWidth?`repeat(auto-fit, minmax(${cellWidth}px, 1fr))`:'auto'

        }

        return [headstyles,tailstyles]
        
}
