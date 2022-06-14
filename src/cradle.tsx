// cradle.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    Description
    -----------
    The GridStroller provides the illusion of infinite scrolling through the use of a data 'cradle' inside a viewport.
    The illusion is maintained by synchronizing changes in cradle content with cradle location inside a scrollblock, such
    that as the scrollblock is moved, the cradle moves oppositely in the scrollblock (to stay visible within the viewport). 
    The scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size and position which 
    realistically reflects the size of the list being shown.

    The position of the cradle is controlled by a 'axis' which is a 0px height/width (along the medial - ScrollBlock can be 
    verticsl or horizontal). The purpose of the axis is to act as a 'fold', above which cell content expands 'upwards', and 
    below which the cell content expands  'downwards'. GridScroller can be viewed vertically or horizontally. When horizontal, 
    the axis has a 0px width, so that the 'fold' is vertical, and cells expand to the left and right.

    The axis is controlled to always be in the at the leading edge of the leading cellrow of the viewport. Thus
    in vertical orientation, the axis 'top' css attribute is always equal to the 'scrollTop' position of the scrollblock,
    plus an adjustment. The adjustment is the result of the alignment of the axis in relation to the top-(or left-)most cell
    in the viewport (the 'reference' row). The axis can only be placed at the leading edge of the first visible
    cell in the viewport. Therefore the axis offset from the leading edge of the viewport can be anywhere from minus to
    plus the length of the leading row. The exact amount depends on where the 'breakpoint' of transition notification is set for
    cells crossing the viewport threshold (and can be configured). The default of the breakpoint is .5 (half the length of the cell).

    Technically, there are several reference points tracked by the GridScroller. These are:
        - axisReferenceIndex (the virtual index of the item controlling the location of the axis)
            The axisReferenceIndex is also used to allocate items above (lower index value) and below (same or higher index value)
            the fold
        - cradleReferenceIndex (the virtual index of the item defining the leading bound of the cradle content)
        - axisPixelOffset (pixels - plus or minus - that the axis is placed in relation to the viewport's leading edge) 
    
    These reference points are applied to the following structures:
        - the viewport
        - the scrollblock
        - the cradle, consisting of
            - the axis (contains cradle head and tail)
            - the head (contains leading items)
            - the tail (contains trailing items)

    Structure details:
        the cradle content consists of
        - the number of rows that are visible in the viewport (according to the default parameters)
            - this typically includes one partially visible row
        - the number of runway rows specified in the parameters, times 2 (one et for the head; one for the tail)
        - the number of items is the number of rows times the 'crosscount' the lateral number of cells. 
        - the last row might consist of fewer items than crosscount, to match the maximum listsize
        - the cradleRowcount (visible default rows + runwayRowcountSpec * 2) and viewpointRowcount (visble rows;typicall one partial)

    Item containers:
        Client cell content is contained in CellShell's, which are configured according to GridScroller's input parameters.
        The ItemCell's are in turn contained in CSS grid structures. There are two grid structures - one in the cradle head,
        and one in the cradle tail. Each grid structure is allowed uniform padding and gaps - identical between the two.

    Overscroll handling:
        Owing to the weight of the code, and potential rapidity of scrolling, there is an overscroll protocol. 
        if the overscroll is such that part of the cradle is still within the viewport boundaries, then the overscroll
        is calculated as the number of cell rows that would fit (completely or partially) in the space between the edge of 
        the cradle that is receding from a viewport edge. 

        If the overshoot is such that the cradle has entirely passed out of the viewport, the GridScroller goes into 'Repositoining'
        mode, meaning that it tracks relative location of the axis edge of the viewport, and repaints the cradle accroding to
        this position when the scrolling stops.
*/

/*
    Cradle is activated by interrupts:
    - resizing of the viewport (1)
    - observer callbacks:
        - cradle viewport intersection for repositioning when the cradle races out of scope - by scroll (2)
        - cellShell viewport intersection which triggers rolling of content - by scroll (3)
            - rolling content triggers re-allocation of content between cradle wings
        - cradle wing resize (responding to variable length cell changes) which triggers reconfiguration (4)
    - pivot - change of orientation (5)
    - host change of other configuration specs (6)
*/

'use strict'

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportInterrupt } from './viewport'

// popup position tracker for repositioning
import ScrollTracker from './scrolltracker'

// support code
import { PortalHandler, PortalList } from './cradle/portalhandler'
import ScrollHandler from './cradle/scrollhandler'
import StateHandler from './cradle/statehandler'
import ContentHandler from './cradle/contenthandler'
import ScaffoldHandler from './cradle/scaffoldhandler'
import InterruptHandler from './cradle/interrupthandler'
import ServiceHandler from './cradle/servicehandler'
import StylesHandler from './cradle/styleshandler'

