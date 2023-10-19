// contentsharedfuncs.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module, and updatefunctions, supports the contenthandler module. The functions in this module perform
    the detailed calculations and processes required by the contenthandler.

    getCellFrameComponentList, allocateContentList, and deletePortals functions are shared by both. 

    createCellFrame is called internally by getCellFrameComponentList as needed.
*/

import React from 'react'

import CellFrame from '../../CellFrame'

// =====================[ shared by both setCradleContent and updateCradleContent ]====================

// update content
// adds CellFrames at end of contentlist according to headindexcount and tailindexcount,
// or if indexcount values are <0 removes them.
export const getCellFrameComponentList = ({ 

        cradleInheritedProperties,
        cradleInternalProperties,
        cacheAPI,
        cradleContentCount,
        cradleReferenceIndex, 
        listStartChangeCount, 
        listEndChangeCount, 
        workingContentList:contentlist,
        instanceIdCounterRef,
        styles,
        placeholderMessages,

    }) => {

    const 
        localContentlist = [...contentlist],
        lastindexoffset = cradleReferenceIndex + localContentlist.length - 1,

        headContentlist = [], tailContentlist = []

    let deletedtailitems = [], deletedheaditems = []

    if (listStartChangeCount >= 0) { // acquire new items

        let 
            referenceIndex = cradleReferenceIndex,
            changeCount = listStartChangeCount
        
        if (listStartChangeCount > cradleContentCount) {
            referenceIndex = cradleReferenceIndex - (listStartChangeCount - cradleContentCount)
            changeCount = cradleContentCount
        }

        for (let newindex = referenceIndex - changeCount; newindex < referenceIndex; newindex++) {

            headContentlist.push(
                createCellFrame(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheAPI,
                        placeholderFrameStyles:styles.placeholderframe,
                        placeholderLinerStyles:styles.placeholderliner,
                        placeholderErrorFrameStyles:styles.placeholdererrorframe,
                        placeholderErrorLinerStyles:styles.placeholdererrorliner,
                        dndDragIconStyles:styles.dndDragIcon,
                        placeholderMessages,
                    }
                )
            )

        }

    } else {

        deletedheaditems = localContentlist.splice( 0, -listStartChangeCount )

    }

    if (listEndChangeCount >= 0) { // acquire new items

        let 
            referenceIndex = lastindexoffset,
            changeCount = listEndChangeCount

        if (listEndChangeCount > cradleContentCount) {
            referenceIndex = lastindexoffset + (listEndChangeCount - cradleContentCount)
            changeCount = cradleContentCount
        }

        for (let newindex = referenceIndex + 1; newindex < (referenceIndex + 1 + changeCount); newindex++) {

            tailContentlist.push(
                createCellFrame(
                    {
                        index:newindex, 
                        cradleInheritedProperties,
                        cradleInternalProperties,
                        instanceIdCounterRef,
                        cacheAPI,
                        placeholderFrameStyles:styles.placeholderframe,
                        placeholderLinerStyles:styles.placeholderliner,
                        placeholderErrorFrameStyles:styles.placeholdererrorframe,
                        placeholderErrorLinerStyles:styles.placeholdererrorliner,
                        placeholderMessages,
                        dndDragIconStyles:styles.dndDragIcon,
                    }
                )
            )
            
        }

    } else {

        deletedtailitems = localContentlist.splice(listEndChangeCount,-listEndChangeCount)

    }

    const 
        deletedItems = [...deletedheaditems,...deletedtailitems],
        componentList = [...headContentlist,...localContentlist,...tailContentlist]

    return [componentList,deletedItems]

}

