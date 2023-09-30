// contentupdate.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

import {

    calculateShiftSpecs,

} from './contentupdatefuncs'

import { 

    allocateContentList,
    deletePortals,
    getCellFrameComponentList, 

} from './contentsharedfuncs'

export const contentUpdate = (cradleParameters, cradleContent, instanceIdCounterRef) => {

    // ----------------------[ 1. initialize ]-------------------------

    const
        viewportElement = cradleParameters.viewportContextRef.current.elementRef.current,
        cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
        cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,
        cradleHandlers = cradleParameters.handlersRef.current,

        {

            cacheAPI, 
            layoutHandler, 
            stateHandler, 
            interruptHandler,
            serviceHandler,
            
        } = cradleHandlers,

        { 

            shiftinstruction, 
            triggerViewportReferencePixelPos // trigger CellFrame

        } = interruptHandler,

        { 
        
            elements: cradleElements,
            cradlePositionData

        } = layoutHandler,
    
        { 

            orientation, 
            cache,
            styles,
            placeholderMessages,
            layout, 
            cellHeight, 
            cellWidth, 
            // gap,
            scrollerID, // debug

        } = cradleInheritedProperties,

        {

            virtualListProps,
            cradleContentProps,
            paddingProps,
            gapProps,

        } = cradleInternalProperties,

        { 

            crosscount,
            lowindex:listlowindex,

        } = virtualListProps,

        // new vars
        currentScrollPos = 
            (orientation == 'vertical')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft,

        modelcontentlist = cradleContent.cradleModelComponents || [],

        previousCradleReferenceIndex = (modelcontentlist[0]?.props.index || 0)

    // --------------------------------[ 3. Calculate shifts ]-------------------------------

    // cradle properties
    const {

        // by index
        cradleReferenceItemShift: cradleItemShift, 
        newAxisReferenceIndex: axisReferenceIndex, 
        axisReferenceItemShift: axisItemShift, 

        // counts
        newCradleContentCount: cradleContentCount,
        listStartChangeCount,
        listEndChangeCount,

        // pixels
        newPixelOffsetAxisFromViewport,

    } = calculateShiftSpecs({

        shiftinstruction,
        triggerViewportReferencePixelPos,
        currentScrollPos,
        scrollblockElement: viewportElement.firstChild,

        cradleInheritedProperties,
        cradleInternalProperties,
        cradleContentProps,
        virtualListProps,
        cradleContent,
        cradleElements,

    })

    const 
        pixelOffsetAxisFromViewport = newPixelOffsetAxisFromViewport,
        isShift = !((axisItemShift == 0) && (cradleItemShift == 0)),
        axisElement = cradleElements.axisRef.current,
        headElement = cradleElements.headRef.current

    // the triggerlines will be moved, so disconnect them from their observer.
    // they are reconnected with 'renderupdatedcontent' state in cradle.tsx, or at 'finishupdateforvariability'
    //    for variable content
    interruptHandler.triggerlinesIntersect.disconnect()

    // abandon option; nothing to do but reposition
    if (!isShift) { // can happen first row; oversized last row

        if (layout == 'uniform') {// there's a separate routine for variable adjustments and css

            cradlePositionData.targetPixelOffsetAxisFromViewport = applyStyling({
                layout, orientation, paddingProps, gapProps, cellHeight, cellWidth, 
                crosscount, 
                axisReferenceIndex, pixelOffsetAxisFromViewport, currentScrollPos, 
                headcontent:cradleContent.headModelComponents,
                axisElement, headElement, listlowindex,
            })

        } else {

            cradlePositionData.targetPixelOffsetAxisFromViewport = pixelOffsetAxisFromViewport

        }

        return

    }

    // ----------------------------------[ 4. reconfigure cradle content ]--------------------------

    // collect changed content
    let updatedContentList, deletedContentItems = []

    if (listStartChangeCount || listEndChangeCount) { // if either is non-0 then modify content

        [ updatedContentList, deletedContentItems ] = getCellFrameComponentList({
            cacheAPI,
            cradleInheritedProperties,
            cradleInternalProperties,
            cradleContentCount,
            workingContentList:modelcontentlist,
            listStartChangeCount,
            listEndChangeCount,
            cradleReferenceIndex:previousCradleReferenceIndex,
            instanceIdCounterRef:instanceIdCounterRef,
            styles,
            placeholderMessages,
        })

        cradleContentProps.size = updatedContentList.length

        if (cradleContentProps.size) {

            const 
                lowindex = updatedContentList[0].props.index,
                highindex = lowindex + cradleContentProps.size - 1

            Object.assign(cradleContentProps,
            {
                lowindex,
                highindex,
                axisReferenceIndex,
                SOL:(virtualListProps.lowindex == lowindex),
                EOL:(virtualListProps.highindex == highindex),
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
                axisReferenceIndex:undefined,
                SOL:undefined,
                EOL:undefined,
            })

        }

        let gridstart
        if (cradleContentProps.SOL === true && 
            !(virtualListProps.baserowblanks === undefined || 
            virtualListProps.baserowblanks === 0)) {
            gridstart = `${virtualListProps.baserowblanks + 1}`
        } else {
            gridstart = 'unset'
        }

        const 
            firstcomponent = updatedContentList[0],
            gridstartstyle =
                (orientation == 'vertical')?
                    { gridColumnStart:gridstart }:
                    { gridRowStart:gridstart },
            revisedcomponent = React.cloneElement(firstcomponent,{gridstartstyle})

        updatedContentList[0] = revisedcomponent

    } else {

        updatedContentList = modelcontentlist
        Object.assign(cradleContentProps, { axisReferenceIndex })

    }

    if (deletedContentItems.length && (cache == 'cradle')) {

        const { deleteListCallback } = serviceHandler.callbacks

        let deleteListCallbackWrapper
        if (deleteListCallback) {
            deleteListCallbackWrapper = (deleteList) => {

                deleteListCallback(deleteList,
                    {
                        contextType:'deleteList',
                        scrollerID,
                        message:'pare cache to cradle',
                    }
                )

            }

        }

        deletePortals(cacheAPI, deletedContentItems, deleteListCallbackWrapper)

    }

    // ----------------------------------[ 5. allocate cradle content ]--------------------------

    const [ headcontent, tailcontent ] = allocateContentList(
        {
            contentlist:updatedContentList,
            axisReferenceIndex,
            layoutHandler,
            // listlowindex,
        }
    )

    cradleContent.cradleModelComponents = updatedContentList
    cradleContent.headModelComponents = headcontent
    cradleContent.tailModelComponents = tailcontent

    if (serviceHandler.callbacks.referenceIndexCallback) {

        const cstate = stateHandler.cradleStateRef.current

        serviceHandler.callbacks.referenceIndexCallback(

            axisReferenceIndex,'updateCradleContent', cstate)
    
    }

    // -------------------------------[ 6. css changes ]-------------------------

    cradlePositionData.targetAxisReferencePosition = axisReferenceIndex - listlowindex
    cradlePositionData.targetPixelOffsetAxisFromViewport = pixelOffsetAxisFromViewport

    if (isShift) cacheAPI.renderPortalLists()

    if (layout == 'uniform') {// there's a separate routine for variable adjustments and css

        cradlePositionData.targetPixelOffsetAxisFromViewport = applyStyling({
            layout, orientation, paddingProps, gapProps, cellHeight, cellWidth, 
            crosscount, 
            axisReferenceIndex, pixelOffsetAxisFromViewport, currentScrollPos, 
            headcontent,
            axisElement, headElement, listlowindex
        })

    }

    // load new display data
    cradleContent.headDisplayComponents = cradleContent.headModelComponents
    cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

}

