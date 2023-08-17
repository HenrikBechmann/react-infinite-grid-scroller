// contenthandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module supports the setup, rollover and positioning of content in the Cradle. 

    There are three key functions in this module: setCradleContent, updateCradleContent, and
    adjustScrollblockForVariability.

    There are also a few functions which support synchronization of Cradle content with cache 
    content (see internal and external services below).

    setCradleContent is called directly from Cradle (in the state manager), and instantiates new Cradle
    content in response to the scroller setup, or changes to its configuration. setCradleContent
    creates a list of Cradle content CellFrames, and allocates those to the two Cradle grids. This 
    process occurs in response to many state changes, such as finishreposition, pivot, a host scrollto
    request, and more.

    updateCradleContent rolls over the Cradle content in response to user scrolling. When scrolling 
    down (or right), content is removed from the Cradle tail and added to the Cradle head (thus moving the 
    Cradle axis), while new content is added to the tail. When scrolling up (or left), the reverse occurs.

    adjustScrollblockForVariability reconfigures the scrollblock to accommodate variable sized grid rows.

    The Cradle (through the contentfunctions module) delegates fetching content items to the CellFrame.

    This module is supported primarily by the contentfunctions module.

*/

import React from 'react'

import { 
    calculateContentListRequirements,
    calculateShiftSpecs,
    allocateContentList,
    deletePortals,
    getCellFrameComponentList, 

} from './contentfunctions'

// import { isSafariIOS } from '../InfiniteGridScroller'

export default class ContentHandler {

   constructor(cradleParameters) {

      this.cradleParameters = cradleParameters

   }

   public content = {

      cradleModelComponents: null,
      headModelComponents: null,
      tailModelComponents: null,
      // the following two only used in cradle for render
      headDisplayComponents: [],
      tailDisplayComponents: [],

    }

    private cradleParameters

    private instanceIdCounterRef = {

       current:0

    }

    // =============================[ UPDATE VIRTUAL LIST SIZE OR RANGE ]==========================
    // these are utilities

    // reset the cradle with new content, including allocation between head and tail parts of the cradle
    // - called only from the Cradle state handler
    public updateVirtualListSize = (newlistsize) => {

        const { cradleParameters } = this
        const cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current
        const cradleHandlers = cradleParameters.handlersRef.current

        const { 

            cradleContentProps,
            setVirtualListSize,

        } = cradleInternalProperties

        if (newlistsize == 0) {

            const 
                cradleContent = this.content,
                { layoutHandler } = cradleHandlers,
                { cradlePositionData } = layoutHandler

            this.clearCradle()
            cradleContent.headDisplayComponents = []
            cradleContent.tailDisplayComponents = []
            Object.assign(cradleContentProps, 
                {
                    SOL:undefined, 
                    EOL:undefined,
                    highindex:undefined, 
                    lowindex:undefined, 
                    axisReferenceIndex:undefined,
                    size:0 
                }
            )

            cradlePositionData.targetAxisReferencePosition = 0
            cradlePositionData.targetAxisViewportPixelOffset = 0

        }

        setVirtualListSize(newlistsize)

    }

    public updateVirtualListRange = (newlistrange) => {

        const
            { cradleParameters } = this,

            cradleHandlers = cradleParameters.handlersRef.current,

            {
                layoutHandler,

            } = cradleHandlers,

            {

                setVirtualListRange,
                virtualListProps,
                cradleContentProps,

            } = this.cradleParameters.cradleInternalPropertiesRef.current,

            { 
            
                cradlePositionData,

            } = layoutHandler

        let newlistsize
        if (newlistrange.length == 0) {

            newlistsize = 0
            cradlePositionData.targetAxisReferencePosition = 0
            cradlePositionData.targetAxisViewportPixelOffset = 0

        } else {

            const [newlowindex, newhighindex] = newlistrange

            if (virtualListProps.range.length) {

                const {lowindex:previouslowindex} = virtualListProps

                const lowindexchange = newlowindex - previouslowindex

                cradlePositionData.targetAxisReferencePosition -= lowindexchange

            }

            newlistsize = newhighindex - newlowindex + 1

        }

        if (newlistsize == 0) {

            const cradleContent = this.content        

            this.clearCradle()
            cradleContent.headDisplayComponents = []
            cradleContent.tailDisplayComponents = []
            Object.assign(cradleContentProps, 
                {
                    SOL:undefined, 
                    EOL:undefined,
                    highindex:undefined, 
                    lowindex:undefined, 
                    axisReferenceIndex:undefined,
                    size:0 
                }
            )

        }

        setVirtualListRange(newlistrange)

    }

