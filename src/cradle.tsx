// cradle.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*

    BUGS:
    - sometimes on android chrome axis gets stuck outside of visible area and 
        loses intersect norifications
    - android firefox loses position on fast scroll
    - safari mac loses place in sublists on rapid backscroll at start of list
    - Scrolltop is sometimes set to 0 while head overflows above border
    - context problems develop when rotating phone while scrolling intertia continues
    - rapid back and forth in middle eventually causes fail of intercepts
    - cell height not being respected in nested scrollers.
    - resize sometimes loses correct allocation of head items; leaves blank items

    BUGS:
    - check styles in scrollTracker args
    - doreposition gets stuck at a particular number after getting behind on heavy scroll
        check pauseScrollingEffects
    - variable cells showing signs of getItem() with portal
    - Chrome sometimes misses nested cell portals horizontally
    - reduce computing intensity to avoid battery drainage

    TODO:

    - PLACE SENTINELS (assertions) AT CRITICAL LOCATIONS TO WATCH FOR ANOMALIES
    - try position fixed during reparenting to preserve scroll position

    - consider eliminating cellintersectobserver in favour of head and tail intersect oberver

    - scroll reset problem recurs with repeated above and below rapid resets
        the problem comes with update content from endofscroll, after double normalize signals
        the extra reparenting is inserted during the timeout for normalize signals
    - try cleartimeout


    - fix scroll reset on reparent
    - review need for setscrollposition
    - BUG: in FF nested scroller switch from placeholder to content resets scroll position
    - unmounted warning to do with InPortal

    ObserversHandler
    WingsAgent
    MessageAgent ? // message with host environment, such as referenceIndexCallback

    ScrollHandler
    SignalsHandler
    StateHandler
    ContentHandler
    ScaffoldHandler
    ServiceHandler // user services
    StylesHandler

*/

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

const NORMALIZE_SIGNALS_TIMEOUT = 250

