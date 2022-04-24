// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:

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
    CradleHandler
    ServiceHandler // user services
    StylesHandler

    BUGS:
    - check styles in scrollTracker args
    - doreposition gets stuck at a particular number after getting behind on heavy scroll
        check pauseScrollingEffects
    - variable cells showing signs of getItem() with portal
    - Chrome sometimes misses nested cell portals horizontally
    - reduce computing intensity to avoid battery drainage
*/

/*
    Description
    -----------
    The GridStroller provides the illusion of infinite scrolling through the use of a data 'cradle' inside a viewport.
    The illusion is maintained by synchronizing changes in cradle content with cradle location inside a scrollblock, such
    that as the scrollblock is moved, the cradle moves oppositely in the scrollblock (to stay visible within the viewport). 
    The scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size and position which 
    realistically reflects the size of the list being shown.

    The position of the cradle is controlled by a 'spine' which is a 0px height/width (along the medial - ScrollBlock can be 
    verticsl or horizontal). The purpose of the spine is to act as a 'fold', above which cell content expands 'upwards', and 
    below which the cell content expands  'downwards'. GridScroller can be viewed vertically or horizontally. When horizontal, 
    the spine has a 0px width, so that the 'fold' is vertical, and cells expand to the left and right.

    The spine is controlled to always be in the at the leading edge of the leading cellrow of the viewport. Thus
    in vertical orientation, the spine 'top' css attribute is always equal to the 'scrollTop' position of the scrollblock,
    plus an adjustment. The adjustment is the result of the alignment of the spine in relation to the top-(or left-)most cell
    in the viewport (the 'reference' row). The spine can only be placed at the leading edge of the first visible
    cell in the viewport. Therefore the spine offset from the leading edge of the viewport can be anywhere from minus to
    plus the length of the leading row. The exact amount depends on where the 'breakpoint' of transition notification is set for
    cells crossing the viewport threshold (and can be configured). The default of the breakpoint is .5 (half the length of the cell).

    Technically, there are several reference points tracked by the GridScroller. These are:
        - spineReferenceIndex (the virtual index of the item controlling the location of the spine)
            The spineReferenceIndex is also used to allocate items above (lower index value) and below (same or higher index value)
            the fold
        - cradleReferenceIndex (the virtual index of the item defining the leading bound of the cradle content)
        - spinePosOffset (pixels - plus or minus - that the spine is placed in relation to the viewport's leading edge) 
    
    These reference points are applied to the following structures:
        - the viewport
        - the scrollblock
        - the cradle, consisting of
            - the spine (contains cradle head and tail)
            - the head (contains leading items)
            - the tail (contains trailing items)

    Structure details:
        the cradle content consists of
        - the number of rows that are visible in the viewport (according to the default parameters)
            - this typically includes one partially visible row
        - the number of runway rows specified in the parameters, times 2 (one et for the head; one for the tail)
        - the number of items is the number of rows times the 'crosscount' the lateral number of cells. 
        - the last row might consist of fewer items than crosscount, to match the maximum listsize
        - the cradleRowcount (visible default rows + runwaycount * 2) and viewpointRowcount (visble rows;typicall one partial)

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
        mode, meaning that it tracks relative location of the spine edge of the viewport, and repaints the cradle accroding to
        this position when the scrolling stops.
*/

'use strict'

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportInterrupt } from './viewport'

import { PortalHandler, PortalList } from './portalhandler'

const ITEM_OBSERVER_THRESHOLD = [0,1]

// popup position tracker
import ScrollTracker from './scrolltracker'

// support code
import ScrollHandler from './cradle/scrollhandler'
import StateHandler from './cradle/statehandler'
import ContentHandler from './cradle/contenthandler'
import CradleHandler from './cradle/cradlehandler'
import InterruptHandler from './cradle/interrupthandler'
import ServiceHandler from './cradle/servicehandler'
import StylesHandler from './cradle/styleshandler'

// for children
export const CradleContext = React.createContext(null) // for children

const portalrootstyle = {display:'none'} // static parm

const NORMALIZE_SIGNALS_TIMEOUT = 250

