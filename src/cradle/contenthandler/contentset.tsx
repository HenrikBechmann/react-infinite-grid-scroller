// contentset.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

import { 

    // calculateContentParameters,
    allocateContentList,
    getCellFrameComponentList, 

} from './contentsharedfuncs'

export const contentSet = ( cradleState, cradleParameters, cradleContent, instanceIdCounterRef ) => { // cradleState influences some behaviour

    // ------------------------------[ 1. initialize ]---------------------------

    const 

        viewportContext = cradleParameters.viewportContextRef.current,
        cradleHandlers = cradleParameters.handlersRef.current,
        cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
        cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

        viewportElement = viewportContext.elementRef.current,

        {

            cacheAPI,
            layoutHandler,
            serviceHandler,
            scrollHandler,

        } = cradleHandlers,

        { 
        
            cradlePositionData 

        } = layoutHandler,

        {

            targetAxisReferencePosition:requestedAxisReferencePosition,

        } = cradlePositionData,

        {

            orientation, 
            // gap, 
            cellHeight,
            cellWidth,
            styles,
            placeholderMessages,
            scrollerID, // debug

        } = cradleInheritedProperties,

        { 

            virtualListProps, 
            cradleContentProps,
            paddingProps,
            gapProps,

        } = cradleInternalProperties,

        {

            lowindex:listlowindex, 
            // highindex:listhighindex, 
            size:listsize, 
            crosscount, 
            rowcount:listRowcount,
            rowshift,
            // baserowblanks,
            // endrowblanks,

        } = virtualListProps,

        paddingOffset = 
            orientation == 'vertical'
                ?paddingProps.top
                :paddingProps.left,

        // cradleContent = this.content,

        gaplength =
            orientation == 'vertical'
                ?gapProps.column
                :gapProps.row

    let { targetPixelOffsetAxisFromViewport } =  cradlePositionData

    // ----------------------[ 2. normalize data ]--------------------------

    // in bounds
    let workingAxisReferencePosition = Math.min(requestedAxisReferencePosition,listsize - 1)
    workingAxisReferencePosition = Math.max(workingAxisReferencePosition, 0)

    // shifted by virtual list low range
    let workingAxisReferenceIndex  = workingAxisReferencePosition + listlowindex

    // calculate axis reference base index
    workingAxisReferenceIndex -=
        workingAxisReferenceIndex < 0
            ?(workingAxisReferenceIndex % crosscount)
                ?(crosscount - Math.abs(workingAxisReferenceIndex % crosscount))
                :0
            :workingAxisReferenceIndex % crosscount

    // reposition at row boundary
    if ([
        'firstrender', 
        'firstrenderfromcache',
        'finishreposition', 
        'reconfigure', 
        'scrollto', 
    ].includes(cradleState)) {

        targetPixelOffsetAxisFromViewport = 
            (workingAxisReferenceIndex == listlowindex)
                ?paddingOffset
                :gaplength // default

    }

    const 
        workingContentList = [],

        // ----------------------[ 3. get content requirements ]----------------------

        baseRowPixelLength = 
            ((orientation == 'vertical')
                ?cellHeight
                :cellWidth)
            + gaplength

    const {

        // by index
        targetCradleReferenceIndex, 
        targetAxisReferenceIndex,

        // counts
        newCradleContentCount:cradleContentCount, 

        // target scrollPos by pixels
        targetPixelOffsetViewportFromScrollblock:pixelOffsetViewportFromScrollblock,

    } = calculateContentParameters({

            // pixel
            baseRowPixelLength,
            targetPixelOffsetAxisFromViewport,

            // index
            targetAxisReferenceIndex:workingAxisReferenceIndex,

            // resources
            cradleInheritedProperties,
            cradleInternalProperties,

        })

    const pixelOffsetAxisFromViewport = targetPixelOffsetAxisFromViewport // semantics

    // ----------------------[ 4. get and config content ]----------------------
    
    // returns content constrained by cradleRowcount
    const [newcontentlist] = getCellFrameComponentList({
        
        cacheAPI,            
        cradleInheritedProperties,
        cradleInternalProperties,
        cradleContentCount,
        cradleReferenceIndex:targetCradleReferenceIndex,
        listStartChangeCount:0,
        listEndChangeCount:cradleContentCount,
        workingContentList,
        instanceIdCounterRef:instanceIdCounterRef,
        styles,
        placeholderMessages,

    })

    // update cradleContentProps from newcontentlist
    cradleContentProps.size = newcontentlist.length
    if (cradleContentProps.size) {

        const 
            lowindex = newcontentlist[0]?.props?.index, // TODO mobile issue
            highindex = lowindex + cradleContentProps.size - 1

        if (isNaN(highindex)) return // TODO mobile issue (leaves cradleContentProps undefined)

        Object.assign(cradleContentProps,
        {
            lowindex,
            highindex,
            axisReferenceIndex:targetAxisReferenceIndex,
            SOL:(virtualListProps.lowindex == lowindex),
            EOL:(virtualListProps.highindex == highindex),
            lowrow:Math.floor(lowindex/crosscount) - rowshift,
            highrow:Math.floor(highindex/crosscount) - rowshift,
        })

        if (cradleContentProps.SOL && !layoutHandler.SOLSignal) {
            layoutHandler.SOLSignal = true
        }
        if (cradleContentProps.EOL && !layoutHandler.EOLSignal) {
            layoutHandler.EOLSignal = true
        }

    } else {

        Object.assign(cradleContentProps,
        {
            lowindex:undefined,
            highindex:undefined,
            lowrow:undefined,
            highrow:undefined,
            axisReferenceIndex:undefined,
            SOL:undefined,
            EOL:undefined,
        })

    }

    // set or cancel first row offset if within cradle
    let gridstart
    if (cradleContentProps.SOL === true 
        && !(virtualListProps.baserowblanks === undefined 
            || virtualListProps.baserowblanks === 0)) {
        gridstart = `${virtualListProps.baserowblanks + 1}`
    } else {
        gridstart = 'unset'
    }

    const firstcomponent = newcontentlist[0]

    if (!firstcomponent) return // possible child dismounts with nested scrollers

    let gridstartstyle
    if (orientation == 'vertical') {
        gridstartstyle = {gridColumnStart:gridstart}
    } else {
        gridstartstyle = {gridRowStart:gridstart}
    }
    const revisedcomponent = React.cloneElement(firstcomponent,{gridstartstyle})
    newcontentlist[0] = revisedcomponent

    const [headcontentlist, tailcontentlist] = allocateContentList({

        contentlist:newcontentlist,
        axisReferenceIndex:targetAxisReferenceIndex,
        layoutHandler,
        // listlowindex,

    })

    cradleContent.cradleModelComponents = newcontentlist
    cradleContent.headModelComponents = headcontentlist
    cradleContent.tailModelComponents = tailcontentlist

    cradlePositionData.targetAxisReferencePosition = targetAxisReferenceIndex - listlowindex
    cradlePositionData.targetPixelOffsetAxisFromViewport = pixelOffsetAxisFromViewport

    if (serviceHandler.callbacks.referenceIndexCallback) {

        const cstate = cradleState

        serviceHandler.callbacks.referenceIndexCallback(

            targetAxisReferenceIndex,{
                contextType:'referenceIndex',
                action:'setCradleContent',
                cradleState:cstate,
                scrollerID,
            }
        )
    
    }

    //  ----------------------[ 5. set CSS ]-----------------------

    // reset scrollblock Offset and length
    const 
        totalpaddinglength = 
            orientation == 'vertical'
                ?paddingProps.top + paddingProps.bottom
                :paddingProps.left + paddingProps.right,

        scrollblockElement = viewportElement.firstChild,
        blocknewlength = (listRowcount * baseRowPixelLength) - gaplength // final cell has no trailing gap
            + totalpaddinglength // leading and trailing padding

    if (cradleState == 'pivot') {

        if (orientation == 'vertical') {

            scrollblockElement.style.left = null

        } else {

            scrollblockElement.style.top = null

        }

    }

    if (orientation == 'vertical') {

        scrollblockElement.style.top = null
        scrollblockElement.style.height = blocknewlength + 'px'

    } else {

        scrollblockElement.style.left = null
        scrollblockElement.style.width = blocknewlength + 'px'

    }

    cradlePositionData.trackingBlockScrollPos = pixelOffsetViewportFromScrollblock

    // avoid bogus call to updateCradleContent
    scrollHandler.resetScrollData(pixelOffsetViewportFromScrollblock) 

    const 
        scrollTop = viewportElement.scrollTop,
        scrollLeft = viewportElement.scrollLeft

    let scrollOptions
    if (cradlePositionData.blockScrollProperty == 'scrollTop') {
        scrollOptions = {
            top:cradlePositionData.trackingBlockScrollPos,
            left:scrollLeft,
            behavior:'instant',
        }
    } else {
        scrollOptions = {
            left:cradlePositionData.trackingBlockScrollPos,
            top:scrollTop,
            behavior:'instant',
        }            
    }

    viewportElement.scroll(scrollOptions)

    const 
        cradleElements = layoutHandler.elements,

        axisElement = cradleElements.axisRef.current,
        headElement = cradleElements.headRef.current,

        pixelOffsetAxisFromScrollblock = 
            pixelOffsetViewportFromScrollblock + pixelOffsetAxisFromViewport

    if (orientation == 'vertical') {

        const top = pixelOffsetAxisFromScrollblock - paddingProps.top

        axisElement.style.top = top + 'px'
        axisElement.style.left = 'auto'

        headElement.style.padding = 
            headcontentlist.length
                ?`0px 0px ${gapProps.column}px 0px`
                :`0px`

    } else { // orientation = 'horizontal'

        const left = pixelOffsetAxisFromScrollblock - paddingProps.left

        axisElement.style.top = 'auto'
        axisElement.style.left = left + 'px'

        headElement.style.padding = 
            headcontentlist.length
                ?`0px ${gapProps.row}px 0px 0px`
                :`0px`

    }

}