// component
const Cradle = ({ 
        gridSpecs,

        runwayRowcountSpec, 
        listsize, 
        defaultVisibleIndex, 
        getItem, 
        placeholder, 
        functions:inheritedfunctions,
        styles:inheritedstyles,

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

    // freeze object props
    const functions = Object.freeze(Object.assign({},inheritedfunctions))
    const styles = Object.freeze(Object.assign({},inheritedstyles))

    // bundle cradle props to pass to handlers
    const cradleInheritedPropertiesRef = useRef(null) // access by closures and support functions
    cradleInheritedPropertiesRef.current =  Object.freeze({
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

    })

    // create context
    const viewportInterruptProperties = useContext(ViewportInterrupt)
    const viewportInterruptPropertiesRef = useRef(null)
    viewportInterruptPropertiesRef.current = viewportInterruptProperties // for closures

    const { viewportDimensions } = viewportInterruptProperties
    const { height:viewportheight,width:viewportwidth } = viewportDimensions

    const [cradleState, setCradleState] = useState('setup')

    // console.log('entering Cradle with state',cradleState)

    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState;

    // controls
    const isMountedRef = useRef(true)
    const normalizeTimerRef = useRef(null)

    // cradle scaffold elements
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

    // bundle configuration properties
    const cradleInternalPropertiesRef = useRef(null)
    cradleInternalPropertiesRef.current = {
        crosscount,
        cradleRowcount,
        viewportRowcount,
        listRowcount,
        cradleStateRef,
        setCradleState,
        isMountedRef,
        cradleElementsRef,
        runwayRowcount,
    }

    // utility to register or unregister cradle item elements
    const setItemElementData = useCallback((itemElementData, reportType) => {

        const [index, shellref] = itemElementData

        if (reportType == 'register') {

            contentHandler.itemElements.set(index,shellref)

        } else if (reportType == 'unregister') {

            contentHandler.itemElements.delete(index)

        }

    },[])

    const internalCallbacksRef = useRef({

        setElementData:setItemElementData

    })

    // host callbacks
    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)

    const externalCallbacksRef = useRef({referenceIndexCallbackRef})

    // cradle parameters master bundle
    const handlersRef = useRef(null) // placeholder in cradleParamters; make available individual handlers
    const cradleParameters = Object.freeze({
        handlersRef,
        viewportInterruptPropertiesRef,
        cradleInheritedPropertiesRef, 
        cradleInternalPropertiesRef, 
        internalCallbacksRef,
        externalCallbacksRef,
    })

    const setOfHandlersRef = useRef(null)

    if (!setOfHandlersRef.current) {
        setOfHandlersRef.current = getCradleHandlers(cradleParameters)
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
    } = setOfHandlersRef.current

    // to instantiate handlersRef for cradleParameters
    const handlerObjectRef = useRef({
        portals:portalHandler,
        interrupts:interruptHandler,
        scroll:scrollHandler,
        state:stateHandler,
        content:contentHandler, 
        scaffold:scaffoldHandler, 
        service:serviceHandler,
        styles:stylesHandler,
    });

    handlersRef.current = handlerObjectRef.current // back-fill cradleParameters property

    // ===================[ INITIALIZATION effects ]=========================

    // this is an immediate response to reparenting. Reparenting resets scroll positions
    // for nested infinitegridscrollers.
    // the code restores scroll as soon as cradle is invoked after reparenting
    if (viewportInterruptProperties.portal?.isReparenting) { 

        viewportInterruptProperties.portal.isReparenting = false

        const cradleReferenceData = scaffoldHandler.cradleReferenceData
        viewportInterruptProperties.elementref.current[
            cradleReferenceData.blockScrollProperty] =
            Math.max(0,cradleReferenceData.blockScrollPos)

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

        Object.freeze(callbacks)

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
        cradleintersectobserver.observe(cradleElements.headRef.current)
        cradleintersectobserver.observe(cradleElements.tailRef.current)

        const triggerobserver = interruptHandler.axisTriggerlinesIntersect.createObserver()
        triggerobserver.observe(cradleElements.headTriggerlineRef.current)
        triggerobserver.observe(cradleElements.tailTriggerlineRef.current)

        const resizeobserver = interruptHandler.cradleResize.createObserver()
        resizeobserver.observe(cradleElements.headRef.current)
        resizeobserver.observe(cradleElements.tailRef.current)

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
            // signals.pauseCellObserver = true
            signals.pauseCradleIntersectionObserver = true
            signals.pauseCradleResizeObserver = true
            signals.pauseScrollingEffects = true
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportInterruptProperties.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('resized')

        }

    },[viewportInterruptProperties.isResizing])

    // reload for changed parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        const signals = interruptHandler.signals

        // signals.pauseCellObserver = true
        // signals.pauseTriggerlinesObserver = true
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
    // TODO: review this code
    useEffect(()=> {

        scaffoldHandler.cradleReferenceData.blockScrollProperty = 
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

        const previousAxisOffset = scaffoldHandler.cradleReferenceData.targetAxisPixelOffset

        const previousratio = previousAxisOffset/previousCellPixelLength

        const pivotCellPixelLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth)
            + gap

        const pivotAxisOffset = previousratio * pivotCellPixelLength
        
        scaffoldHandler.cradleReferenceData.targetAxisPixelOffset = Math.round(pivotAxisOffset)

        console.log('pivot scaffoldHandler.cradleReferenceData',
            Object.assign({},scaffoldHandler.cradleReferenceData))

        const { signals } = interruptHandler

        // signals.pauseTriggerlinesObserver = true
        signals.pauseScrollingEffects = true

        const cradleContent = contentHandler.content
        cradleContent.headModelComponents = []
        cradleContent.tailModelComponents = []
        cradleContent.headViewComponents = []
        cradleContent.tailViewComponents = []

        setCradleState('pivot')

    },[orientation])

    // =====================[ STYLES ]===========================

    // styles for scaffold
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

    // =====================[ STATE management ]==========================

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        const viewportInterruptProperties = viewportInterruptPropertiesRef.current
        const cradleContent = contentHandler.content

        switch (cradleState) {

            // renderupdatedcontent is called from triggerlineintersectionobservercallback (interruptHandler), 
            // and called from onAfterScroll (scrollHandler)
            // it is required set configurations before 'ready' TODO: specify!
            case 'renderupdatedcontent': {

                interruptHandler.signals.pauseTriggerlinesObserver = false

                setCradleState('ready')

                break

            }
            // ----------------------------------------------------------------------
            // ------------[ reposition when repositioningRequired is true ]---------------
            case 'startreposition': {

                interruptHandler.signals.pauseTriggerlinesObserver = true

                // avoid recursive cradle intersection interrupts
                interruptHandler.signals.pauseCradleIntersectionObserver = true

                interruptHandler.signals.repositioningRequired = false // because now underway

                setCradleState('repositioningRender')
                break

            }

            case 'finishreposition': {

                scrollHandler.updateBlockScrollPos()
                // console.log('==> in finishposition:pauseCradleIntersectionObserver, scaffoldHandler.cradleReferenceData',
                //     interruptHandler.signals.pauseCradleIntersectionObserver, Object.assign({},scaffoldHandler.cradleReferenceData))
                setCradleState('doreposition')
                break

            }

            /*
                the following 5 cradle states all resolve with
                a chain starting with 'preparerender', which
                calls setCradleContent
            */
            case 'setup': 
                setCradleState('dosetup') // cycle to allow for config, particlularly ref's
                break

            // the following all setCradleContent
            case 'dosetup':
            case 'doreposition':
            case 'resized':
            case 'pivot':
            case 'reload': {

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

                const cradleReferenceData = scaffoldHandler.cradleReferenceData
                viewportInterruptProperties.elementref.current[cradleReferenceData.blockScrollProperty] =
                    Math.max(0,cradleReferenceData.blockScrollPos)

                setCradleState('normalizesignals') // call a timeout for ready (or interrupt continuation)

                break
            }

            case 'normalizesignals': {

                // console.log('- in normalizesignals call')

                normalizeTimerRef.current = setTimeout(()=> {

                    // console.log('-- executing normalizesignals call:interruptHandler.signals.repositioningRequired',
                    //     interruptHandler.signals.repositioningRequired)
                    if (!isMountedRef.current) return

                    // allow short-circuit fallbacks to continue interrupt responses
            /*1*/   if (!viewportInterruptProperties.isResizing) { // resize short-circuit
                        
            /*2*/       if (!interruptHandler.signals.repositioningRequired) { // repositioning short-circuit


                            // console.log('normalizing signals')
                            const signals = interruptHandler.signals

                            signals.pauseTriggerlinesObserver && (signals.pauseTriggerlinesObserver = false)
                            signals.pauseScrollingEffects && (signals.pauseScrollingEffects = false)
                            signals.pauseCradleIntersectionObserver && (signals.pauseCradleIntersectionObserver = false)

            /*default*/     setCradleState('ready')

                        } else {

            /*2*/           setCradleState('startreposition')

                        }

                    } else {

            /*1*/       setCradleState('resizing')

                    }

                },NORMALIZE_SIGNALS_TIMEOUT)

                break 

            }          

        }

    },[cradleState])

    // standard processing stages
    useEffect(()=> { // TODO: verify benefit of useLayoutEffect

        // repositioningRender and repositioningContinuation are toggled to generate continuous 
        //    reposiioning renders
        switch (cradleState) {

            case 'repositioningRender': // to trigger render between scrolls
                break

            case 'repositioningContinuation': // set from onScroll
                setCradleState('repositioningRender')
                break

            case 'ready': // to specify no action on ready
                break

        }

    },[cradleState])

    // ==========================[ RENDER ]===========================

    const axisReferenceIndex = scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex
    const scrollTrackerArgs = useMemo(() => {
        if (!(cradleState == 'repositioningContinuation' || cradleState == 'repositioningRender')) {
            return null
        }
        const trackerargs = {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            axisReferenceIndex,//:scaffoldHandler.cradleReferenceData.scrollImpliedAxisReferenceIndex,
            listsize,
            styles,
        }
        return trackerargs
    },[
        cradleState, 
        viewportDimensions, 
        axisReferenceIndex, 
        listsize,
        styles,
        ]
    )

    const cradleContent = contentHandler.content

    // console.log('rendering with state',cradleStateRef.current)

    // portalroot is the hidden portal component cache
    return <CradlePortalsContext.Provider value = {handlersRef.current.portals}>
        {(cradleStateRef.current != 'setup') && <div data-type = 'portalroot' style = { portalrootstyle }>
            <PortalList scrollerProps = {handlersRef.current.portals.scrollerProps}/>
        </div>}

        {((cradleStateRef.current == 'repositioningRender') || (cradleStateRef.current == 'repositioningContinuation'))
            ?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.axisReferenceIndex} 
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