// for children
export const CradlePortalsContext = React.createContext(null) // for children

const portalrootstyle = {display:'none'} // static 

// component
const Cradle = ({ 
        gridSpecs,

        runwayRowcountSpec, 
        listsize, 
        defaultVisibleIndex, 
        getItem, 
        placeholder, 
        functions,
        styles,

        scrollerName,
        scrollerID,
        triggerlineOffset,
    }) => {

    if (listsize == 0) return // nothing to do

    // ========================[ DATA SETUP ]========================

    // unpack gridSpecs
    const {
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
        dense,
    } = gridSpecs

    // bundle cradle props to pass to handlers
    const cradleInheritedPropertiesRef = useRef(null) // access by closures and support functions
    cradleInheritedPropertiesRef.current = {
        // gridSpecs
        orientation, 
        gap, 
        padding, 
        cellHeight, 
        cellWidth, 
        layout,
        dense,
        // ...rest
        listsize, 
        defaultVisibleIndex, 
        getItem, 
        placeholder, 
        scrollerName,
        scrollerID,
        // objects
        functions,
        styles,
        triggerlineOffset,

    }

    // get viewport context
    const viewportInterruptProperties = useContext(ViewportInterrupt)
    const viewportInterruptPropertiesRef = useRef(null)
    viewportInterruptPropertiesRef.current = viewportInterruptProperties // for closures

    const { viewportDimensions } = viewportInterruptProperties
    const { height:viewportheight,width:viewportwidth } = viewportDimensions

    const [cradleState, setCradleState] = useState('setup')
    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState;

    // controls
    const isMountedRef = useRef(true)
    // const normalizeTimerRef = useRef(null)

    // cradle scaffold elements refs
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const axisCradleElementRef = useRef(null)
    const headTriggerlineCradleElementRef = useRef(null)
    const tailTriggerlineCradleElementRef = useRef(null)
    const cradleElementsRef = useRef(
        {
            headRef:headCradleElementRef, 
            tailRef:tailCradleElementRef, 
            axisRef:axisCradleElementRef,
            headTriggerlineRef:headTriggerlineCradleElementRef,
            tailTriggerlineRef:tailTriggerlineCradleElementRef
        }
    )

    // configuration calculations
    const crosscount = useMemo(() => {

        const viewportsize = (orientation == 'horizontal')?viewportheight:viewportwidth
        const crossLength = (orientation == 'horizontal')?cellHeight:cellWidth

        const viewportlengthforcalc = viewportsize - (padding * 2) + gap // length of viewport
        let tilelengthforcalc = crossLength + gap
        tilelengthforcalc = Math.min(tilelengthforcalc,viewportlengthforcalc) // result cannot be less than 1

        return Math.floor(viewportlengthforcalc/tilelengthforcalc)

    },[
        orientation, 
        gap, 
        padding, 
        cellWidth, 
        cellHeight, 
        viewportheight, 
        viewportwidth,
    ])

    const [
        cradleRowcount, 
        viewportRowcount, 
        viewportVisibleRowcount, // max number of rows completely visible at once
        listRowcount,
        runwayRowcount,
    ] = useMemo(()=> {

        let viewportLength, cellLength
        if (orientation == 'vertical') {
            viewportLength = viewportheight
            cellLength = cellHeight
        } else {
            viewportLength = viewportwidth
            cellLength = cellWidth
        }

        cellLength += gap

        const viewportRowcount = Math.ceil(viewportLength/cellLength)

        const viewportVisibleRowcount = Math.floor(viewportLength/cellLength)

        const listRowcount = Math.ceil(listsize/crosscount)

        const calculatedCradleRowcount = viewportRowcount + (runwayRowcountSpec * 2)

        let cradleRowcount = Math.min(listRowcount, calculatedCradleRowcount)

        let runwayRowcount
        if (calculatedCradleRowcount >= cradleRowcount) {
            runwayRowcount = runwayRowcountSpec
        } else {
            const diff = (cradleRowcount - calculatedCradleRowcount)
            runwayRowcount -= Math.floor(diff/2)
            runwayRowcount = Math.max(0,runwayRowcount)
        }
        let itemcount = cradleRowcount * crosscount
        if (itemcount > listsize) {
            itemcount = listsize
            cradleRowcount = Math.ceil(itemcount/crosscount)
        }

        return [
            cradleRowcount, 
            viewportRowcount, 
            viewportVisibleRowcount,
            listRowcount,
            runwayRowcount,
        ]

    },[
        orientation, 
        gap, 
        // padding,
        cellWidth, 
        cellHeight, 
        viewportheight, 
        viewportwidth,

        listsize,
        runwayRowcountSpec,
        crosscount,
    ])

    // bundle configuration properties to share
    const cradleInternalPropertiesRef = useRef(null)
    cradleInternalPropertiesRef.current = {
        crosscount,
        cradleRowcount,
        viewportRowcount,
        viewportVisibleRowcount,
        listRowcount,
        runwayRowcount,
        cradleStateRef,
        setCradleState,
        isMountedRef,
        cradleElementsRef,
    }

    // utility to register or unregister cradle item elements
    const setItemElementData = useCallback((itemElementData, registrationType) => {

        const [index, shellref] = itemElementData

        if (registrationType == 'register') {

            contentHandler.itemElements.set(index,shellref)

        } else if (registrationType == 'unregister') {

            contentHandler.itemElements.delete(index)

        }

    },[])

    const internalCallbacksRef = useRef({

        setElementData:setItemElementData

    })

    // host callbacks
    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)

    const externalCallbacksRef = useRef({referenceIndexCallbackRef})

    // placeholder in cradleParameters to make available individual handlers
    const handlersRef = useRef(null)

    // cradle parameters master bundle
    const cradleParameters = {
        handlersRef,
        viewportInterruptPropertiesRef,
        cradleInheritedPropertiesRef, 
        cradleInternalPropertiesRef, 
        internalCallbacksRef,
        externalCallbacksRef,
    }

    // ongoing source of handlers
    const holdHandlersRef = useRef(null)

    if (!holdHandlersRef.current) {
        holdHandlersRef.current = getCradleHandlers(cradleParameters)
    }

    // make handlers directly available to cradle code
    const {
        portalHandler,
        interruptHandler,
        scrollHandler,
        stateHandler,
        contentHandler,
        scaffoldHandler,
        serviceHandler,
        stylesHandler,
    } = holdHandlersRef.current

    // map to instantiate handlersRef for cradleParameters
    const handlerMapRef = useRef({
        portals:portalHandler,
        interrupts:interruptHandler,
        scroll:scrollHandler,
        state:stateHandler,
        content:contentHandler, 
        scaffold:scaffoldHandler, 
        service:serviceHandler,
        styles:stylesHandler,
    });

    handlersRef.current = handlerMapRef.current // back-fill cradleParameters property

    // ===================[ INITIALIZATION effects ]=========================

    // this is an immediate response to reparenting. Reparenting resets scroll positions
    // for nested infinitegridscrollers.
    // the code restores scroll as soon as cradle is invoked after reparenting
    if (viewportInterruptProperties.portal?.isReparenting) { 

        viewportInterruptProperties.portal.isReparenting = false

        const cradlePositionData = scaffoldHandler.cradlePositionData

        viewportInterruptProperties.elementref.current[
            cradlePositionData.blockScrollProperty] =
            Math.max(0,cradlePositionData.blockScrollPos)

    }

    // clear mounted flag on unmount
    useLayoutEffect(()=>{

        // unmount
        return () => {
            isMountedRef.current = false
        }

    },[])

    //initialize host functions properties
    useEffect(()=>{

        referenceIndexCallbackRef.current = functions?.referenceIndexCallback

        if (!functions.getCallbacks) return

        const {scrollToItem, getVisibleList, getContentList, reload} = serviceHandler

        const callbacks = {
            scrollToItem,
            getVisibleList,
            getContentList,
            reload,
        }

        functions.getCallbacks(callbacks)

    },[])

    // initialize window scroll listener
    useEffect(() => {
        const viewportdata = viewportInterruptPropertiesRef.current
        viewportdata.elementref.current.addEventListener('scroll',scrollHandler.onScroll)

        return () => {

            viewportdata.elementref.current && viewportdata.elementref.current.removeEventListener('scroll',scrollHandler.onScroll)

        }

    },[])

    // observer support

    /*
        There are two interection observers, one for the cradle, and another for triggerlines; 
            both against the viewport.
        There is also a resize observer for the cradle wings, to respond to size changes of 
            variable cells.
    */    

    // intersection observer for cradle body

    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioningRender" cradle state is triggerd.
    // Also, intersection observer for cradle axis triggerlines, and cradle resizeobserver
    useEffect(()=>{

        const cradleElements = scaffoldHandler.elements

        const cradleintersectobserver = interruptHandler.cradleIntersect.createObserver()
        interruptHandler.cradleIntersect.connectElements()

        const triggerobserver = interruptHandler.axisTriggerlinesIntersect.createObserver()
        interruptHandler.axisTriggerlinesIntersect.connectElements()

        const resizeobserver = interruptHandler.cradleResize.createObserver()
        interruptHandler.cradleResize.connectElements()

        return () => {

            cradleintersectobserver.disconnect()
            triggerobserver.disconnect()
            resizeobserver.disconnect()

        }

    },[])

    // =====================[ RECONFIGURATION effects ]======================

    // trigger resizing based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        if (viewportInterruptProperties.isResizing) {

            const { signals } = interruptHandler
            signals.pauseTriggerlinesObserver = true
            signals.pauseCradleIntersectionObserver = true
            signals.pauseCradleResizeObserver = true
            signals.pauseScrollingEffects = true
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportInterruptProperties.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('finishresize')

        }

    },[viewportInterruptProperties.isResizing])

    // reload for changed size parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        const signals = interruptHandler.signals

        signals.pauseCradleIntersectionObserver = true
        signals.pauseTriggerlinesObserver = true
        signals.pauseScrollingEffects = true

        setCradleState('reload')

    },[
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    // trigger pivot *only* on change in orientation
    useEffect(()=> {

        scaffoldHandler.cradlePositionData.blockScrollProperty = 
            (orientation == "vertical")?"scrollTop":"scrollLeft"

        if (cradleStateRef.current == 'setup') return

        const { 
            cellWidth,
            cellHeight,
            gap,
        } = cradleInheritedPropertiesRef.current

        // get previous ratio
        const previousCellPixelLength = 
            ((orientation == 'vertical')?
                cellWidth:
                cellHeight)
            + gap

        const previousAxisOffset = scaffoldHandler.cradlePositionData.targetAxisPixelOffset

        const previousratio = previousAxisOffset/previousCellPixelLength

        const pivotCellPixelLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth)
            + gap

        const pivotAxisOffset = previousratio * pivotCellPixelLength
        
        scaffoldHandler.cradlePositionData.targetAxisPixelOffset = Math.round(pivotAxisOffset)

        const { signals } = interruptHandler
        
        signals.pauseTriggerlinesObserver = true
        signals.pauseScrollingEffects = true
        signals.pauseCradleIntersectionObserver = true

        const cradleContent = contentHandler.content
        cradleContent.headModelComponents = []
        cradleContent.tailModelComponents = []
        cradleContent.headViewComponents = []
        cradleContent.tailViewComponents = []

        setCradleState('pivot')

    },[orientation])

    // =====================[ STYLES ]===========================

    // styles for the six scaffold components
    const [
        cradleHeadStyle, 
        cradleTailStyle, 
        cradleAxisStyle, 
        triggerlineHeadStyle, 
        triggerlineTailStyle,
        cradleDividerStyle
    ] = useMemo(()=> {

        return stylesHandler.setCradleStyles({

            orientation, 
            cellHeight, 
            cellWidth, 
            gap,
            padding,
            viewportheight, 
            viewportwidth,
            crosscount, 
            userstyles:styles,
            triggerlineOffset,

        })

    },[

        orientation,
        cellHeight,
        cellWidth,
        gap,
        padding,
        viewportheight,
        viewportwidth,
        crosscount,
        styles,
        triggerlineOffset,

      ])

    // =====================[ state management ]==========================

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradleState) {

            case 'setup': { // cycle to allow for ref config

                setCradleState('dosetup') // load grid

                break

            }

            // renderupdatedcontent is called from updateCradleContent. 
            // it is required to integrate changed DOM configurations before 'ready' is displayed
            case 'renderupdatedcontent': {

                setCradleState('ready')

                break

            }

            case 'startreposition': {

                interruptHandler.signals.pauseTriggerlinesObserver = true

                // avoid recursive cradle intersection interrupts
                interruptHandler.signals.pauseCradleIntersectionObserver = true

                interruptHandler.signals.repositioningRequired = false // because now underway

                setCradleState('repositioningRender')

                break

            }

            /*
                the following 5 cradle states all resolve with
                a chain starting with setCradleContent, 
                continuing with 'preparerender', and ending with
                'normalizesignals'
            */
            case 'dosetup':
            case 'doreposition':
            case 'finishresize':
            case 'pivot':
            case 'reload': {

                const cradleContent = contentHandler.content

                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []
                cradleContent.headViewComponents = []
                cradleContent.tailViewComponents = []

                handlersRef.current.portals.resetScrollerPortalRepository()
                
                contentHandler.setCradleContent( cradleState )

                setCradleState('preparerender')

                break
            }

            case 'preparerender': {

                const cradleContent = contentHandler.content

                cradleContent.headViewComponents = cradleContent.headModelComponents
                cradleContent.tailViewComponents = cradleContent.tailModelComponents

                setCradleState('normalizesignals') // call a timeout for ready (or interrupt continuation)

                break
            }

            case 'normalizesignals': {

                // prioritize interrupts
                if (viewportInterruptPropertiesRef.current.isResizing) {

                    setCradleState('resizing')

                } else if (interruptHandler.signals.repositioningRequired) {

                    setCradleState('startreposition')

                } else {                     

                    const signals = interruptHandler.signals

                    signals.pauseTriggerlinesObserver && (signals.pauseTriggerlinesObserver = false)
                    signals.pauseCradleIntersectionObserver && (signals.pauseCradleIntersectionObserver = false)

                    signals.pauseScrollingEffects && (signals.pauseScrollingEffects = false)

                    setCradleState('ready')

                }

                break 

            }          

        }

    },[cradleState])

    // standard rendering states
    useEffect(()=> { 

        switch (cradleState) {

            // repositioningRender and repositioningContinuation are toggled to generate continuous 
            // reposiioning renders
            case 'repositioningRender':
                break

            case 'repositioningContinuation': // set from onScroll
                setCradleState('repositioningRender')
                break

            case 'ready': // no action on ready
                break

        }

    },[cradleState])

    // ==========================[ RENDER ]===========================

    const scrollAxisReferenceIndex = scaffoldHandler.cradlePositionData.targetAxisReferenceIndex
    const scrollTrackerArgs = useMemo(() => {
        if (!(cradleState == 'repositioningContinuation' || cradleState == 'repositioningRender')) {
            return null
        }
        const trackerargs = {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            scrollAxisReferenceIndex,
            listsize,
            styles,
        }
        return trackerargs
    },[
        cradleState, 
        viewportDimensions, 
        scrollAxisReferenceIndex, 
        listsize,
        styles,
        ]
    )

    const cradleContent = contentHandler.content

    // portalroot is the hidden portal component cache
    return <CradlePortalsContext.Provider value = {handlersRef.current.portals}>
        {(cradleStateRef.current != 'setup') && <div data-type = 'portalroot' style = { portalrootstyle }>
            <PortalList scrollerProps = {handlersRef.current.portals.scrollerProps}/>
        </div>}

        {((cradleStateRef.current == 'repositioningRender') || (cradleStateRef.current == 'repositioningContinuation'))
            ?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.scrollAxisReferenceIndex} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />
            :<div 
                data-type = 'cradle-axis'
                style = {cradleAxisStyle} 
                ref = {axisCradleElementRef}
            >
                <div
                    data-type = 'triggerline-head'
                    style = {triggerlineHeadStyle}
                    ref = {headTriggerlineCradleElementRef}
                >
                </div>
                <div
                    data-type = 'triggerline-tail'
                    style = {triggerlineTailStyle}
                    ref = {tailTriggerlineCradleElementRef}
                >
                </div>

                {true
                    ?<div 
                        data-type = 'cradle-divider' 
                        style = {cradleDividerStyle}
                    >
                    </div>
                    :null
                }
                <div 
                
                    data-type = 'head'
                    ref = {headCradleElementRef} 
                    style = {cradleHeadStyle}
                
                >
                
                    {(cradleStateRef.current != 'setup')?
                        cradleContent.headViewComponents:
                        null
                    }
                
                </div>
                <div 
                
                    data-type = 'tail'
                    ref = {tailCradleElementRef} 
                    style = {cradleTailStyle}
                
                >
                
                    {(cradleStateRef.current != 'setup')?
                        cradleContent.tailViewComponents:
                        null
                    }
                
                </div>
            </div>
        }
        
    </CradlePortalsContext.Provider>

} // Cradle

// utilities

const getCradleHandlers = (cradleParameters) => {

    const createHandler = handler => new handler(cradleParameters)

    return {
        portalHandler:new PortalHandler(),
        interruptHandler:createHandler(InterruptHandler),
        scrollHandler:createHandler(ScrollHandler),
        stateHandler:createHandler(StateHandler),
        contentHandler:createHandler(ContentHandler),
        scaffoldHandler:createHandler(ScaffoldHandler),
        serviceHandler:createHandler(ServiceHandler),
        stylesHandler:createHandler(StylesHandler),
    }
}

export default Cradle