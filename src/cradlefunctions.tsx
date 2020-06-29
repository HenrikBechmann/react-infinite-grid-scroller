// cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React from 'react'

import ItemShell from './itemshell'

import { detect } from 'detect-browser'

const browser = detect()

export const calcVisibleItems = (itemsArray, viewportElement, cradleElement, orientation) => {
    let list = []
    let cradleTop = cradleElement.offsetTop, 
        cradleLeft = cradleElement.offsetLeft
    let scrollblockTopOffset = -viewportElement.scrollTop, 
        scrollblockLeftOffset = -viewportElement.scrollLeft,
        viewportHeight = viewportElement.offsetHeight,
        viewportWidth = viewportElement.offsetWidth,
        viewportTopOffset = -scrollblockTopOffset,
        viewportBottomOffset = -scrollblockTopOffset + viewportHeight

    for (let i = 0; i < itemsArray.length; i++) {

        let [index, elementRef] = itemsArray[i]
        let element = elementRef.current

        let top = element.offsetTop, 
            left = element.offsetLeft, 
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

    list.sort((a,b) => {
        return (a.index - b.index)
    })

    return list
}

export const getReferenceIndexData = (
    {
        viewportData,
        cradlePropsRef,
        crosscountRef,
    }) => {

    let cradleProps = cradlePropsRef.current
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

    let referencescrolloffset = cellLength - (scrollPos % cellLength) // + cellSpecs.padding
    if (referencescrolloffset == cellLength + cradleProps.padding) referencescrolloffset = 0

    let referencerowindex = Math.ceil((scrollPos - cradleProps.padding)/cellLength)
    let referenceindex = referencerowindex * crosscountRef.current

    let referenceIndexData = {
        index:Math.min(referenceindex,listsize - 1),
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

    // console.log('getContentListRequirements props',
    //     `orientation, 
    //     cellHeight, 
    //     cellWidth, 
    //     rowcount,
    //     runwaycount,
    //     gap,
    //     visibletargetindexoffset,
    //     targetScrollOffset,
    //     crosscount,
    //     listsize`,

    //     orientation, 
    //     cellHeight, 
    //     cellWidth, 
    //     cradlerowcount,
    //     runwaycount,
    //     gap,
    //     visibletargetindexoffset,
    //     targetViewportOffset,
    //     crosscount,
    //     listsize
    // )

    // -------------[ calc basic inputs: cellLength, contentCount. ]----------

    // let cradleContentLength, cellLength, viewportlength
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
    let targetdiff = visibletargetindexoffset % crosscount
    let referenceoffset = visibletargetindexoffset - targetdiff // part of return message

    leadingitemcount += targetdiff
    leadingitemcount = Math.min(leadingitemcount, visibletargetindexoffset) // for list head

    // -----------------------[ calc indexoffset ]------------------------

    // leading edge
    let indexoffset = visibletargetindexoffset - leadingitemcount
    let diff = indexoffset % crosscount
    indexoffset -= diff

    // ------------[ adjust indexoffset and contentCount for listsize ]------------

    diff = 0
    let shift = 0
    if ((indexoffset + contentCount) > listsize) {
        diff = (indexoffset + contentCount) - listsize
        shift = diff % crosscount
    }

    if (diff) {
        indexoffset -= (diff - shift)
        contentCount -= shift
    }
    
    // --------------------[ calc css positioning ]-----------------------

    let indexrowoffset = Math.floor(indexoffset/crosscount)

    let targetrowoffset = Math.floor(referenceoffset/crosscount)
    let maxrowoffset = Math.ceil(listsize/crosscount)
    let scrollblockoffset = (targetrowoffset * cellLength)

    let spineoffset = targetViewportOffset

    if (maxrowoffset < (targetrowoffset + viewportrows)) {
        let rowdiff = (targetrowoffset + viewportrows) - maxrowoffset
        let itemdiff = rowdiff * crosscount
        // indexoffset += itemdiff
        referenceoffset -= itemdiff
        spineoffset = viewportlength - (viewportrows * cellLength) + padding
        // scrollblockoffset += rowdiff * (cellLength + gap)
        console.log('requirements fit: rowdiff, itemdiff, referenceoffset, spineoffset',
            rowdiff, itemdiff, referenceoffset, spineoffset)
    }

    return {indexoffset, referenceoffset, contentCount, scrollblockoffset, spineoffset} // summarize requirements message

}

// filter out items that not proximate to the spine
export const isolateRelevantIntersections = ({
    intersections,
    headcontent, 
    tailcontent,
    ITEM_OBSERVER_THRESHOLD,
    scrollforward,
    // orientation,
}) => {

    let headindexes = [], 
        tailindexes = [],
        headintersectionindexes = [],
        headintersections = [],
        tailintersectionindexes = [],
        tailintersections = [],
        intersecting:any = {},
        filteredintersections = []

    // collect lists of indexes
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
    let duplicatecompare = (a,b) => {
        let retval = (a.time < b.time)?-1:1
    }
    if (Object.keys(duplicates).length > 0) {
        console.log('duplicates found',duplicates)
        // console.log('UNresolved intersecting',{...intersecting})
        for (let duplicateindex in duplicates) {

            let duplicate = duplicates[duplicateindex]

            if (duplicate.length % 2) {
                duplicate.sort(duplicatecompare)
                let entry = duplicate.slice(duplicate.length -1,1)
                intersecting[entry.index] = entry
            } else {
                // console.log('deleting intersecting',duplicate[0].index)
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
        // console.log('resolved intersecting',{...intersecting})
    }

    headintersectionindexes.sort(indexcompare)
    tailintersectionindexes.sort(indexcompare)

    headintersections.sort(entrycompare)
    tailintersections.sort(entrycompare)

    // console.log('sorted headintersectionindexes, tailintersectionindexes, headintersections, tailintersections',
    //     headintersectionindexes, tailintersectionindexes, headintersections, tailintersections)

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
    // console.log('headptr, tailptr',headptr, tailptr)
    if ((headptr > -1) && (tailptr > -1)) { // edge case
        // console.log('Warning: filtered observer entries are bidirectional:headptr, tailptr, headintersectionindexes, tailintersectionindexes, headindexes, tailindexes',
        //     headptr, tailptr, headintersectionindexes, tailintersectionindexes, headindexes, tailindexes)
        if (scrollforward) {
            headptr = -1
        } else {
            tailptr = -1
        }
        // return
    }
    // let scrollforward = (tailptr > -1)?true:(headptr > -1)?false:undefined
    // -----------------------------------------------

    // collect notifications to main thread (filtered intersections)
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

    // console.log('filteredintersections',filteredintersections)

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

export const calcItemshiftcount = ({
    cradleProps,
    spineElement,
    viewportElement,
    headElement,
    tailElement,
    intersections,
    scrollforward,
    crosscount,
}) => {

    let spineviewportoffset, headspineoffset, tailspineoffset
    let boundary // = 0
    if (cradleProps.orientation == 'vertical') {
        spineviewportoffset = spineElement.offsetTop - viewportElement.scrollTop
        headspineoffset = headElement.offsetTop
        tailspineoffset = tailElement.offsetTop

        if (scrollforward) {

            boundary = viewportElement.offsetHeight - (spineviewportoffset + tailspineoffset + tailElement.offsetHeight)

        } else {

            boundary = spineviewportoffset + headspineoffset

        }
    } else { // horizontal
        spineviewportoffset = spineElement.offsetLeft - viewportElement.scrollLeft
        headspineoffset = headElement.offsetLeft
        tailspineoffset = tailElement.offsetLeft

        if (scrollforward) {

            boundary = viewportElement.offsetWidth - (spineviewportoffset + tailspineoffset + tailElement.offsetWidth)
        } else {

            boundary = spineviewportoffset + headspineoffset

        }
    }

    if (boundary < 0) boundary = 0

    let cellLength = cradleProps.orientation == 'vertical'?cradleProps.cellHeight:cradleProps.cellWitdh
    let boundaryrowcount = (boundary == 0)?0:Math.ceil(boundary/(cellLength + cradleProps.gap))

    let boundaryitemcount = boundaryrowcount * crosscount
    if (scrollforward && (boundaryitemcount != 0)) boundaryitemcount = -boundaryitemcount

    // ----------------------[  calculate itemshiftcount includng overshoot ]------------------------
    // shift item count is the number of items the virtual cradle shifts, according to observer notices

    // -- isolate forward and backward lists (happens with rapid scrolling changes)
    //  then set scrollforward
    let forwardcount = 0, backwardcount = 0
    if (scrollforward) {
        backwardcount = intersections.length
    } else {
        forwardcount = intersections.length
    }

    let itemshiftcount = forwardcount - backwardcount + boundaryitemcount

    // console.log('forwardcount, backwardcount, scrollforward, itemshiftcount',
    //     forwardcount, backwardcount, scrollforward, itemshiftcount)

    return itemshiftcount

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

    // if (boundary > 0) console.log('BOUNDARY, boundaryrowcount, rowshiftcount',
    //     boundary, boundaryrowcount, rowshiftcount)

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

        // console.log('headchangecount, tailchangecount', headchangecount, tailchangecount)

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
        crosscount,
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

export const getReferenceindex = ({
    itemshiftcount,
    crosscount,
    listsize,
    headcontentlist,
    tailcontentlist,
    scrollforward,
}) => {

    let referenceindex

    let referencerowshift = Math.abs(Math.ceil(itemshiftcount/crosscount))

    let referenceitemshift = referencerowshift * crosscount

    let previousreferenceindex = tailcontentlist[0]

    if (scrollforward) {

        // could be undefined with overshoot
        referenceindex = tailcontentlist[referenceitemshift]?.props.index
        // console.log('referenceindex from tailcontentlist', referenceindex)
        if (referenceindex === undefined) {
            // let lastindex = tailcontentlist[tailcontentlist.length - 1].props.index
            let overshoot = referenceitemshift - tailcontentlist.length
            referenceindex = tailcontentlist[tailcontentlist.length -1].props.index
            referenceindex += overshoot
            // console.log('referenceindex from adjustment;referenceindex, overshoot, referenceitemshift, tailcontentlist.length, itemshiftcount,referencerowhift',
            //     referenceindex, overshoot, referenceitemshift, tailcontentlist.length, itemshiftcount, referencerowshift)
        }


    } else {

        referenceindex = headcontentlist[(headcontentlist.length - crosscount)].props.index
        referenceindex -= referenceitemshift - crosscount

    }

    if (referenceindex > (listsize -1)) {
        referenceindex = listsize -1
    }

    if (referenceindex < 0) {
        referenceindex = 0
    }
    return [referenceindex, referenceitemshift]
}

// butterfly model. Leading (head) all or partially hidden; tail, visible plus following hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        runwaycount, // in rows
        referenceindex, // first tail item
        crosscount,

    }
) => {

    // console.log('allocateContentList: contentlist, runwaycount, referenceindex, crosscount',
    //     contentlist, runwaycount, referenceindex, crosscount)

    let offsetindex = contentlist[0].props.index
    // let runwaytailindex = contentlist[(runwaycount * crosscount) - 1].props.index
    let headitemcount

    headitemcount = (referenceindex - offsetindex)

    let headlist = contentlist.slice(0,headitemcount)
    let taillist = contentlist.slice(headitemcount)

    // console.log('headlist, taillist', headlist, taillist)

    return [headlist,taillist]

}

export const getSpinePosRef = (
    {
        cradleProps,
        crosscount,
        scrollforward,
        headcontent,
        tailcontent,
        itemelements, 
        referenceindex,
        referenceshift,
        viewportElement,
        spineElement,
    }) => {

    let orientation = cradleProps.orientation, 
        padding = cradleProps.padding,
        gap = cradleProps.gap

    let cellLength
    if (orientation == 'vertical') {
        cellLength = cradleProps.cellHeight + gap
    } else {
        cellLength = cradleProps.cellWidth + gap
    }

    let spineposbase,spineposref
    var localrefindex = referenceindex // changed by function
    if (!scrollforward) {
        // localrefindex += crosscount
        localrefindex += referenceshift
    }
    let referenceobjects = []
    if (scrollforward) {
        referenceobjects.push(itemelements.get(localrefindex))
    } else {
        for (let index = localrefindex; index > referenceindex; index -= crosscount ) {
            referenceobjects.push(itemelements.get(index))
        }
    }
    let referenceposshift

    if (orientation == 'vertical') {
        spineposbase = spineElement.offsetTop
    } else {
        spineposbase = spineElement.offsetLeft
    }
    if (scrollforward) {
        let referenceelement = referenceobjects[0]?.current
        if (referenceelement) {

            if (orientation == 'vertical') {
                referenceposshift = referenceelement.offsetTop
            } else {
                referenceposshift = referenceelement.offsetLeft
            }

        }
    } else {
        referenceposshift = 0
        for (let refobj of referenceobjects) {

            if (orientation == 'vertical') {
                referenceposshift += refobj.current.offsetHeight + gap
            } else {
                referenceposshift += refobj.current.offsetWidth + gap
            }

        }
    }

    if (scrollforward) {
        spineposref = spineposbase + referenceposshift
    } else {
        spineposref = spineposbase - referenceposshift
    }

    if (headcontent.length == 0) {
        spineposref = padding
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
        }

        return [headstyles,tailstyles]
        
}
