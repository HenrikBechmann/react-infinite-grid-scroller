// cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React from 'react'

import ItemShell from './itemshell'

import { detect } from 'detect-browser'

const browser = detect()

export const calcVisibleItems = (
        {itemElementMap, viewportElement, spineElement, headElement, orientation, headlist}
    ) => {

    let itemlistindexes = Array.from(itemElementMap.keys())
    itemlistindexes.sort((a,b)=>{
        return (a < b)?-1:1
    })
    let headlistindexes = []
    for (let item of headlist) {
        headlistindexes.push(parseInt(item.props.index))
    }
    // console.log('itemlistindexes, headlistindexes',itemlistindexes, headlistindexes)
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

    // list.sort((a,b) => {
    //     return (a.index - b.index)
    // })

    return list
}

export const getContextReferenceIndexData = ({

        viewportData,
        cradleProps,
        crosscount,

    }) => {

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
    if (referencescrolloffset == cellLength + cradleProps.padding) referencescrolloffset = 0

    let referencerowindex = Math.ceil((scrollPos - cradleProps.padding)/cellLength)
    let referenceindex = referencerowindex * crosscount
    referenceindex = Math.min(referenceindex,listsize - 1)
    let diff = referenceindex % crosscount
    referenceindex -= diff

    let referenceIndexData = {
        index:referenceindex,
        scrolloffset:referencescrolloffset
    }

    if (referenceIndexData.index == 0) referenceIndexData.scrolloffset = 0 // defensive

    return referenceIndexData
}

// evaluate content for requirements
export const getContentListRequirements = ({
        orientation, 
        cellHeight, 
        cellWidth, 
        cradlerowcount,
        runwaycount,
        gap,
        padding,
        visibletargetindexoffset,
        targetViewportOffset,
        crosscount,
        listsize,
        viewportElement,
    }) => {

    // reconcile referenceindex to crosscount context
    let diff = visibletargetindexoffset % crosscount
    visibletargetindexoffset -= diff

    // -------------[ calc basic inputs: cellLength, contentCount. ]----------

    let cellLength,viewportlength
    if (orientation == 'vertical') {
        cellLength = cellHeight + gap
        viewportlength = viewportElement.offsetHeight
    } else {
        cellLength = cellWidth + gap
        viewportlength = viewportElement.offsetWidth
    }
    let viewportrows = Math.floor(viewportlength / cellLength)

    let contentCount = cradlerowcount * crosscount 
    if (contentCount > listsize) contentCount = listsize

    // -----------------------[ calc leadingitemcount, referenceoffset ]-----------------------

    let leadingitemcount = runwaycount * crosscount
    // let targetdiff = visibletargetindexoffset % crosscount
    let referenceoffset = visibletargetindexoffset // part of return message

    // leadingitemcount += diff
    leadingitemcount = Math.min(leadingitemcount, visibletargetindexoffset) // for list head

    // -----------------------[ calc indexoffset ]------------------------

    // leading edge
    let indexoffset = visibletargetindexoffset - leadingitemcount
    diff = indexoffset % crosscount
    indexoffset -= diff

    // ------------[ adjust indexoffset for underflow ]------------

    diff = 0
    let shift = 0
    if (indexoffset < 0) {
        diff = indexoffset
        shift = Math.floor(diff / crosscount) * crosscount
    }

    if (diff) {
        indexoffset += shift
    }

    // ------------[ adjust indexoffset and contentCount for listsize overflow ]------------

    diff = 0
    shift = 0
    if ((indexoffset + contentCount) > listsize) {
        diff = (indexoffset + contentCount) - listsize
        shift = Math.floor(diff / crosscount) * crosscount
    }

    if (diff) {
        indexoffset -= shift
        contentCount -= (diff % crosscount)
    }
    
    // console.log('inside getContentListRequirements: indexoffset, virtual indexrow, referenceoffset, virtualreferencerow, contentCount, contentrows', 
    //     indexoffset, (indexoffset/crosscount) , referenceoffset, (referenceoffset/crosscount), contentCount, (contentCount/crosscount))

    // --------------------[ calc css positioning ]-----------------------

    let indexrowoffset = Math.floor(indexoffset/crosscount)
    let targetrowoffset = Math.floor(referenceoffset/crosscount)
    let maxrowcount = Math.ceil(listsize/crosscount)

    let scrollblockoffset = (targetrowoffset * cellLength) + padding

    let spineoffset = targetViewportOffset

    if (maxrowcount < (targetrowoffset + viewportrows)) {

        let rowdiff = (targetrowoffset + viewportrows) - maxrowcount
        let itemdiff = rowdiff * crosscount
        // indexoffset += itemdiff
        referenceoffset += itemdiff
        spineoffset = viewportlength - ((viewportrows * cellLength) + padding)

    }

    if (targetrowoffset = 0) {
        spineoffset = padding
    }

    // console.log('inside getContentListRequirements: spineoffset', spineoffset)

    return {indexoffset, referenceoffset, contentCount, scrollblockoffset, spineoffset} // summarize requirements message

}