export const calculateContentParameters = ({ // called from setCradleContent only

        // index
        targetAxisReferenceIndex, // from user, or from pivot
        // pixels
        baseRowPixelLength,
        targetPixelOffsetAxisFromViewport,
        // resources
        cradleInheritedProperties,
        cradleInternalProperties,

    }) => {

    const 
        { 

            orientation,

        } = cradleInheritedProperties,

        {

            cradleContentProps,
            virtualListProps,
            paddingProps,

        } = cradleInternalProperties,

        {

            cradleRowcount,
            runwayRowcount,

        } = cradleContentProps,

        {

            lowindex:listlowindex, 
            highindex:listhighindex, 
            // size:listsize, 
            crosscount, 
            rowcount:listRowcount,
            baserowblanks,
            endrowblanks,
            rowshift:rangerowshift,

        } = virtualListProps

    // align axis reference to list scope
    targetAxisReferenceIndex = Math.min(targetAxisReferenceIndex, listhighindex)
    targetAxisReferenceIndex = Math.max(targetAxisReferenceIndex, listlowindex)

    // derive target row
    const targetAxisReferenceRow = Math.floor(targetAxisReferenceIndex/crosscount)

    // -----------------------[ calc cradleReferenceRow & Index ]------------------------

    // leading edge
    let 
        targetCradleReferenceRow = Math.max(rangerowshift,targetAxisReferenceRow - runwayRowcount),
        // trailing edge
        targetCradleEndRow = targetCradleReferenceRow + (cradleRowcount - 1)

    const listEndRowOffset = (listRowcount - 1) + rangerowshift

    if (targetCradleEndRow > (listEndRowOffset)) {
        const diff = (targetCradleEndRow - listEndRowOffset)
        targetCradleReferenceRow -= diff
        targetCradleEndRow -= diff
    }

    let targetCradleReferenceIndex = (targetCradleReferenceRow * crosscount)
    targetCradleReferenceIndex = Math.max(targetCradleReferenceIndex,listlowindex)

    // ---------------------[ calc cradle content count ]---------------------

    let newCradleContentCount = cradleRowcount * crosscount
    if (targetCradleEndRow == listEndRowOffset) {
        if (endrowblanks) {
            newCradleContentCount -= endrowblanks// endRowRemainderCount)
        }
    }
    if (targetCradleReferenceRow == rangerowshift) { // first row
        if (baserowblanks) {
            newCradleContentCount -= baserowblanks
        }
    }

    // --------------------[ calc css positioning ]-----------------------

    const 
        paddingOffset = 
            orientation == 'vertical'
                ?paddingProps.top
                :paddingProps.left,

        targetPixelOffsetViewportFromScrollblock = 
            ((targetAxisReferenceRow - rangerowshift) * baseRowPixelLength) + paddingOffset
                - targetPixelOffsetAxisFromViewport

    // ----------------------[ return required values ]---------------------

    return {
        targetCradleReferenceIndex, 
        targetAxisReferenceIndex,
        targetPixelOffsetViewportFromScrollblock, 
        newCradleContentCount, 
    } 

}

