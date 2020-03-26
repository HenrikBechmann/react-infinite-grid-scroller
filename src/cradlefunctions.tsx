// cradlefunctions.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/

import React from 'react'

import ItemShell from './itemshell'

// triggered by transition to ready state (from resize modtly; also setup), and by cancellation of isScrolling mode
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

        let 
            itemTopOffset = scrollblockTopOffset + cradleTop + top, // offset from top of viewport
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

// export const getVisibleTargetData = (mainConfigDatasetRef) => {
//     let { current:targetConfigData } = mainConfigDatasetRef

//     if (targetConfigData.setup) return [undefined, undefined]

//     let { previousvisible:previousvisiblelist, orientation } = targetConfigData

//     let targetindex, targetoffset
//     for (let i = 0; i < previousvisiblelist.length; i++) {
//         let item = previousvisiblelist[i]
//         let previousitem
//         if (orientation == 'vertical') {
//             if ( item.verticalRatio  == 1) {

//                 targetindex = item.index
//                 if (i !== 0) {
//                     let { topPortion, bottomPortion } = previousvisiblelist[i-1]
//                     targetoffset = (topPortion >=0)?topPortion:bottomPortion
//                 } else {
//                     targetoffset = 0
//                 }
//                 break

//             }
//         } else {
//             if ( item.horizontalRatio  == 1) {

//                 targetindex = item.index
//                 if (i !== 0) {
//                     let { leftPortion, rightPortion } = previousvisiblelist[i-1]
//                     targetoffset = (leftPortion >=0)?leftPortion:rightPortion
//                 } else {
//                     targetoffset = 0
//                 }
//                 break

//             }
//         }
//     }

//     return [targetindex, targetoffset]

// }

export const getReferenceIndexData = (
    {
        orientation,
        viewportData,
        cellSpecsRef,
        crosscountRef,
        listsize,
    }) => {

    let scrollPos, cellLength
    if (orientation == 'vertical') {
        // if (viewportData.isResizing) {
            // console.log('viewportDat in getReferenceIndexData with isResizing true',viewportData)
            // scrollPos = viewportData.scrollPos.top
        // } else {
            scrollPos = viewportData.elementref.current.scrollTop
        // }
        cellLength = cellSpecsRef.current.cellHeight + cellSpecsRef.current.gap
    } else {
        // if (viewportData.isResizing) {
            // scrollPos = viewportData.scrollPos.left
        // } else {
            scrollPos = viewportData.elementref.current.scrollLeft
        // }
        cellLength = cellSpecsRef.current.cellWidth + cellSpecsRef.current.gap
    }
    let referencerowindex = Math.ceil(scrollPos/cellLength)
    let referencescrolloffset = cellLength - (scrollPos % cellLength)
    if (referencescrolloffset == cellLength) referencescrolloffset = 0
    let referenceindex = referencerowindex * crosscountRef.current

    let referenceIndexData = {
        index:Math.min(referenceindex,listsize - 1),
        scrolloffset:referencescrolloffset
    }

    // console.log('returning referenceIndexData',referenceIndexData)

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

    // -------------[ calc basic inputs: cradleLength, cellLength, rowcount, contentCount ]----------

    // console.log('==> 1. visibletargetindexoffset,targetScrollOffset',visibletargetindexoffset,targetScrollOffset)

    let cradleContentLength, cellLength, viewportlength
    if (orientation == 'vertical') {
        cellLength = cellHeight + gap
        viewportlength = viewportheight
    } else {
        cellLength = cellWidth + gap
        viewportlength = viewportwidth
    }
    // cradleLength = (viewportlength + (padding * 2) - gap) + (runwaylength * 2) // assumes at least one item
    cradleContentLength = viewportlength + (runwaylength * 2)
    let cradlerowcount = Math.floor(cradleContentLength/cellLength)
    let contentCount = cradlerowcount * crosscount
    if (contentCount > listsize) contentCount = listsize

    // -----------------------[ calc leadingitemcount ]-----------------------

    let cradleleadingrowcount = Math.floor(runwaylength/cellLength)
    let leadingitemcount = cradleleadingrowcount * crosscount
    let targetdiff = visibletargetindexoffset % crosscount
    let referenceoffset = visibletargetindexoffset - targetdiff

    leadingitemcount += targetdiff
    leadingitemcount = Math.min(leadingitemcount, visibletargetindexoffset) // for list head

    // console.log('2. contentCount, cradleleadingitemcount, targetdiff, cradleleadingrowcount, crosscount', 
    //     contentCount, leadingitemcount, targetdiff, cradleleadingrowcount, crosscount)

    // -----------------------[ calc indexoffset ]------------------------

    // leading edge
    let indexoffset = visibletargetindexoffset - leadingitemcount
    let diff = indexoffset % crosscount
    indexoffset -= diff

    // console.log('3. indexoffset, diff, visibletargetindexoffset, leadingitemcount',
    //     indexoffset, diff, visibletargetindexoffset, leadingitemcount)

    // ------------[ adjust indexoffset and contentCount for listsize ]------------
    // include referenceoffset in return message
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

    // console.log('4. scrollblockoffset, cradleoffset, rowscrollblockoffset, targetScrollOffset',
    //     scrollblockoffset, cradleoffset, rowscrollblockoffset, targetScrollOffset)

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

    // console.log('assigning styles to cradleElement',styles)

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
        observer,
        crosscount,
        callbacksRef,
        getItem,
        listsize,
        placeholder,
    } = props

    // console.log('getUIContentList getItem',getItem)

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