// move the offset of the axis
const applyStyling = ({
    layout, orientation, paddingProps, gapProps, cellHeight, cellWidth, 
    crosscount, 
    axisReferenceIndex, pixelOffsetAxisFromViewport, currentScrollPos, 
    headcontent,
    axisElement, headElement, listlowindex
}) => {
    
    const 
        preAxisVirtualRows = Math.ceil( ( axisReferenceIndex - listlowindex )/crosscount ),

        gaplength = 
            orientation == 'vertical'?
                gapProps.column:
                gapProps.row,

        baseCellLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth)
            + gaplength,

        paddingOffset = 
            orientation == 'vertical'?
                paddingProps.top:
                paddingProps.left,

        testScrollPos = (baseCellLength * preAxisVirtualRows) + paddingOffset - pixelOffsetAxisFromViewport,
        
        scrollDiff = testScrollPos - currentScrollPos

    if (scrollDiff) {

        pixelOffsetAxisFromViewport += scrollDiff

    }

    // move the axis to accomodate change of content
    let topAxisPos, leftAxisPos
    if (orientation == 'vertical') {

        topAxisPos = currentScrollPos + pixelOffsetAxisFromViewport - paddingProps.top

        axisElement.style.top = topAxisPos + 'px'
        axisElement.style.left = 'auto'
        
        headElement.style.padding = 
            headcontent.length?
                `0px 0px ${gapProps.column}px 0px`:
                `0px`

    } else { // 'horizontal'

        leftAxisPos = currentScrollPos + pixelOffsetAxisFromViewport - paddingProps.left

        axisElement.style.top = 'auto'
        axisElement.style.left = leftAxisPos + 'px'

        headElement.style.padding = 
            headcontent.length?
                `0px ${gapProps.row}px 0px 0px`:
                `0px`
    }

    return pixelOffsetAxisFromViewport

}
