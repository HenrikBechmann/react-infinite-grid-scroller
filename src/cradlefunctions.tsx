// cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React from 'react'

import ItemShell from './itemshell'

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
        viewportheight, 
        viewportwidth, 
        runwaylength, 
        gap,
        padding, 
        visibletargetindexoffset,
        targetScrollOffset,
        crosscount,
        listsize,
    }) => {

    // -------------[ calc basic inputs: cellLength, contentCount. ]----------

    let cradleContentLength, cellLength, viewportlength
    if (orientation == 'vertical') {
        cellLength = cellHeight + gap
        viewportlength = viewportheight
    } else {
        cellLength = cellWidth + gap
        viewportlength = viewportwidth
    }

    cradleContentLength = viewportlength + (runwaylength * 2)
    let cradlerowcount = Math.ceil(cradleContentLength/cellLength)
    let contentCount = cradlerowcount * crosscount
    if (contentCount > listsize) contentCount = listsize

    // -----------------------[ calc leadingitemcount, referenceoffset ]-----------------------

    let cradleleadingrowcount = Math.floor(runwaylength/cellLength)
    let leadingitemcount = cradleleadingrowcount * crosscount
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
    let cradleoffset = indexrowoffset * cellLength

    let targetrowoffset = Math.floor(visibletargetindexoffset/crosscount)

    let rowscrollblockoffset = targetrowoffset * cellLength
    let scrollblockoffset = Math.max(0,rowscrollblockoffset - targetScrollOffset)

    return {indexoffset, referenceoffset, contentCount, scrollblockoffset, cradleoffset} // summarize requirements message

}

// this makes ui resize less visually jarring
export const normalizeCradleAnchors = (cradleElement, orientation) => {

    let styles:React.CSSProperties = {}

    let stylerevisions:React.CSSProperties = {}
    if (orientation == 'vertical') {
        if (cradleElement.style.top == 'auto') {

            styles.top = cradleElement.offsetTop + 'px'
            styles.bottom = 'auto'
            styles.left = 'auto'
            styles.right = 'auto'

        }
    } else {
        if (cradleElement.style.left == 'auto') {

            styles.left = cradleElement.offsetLeft + 'px'
            styles.right = 'auto'
            styles.top = 'auto'
            styles.bottom = 'auto'

        }
    }

    for (let style in styles) {
        cradleElement.style[style] = styles[style]
    }

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

        callbacksRef,
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
                        callbacksRef, 
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
                        callbacksRef, 
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
        crosscount, 
        rowcount, // in cradle
        viewportElement, 
        orientation,
        // measurements
        cellHeight,
        cellWidth,
        gap,
        padding,
    }
) => {

    console.log(`allocate args contentlist, // of cradle, in items (React components)
        runwaycount, // in rows
        crosscount, 
        rowcount, // in cradle
        viewportElement, 
        orientation,
        // measurements
        cellHeight,
        cellWidth,
        gap,
        padding`,contentlist, // of cradle, in items (React components)
        runwaycount, // in rows
        crosscount, 
        rowcount, // in cradle
        viewportElement, 
        orientation,
        // measurements
        cellHeight,
        cellWidth,
        gap,
        padding)
    // basic data
    let cellLength, scrolloffset, scrollblocklength, viewportlength
    let scrollblock = viewportElement.children[0]
    if (orientation == 'vertical') {
        scrolloffset = viewportElement.scrollTop
        cellLength = cellHeight + gap
        scrollblocklength = scrollblock.offsetHeight
        viewportlength = viewportElement.offsetHeight
    } else {
        scrolloffset = viewportElement.scrollLeft
        cellLength = cellWidth + gap
        scrollblocklength = scrollblock.offsetWidth
        viewportlength = viewportElement.offsetWidth
    }
    // calculate head configuration
    let runwayheadrowroom = Math.max(0,Math.floor((scrolloffset - padding)/cellLength))
    let runwaycountroom = Math.min(runwayheadrowroom, runwaycount)

    // calculate tail configuration
    let remainingroomrows = Math.ceil((scrollblocklength - scrolloffset)/cellLength)
    let rowdiff = remainingroomrows - rowcount
    if (rowdiff < runwaycountroom) {
        runwaycountroom += (runwaycountroom - rowdiff)
    }
    let runwayitemcount = runwaycountroom * crosscount

    console.log('runwayheadrowroom,runwaycountroom,rowdiff, runwayitemcount',runwayheadrowroom,runwaycountroom, rowdiff, runwayitemcount)

    // allocate the contentlist to head and tail
    let headlist = contentlist.slice(0,runwayitemcount)
    let taillist = contentlist.slice(runwayitemcount)

    console.log('headlist, taillist', headlist, taillist)

    return [headlist,taillist]

}