    // Three main public methods - setCradleContent, updateCradleContent, and adjustScrollblockForVariability

    // ==========================[ SET CONTENT ]===========================

    public setCradleContent = ( cradleState ) => { // cradleState influences some behaviour

        // ------------------------------[ 1. initialize ]---------------------------

        const 

            { cradleParameters } = this,

            ViewportContextProperties = cradleParameters.ViewportContextPropertiesRef.current,
            cradleHandlers = cradleParameters.handlersRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

            viewportElement = ViewportContextProperties.elementRef.current,

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
                gap, 
                padding, 
                cellHeight,
                cellWidth,
                styles,
                placeholderMessages,
                scrollerID, // debug

            } = cradleInheritedProperties,

            { 

                virtualListProps, 
                cradleContentProps,

            } = cradleInternalProperties,

            {

                lowindex:listlowindex, 
                // highindex:listhighindex, 
                size:listsize, 
                crosscount, 
                rowcount:listRowcount,
                baserowblanks,
                // endrowblanks,

            } = virtualListProps

        const cradleContent = this.content

        let { targetAxisViewportPixelOffset } =  cradlePositionData

        // ----------------------[ 2. normalize data ]--------------------------

        // in bounds
        let workingAxisReferencePosition = Math.min(requestedAxisReferencePosition,listsize - 1)
        workingAxisReferencePosition = Math.max(workingAxisReferencePosition, 0)

        // shifted by virtual list low range
        let workingAxisReferenceIndex  = workingAxisReferencePosition + listlowindex

        // calculate axis reference base index
        workingAxisReferenceIndex -=
            workingAxisReferenceIndex < 0? 
                (workingAxisReferenceIndex % crosscount)?
                    (crosscount - Math.abs(workingAxisReferenceIndex % crosscount)):
                    0:
                workingAxisReferenceIndex % crosscount

        // reposition at row boundary
        if ([
            'firstrender', 
            'firstrenderfromcache',
            'finishreposition', 
            'reconfigure', 
            'scrollto', 
        ].includes(cradleState)) {

            targetAxisViewportPixelOffset = 
                (workingAxisReferenceIndex == listlowindex)?
                    padding:
                    gap // default

        }

        const workingContentList = []

        // ----------------------[ 3. get content requirements ]----------------------

