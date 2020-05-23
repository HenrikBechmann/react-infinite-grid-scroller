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
    for (let item of headcontent) {
        headindexes.push(item.props.index)
    }

    for (let item of tailcontent) {
        tailindexes.push(item.props.index)
    }

    for (let entry of intersections) {

        let index = parseInt(entry.target.dataset.index)

        if (tailindexes.includes(index)) {

            tailintersectionindexes.push(index)
            tailintersections.push(entry)

        } else if (headindexes.includes(index)) {

            headintersectionindexes.push(index)
            headintersections.push(entry)

        } else {
            console.log('warning: unknown intersection element',entry)
            return // shouldn't happen; give up
        }

        let calcintersecting
        let ratio = Math.round(entry.intersectionRatio * 1000)/1000
        if (browser && browser.name == 'safari') {
            calcintersecting = entry.intersectionRatio >= ITEM_OBSERVER_THRESHOLD
        } else {
            calcintersecting = ratio >= ITEM_OBSERVER_THRESHOLD
        }
        if (intersecting[index]) {
            console.log('WARNING: duplicate entry:',index)
        }
        intersecting[index] = {
            intersecting:calcintersecting,  // to accommodate browser differences
            isIntersecting:entry.isIntersecting,
            ratio,
            originalratio:entry.intersectionRatio
        }

    }

    let indexcompare = (a,b) => {
        let retval = (a < b)?-1:1
        return retval
    }

    let entrycompare = (a,b) => {
        let retval = (parseInt(a.target.dataset.index) < parseInt(b.target.dataset.index))? -1:1
        return retval
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
    if ((headptr >=0) && !intersecting[headindex].intersecting) {
        headptr = -1
    }

    if ((tailptr >=0) && intersecting[tailindex].intersecting) {
        tailptr = -1
    }
    // -----------------------------------------------

    // collect notifications to main thread (filtered intersections)
    if (headptr >= 0) {

        let refindex = headintersectionindexes[headptr] + 1
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
     
    if (tailptr >= 0) {

        let refindex = tailintersectionindexes[tailptr] - 1
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

    return filteredintersections

}

// update content
// adds itemshells at end of contentlist according to headindexcount and tailindescount,
// or if indexcount values are <0 removes them.
export const getUIContentList = (props) => {

    let { 

        indexoffset, 
        headindexcount, 
        tailindexcount, 
        orientation, 
        cellHeight, 
        cellWidth, 
        localContentList:contentlist,
        crosscount,
        listsize,

        callbacks,
        getItem,
        placeholder,
        observer,
    } = props

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

    return [headlist,taillist]

}

export const getSpinePosRef = (
    {
        headcontent,
        viewportElement,
        scrollforward,
        itemelements, 
        orientation, 
        spineElement,
        referenceindex,
        crosscount,
        gap,
        padding,
        referenceshift,
    }) => {

    let spineposbase,spineposref
    var localrefindex = referenceindex
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
        let referenceelement = referenceobjects[0].current
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
        // let scrollLength
        // if (orientation == 'vertical') {
        //     scrollLength = viewportElement.scrollTop
        // } else {
        //     scrollLength = viewportElement.scrollLength
        // }
        // console.log('top spineposref,scrollLength,spineposref,padding',scrollLength,spineposref,padding)
        // if (spineposref > (scrollLength + padding)) {
        //     spineposref = scrollLength + padding
        // }
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