const emitItem = ({index, orientation, cellHeight, cellWidth, observer, callbacksRef, getItem, listsize, placeholder}) => {

    return <ItemShell
        key = {index} 
        orientation = {orientation}
        cellHeight = { cellHeight }
        cellWidth = { cellWidth }
        index = {index}
        observer = {observer}
        callbacks = {callbacksRef}
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

// export const setCradleStyleRevisionsForDrop = ({ 
//     headcontentlist,
//     tailcontentlist,
//     headCradleElement,
//     tailCradleElement, 
//     parentElement, 
//     scrollforward, 
//     orientation 
// }) => {

//     let styles = {} as React.CSSProperties
//     let tailstyles = {} as React.CSSProperties
//     let headpos, tailpos

//     // set styles revisions
//     if (orientation == 'vertical') {

//         let offsetHeight = headCradleElement.offsetHeight
//         let parentHeight = parentElement.offsetHeight

//         let offsetTop = headCradleElement.offsetTop

//         styles.left = 'auto'
//         styles.right = 'auto'

//         if (scrollforward) {

//             tailpos = offsetTop + offsetHeight
//             styles.top = 'auto'
//             styles.bottom = (parentHeight - tailpos) + 'px'

//         } else {

//             headpos = offsetTop
//             styles.top = headpos + 'px'
//             styles.bottom = 'auto'

//         }

//     } else {

//         let offsetLeft = headCradleElement.offsetLeft
//         let offsetWidth = headCradleElement.offsetWidth
//         let parentWidth = parentElement.offsetWidth
//         let cssleft = parseInt(headCradleElement.style.left)
//         let cssright = parseInt(headCradleElement.style.bottom)

//         styles.top = 'auto'
//         styles.bottom = 'auto'

//         if (scrollforward) {

//             tailpos = offsetLeft + offsetWidth
//             styles.left = 'auto'
//             styles.right = (parentWidth - tailpos) + 'px'

//         } else {

//             headpos = offsetLeft
//             styles.left = headpos + 'px'
//             styles.right = 'auto'

//         }
//     }

//     return [styles,tailstyles]

// }

// export const setCradleStyleRevisionsForAdd = ({
//     headcontentlist,
//     tailcontentlist,
//     headCradleElement,
//     tailCradleElement,
//     parentElement,
//     scrollforward,
//     orientation,
// }) => {
//     let styles = {} as React.CSSProperties
//     let tailstyles = {} as React.CSSProperties
//     let headpos, tailpos

//     // set style revisions
//     if (orientation == 'vertical') {

//         // let offsetTop
//         let offsetHeight = headCradleElement.offsetHeight
//         let parentHeight = parentElement.offsetHeight
//         let csstop = parseInt(headCradleElement.style.top)
//         let cssbottom = parseInt(headCradleElement.style.bottom)
//         let offsetTop = headCradleElement.offsetTop

//         styles.left = 'auto'
//         styles.right = 'auto'

//         if (scrollforward) {

//             headpos = offsetTop
//             styles.top = headpos + 'px'
//             styles.bottom = 'auto'

//         } else { // scroll backward

//             tailpos = offsetTop + offsetHeight
//             styles.top = 'auto'
//             styles.bottom = (parentHeight - tailpos) + 'px'

//         }

//     } else {

//         let offsetLeft = headCradleElement.offsetLeft
//         let offsetWidth = headCradleElement.offsetWidth
//         let parentWidth = parentElement.offsetWidth

//         let cssleft = parseInt(headCradleElement.style.left)
//         let cssright = parseInt(headCradleElement.style.bottom)

//         styles.top = 'auto'
//         styles.bottom = 'auto'

//         if (scrollforward) {

//             headpos = offsetLeft
//             styles.left = headpos + 'px'
//             styles.right = 'auto'

//         } else { // scroll backward

//             tailpos = offsetLeft + offsetWidth
//             styles.left = 'auto'
//             styles.right = (parentWidth - tailpos) + 'px'

//         }

//     }

//     return [styles, tailstyles]

// }