        const baseRowPixelLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth)
            + gap

        const {

            // by index
            targetCradleReferenceIndex, 
            targetAxisReferenceIndex,

            // counts
            newCradleContentCount:cradleContentCount, 

            // target scrollPos by pixels
            targetScrollblockViewportPixelOffset:scrollblockViewportPixelOffset,

        } = calculateContentListRequirements({

                // pixel
                baseRowPixelLength,
                targetAxisViewportPixelOffset,

                // index
                targetAxisReferenceIndex:workingAxisReferenceIndex,

                // resources
                cradleInheritedProperties,
                cradleInternalProperties,

            })

        const axisViewportPixelOffset = targetAxisViewportPixelOffset // semantics

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
            instanceIdCounterRef:this.instanceIdCounterRef,
            styles,
            placeholderMessages,

        })

        // update cradleContentProps from newcontentlist
        cradleContentProps.size = newcontentlist.length
        if (cradleContentProps.size) {

            const 
                lowindex = newcontentlist[0].props.index,
                highindex = lowindex + cradleContentProps.size - 1

            Object.assign(cradleContentProps,
            {
                lowindex,
                highindex,
                axisReferenceIndex:targetAxisReferenceIndex,
                SOL:(virtualListProps.lowindex == lowindex),
                EOL:(virtualListProps.highindex == highindex),
            })

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

        // set or cancel first row offset if within cradle
        let gridstart
        if (cradleContentProps.SOL === true && 
            !(virtualListProps.baserowblanks === undefined || 
            virtualListProps.baserowblanks === 0)) {
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
        cradlePositionData.targetAxisViewportPixelOffset = axisViewportPixelOffset

        if (serviceHandler.callbacks.referenceIndexCallback) {

            const cstate = cradleState

            serviceHandler.callbacks.referenceIndexCallback(

                targetAxisReferenceIndex,'setCradleContent', cstate)
        
        }

        //  ----------------------[ 5. set CSS ]-----------------------

        // reset scrollblock Offset and length
        const scrollblockElement = viewportElement.firstChild

        const blockbaselength = (listRowcount * baseRowPixelLength) - gap // final cell has no trailing gap
            + (padding * 2) // leading and trailing padding

        if (cradleState == 'pivot') {

            if (orientation == 'vertical') {

                scrollblockElement.style.left = null

            } else {

                scrollblockElement.style.top = null

            }

        }

        if (orientation == 'vertical') {

            scrollblockElement.style.top = null
            scrollblockElement.style.height = blockbaselength + 'px'

        } else {

            scrollblockElement.style.left = null
            scrollblockElement.style.width = blockbaselength + 'px'

        }

        cradlePositionData.blockScrollPos = scrollblockViewportPixelOffset 
        // avoid bogus call to updateCradleContent

        scrollHandler.resetScrollData(scrollblockViewportPixelOffset) 

        const 
            scrollTop = viewportElement.scrollTop,
            scrollLeft = viewportElement.scrollLeft

        let scrollOptions
        if (cradlePositionData.blockScrollProperty == 'scrollTop') {
            scrollOptions = {
                top:cradlePositionData.blockScrollPos,
                left:scrollLeft,
                behavior:'instant',
            }
        } else {
            scrollOptions = {
                left:cradlePositionData.blockScrollPos,
                top:scrollTop,
                behavior:'instant',
            }            
        }

        viewportElement.scroll(scrollOptions)

        const 
            cradleElements = layoutHandler.elements,

            axisElement = cradleElements.axisRef.current,
            headElement = cradleElements.headRef.current,

            axisScrollblockPixelOffset = 
                scrollblockViewportPixelOffset + axisViewportPixelOffset

        if (orientation == 'vertical') {

            const top = axisScrollblockPixelOffset 

            axisElement.style.top = top + 'px'
            axisElement.style.left = 'auto'

            headElement.style.padding = 
                headcontentlist.length?
                    `${padding}px ${padding}px ${gap}px ${padding}px`:
                    `${padding}px ${padding}px 0px ${padding}px`

        } else { // orientation = 'horizontal'

            const left = axisScrollblockPixelOffset

            axisElement.style.top = 'auto'
            axisElement.style.left = left + 'px'

            headElement.style.padding = 
                headcontentlist.length?
                    `${padding}px ${gap}px ${padding}px ${padding}px`:
                    `${padding}px 0px ${padding}px ${padding}px`

        }

    }

    // ==================[ UPDATE CONTENT through scroll ]========================

    // updateCradleContent does not touch the viewport element's scroll position for the scrollblock
    // instead it reconfigures elements within the cradle. It is called solely from
    // axisTriggerlinesObserverCallback of interruptHandler.
    // typically called for scroll action, but can also be called if the triggerLineCell changes
    // size with variant layout.

    public updateCradleContent = () => {

        // ----------------------[ 1. initialize ]-------------------------

        const 
            { 
            
                cradleParameters,
                content:cradleContent,

            } = this,

            viewportElement = cradleParameters.ViewportContextPropertiesRef.current.elementRef.current,
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
                padding, 
                gap,
                scrollerID, // debug

            } = cradleInheritedProperties,

            {

                virtualListProps,
                cradleContentProps,

            } = cradleInternalProperties,

            { 

                crosscount,
                lowindex:listlowindex,

            } = virtualListProps,

            // new vars
            scrollPos = 
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
            newAxisViewportPixelOffset, 

        } = calculateShiftSpecs({

            shiftinstruction,
            triggerViewportReferencePixelPos,
            scrollPos,
            scrollblockElement: viewportElement.firstChild,

            cradleInheritedProperties,
            cradleContentProps,
            virtualListProps,
            cradleContent,
            cradleElements,

        })

        const 
            axisViewportPixelOffset = newAxisViewportPixelOffset,

            isShift = !((axisItemShift == 0) && (cradleItemShift == 0)),
            axisElement = cradleElements.axisRef.current,
            headElement = cradleElements.headRef.current

        // the triggerlines will be moved, so disconnect them from their observer.
        // they are reconnected with 'renderupdatedcontent' state in cradle.tsx, or at 'finishupdateforvariability'
        //    for variable content
        interruptHandler.triggerlinesIntersect.disconnect()

        // abandon option; nothing to do but reposition
        if (!isShift) { // can happen first row; oversized last row
    
            cradlePositionData.targetAxisViewportPixelOffset = axisViewportPixelOffset
            this.applyStyling({
                layout, orientation, padding, gap, cellHeight, cellWidth, 
                crosscount, 
                axisReferenceIndex, axisViewportPixelOffset, scrollPos, 
                headcontent:cradleContent.headModelComponents,
                axisElement, headElement, listlowindex,
            })

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
                instanceIdCounterRef:this.instanceIdCounterRef,
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

            const firstcomponent = updatedContentList[0]

            let gridstartstyle
            if (orientation == 'vertical') {
                gridstartstyle = {gridColumnStart:gridstart}
            } else {
                gridstartstyle = {gridRowStart:gridstart}
            }
            const revisedcomponent = React.cloneElement(firstcomponent,{gridstartstyle})
            updatedContentList[0] = revisedcomponent

        } else {

            updatedContentList = modelcontentlist
            Object.assign(cradleContentProps, { axisReferenceIndex })

        }

        if (deletedContentItems.length && (cache == 'cradle')) {

            const { deleteListCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('pare cache to cradle',deleteList)

                }

            }

            deletePortals(cacheAPI, deletedContentItems, dListCallback)

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
        cradlePositionData.targetAxisViewportPixelOffset = axisViewportPixelOffset

        if (isShift) cacheAPI.renderPortalLists()

        this.applyStyling({
            layout, orientation, padding, gap, cellHeight, cellWidth, 
            crosscount, 
            axisReferenceIndex, axisViewportPixelOffset, scrollPos, 
            headcontent,
            axisElement, headElement, listlowindex
        })

        // load new display data
        cradleContent.headDisplayComponents = cradleContent.headModelComponents
        cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

    }

    // move the offset of the axis
    private applyStyling = ({
        layout, orientation, padding, gap, cellHeight, cellWidth, 
        crosscount, 
        axisReferenceIndex, axisViewportPixelOffset, scrollPos, 
        headcontent,
        axisElement, headElement, listlowindex
    }) => {
        
        if (layout == 'variable') return // there's a separate routine for variable adjustments and css

        // --------------
        // Safari when zoomed drifts (calc precision one presumes). This is a hack to correct that.
        const preAxisVirtualRows = Math.ceil( ( axisReferenceIndex - listlowindex )/crosscount )
    
        const baseCellLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth)
            + gap

        const testScrollPos = (baseCellLength * preAxisVirtualRows) + padding - axisViewportPixelOffset
        const scrollDiff = testScrollPos - scrollPos

        if (scrollDiff) {
            axisViewportPixelOffset += scrollDiff
        }

        let topAxisPos, leftAxisPos // available for debug
        if (orientation == 'vertical') {

            topAxisPos = scrollPos + axisViewportPixelOffset

            axisElement.style.top = topAxisPos + 'px'
            axisElement.style.left = 'auto'
            
            headElement.style.padding = 
                headcontent.length?
                    `${padding}px ${padding}px ${gap}px ${padding}px`:
                    `${padding}px ${padding}px 0px ${padding}px`

        } else { // 'horizontal'

            leftAxisPos = scrollPos + axisViewportPixelOffset

            axisElement.style.top = 'auto'
            axisElement.style.left = leftAxisPos + 'px'

            headElement.style.padding = 
                headcontent.length?
                    `${padding}px ${gap}px ${padding}px ${padding}px`:
                    `${padding}px 0px ${padding}px ${padding}px`
        }

    }

    // ===================[ RECONFIGURE THE SCROLLBLOCK FOR VARIABLE CONTENT ]=======================