export const setCradleStyles = ({

    orientation, 
    divlinerStyles:stylesobject, 
    cellHeight, 
    cellWidth, 
    gap, 
    crosscount, 
    viewportheight, 
    viewportwidth

}) => {

        let styles = Object.assign({},stylesobject) as React.CSSProperties
        if (orientation == 'horizontal') {
            styles.width = 'auto'
            styles.height = '100%'
            styles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            styles.gridTemplateRows = cellHeight?`repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:'auto'
            styles.gridTemplateColumns = 'none'
            styles.minWidth = viewportwidth + 'px'
            styles.minHeight = 0
        } else if (orientation == 'vertical') {
            styles.width = '100%'
            styles.height = 'auto'
            styles.gridAutoFlow = 'row'
            
            styles.gridTemplateRows = 'none'
            styles.gridTemplateColumns = cellWidth?`repeat(auto-fit, minmax(${cellWidth}px, 1fr))`:'auto'
            styles.minWidth = 0
            styles.minHeight = viewportheight + 'px'
        }

        return styles
}

export const setCradleStyleRevisionsForDrop = ({ 
    cradleElement, 
    parentElement, 
    scrollforward, 
    orientation 
}) => {

    let styles = {} as React.CSSProperties
    let headpos, tailpos

    // set styles revisions
    if (orientation == 'vertical') {

        let offsetTop = cradleElement.offsetTop
        let offsetHeight = cradleElement.offsetHeight
        let parentHeight = parentElement.offsetHeight
        styles.left = 'auto'
        styles.right = 'auto'

        if (scrollforward) {

            tailpos = offsetTop + offsetHeight
            styles.top = 'auto'
            styles.bottom = (parentHeight - tailpos) + 'px'

        } else {

            headpos = offsetTop
            styles.top = headpos + 'px'
            styles.bottom = 'auto'

        }

    } else {

        let offsetLeft = cradleElement.offsetLeft
        let offsetWidth = cradleElement.offsetWidth
        let parentWidth = parentElement.offsetWidth
        styles.top = 'auto'
        styles.bottom = 'auto'

        if (scrollforward) {

            tailpos = offsetLeft + offsetWidth
            styles.left = 'auto'
            styles.right = (parentWidth - tailpos) + 'px'

        } else {

            headpos = offsetLeft
            styles.left = headpos + 'px'
            styles.right = 'auto'

        }
    }

    return styles

}

export const setCradleStyleRevisionsForAdd = ({
    cradleElement,
    parentElement,
    scrollforward,
    orientation,
}) => {
    let styles = {} as React.CSSProperties
    let headpos, tailpos

    // set style revisions
    if (orientation == 'vertical') {

        let offsetTop = cradleElement.offsetTop
        let offsetHeight = cradleElement.offsetHeight
        let parentHeight = parentElement.offsetHeight
        styles.left = 'auto'
        styles.right = 'auto'

        if (scrollforward) {

            headpos = offsetTop
            styles.top = headpos + 'px'
            styles.bottom = 'auto'

        } else { // scroll backward

            tailpos = offsetTop + offsetHeight
            styles.top = 'auto'
            styles.bottom = (parentHeight - tailpos) + 'px'

        }

    } else {

        let offsetLeft = cradleElement.offsetLeft
        let offsetWidth = cradleElement.offsetWidth
        let parentWidth = parentElement.offsetWidth
        styles.top = 'auto'
        styles.bottom = 'auto'

        if (scrollforward) {

            headpos = offsetLeft
            styles.left = headpos + 'px'
            styles.right = 'auto'

        } else { // scroll backward

            tailpos = offsetLeft + offsetWidth
            styles.left = 'auto'
            styles.right = (parentWidth - tailpos) + 'px'

        }

    }

    return styles

}

