// cradle.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    BUG: cache is last imort state; should be ready
    - rationalize pauseScrolling, and other signals
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
        - the cradleRowcount (visible default rows + runwayRowcountProp * 2) and viewpointRowcount (visble rows;typicall one partial)

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

import React, { 
    useState, 
    useRef, 
    useContext, 
    useEffect, 
    useLayoutEffect, 
    useCallback, 
    useMemo 
} from 'react'

import { ViewportInterrupt } from './viewport'

// popup position tracker for repositioning
import ScrollTracker from './scrolltracker'

// support code
import ScrollHandler from './cradle/scrollhandler'
import StateHandler from './cradle/statehandler'
import ContentHandler from './cradle/contenthandler'
import ScaffoldHandler from './cradle/scaffoldhandler'
import InterruptHandler from './cradle/interrupthandler'
import ServiceHandler from './cradle/servicehandler'
import StylesHandler from './cradle/styleshandler'

// for children
export const CradleContext = React.createContext(null)

// component
const Cradle = ({ 
        gridSpecs,

        runwaySize, 
        listsize, 
        defaultVisibleIndex, 
        getItem, 
        placeholder, 
        functions,
        styles,
        triggerlineOffset,
        cache,
        cacheMax,
        // for debugging
        scrollerID,

        cacheHandler,
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
    } = gridSpecs

    // get viewport context
    const viewportInterruptProperties = useContext(ViewportInterrupt)
    const viewportInterruptPropertiesRef = useRef(null)
    viewportInterruptPropertiesRef.current = viewportInterruptProperties // for closures

    const { viewportDimensions } = viewportInterruptProperties
    const { height:viewportheight,width:viewportwidth } = viewportDimensions

    // state
    const [cradleState, setCradleState] = useState('setup')
    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState

    // console.log('RUNNING Cradle scrollerID, cradleState','-'+scrollerID+'-', cradleState)

    // controls
    const isMountedRef = useRef(true)
    const isCachedRef = useRef(false)
    const wasCachedRef = useRef(null)
    const triggerlineRecordsRef = useRef({ // to calculate inferred trigger
        wasViewportScrollingForward:null,
        driver:null,
        offset:null,
    })

    // cradle scaffold element refs
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const axisCradleElementRef = useRef(null)
    const headTriggerlineCradleElementRef = useRef(null)
    const tailTriggerlineCradleElementRef = useRef(null)

    // scaffold bundle
    const cradleElementsRef = useRef(
        {
            headRef:headCradleElementRef, 
            tailRef:tailCradleElementRef, 
            axisRef:axisCradleElementRef,
            headTriggerlineRef:headTriggerlineCradleElementRef,
            tailTriggerlineRef:tailTriggerlineCradleElementRef
        }
    )

    // ------------------------[ calculated properties ]------------------------

    // configuration calculations
    const crosscount = useMemo(() => { // the number of cells crossing orientation

        const viewportsize = (orientation == 'horizontal')?viewportheight:viewportwidth
        const crossLength = (orientation == 'horizontal')?cellHeight:cellWidth

        const viewportlengthforcalc = viewportsize - (padding * 2) + gap // length of viewport
        let tilelengthforcalc = crossLength + gap
        tilelengthforcalc = Math.min(tilelengthforcalc,viewportlengthforcalc) // result cannot be less than 1

        const crosscount = Math.floor(viewportlengthforcalc/tilelengthforcalc)

        return crosscount

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

        let viewportLength, rowLength
        if (orientation == 'vertical') {
            viewportLength = viewportheight
            rowLength = cellHeight
        } else {
            viewportLength = viewportwidth
            rowLength = cellWidth
        }

        rowLength += gap

        const viewportRowcount = Math.ceil(viewportLength/rowLength)

        const viewportVisibleRowcount = Math.floor(viewportLength/rowLength)

        const listRowcount = Math.ceil(listsize/crosscount)

        const calculatedCradleRowcount = viewportRowcount + (runwaySize * 2)

        let cradleRowcount = Math.min(listRowcount, calculatedCradleRowcount)

        let runwayRowcount
        if (calculatedCradleRowcount >= cradleRowcount) {
            runwayRowcount = runwaySize
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
        runwaySize,
        crosscount,
    ])

    // ======================[ callbacks ]=====================

    // host callbacks
    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)

    const externalCallbacksRef = useRef({referenceIndexCallbackRef})

    // ====================[ bundle parameters for handlers ]===================

    // bundle cradle props to pass to handlers - ultimately cradleParametersRef (brute force)
    const cradleInheritedPropertiesRef = useRef(null) // access by closures and support functions
    // up to date values
    cradleInheritedPropertiesRef.current = {
        // gridSpecs
        orientation, 
        gap, 
        padding, 
        cellHeight, 
        cellWidth, 
        layout,
        // ...rest
        listsize, 
        cache,
        cacheMax,
        defaultVisibleIndex, 
        getItem, 
        placeholder, 
        triggerlineOffset,
        scrollerID,
        // objects
        functions,
        styles,
        cacheHandler,

    }

    const cradlePassthroughPropertiesRef = useRef(null)

    // passed to cellShell content if requested
    cradlePassthroughPropertiesRef.current = {
        orientation, 
        gap, 
        padding, 
        cellHeight, 
        cellWidth, 
        layout,
        runwayRowcount,
        listsize, 
        cache,
        cacheMax,
        indexOffset:defaultVisibleIndex, 
        triggerlineOffset,
    }

    // configuration properties to share
    const cradleInternalPropertiesRef = useRef(null)
    cradleInternalPropertiesRef.current = {
        // updated values
        crosscount,
        cradleRowcount,
        viewportRowcount,
        viewportVisibleRowcount,
        listRowcount,
        runwayRowcount,
        // the following values are maintained elsewhere
        isMountedRef,
        cradleElementsRef,
        isCachedRef,
        wasCachedRef,
        triggerlineRecordsRef,
        // scrollPosRecoveryPosRef,

        // for stateHandler
        cradleStateRef,
        setCradleState,
    }

    // placeholder in cradleParameters to make available individual handlers
    const handlersRef = useRef(null)

    // cradle parameters MASTER BUNDLE
    const cradleParameters = {
        handlersRef,
        viewportInterruptPropertiesRef,
        cradleInheritedPropertiesRef, 
        cradlePassthroughPropertiesRef,
        cradleInternalPropertiesRef, 
        // internalCallbacksRef, // n/a
        externalCallbacksRef,
    }

    // ongoing source of handlers - note all Handlers are given all parameters (cradleParameters)
    if (!handlersRef.current) {
        handlersRef.current = getCradleHandlers(cradleParameters)
    }

    // make handlers directly available to cradle code below
    const { // cacheHandler already available
        interruptHandler,
        scrollHandler,
        stateHandler,
        contentHandler,
        scaffoldHandler,
        serviceHandler,
        stylesHandler,
    } = handlersRef.current

    // =======================[ CACHE STATE CHANGE SENTINEL ]=========================

    // intercept change in caching status
    // when a portal is cached, including the transition of being moved from one cellShell to another,
    // (and the infinitegridscroller can be a component that is cached),
    // the scrollPos (scrollLeft or scrollTop) is reset to 0 (zero). When the scroller is 
    // moved to a cellShell, this code restores the scrollPos.
    // The restore action must be the first priority to hide the scrollPos changes from the user
    
    const parentingTransitionRequiredRef = useRef(false)
    // the two circumstances associated with being moved to and from the cache
    if (viewportInterruptProperties.isResizing || // happens with movement into cache
        viewportInterruptProperties.isReparentingRef?.current) { // happens with movement out of cache

        // console.log('cradle sentinel isResizing, isReparenting\n isCached, wasCached', '-'+scrollerID+'-','\n',
        //     viewportInterruptProperties.isResizing,viewportInterruptProperties.isReparentingRef?.current,'\n',
        //     isCachedRef.current, wasCachedRef.current)

        let isChange = false
        if (viewportInterruptProperties.isReparentingRef?.current) { // priority

            // console.log('-processing reparenting')
            // cancel any resizing message - isReparenting takes priority
            viewportInterruptProperties.isResizing && (viewportInterruptProperties.isResizing = false)
            viewportInterruptProperties.isReparentingRef.current = false // no longer needed
            wasCachedRef.current = true // must be coming from cache
            isCachedRef.current = false // must be moved to cellShell
            isChange = true // in any case a change has occurred

        } else { // resizing is underway

            const isInPortal = ((viewportwidth == 0) && (viewportheight == 0)) // must be in portal (cache) state
            // console.log('-processing resizing, isInPortal, isCached, viewportwidth, viewportheight, getViewportDimensions()',
            //     isInPortal, isCachedRef.current, viewportwidth, viewportheight, scaffoldHandler.getViewportDimensions())

            if (isInPortal != isCachedRef.current) { // there's been a change
                isChange = true
                wasCachedRef.current = isCachedRef.current
                isCachedRef.current = isInPortal
            }

            // resizing from caching requires no further action
            if (isCachedRef.current || wasCachedRef.current) { 

                viewportInterruptProperties.isResizing = false

            }

        }

        if (isChange) {

            if (isCachedRef.current && !wasCachedRef.current) { // change into cached

                interruptHandler.pauseInterrupts()

            } else if ((!isCachedRef.current) && wasCachedRef.current) { // change out of cached

                const viewportElement = viewportInterruptProperties.elementRef.current

                const { cradlePositionData } = scaffoldHandler // maintains history of scrollPos

                if (viewportElement[cradlePositionData.blockScrollProperty] != 
                    cradlePositionData.blockScrollPos) { // possibly clientHeight/Width hasn't caught up
                    // ... so likely requires a render cycle to catch up
                    // parentingTransitionRequiredRef generates a 'reparentingtransition' cycle
                    //     before resetting scrollPos
                    parentingTransitionRequiredRef.current = true

                } else { // no need for reset

                    wasCachedRef.current = false // cancel cache state

                    // cancel pauses
                    interruptHandler.restoreInterrupts()

                }

            }
        }
    }

    // generate state for restoring scrollPos
    useEffect(()=>{

        if (parentingTransitionRequiredRef.current) {
            parentingTransitionRequiredRef.current = false            
            setCradleState('reparentingtransition')
        }

    },[parentingTransitionRequiredRef.current])

    // change state for entering or leaving cache
    useEffect(()=>{

        // disallow 'setup' so 'dosetup' won't be passed over
        if (cradleStateRef.current == 'setup') return 

        if (isCachedRef.current && !wasCachedRef.current) {

            setCradleState('cached') // replaces 'ready' as steady state

        // movement to and from cache has been resolved
        } else if (!wasCachedRef.current && !isCachedRef.current){

            setCradleState('ready')

        }

    },[isCachedRef.current, wasCachedRef.current])

    // ===================[ INITIALIZATION effects ]=========================
    // initialization effects are independent of caching

    // clear mounted flag on unmount
    useLayoutEffect(()=>{

        // unmount
        return () => {

            isMountedRef.current = false

        }

    },[])

    //send callback functions to host
    useEffect(()=>{

        referenceIndexCallbackRef.current = functions?.referenceIndexCallback

        if (!functions.getCallbacks) return

        const {scrollToItem, reload, clearCache} = serviceHandler

        const callbacks = {
            scrollToItem,
            clearCache,
            reload,
        }

        functions.getCallbacks(callbacks)

    },[])

    // initialize window scroll listener
    useEffect(() => {
        const viewportdata = viewportInterruptPropertiesRef.current
        viewportdata.elementRef.current.addEventListener('scroll',scrollHandler.onScroll)

        return () => {

            viewportdata.elementRef.current && viewportdata.elementRef.current.removeEventListener('scroll',scrollHandler.onScroll)

        }

    },[])

    // observer support

    /*
        There are two interection observers, one for the cradle wings, and another for triggerlines; 
            both against the viewport.
        There is also a resize observer for the cradle wings, to generate responses to size changes of 
            variable cells.
    */    
    useEffect(()=>{

        // intersection observer for cradle body
        // this sets up an IntersectionObserver of the cradle against the viewport. When the
        // cradle goes out of the observer scope, the "repositioningRender" cradle state is triggered.
        const cradleintersectobserver = interruptHandler.cradleIntersect.createObserver()
        interruptHandler.cradleIntersect.connectElements()

        // triggerobserver tiggers cradle content updates 
        //     when triggerlines pass the edge of the viewport
        const triggerobserver = interruptHandler.axisTriggerlinesIntersect.createObserver()
        interruptHandler.axisTriggerlinesIntersect.connectElements()

        // resize observer generates compensation for changes in cell sizes for variable layout modes
        const resizeobserver = interruptHandler.cradleResize.createObserver()
        interruptHandler.cradleResize.connectElements()

        return () => {

            cradleintersectobserver.disconnect()
            triggerobserver.disconnect()
            resizeobserver.disconnect()

        }

    },[])

    // =====================[ RECONFIGURATION effects ]======================
    // resize (UI resize of the viewport), reconfigure, or pivot

    // trigger resizing based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        // movement to and from cache is independent of ui resizing
        if (isCachedRef.current || wasCachedRef.current) {

            return

        }

        if (viewportInterruptPropertiesRef.current.isResizing) {

            interruptHandler.pauseInterrupts()
 
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportInterruptPropertiesRef.current.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('finishresize')

        }

    },[viewportInterruptPropertiesRef.current.isResizing])

    // reconfigure for changed size parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        if (isCachedRef.current) return

        const signals = interruptHandler.signals

        interruptHandler.pauseInterrupts()

        setCradleState('reconfigure')

    },[
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
        triggerlineOffset
    ])

    // pivot triggered on change in orientation
    useEffect(()=> {

        scaffoldHandler.cradlePositionData.blockScrollProperty = 
            (orientation == "vertical")?"scrollTop":"scrollLeft"

        if (cradleStateRef.current == 'setup') return

        if (isCachedRef.current) return

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

        interruptHandler.pauseInterrupts()

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

    // this is the core state engine, using named states
    // useLayoutEffect for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradleState) {

            case 'setup': { // cycle to allow for ref config

                setCradleState('dosetup') // load grid

                break

            }

            case 'cached': {

                if (!wasCachedRef.current && !isCachedRef.current){

                    setCradleState('ready')

                }
                break
            }

            // renderupdatedcontent is called from updateCradleContent. 
            // it is required to integrate changed DOM configurations before 'ready' is displayed
            case 'renderupdatedcontent': { // cycle for DOM update

                // cacheHandler.renderPortalList()

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                setCradleState('finishupdatedcontent')

                break

            }

            case 'finishupdatedcontent': { // cycle for DOM update

                const { cache } = cradleInternalPropertiesRef.current
                if (cache == 'keepload') {

                    contentHandler.guardAgainstRunawayCaching()

                }
                interruptHandler.axisTriggerlinesIntersect.connectElements()
                interruptHandler.signals.pauseTriggerlinesObserver = false
                setCradleState('ready')

                break
            }

            case 'startreposition': {

                const { signals } = interruptHandler

                signals.pauseTriggerlinesObserver = true

                // avoid recursive cradle intersection interrupts
                signals.pauseCradleIntersectionObserver = true
                signals.repositioningRequired = false // because now underway

                setCradleState('repositioningRender')

                break

            }

            /*
                the following 6 cradle states all resolve with
                a chain starting with setCradleContent, 
                continuing with 'preparerender', and ending with
                'normalizesignals'
            */
            case 'dosetup':
            case 'doreposition':
            case 'finishresize':
            case 'pivot':
            case 'reconfigure':
            case 'reload': {

                const cradleContent = contentHandler.content

                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []

                // register new array id for Object.is to trigger react re-processing
                cradleContent.headDisplayComponents = []
                cradleContent.tailDisplayComponents = []

                if (cradleState == 'reload') {
                    cacheHandler.clearCache()
                }

                contentHandler.setCradleContent( cradleState )

                const cache = cradleInternalPropertiesRef.current.cache
                if (cache == 'cradle') {
                    const modelComponentList = contentHandler.content.cradleModelComponents
                    const modelIndexList = modelComponentList.map(item=>item.props.index)
                    cacheHandler.matchCacheToCradle(modelIndexList)
                    cacheHandler.renderPortalList()
                }

                setCradleState('preparerender')

                break
            }

            case 'preparerender': { // cycle for DOM update

                const cradleContent = contentHandler.content

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                setCradleState('normalizesignals') // call a timeout for ready (or interrupt continuation)

                break
            }

            case 'normalizesignals': { // normalize or resume cycling

                // prioritize interrupts TODO: validate this

                if ((!isCachedRef.current) && viewportInterruptPropertiesRef.current.isResizing) {

                    setCradleState('resizing')

                } else if (interruptHandler.signals.repositioningRequired) {

                    setCradleState('startreposition')

                } else {                     

                    interruptHandler.restoreInterrupts()

                    setCradleState('ready')

                }

                break 

            }

            // user request
            case 'clearcache': {
                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []

                // register new array id for Object.is to trigger react re-processing
                cradleContent.headDisplayComponents = []
                cradleContent.tailDisplayComponents = []

                cacheHandler.clearCache()

                setCradleState('ready')

                break
            }

            // moving out of cache into visible DOM tree (cellShell)
            // resets scrollPos to last UI value
            case 'reparentingtransition': {

                    const viewportElement = viewportInterruptPropertiesRef.current.elementRef.current
                    const { cradlePositionData } = scaffoldHandler

                    // reset scroll position to previous value
                    viewportElement[cradlePositionData.blockScrollProperty] = 
                        cradlePositionData.blockScrollPos

                    wasCachedRef.current = false

                    // const { signals } = interruptHandler

                    interruptHandler.restoreInterrupts()

                    setCradleState('ready')

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

            case 'ready': // no op
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
    },
        [
            cradleState, 
            viewportDimensions, 
            scrollAxisReferenceIndex, 
            listsize,
            styles,
        ]
    )

    const cradleContent = contentHandler.content

    const contextvalueRef = useRef({cradlePassthroughPropertiesRef, cacheHandler})

    // the data-type = cacheroot div at the end is the hidden portal component cache
    return <CradleContext.Provider value = {contextvalueRef.current}>
        {((cradleState == 'repositioningRender') || 
            (cradleState == 'repositioningContinuation'))?
            <ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.scrollAxisReferenceIndex} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />:
            <div 
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

                {true?
                    <div 
                        data-type = 'cradle-divider' 
                        style = {cradleDividerStyle}
                    >
                    </div>:
                    null
                }
                <div 
                
                    data-type = 'head'
                    ref = {headCradleElementRef} 
                    style = {cradleHeadStyle}
                
                >
                
                    {(cradleState != 'setup')?
                        cradleContent.headDisplayComponents:
                        null
                    }
                
                </div>
                <div 
                
                    data-type = 'tail'
                    ref = {tailCradleElementRef} 
                    style = {cradleTailStyle}
                
                >
                    {(cradleState != 'setup')?
                        cradleContent.tailDisplayComponents:
                        null
                    }
                
                </div>
            </div>
        }

        
    </CradleContext.Provider>

} // Cradle

// utilities

const getCradleHandlers = (cradleParameters) => {

    const createHandler = handler => new handler(cradleParameters)

    return {
        cacheHandler:cradleParameters.cradleInheritedPropertiesRef.current.cacheHandler,
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