// filter out items that not proximate to the spine
export const isolateRelevantIntersections = ({
    intersections,
    headcontent, 
    tailcontent,
    ITEM_OBSERVER_THRESHOLD,
    scrollforward,
}) => {

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

    // headintersectionindexes, tailintersectionindexes, intersecting
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

        let calcintersecting = (ratio >= ITEM_OBSERVER_THRESHOLD)
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

    if (Object.keys(duplicates).length > 0) {

        for (let duplicateindex in duplicates) {

            let duplicate = duplicates[duplicateindex]

            if (duplicate.length % 2) {
                duplicate.sort(duplicatecompare)
                let entry = duplicate.slice(duplicate.length -1,1)
                intersecting[entry.index] = entry
            } else {
                delete intersecting[duplicate[0].index]
            }
            for (let entryobj of duplicate) {
                let headptr = entryobj.headptr
                let tailptr = entryobj.tailptr
                if (headptr !== undefined) {
                    delete headintersectionindexes[headptr]
                    delete headintersections[headptr]
                }
                if (tailptr !== undefined) {
                    delete tailintersectionindexes[tailptr]
                    delete headintersections[tailptr]
                }
            }
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

    return filteredintersections //, headrefindex, tailrefindex}

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

export const calcItemshiftcount = ({
    cradleProps,
    spineElement,
    viewportElement,
    headElement,
    tailElement,
    intersections,
    scrollforward,
    crosscount,
    cradlecontentlist,
}) => {

    let forwardcount = 0, backwardcount = 0
    let spineviewportoffset, headspineoffset, tailspineoffset
    let cradleboundary, itemshiftcount
    if (cradleProps.orientation == 'vertical') {
        spineviewportoffset = spineElement.offsetTop - viewportElement.scrollTop
        headspineoffset = headElement.offsetTop
        tailspineoffset = tailElement.offsetTop // always 0

        if (scrollforward) {

            cradleboundary = viewportElement.offsetHeight - (spineviewportoffset + tailspineoffset + tailElement.offsetHeight)

        } else {

            cradleboundary = spineviewportoffset + headspineoffset

        }

    } else { // horizontal
        spineviewportoffset = spineElement.offsetLeft - viewportElement.scrollLeft
        headspineoffset = headElement.offsetLeft
        tailspineoffset = tailElement.offsetLeft // always 0

        if (scrollforward) {

            cradleboundary = viewportElement.offsetWidth - (spineviewportoffset + tailspineoffset + tailElement.offsetWidth)

        } else {

            cradleboundary = spineviewportoffset + headspineoffset

        }
    }

    // console.log('cradleboundary',cradleboundary)

    if (cradleboundary < 0) cradleboundary = 0 // not relevant

    let cellLength = cradleProps.orientation == 'vertical'?cradleProps.cellHeight:cradleProps.cellWitdh
    let boundaryrowcount = (cradleboundary == 0)?0:Math.ceil(cradleboundary/(cellLength + cradleProps.gap))

    let boundaryitemcount = boundaryrowcount * crosscount
    if (boundaryitemcount) {
        boundaryitemcount += (cradleProps.runwaycount * crosscount)
    }

    if (scrollforward && (boundaryitemcount != 0)) boundaryitemcount = -boundaryitemcount

    // console.log('boundaryitemcount',boundaryitemcount)

    // ----------------------[  calculate itemshiftcount includng overshoot ]------------------------
    // shift item count is the number of items the virtual cradle shifts, according to observer notices

    if (scrollforward) {

        backwardcount = intersections.length

    } else {

        forwardcount = intersections.length

    }

    itemshiftcount = forwardcount - backwardcount + boundaryitemcount

    // console.log('internal itemshiftcount',itemshiftcount)

    let previousindex = cradlecontentlist[0].props.index,
        testshift = -itemshiftcount

    let proposedindex = previousindex + testshift
    let listsize = cradleProps.listsize
    if (proposedindex > listsize) {
        let diff = listsize - (proposedindex + 1)
        itemshiftcount -= diff
    } 

    if (proposedindex < 0) {
        itemshiftcount += (proposedindex + 1)
    } 

    return itemshiftcount // positive = roll toward top/left; negative = roll toward bottom/right

}

export const calcHeadAndTailChanges = (
    {
        itemshiftcount,
        crosscount,
        headcontent,
        tailcontent,
        scrollforward,
        cradleProps,
        indexoffset,
        cradlerowcount,
        listsize,
    }) => {

    itemshiftcount = Math.abs(itemshiftcount) 
    let rowshiftcount = Math.ceil(itemshiftcount/crosscount) //+ boundaryrowcount

    let headrowcount, tailrowcount
    headrowcount = Math.ceil(headcontent.length/crosscount)
    tailrowcount = Math.ceil(tailcontent.length/crosscount)

    let pendingcontentoffset // lookahead to new indexoffset

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

        pendingcontentoffset = indexoffset + clipitemcount // after clip

        let proposedtailindex = pendingcontentoffset + (cradlerowcount * crosscount) - 1 // modelcontentlist.length - 1

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

        let proposedindexoffset = indexoffset - additemcount

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
export const getUIContentList = (props) => {

    let { 

        indexoffset, 
        headindexcount, 
        tailindexcount, 
        cradleProps,
        localContentList:contentlist,
        // crosscount,
        listsize,
        callbacks,
        observer,
    } = props

    let orientation = cradleProps.orientation,
        cellHeight = cradleProps.cellHeight,
        cellWidth = cradleProps.cellWidth,
        getItem = cradleProps.getItem,
        placeholder = cradleProps.placeholder

    let localContentlist = [...contentlist]
    let tailindexoffset = indexoffset + contentlist.length
    let returnContentlist

    let headContentlist = []

    if (headindexcount >= 0) {

        for (let index = indexoffset - headindexcount; index < (indexoffset); index++) {

            headContentlist.push(
                emitItem(
                    {
                        index, 
                        orientation, 
                        cellHeight, 
                        cellWidth, 
                        observer, 
                        callbacks, 
                        getItem, 
                        listsize, 
                        placeholder
                    }
                )
            )

        }

    } else {

        localContentlist.splice(0,-headindexcount)

    }

    let tailContentlist = []

    if (tailindexcount >= 0) {

        for (let index = tailindexoffset; index <(tailindexoffset + tailindexcount); index++) {

            tailContentlist.push(
                emitItem(
                    {
                        index, 
                        orientation, 
                        cellHeight, 
                        cellWidth, 
                        observer, 
                        callbacks, 
                        getItem, 
                        listsize, 
                        placeholder
                    }
                )
            )
            
        }

    } else {

        localContentlist.splice(tailindexcount,-tailindexcount)

    }

    returnContentlist = headContentlist.concat(localContentlist,tailContentlist)

    return returnContentlist
}

/*
    Algorithm
    The referenceindex must result in correct spine placement,
    ... and must take into account the bounds of the list for positioning
*/
export const getReferenceindex = ({
    crosscount,
    listsize,
    scrollforward,
    itemshiftcount,
    // localcontentlist,
    // headcontentlist,
    tailcontentlist,
    // itemelements,
    intersections,
}) => {

    let referenceindex
    if (scrollforward) {

        let referenceindexbase = parseInt(intersections[intersections.length - 1]?.target.dataset.index)
        referenceindex += referenceindexbase + 1
        if (referenceindexbase === undefined) {
            // let referenceindexbase = parseInt(intersections[intersections.length - 1]?.target.dataset.index)
            referenceindex = referenceindexbase - (( crosscount * 2 ) - 2) + 1

        }

    }


    itemshiftcount = Math.abs(itemshiftcount)

    let referencerowshift = Math.ceil(itemshiftcount/crosscount)
    let referenceitemshift = referencerowshift * crosscount

    let previousreferenceindex = tailcontentlist[0].props.index

    if (scrollforward) {

        referenceindex = previousreferenceindex + referenceitemshift

    } else {

        referenceindex = previousreferenceindex - referenceitemshift

    }

    if (referenceindex > (listsize -1)) {
        referenceindex = listsize -1
    }

    // if (referenceindex < 0) {
    //     referenceindex = 0
    // }

    return [referenceindex, referenceitemshift, previousreferenceindex]
}

// butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        // runwaycount, // in rows
        referenceindex, // first tail item
        // crosscount,

    }
) => {

    let offsetindex = contentlist[0].props.index

    let headitemcount

    headitemcount = (referenceindex - offsetindex)

    let headlist = contentlist.slice(0,headitemcount)
    let taillist = contentlist.slice(headitemcount)

    return [headlist,taillist]

}

export const getSpinePosRef = (
    {
        cradleProps,
        crosscount,
        scrollforward,
        headcontent,
        // tailcontent,
        itemelements, 
        referenceindex,
        previousreferenceindex,
        referenceshift,
        // viewportElement,
        spineElement,
        // headElement,
    }) => {

    // ----------[ calculate spine base position ]----------------

    let spineposref 

    let orientation = cradleProps.orientation,
        padding = cradleProps.padding,
        gap = cradleProps.gap

    if (scrollforward) {

        if (orientation == 'vertical') {
            // console.log('referenceindex, itemelements.get(referenceindex)',referenceindex, itemelements.get(referenceindex))
            spineposref = spineElement.offsetTop + itemelements.get(referenceindex)?.current.offsetTop
            return spineposref

        } else {

            spineposref = spineElement.offsetLeft + itemelements.get(referenceindex)?.current.offsetLeft
            return spineposref

        }

    }

    let spineposbase, cellLength
    if (orientation == 'vertical') {

        spineposbase = spineElement.offsetTop
        cellLength = cradleProps.cellHeight + gap

    } else {

        spineposbase = spineElement.offsetLeft
        cellLength = cradleProps.cellWidth + gap

    }

    let referencerowshift = Math.ceil(referenceshift/crosscount)

    // ------------------[ calculate spine position ]---------------

    let referenceposshift = 0
    // let spineposref
    if (headcontent.length == 0) {

        spineposref = padding

    } else { 

        // console.log('inside getSpinePosRef', previousreferenceindex, referenceshift, crosscount)
        for (let rowindex = previousreferenceindex;
            rowindex > previousreferenceindex - referenceshift; 
            rowindex -= crosscount ) {

            let propname = (cradleProps.orientation == 'vertical')?'offsetHeight':'offsetWidth'
            let iterationshift = itemelements.has(rowindex)
                ?itemelements.get(rowindex).current[propname] + gap
                :cellLength
            referenceposshift += iterationshift

        }

        spineposref = spineposbase - referenceposshift

    }

    return spineposref
    
}

const emitItem = ({
    index, 
    orientation, 
    cellHeight, 
    cellWidth, 
    observer, 
    callbacks, 
    getItem, 
    listsize, 
    placeholder
}) => {

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
    />    

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
            headstyles.gridTemplateColumns = 'none'

            tailstyles.padding = `${padding}px ${padding}px ${padding}px 0`

            tailstyles.width = 'auto'
            tailstyles.height = '100%'
            tailstyles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            tailstyles.gridTemplateRows = cellHeight?`repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:'auto'
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
            // console.log('setCradleGridStyles vertical, headstyles, tailstyles',headstyles, tailstyles)
        }

        return [headstyles,tailstyles]
        
}