// component
const Cradle = ({ 
        gridSpecs,

        runwaycount, 
        listsize, 
        defaultVisibleIndex, 
        getItem, 
        placeholder, 
        functions:inheritedfunctions,
        styles:inheritedstyles,
        scrollerName,
        scrollerID,
    }) => {

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

    const functions = Object.freeze(Object.assign({},inheritedfunctions))
    const styles = Object.freeze(Object.assign({},inheritedstyles))

    // ---------------------[ package cradle props to pass to handlers ]-------------------

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
        runwaycount, 
        listsize, 
        defaultVisibleIndex, 
        getItem, 
        placeholder, 
        scrollerName,
        scrollerID,

        functions,
        styles,

    })

    // ----------------[ context ]----------------

    const [cradleState, setCradleState] = useState('setup')
    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState;

    const viewportProperties = useContext(ViewportInterrupt)
    const viewportPropertiesRef = useRef(null)
    viewportPropertiesRef.current = viewportProperties // for closures

    const isMountedRef = useRef(true)
    const normalizeTimerRef = useRef(null)

    // ----------------[ cradle butterfly html components ]---------------

    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const spineCradleElementRef = useRef(null)
    const cradleElementsRef = useRef(
        {
            headRef:headCradleElementRef, 
            tailRef:tailCradleElementRef, 
            spineRef:spineCradleElementRef
        }
    )
    // ----------------[ viewport dimensions ]------------------

    const { viewportDimensions } = viewportProperties

    const { height:viewportheight,width:viewportwidth } = viewportDimensions

    // -------------------[ configuration calculations ]---------------------

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

    const [cradleRowcount, viewportRowcount, listRowcount] = useMemo(()=> {

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

        let cradleRowcount = viewportRowcount + (runwaycount * 2)
        let itemcount = cradleRowcount * crosscount
        if (itemcount > listsize) {
            itemcount = listsize
            cradleRowcount = Math.ceil(itemcount/crosscount)
        }
        const listRowcount = Math.ceil(listsize/crosscount)

        return [cradleRowcount, viewportRowcount, listRowcount]

    },[
        orientation, 
        gap, 
        // padding,
        cellWidth, 
        cellHeight, 
        viewportheight, 
        viewportwidth,

        listsize,
        runwaycount,
        crosscount,
    ])

    const cradleConfigRef = useRef(null)
    cradleConfigRef.current = {
        crosscount,
        cradleRowcount,
        viewportRowcount,
        listRowcount,
        cellObserverThreshold:ITEM_OBSERVER_THRESHOLD,
    }

    const cradlePortalRef = useRef({
        portalHandler:null,
        scrollerID,
    })

    const setItemElementData = useCallback((itemElementData, reportType) => { // candidate to export

        const [index, shellref] = itemElementData

        if (reportType == 'register') {

            contentHandler.itemElements.set(index,shellref)

        } else if (reportType == 'unregister') {

            contentHandler.itemElements.delete(index)

        }

    },[])

    const contentCallbacksRef = useRef({

        setElementData:setItemElementData

    })

    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)
    const serviceCallsRef = useRef({referenceIndexCallbackRef})

    const handlersRef = useRef(null) // placeholder; make available to individual handlers
    const cradleParameters = Object.freeze({
        handlersRef,
        viewportPropertiesRef,
        cradleInheritedPropertiesRef, 
        cradleConfigRef, 
        cradlePortalRef,
        cradleStateRef,
        setCradleState,
        isMountedRef,
        contentCallbacksRef,
        cradleElementsRef,
        serviceCallsRef,
    })

    const setOfHandlersRef = useRef(null)

    if (!setOfHandlersRef.current) {
        setOfHandlersRef.current = getCradleHandlers(cradleParameters)
    }
    // make handlers directly available to cradle code
    const [
        interruptHandler,
        scrollHandler,
        stateHandler,
        contentHandler,
        cradleHandler,
        serviceHandler,
        stylesHandler,
    ] = setOfHandlersRef.current

    // to instantiate handlersRef
    const handlerObjectRef = useRef({
        scroll:scrollHandler,
        // signals:signalsHandler, 
        state:stateHandler,
        content:contentHandler, 
        cradle:cradleHandler, 
        service:serviceHandler,
        interrupts:interruptHandler,
        styles:stylesHandler,
    });

    handlersRef.current = handlerObjectRef.current // back-fill cradleParameters property

    // ------------------------------------------------------------------------
    // -----------------------[ initialization effects ]-----------------------

    // this is an immediate response to reparenting. Reparenting resets scroll positions
    // this restores scroll as soon as cradle is invoked after reparenting
    if (viewportProperties.portal?.isReparenting) { 

        viewportProperties.portal.isReparenting = false
        viewportProperties.elementref.current[cradleHandler.cradleReferenceData.blockScrollProperty] =
            Math.max(0,cradleHandler.cradleReferenceData.blockScrollPos)
    }

    // set portalHandler, and unmounted flag
    useLayoutEffect(()=>{

        cradlePortalRef.current.portalHandler = new PortalHandler()

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
        let viewportdata = viewportPropertiesRef.current
        viewportdata.elementref.current.addEventListener('scroll',scrollHandler.onScroll)

        return () => {

            viewportdata.elementref.current && viewportdata.elementref.current.removeEventListener('scroll',scrollHandler.onScroll)

        }

    },[])

    // -----------------------------------------------------------------------
    // -----------------------[ reconfiguration effects ]---------------------

    // trigger resizing based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        if (viewportProperties.isResizing) {

            const signals = interruptHandler.signals
            signals.pauseCellObserver = true
            signals.pauseCradleIntersectionObserver = true
            signals.pauseCradleResizeObserver = true
            signals.pauseScrollingEffects = true
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportProperties.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('resized')

        }

    },[viewportProperties.isResizing])

    // reload for changed parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        let signals = interruptHandler.signals

        signals.pauseCellObserver = true
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

        if (cradleStateRef.current == 'setup') return

        // get previous ratio
        const previousCellPixelLength = (orientation == 'vertical')?
            cradleInheritedPropertiesRef.current.cellWidth:cradleInheritedPropertiesRef.current.cellHeight
        // let previousSpineOffset = cradleHandler.cradleReferenceData.theNextSpinePixelOffset
        const previousSpineOffset = cradleHandler.cradleReferenceData.nextCradlePosOffset

        const previousratio = previousSpineOffset/previousCellPixelLength

        const currentCellPixelLength = (orientation == 'vertical')?
            cradleInheritedPropertiesRef.current.cellHeight:cradleInheritedPropertiesRef.current.cellWidth

        const currentSpineOffset = previousratio * currentCellPixelLength
        
        cradleHandler.cradleReferenceData.nextCradlePosOffset = Math.round(currentSpineOffset)

        const signals = interruptHandler.signals

        signals.pauseCellObserver = true
        // pauseCradleIntersectionObserverRef.current = true
        signals.pauseScrollingEffects = true

        setCradleState('pivot')

        // let cradleContent = contentAgentRef.current.content
        cradleContent.headModelComponents = []
        cradleContent.tailModelComponents = []
        cradleContent.headViewComponents = []
        cradleContent.tailViewComponents = []

    },[orientation])

    // =======================================================================
    // -------------------------[ OPERATION ]---------------------------------
    // =======================================================================

    // -----------------------------------------------------------------------
    // ------------------------[ style data ]-------------------------------

    // styles for wings and spine
    const [cradleHeadStyle, cradleTailStyle, cradleSpineStyle] = useMemo(()=> {

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

      ])

    // =================================================================================
    // -------------------------[ Observer support]-------------------------
    // =================================================================================

    /*
        There are two interection observers, one for the cradle, and another for itemShells; 
            both against the viewport.
        There is also a resize observer for the cradle wings, to respond to size changes of 
            variable cells.
    */    

    // --------------------------[ resize observer ]-----------------------------------

    // set up cradle resizeobserver
    useEffect(() => {

        let observer = interruptHandler.cradleResize.createObserver()
        let cradleElements = cradleHandler.elements
        observer.observe(cradleElements.headRef.current)
        observer.observe(cradleElements.tailRef.current)

        return () => {

            observer.disconnect()

        }

    },[])

    // --------------------[ intersection observer for cradle body ]-----------------------

    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioningA" cradle state is triggerd.
    useEffect(()=>{

        const observer = interruptHandler.cradleIntersect.createObserver()
        const cradleElements = cradleHandler.elements
        observer.observe(cradleElements.headRef.current)
        observer.observe(cradleElements.tailRef.current)

        return () => {

            observer.disconnect()

        }

    },[])

    // unset and reset observers for reposition
    useEffect(() => {

        if ((cradleState != 'startreposition') && (cradleState != 'finishreposition')) return

        const observer = interruptHandler.cradleIntersect.observer

        if (cradleState == 'startreposition') {
            observer.disconnect()
        }
        if (cradleState == 'finishreposition') {
            const cradleElements = cradleHandler.elements
            observer.observe(cradleElements.headRef.current)
            observer.observe(cradleElements.tailRef.current)
        }

    },[cradleState])

    // --------------------------[ item shell observer ]-----------------------------

    /*
        The cradle content is driven by notifications from the IntersectionObserver.
        - as the user scrolls the cradle, which has a runwaycount at both the leading
            and trailing edges, CellShells scroll into or out of the scope of the observer 
            (defined by the width/height of the viewport + the lengths of the runways). The observer
            notifies the app (through cellobservercallback() below) at the crossings of the itemshells 
            of the defined observer cradle boundaries.

            The no-longer-intersecting notifications trigger dropping of that number of affected items from 
            the cradle contentlist. The dropping of items from the trailing end of the content list
            triggers the addition of an equal number of items at the leading edge of the cradle content.

            Technically, the opposite end position spec is set (top or left depending on orientation), 
            and the matching end position spec is set to 'auto' when items are added. This causes items to be 
            "squeezed" into the leading or trailing ends of the ui content (out of view) as appropriate.

            There are exceptions for setup and edge cases.
    */

    // responds to change of orientation
    useEffect(() => {

        let observer = interruptHandler.cellIntersect.observer
        if (observer) observer.disconnect()
        observer = interruptHandler.cellIntersect.createObserver()

        return () => {

            observer.disconnect()

        }

    },[orientation])

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // =====================================================================================

    // data for state processing
    const callingCradleState = useRef(cradleStateRef.current)
    const headlayoutDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        let viewportProperties = viewportPropertiesRef.current
        let cradleContent = contentHandler.content
        switch (cradleState) {

            // renderupdatedcontent is called from cellintersectionobservercallback (interruptHandler), 
            // and called from onAfterScroll (scrollHandler)
            // it is required set configurations before 'ready' TODO: specify!
            case 'renderupdatedcontent': {

                setCradleState('ready')
                break

            }

            // ----------------------------------------------------------------------
            // ------------[ reposition when repositioningRequired is true ]---------------

            case 'startreposition': {
                // interruptHandler.states.isRepositioning = true
                interruptHandler.signals.pauseCradleIntersectionObserver = true
                setCradleState('repositioningA')
                break
            }

            case 'finishreposition': {
                interruptHandler.signals.pauseCradleIntersectionObserver = false
                scrollHandler.updateReferenceData()
                setCradleState('doreposition')
                // setCradleState('updatepositionreferences')
                break
            }
            // case 'updatepositionreferences':{
            //     scrollHandler.updateReferenceData()
            //     setCradleState('doreposition')
            //     break
            // }

            // -----------------------------------------------------------------------
            // ------------[ the following 5 cradle states all resolve with ]---------
            // ------------[ a chain starting with 'preparecontent', which  ]---------
            // ------------[ calls setCradleContent                         ]---------

            case 'doreposition':
            case 'setup': 
            case 'resized':
            case 'pivot':
            case 'reload':

                callingCradleState.current = cradleState // message for setCradleContent
                setCradleState('preparecontent') // cycle to allow some config

                break

            case 'preparecontent': {

                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []
                cradleContent.headViewComponents = []
                cradleContent.tailViewComponents = []
                cradlePortalRef.current.portalHandler.resetScrollerPortalRepository()
                contentHandler.setCradleContent(callingCradleState.current)

                setCradleState('preparerender')

                break
            }

            case 'preparerender': {

                let cradleContent = contentHandler.content
                cradleContent.headViewComponents = cradleContent.headModelComponents
                cradleContent.tailViewComponents = cradleContent.tailModelComponents

                viewportProperties.elementref.current[cradleHandler.cradleReferenceData.blockScrollProperty] =
                    Math.max(0,cradleHandler.cradleReferenceData.blockScrollPos)

                setCradleState('normalizesignals') // call a timeout for ready (or interrupt continuation)

                break
            }

            case 'normalizesignals': {
                normalizeTimerRef.current = setTimeout(()=> {

                    if (!isMountedRef.current) return

                    // allow short-circuit fallbacks to continue interrupt responses
            /*1*/   if (!viewportProperties.isResizing) { // resize short-circuit
                        
            /*2*/       if (!interruptHandler.signals.repositioningRequired) { // repositioning short-circuit

            // /*3*/           if ((!viewportPropertiesRef.current.portal) || (!viewportPropertiesRef.current.portal.isReparenting))
            //                     /*&& (!isReparentingRef.current))*/ { // reparent (restorescrollpos) short-circuit
                            
                                const signals = interruptHandler.signals
                                if (viewportProperties.elementref.current) { // already unmounted if fails (?)
                                    signals.pauseCellObserver  && (signals.pauseCellObserver = false)
                                    signals.pauseScrollingEffects && (signals.pauseScrollingEffects = false)
                                    signals.pauseCradleIntersectionObserver && (signals.pauseCradleIntersectionObserver = false)
                                    signals.pauseCradleResizeObserver && (signals.pauseCradleResizeObserver = false)
                                } else {
                                    console.log('ERROR: viewport element not set in normalizesignals', scrollerID, viewportProperties)
                                }

            /*default outcome*/ if (isMountedRef.current) setCradleState('ready')

            //                 } else {
            // /*3*/               if (isMountedRef.current) setCradleState('restorescrollposition')
            //                 }

                        } else {
            /*2*/           if (isMountedRef.current) setCradleState('startreposition')
                        }

                    } else {
            /*1*/       if (isMountedRef.current) setCradleState('resizing')
                    }

                },NORMALIZE_SIGNALS_TIMEOUT)

                break 

            }          

        }

    },[cradleState])

    // standard processing stages
    useEffect(()=> { // TODO: verify benefit of useLayoutEffect

        let viewportProperties = viewportPropertiesRef.current
        switch (cradleState) {

            case 'repositioningA':
                break

            case 'repositioningB':
                setCradleState('repositioningA')
                break

            case 'ready':
                break

        }

    },[cradleState])

    // =============================================================================
    // ------------------------------[ RENDER... ]----------------------------------
    // =============================================================================

    const referenceIndexOffset = cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference
    const scrollTrackerArgs = useMemo(() => {
        if (!(cradleState == 'repositioningB' || cradleState == 'repositioningA')) {
            return
        }
        let trackerargs = {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            referenceIndexOffset:cradleHandler.cradleReferenceData.scrollImpliedItemIndexReference,
            listsize,
            styles,
        }
        return trackerargs
    },[
        cradleState, 
        viewportDimensions, 
        referenceIndexOffset, 
        listsize,
        styles,
        ]
    )

    let cradleContent = contentHandler.content

    // portalroot is the hidden portal component cache
    return <CradleContext.Provider value = {cradlePortalRef}>
        {(cradleStateRef.current != 'setup') && <div data-type = 'portalroot' style = { portalrootstyle }>
            <PortalList scrollerProps = {cradlePortalRef.current.portalHandler.scrollerProps}/>
        </div>}

        {((cradleStateRef.current == 'repositioningA') || (cradleStateRef.current == 'repositioningB'))
            ?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.referenceIndexOffset} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />
            :<div 
                data-type = 'cradle-spine'
                style = {cradleSpineStyle} 
                ref = {spineCradleElementRef}
            >
                {true
                    ?<div 
                        data-type = 'cradle-divider' 
                        style = {
                            {
                                zIndex:1, 
                                position:'absolute',
                                width:'100%',
                                height:'100%',
                                boxShadow:'0 0 5px 3px red'
                            }
                        }>
                    </div>
                    :null
                }
                <div 
                
                    data-type = 'head'
                    ref = {headCradleElementRef} 
                    style = {cradleHeadStyle}
                
                >
                
                    {(cradleStateRef.current != 'setup')?cradleContent.headViewComponents:null}
                
                </div>
                <div 
                
                    data-type = 'tail'
                    ref = {tailCradleElementRef} 
                    style = {cradleTailStyle}
                
                >
                
                    {(cradleStateRef.current != 'setup')?cradleContent.tailViewComponents:null}
                
                </div>
            </div>
        }
        
    </CradleContext.Provider>

} // Cradle


const getCradleHandlers = (cradleParameters) => {

    const createHandler = handler => new handler(cradleParameters)

    return [
        createHandler(InterruptHandler),
        createHandler(ScrollHandler),
        createHandler(StateHandler),
        createHandler(ContentHandler),
        createHandler(CradleHandler),
        createHandler(ServiceHandler),
        createHandler(StylesHandler),
    ]
}



export default Cradle