/*  
    blockScrollPos is the amount the scrollBlock is scrolled to reveal the centre of the Cradle
        at the edge of the Viewport
    
    the length of the Scrollblock is shortened by the amount the measured tail length differs from the 
        base tail length

    Called for variable layout only. All DOM elements should have been rendered at this point
    sets CSS: scrollblockElement top and height (or left and width), and axisElement top (or left)
    to get closer to natural proportions
*/

    public adjustScrollblockForVariability = (source) => {

        // ----------------------[ setup base values and references ]------------------------

        // resources...
        const
        { cradleParameters } = this,
            cradleHandlers = cradleParameters.handlersRef.current,
            ViewportContextProperties = cradleParameters.ViewportContextPropertiesRef.current,
            cradleInheritedProperties = cradleParameters.cradleInheritedPropertiesRef.current,
            cradleInternalProperties = cradleParameters.cradleInternalPropertiesRef.current,

        {

            layoutHandler, 
            scrollHandler, 
            interruptHandler 

        } = cradleHandlers,

        { 

            elements: cradleElements, 
            cradlePositionData 

        } = layoutHandler,

        // current configurations...
        { 

            targetAxisReferencePosition: axisReferencePosition,
            targetAxisViewportPixelOffset: axisViewportPixelOffset,

        } = cradlePositionData,

        // element references...
        viewportElement = ViewportContextProperties.elementRef.current,
        scrollblockElement = viewportElement.firstChild,
        headGridElement = cradleElements.headRef.current,
        tailGridElement = cradleElements.tailRef.current,
        axisElement = cradleElements.axisRef.current,

        {

            orientation, 
            gap, 
            padding, 
            cellHeight,
            cellWidth,

        } = cradleInheritedProperties,

        {

            virtualListProps,
            cradleContentProps,

        } = cradleInternalProperties,

        { 

            crosscount, 
            rowcount:listRowcount,
            lowindex:listlowindex,
            rowshift:listrowshift,


        } = virtualListProps

        // ------------------------[ calculations ]------------------------

        const 
            axisReferenceIndex = axisReferencePosition + listlowindex,
            // rowcounts and row offsets for positioning
            // listRowcount taken from internal properties above
            headRowCount = Math.ceil(headGridElement.childNodes.length/crosscount),
            tailRowCount = Math.ceil(tailGridElement.childNodes.length/crosscount),

            // reference rows - cradle first/last; axis; list end
            axisReferenceRow = Math.floor(axisReferenceIndex/crosscount),

            cradleReferenceRow = axisReferenceRow - headRowCount,
            cradleLastRow = axisReferenceRow + (tailRowCount - 1),
            listLastRow = listRowcount - 1 + listrowshift,

            preCradleRowCount = cradleReferenceRow - listrowshift,
            postCradleRowCount = listLastRow - cradleLastRow,

            // base pixel values
            baseCellLength = 
                ((orientation == 'vertical')?
                    cellHeight:
                    cellWidth
                ) + gap,

            measuredTailPixelLength = 
                (orientation == 'vertical')?
                    tailGridElement.offsetHeight:
                    tailGridElement.offsetWidth,

            basePostCradlePixelLength = postCradleRowCount * baseCellLength,

            computedPostAxisPixelLength = basePostCradlePixelLength + measuredTailPixelLength,

            // base figures used for preAxis #s for compatibility with repositioning, which uses base figures
            basePreAxisPixelLength = ((preCradleRowCount + headRowCount) * baseCellLength) + padding

        // ------------------------[ layout adjustments ]----------------------

        interruptHandler.signals.pauseCradleIntersectionObserver = true

        const 
            computedScrollblockPixelLength = basePreAxisPixelLength + computedPostAxisPixelLength,
            blockScrollPos = basePreAxisPixelLength - axisViewportPixelOffset,
            newAxisScrollblockPixelOffset = blockScrollPos + axisViewportPixelOffset // ie. basePreAxisPixelLength, but semantics

        if (orientation == 'vertical') {

            axisElement.style.top = newAxisScrollblockPixelOffset + 'px'

            scrollblockElement.style.height = (computedScrollblockPixelLength) + 'px'

        } else { // 'horizontal'

            axisElement.style.left = newAxisScrollblockPixelOffset + 'px'

            scrollblockElement.style.width = computedScrollblockPixelLength + 'px'

        }
        // -----------------------[ scrollPos adjustment ]-------------------------

        if (orientation == 'vertical') {

            headGridElement.style.padding = 
                headRowCount?
                    `${padding}px ${padding}px ${gap}px ${padding}px`:
                    `${padding}px ${padding}px 0px ${padding}px`

        } else {

            headGridElement.style.padding = 
                headRowCount?
                    `${padding}px ${gap}px ${padding}px ${padding}px`:
                    `${padding}px 0px ${padding}px ${padding}px`

        }

        // temporarily adjust scrollblockElement offset; onAfterScrollForVariable transfers shift to blockScrollPos
        const startingScrollPos = 
            (orientation == 'vertical')?
                viewportElement.scrollTop:
                viewportElement.scrollLeft

        const scrollDiff = blockScrollPos - startingScrollPos

        if (orientation == 'vertical') {

            scrollblockElement.style.top = -scrollDiff + 'px'

        } else {

            scrollblockElement.style.left = -scrollDiff + 'px'

        }

        // check for gotoIndex or resize overshoot
        if ((source == 'setcradle') && !postCradleRowCount) { 

            const viewportPixelLength = 
                (orientation == 'vertical')?
                    viewportElement.offsetHeight:
                    viewportElement.offsetWidth

            const alignedEndPosDiff = 
                axisViewportPixelOffset + measuredTailPixelLength - viewportPixelLength

            if (alignedEndPosDiff < 0) { // fill the bottom of the viewport using scrollBy

                const scrollByY = 
                    (orientation == 'vertical')?
                        alignedEndPosDiff:
                        0

                const scrollByX =
                    (orientation == 'vertical')?
                        0:
                        alignedEndPosDiff

                const options = {
                    top:scrollByY,
                    left:scrollByX,
                    behavior:'instant'
                }

                viewportElement.scrollBy( options )

            }

        }

    }

    // ========================= [ INTERNAL CONTENT MANAGEMENT SERVICES ]=====================

    public guardAgainstRunawayCaching = () => { 

        const { cacheMax, MAX_CACHE_OVER_RUN } = this.cradleParameters.cradleInheritedPropertiesRef.current

        const { cacheAPI } = this.cradleParameters.handlersRef.current

        const modelComponentList = this.content.cradleModelComponents
 
        if (cacheAPI.guardAgainstRunawayCaching(cacheMax, modelComponentList.length, MAX_CACHE_OVER_RUN )) {

            this.pareCacheToMax()

        }
    }
    
    public pareCacheToMax = () => {

        const cradleInheritedProperties = this.cradleParameters.cradleInheritedPropertiesRef.current

        const { cache, scrollerID } = cradleInheritedProperties
        
        if (cache == 'keepload') {

            const cradleHandlers = this.cradleParameters.handlersRef.current
            const { cacheAPI, serviceHandler } = cradleHandlers

            const modelIndexList = this.getModelIndexList()

            const { deleteListCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('pare cache to cacheMax',deleteList)

                }

            }

            if (cacheAPI.pareCacheToMax(
                cradleInheritedProperties.cacheMax, modelIndexList, dListCallback)) {
            
                cacheAPI.renderPortalLists()
                
            }
                            
        }

    }

    // ==========================[ EXTERNAL SERVICE SUPPORT ]=======================

    // supports clearCache
    public clearCradle = () => {

        const cradleContent = this.content
        // const { cacheAPI } = this.cradleParameters.handlersRef.current

        cradleContent.cradleModelComponents = []

        cradleContent.headModelComponents = []
        cradleContent.tailModelComponents = []

    }

    // called from serviceHandler getCradleIndexMap
    // also supports pareCacheToMax, matchCacheToCradle
    public getModelIndexList() {

        const { cradleModelComponents } = this.content

        if (!cradleModelComponents) {

            return [] 

        } else {

            return cradleModelComponents.map((item)=>item.props.index)

        }

    }

    // supports moveIndex and insertRemoveIndex, 
    // updates cradle contiguous items from startChangeIndex or start of cradle
    public synchronizeCradleItemIDsToCache(updatedIndexList, isInsertRemove = 0, startChangeIndex = null) { // 0 = move

        // asssemble resources
        const { cacheAPI } = this.cradleParameters.handlersRef.current
        // const { indexToItemIDMap } = cacheAPI.cacheProps
        const { indexToItemIDMap } = cacheAPI

        const { cradleModelComponents } = this.content

        const { cradleContentProps } = this.cradleParameters.cradleInternalPropertiesRef.current

        if (cradleContentProps.size == 0) return

        const { lowindex:lowSpan, highindex:highSpan } = cradleContentProps

        let startIndex, endIndex
        if (isInsertRemove) {

            if (startChangeIndex > highSpan) return

            startIndex = startChangeIndex
            endIndex = highSpan

        } else { // move

            if (updatedIndexList.length == 0) return

            startIndex = updatedIndexList[0]
            endIndex = updatedIndexList.at(-1)

        }

        const updatedSpan = endIndex - startIndex + 1

        let firstIndex = startIndex

        if (firstIndex > highSpan) return

        if (firstIndex < lowSpan) firstIndex = lowSpan

        const lowPtr = firstIndex - lowSpan

        const highPtr = isInsertRemove?
            cradleModelComponents.length - 1:
            Math.min(cradleModelComponents.length - 1,lowPtr + updatedSpan - 1)

        // function to update individual cradle components to cache changes
        function processcomponentFn(component, componentptr, componentarray) {

            const index = component.props.index

            const cacheItemID = indexToItemIDMap.get(index)

            // if cache has no component for cradle item, then get one
            if (cacheItemID === undefined) {

                const newItemID = cacheAPI.getNewItemID()
                componentarray[componentptr] = React.cloneElement(component, {itemID:newItemID})
                return

            } else { // match cache itemID to cradle component itemID

                const cradleItemID = component.props.itemID

                const updateptr = updatedIndexList.indexOf(index) // TODO verify need for updatelist

                if (updateptr != -1) { // update list confirms there is a cache item for this index

                    if (cacheItemID == cradleItemID) return

                    componentarray[componentptr] = React.cloneElement(component, {itemID:cacheItemID})

                } else {

                    const newItemID = cacheAPI.getNewItemID()
                    componentarray[componentptr] = React.cloneElement(component, {itemID:newItemID})

                }

            }

        }

        for (let ptr = lowPtr; ptr <= highPtr; ptr++) {
            processcomponentFn(cradleModelComponents[ptr], ptr, cradleModelComponents)
        }

    }

    // supports remapIndexes
    public createNewItemIDs(newList) {

        if (!newList.length) return

        const { cacheAPI } = this.cradleParameters.handlersRef.current
        const { cradleModelComponents } = this.content

        const { cradleContentProps } = this.cradleParameters.cradleInternalPropertiesRef.current

        if (cradleContentProps.size == 0) return

        const { lowindex:lowSpan, highindex:highSpan } = cradleContentProps

        function processcomponentFn(newlistindex) {

            if (newlistindex < lowSpan || newlistindex > highSpan) return // defensive

            const cradlePtr = newlistindex - lowSpan

            const component = cradleModelComponents[cradlePtr]

            const newItemID = cacheAPI.getNewItemID()

            cradleModelComponents[cradlePtr] = React.cloneElement(component, {itemID:newItemID})

        }

        newList.forEach(processcomponentFn)

    }

    // called from service handler's remapIndexes, as last step
    public reconcileCellFrames(modifiedIndexesList) {

        if (!modifiedIndexesList.length) return

        const { cradleModelComponents } = this.content

        const { cacheAPI } = this.cradleParameters.handlersRef.current

        const { indexToItemIDMap } = cacheAPI

        function processComponentFn (component, i, array ) {
            const { index, itemID } = component.props
            if (modifiedIndexesList.includes(index)) {

                const newItemID = 
                    indexToItemIDMap.has(index)?
                        indexToItemIDMap.get(index):
                        cacheAPI.getNewItemID()

                if (newItemID != itemID) { // defensive; shouldn't happen

                    array[i] = React.cloneElement(component, {itemID:newItemID})

                }
            }
        }

        cradleModelComponents.forEach(processComponentFn)

        this.content.headModelComponents = cradleModelComponents.slice(0,this.content.headModelComponents.length)
        this.content.tailModelComponents = cradleModelComponents.slice(this.content.headModelComponents.length)

    }

}