// Leading (head) all or partially hidden; tail, visible plus trailing hidden
export const allocateContentList = (
    {

        contentlist, // of cradle, in items (React components)
        axisReferenceIndex, // first tail item
        layoutHandler,

    }
) => {

    const 
        { triggercellIndex } = layoutHandler,

        lowcontentindex = contentlist[0]?.props.index,
        highcontentindex = lowcontentindex + contentlist.length,

        headitemcount = (axisReferenceIndex - lowcontentindex),

        targetTriggercellIndex = 
            (headitemcount == 0)
                ?axisReferenceIndex
                :axisReferenceIndex - 1

    layoutHandler.triggercellIsInTail = 
        (headitemcount == 0)
            ?true
            :false

    if ((triggercellIndex !== undefined) && (lowcontentindex !== undefined)) {
        if ((triggercellIndex >= lowcontentindex) && (triggercellIndex <= highcontentindex)) {
            const 
                triggercellPtr = triggercellIndex - lowcontentindex,
                triggercellComponent = contentlist[triggercellPtr]
            if (triggercellComponent) { // otherwise has been asynchronously cleared
                contentlist[triggercellPtr] = React.cloneElement(triggercellComponent, {isTriggercell:false})
            }
        }
    }

    const 
        triggercellPtr = targetTriggercellIndex - lowcontentindex,
        triggercellComponent = contentlist[triggercellPtr]

    if (triggercellComponent) {

        contentlist[triggercellPtr] = React.cloneElement(triggercellComponent, {isTriggercell:true})
        layoutHandler.triggercellIndex = targetTriggercellIndex

    } else { // defensive; shouldn't happen

        console.log('FAILURE TO REGISTER TRIGGERCELL:scrollerID','-'+layoutHandler.scrollerID+'-')
        console.log('axisReferenceIndex, triggercellIndex, lowcontentindex, highcontentindex, headitemcount, targetTriggercellIndex\n',
            axisReferenceIndex, triggercellIndex, lowcontentindex, highcontentindex, headitemcount, targetTriggercellIndex)
        console.log('triggercellPtr, triggercellComponent, triggercellComponent?.props.isTriggecell, contentlist\n', 
            triggercellPtr, triggercellComponent, triggercellComponent?.props.isTriggecell, 
                {...contentlist})

    }

    const 
        headlist = contentlist.slice(0,headitemcount),
        taillist = contentlist.slice(headitemcount)

    return [ headlist, taillist ]

}

export const deletePortals = (cacheAPI, deleteList, deleteListCallbackWrapper) => {

    const dlist = deleteList.map((item)=>{

        return item.props.index
        
    })

    cacheAPI.deletePortalByIndex(dlist, deleteListCallbackWrapper)
}

// =====================[ internal, acquire item ]======================

const createCellFrame = ({
    index, 
    cradleInheritedProperties,
    cradleInternalProperties,
    instanceIdCounterRef,
    cacheAPI,
    placeholderFrameStyles,
    placeholderLinerStyles,
    placeholderErrorFrameStyles,
    placeholderErrorLinerStyles,
    placeholderMessages,
    dndDragIconStyles,
}) => {

    const 
        instanceID = instanceIdCounterRef.current++,

        { 
        
            orientation,
            cellHeight,
            cellWidth,
            cellMinHeight,
            cellMinWidth,
            getItemPack,
            placeholder,
            scrollerID,
            layout, 
            usePlaceholder,

        } = cradleInheritedProperties,

        listsize = cradleInternalProperties.virtualListProps.size,
        // get new or existing itemID
        itemID = cacheAPI.getNewOrExistingItemID(index),

        props = {

            key: instanceID ,
            orientation,
            cellHeight,
            cellWidth,
            cellMinHeight,
            cellMinWidth,
            layout,
            index,
            getItemPack,
            listsize,
            placeholder,
            itemID,
            instanceID,
            scrollerID,
            isTriggercell:false,
            usePlaceholder,
            placeholderFrameStyles,
            placeholderLinerStyles,
            placeholderErrorFrameStyles,
            placeholderErrorLinerStyles,
            placeholderMessages,
            dndDragIconStyles,
            gridstartstyle:null,

        }

    return <CellFrame { ...props } /> 

}
