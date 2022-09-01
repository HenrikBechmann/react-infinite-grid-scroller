// Cradle.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    The Cradle does the bulk of the work for the infinite grid scroller. It does so with the help of
    eight process handlers, and one main sub-component - the CellFrame.

    Cradle's main responsibility is to manage the state change flows of the content.

    The illusion of infinite content is maintained by synchronizing changes in cradle content with the
    Cradle location inside the Scrollblock, such that as the Scrollblock is moved, the cradle moves 
    oppositely to stay visible within the viewport.

    The Scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size 
    and position which realistically reflects the size of the list being shown.

    The position of the cradle is controlled by an 'axis' which is a 0px height/width div
    (along the medial - ScrollBlock can be verticsl or horizontal). The purpose of the axis is to 
    act as a 'fold', above which cradle content expands 'upwards' in the Cradle, and below which the 
    cradle content expands 'downwards'. The Cradle content is held in two CSS grids (children of the axis): 
    one above, and one below the position of the axis.

    The axis is always kept near the leading (headward) edge of the visible cellrows of the viewport
    (there are some edge-case exceptions).

    Technically, there are several key reference points tracked by the Cradle. These are:
        - axisReferenceIndex is the virtual index of the item controlling the location of the axis.
            The axisReferenceIndex is also used to allocate items above (lower index value) and below 
            (same or higher index value) the axis fold. The axisRefernceIndex is the first item in the 
            tail section of the Cradle.
        - (cradleReferenceIndex is inferred from the axisReferenceIndex, and is the virtual index of 
            the item defining the leading bound of the cradle content. The cradleReferenceIndex is the 
            fist item in the head section of the Cradle)
        - axisPixelOffset (pixels that place the axis in relation to the viewport's leading edge)
        - the blockScrollPos, which is the amount of scroll of the ScrollBlock
    
    Overscroll handling:
        Owing to the potential rapidity of scrolling, which in the case of large lists and heavy content 
        can be too fast for the system to keep up, there is an overscroll protocol called 'repositioning'.

        If the overscroll is such that the cradle has entirely passed out of the viewport, then the Cradle
        is replaced by a ScrollTracker (or by null if the host takes responsibility for feedback). 
        The ScrollTracker shows the relative location in the virtual list at the edge of the viewport 
        during repositioning. When the scrolling stops Cradle recreates the cradle content, according to 
        the final position of the repositioning process.

    Cradle is activated by interrupts:
    - scrolling
    - resizing of the viewport
    - observer callbacks:
        - cradle/viewport intersection for repositioning when the cradle races out of scope
        - two 'triggerline'/viewport intersections which trigger rolling of content
            - rolling content triggers re-allocation of content between cradle head and tail grids
        - cradle grid resizing responding to variable cell length changes (in 'variable' layout mode) 
            which triggers reconfiguration
    - pivot - change of orientation
    - host changes of configuration specs through property changes or direct service calls
*/

import React, { 
    useState, 
    useRef, 
    useContext, 
    useEffect, 
    useLayoutEffect, 
    useMemo,
    useCallback, 
} from 'react'

import { ViewportInterrupt } from './Viewport'

// popup position tracker for repositioning
import ScrollTracker from './cradle/ScrollTracker'

// support code; process handlers
import ScrollHandler from './cradle/scrollhandler'
import StateHandler from './cradle/statehandler'
import ContentHandler from './cradle/contenthandler'
import LayoutHandler from './cradle/layouthandler'
import InterruptHandler from './cradle/interrupthandler'
import ServiceHandler from './cradle/servicehandler'
import StylesHandler from './cradle/styleshandler'
// cacheHandler is imported as a property; instantiated at the root

// for children
export const CradleContext = React.createContext(null)

// component
const Cradle = ({ 
        gridSpecs,

        runwaySize, 
        listsize, 
        startingIndex, 
        getItem, 
        placeholder, 
        userCallbacks,
        styles,
        triggerlineOffset,
        cache,
        cacheMax,
        // for debugging
        scrollerID,
        // for handler list
        cacheHandler,
        // system
        useScrollTracker,
        showAxis,
        IDLECALLBACK_TIMEOUT,
        MAX_CACHE_OVER_RUN,
    }) => {

    if (listsize == 0) return null // nothing to do

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

    const [cradleResizeState, setCradleResizeState] = useState('resizeready')
    const cradleResizeStateRef = useRef(null) // access by closures
    cradleResizeStateRef.current = cradleResizeState

    // flags
    const isMountedRef = useRef(true)
    const isCachedRef = useRef(false)
    const wasCachedRef = useRef(false)
    const parentingTransitionRequiredRef = useRef(false)
    const hasBeenRenderedRef = useRef(false)

    // cradle scaffold element refs
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const axisCradleElementRef = useRef(null)
    const backwardTriggerlineCradleElementRef = useRef(null)
    const forwardTriggerlineCradleElementRef = useRef(null)

    // scaffold bundle
    const cradleElementsRef = useRef(
        {
            headRef:headCradleElementRef, 
            tailRef:tailCradleElementRef, 
            axisRef:axisCradleElementRef,
            backwardTriggerlineRef:backwardTriggerlineCradleElementRef,
            forwardTriggerlineRef:forwardTriggerlineCradleElementRef,
        }
    )

    // ------------------------[ calculated properties ]------------------------
    // configuration calculations

    // crosscount (also calculated by Scrollblock for deriving Scrollblock length)
    const crosscount = useMemo(() => { // the number of cells crossing orientation

        const viewportcrosslength = 
            (orientation == 'horizontal')?
                viewportheight:
                viewportwidth

        if (viewportcrosslength == 0) {

            return 0

        }

        // cross length of viewport (gap to match crossLength)
        const viewportcrosslengthforcalc = viewportcrosslength - (padding * 2) + gap 

        const cellcrosslength = 
            (orientation == 'horizontal')?
                cellHeight + gap:
                cellWidth + gap

        const cellcrosslengthforcalc = 
            Math.min(cellcrosslength,viewportcrosslengthforcalc) // result cannot be less than 1

        const crosscount = Math.floor(viewportcrosslengthforcalc/cellcrosslengthforcalc)

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

    // various row counts
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

    // ----------------------[ callbacks ]----------------------------

    // host callbacks, upacked by serviceHandler
    const externalCallbacksRef = useRef(
        {
            referenceIndexCallback:userCallbacks?.referenceIndexCallback,
            repositioningFlagCallback:userCallbacks?.repositioningFlagCallback,
            preloadIndexCallback:userCallbacks?.preloadIndexCallback,
            deleteListCallback:userCallbacks?.deleteListCallback,
            changeListsizeCallback:userCallbacks?.changeListsizeCallback,
            itemExceptionsCallback:userCallbacks?.itemExceptionsCallback,
        }
    )

    // -----------------[ bundle properties for handlers ]-------------------

    // bundle all cradle props to pass to handlers - ultimately cradleParametersRef
    const cradleInheritedPropertiesRef = useRef(null) // access by closures and support callbacks
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
        cache,
        cacheMax,
        startingIndex, 
        getItem, 
        placeholder, 
        triggerlineOffset,
        scrollerID,
        // objects
        userCallbacks,
        styles,
        cacheHandler,
        MAX_CACHE_OVER_RUN,

    }

    const scrollerPassthroughPropertiesRef = useRef(null)

    // passed to cellFrame content (user content) if requested
    scrollerPassthroughPropertiesRef.current = {
        orientation, 
        gap, 
        padding, 
        cellHeight, 
        cellWidth, 
        layout,
        runwayRowcount,
        cache,
        cacheMax,
        startingIndex, 
        triggerlineOffset,
    }

    // configuration properties to share with handlers
    const cradleInternalPropertiesRef = useRef(null)
    cradleInternalPropertiesRef.current = {

        // updated values
        crosscount,
        cradleRowcount,
        viewportRowcount,
        viewportVisibleRowcount,
        listRowcount,
        listsize,
        runwayRowcount,

        // the following values are maintained elsewhere
        isMountedRef,
        cradleElementsRef,
        isCachedRef,
        wasCachedRef,

        // for stateHandler
        cradleStateRef,
        setCradleState,
        cradleResizeStateRef,
        setCradleResizeState,
    }

    // placeholder in cradleParameters to make available individual handlers
    const handlersRef = useRef(null)

    // cradle parameters MASTER BUNDLE
    const cradleParameters = {
        handlersRef,
        viewportInterruptPropertiesRef,
        cradleInheritedPropertiesRef, 
        scrollerPassthroughPropertiesRef,
        cradleInternalPropertiesRef, 
        externalCallbacksRef,
    }

    const cradleParametersRef = useRef(null)
    cradleParametersRef.current = cradleParameters

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
        layoutHandler,
        serviceHandler,
        stylesHandler,
    } = handlersRef.current

    // =======================[ INTERCEPT CACHING STATE CHANGE ]=========================

/*    
    Intercept change in caching status:
    when a portal is cached, including the transition of being moved from one cellFrame to another,
    (and the infinitegridscroller can be a component that is cached),
    the scrollPos (scrollLeft or scrollTop) is reset to 0 (zero). When the scroller is 
    moved to a cellFrame, this code triggers restoration the scrollPos (see case 'parentingtransition'
    in the state management section below).
    The restore action must be the first priority to hide the scrollPos changes from the user
*/
    // zero width and height means the component must be in portal (cache) state
    const isInPortal = ((viewportwidth == 0) && (viewportheight == 0)) 

    const isCacheChange = (isInPortal != isCachedRef.current)

    if (isCacheChange) {
        wasCachedRef.current = isCachedRef.current
        isCachedRef.current = isInPortal
    }

    const isCachingUnderway = (isCachedRef.current || wasCachedRef.current)

    if (
        isCacheChange || 
        viewportInterruptProperties.isReparentingRef?.current ||
        (viewportInterruptProperties.isResizing && isCachingUnderway) 
    ) { 

        if (viewportInterruptProperties.isReparentingRef?.current) {

            viewportInterruptProperties.isReparentingRef.current = false // no longer needed

            parentingTransitionRequiredRef.current = true

        } 

        if (viewportInterruptProperties.isResizing) { // caching is underway, so cancel

            viewportInterruptProperties.isResizing = false

        }

        if (isCacheChange) { // into or out of caching

            if (isCachedRef.current && !wasCachedRef.current) { // change into cache
                
                interruptHandler.pauseInterrupts()

            }

        }

    }

    // generate state for restoring scrollPos
    useEffect(()=>{

        // if is cached, then the next effect (for entering or leaving cache) has another turn
        if (parentingTransitionRequiredRef.current && !isCachedRef.current) {

            parentingTransitionRequiredRef.current = false            
            setCradleState('parentingtransition')
        }

    },[parentingTransitionRequiredRef.current])

    // change state for entering or leaving cache
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return // nothing to do

        if (isCachedRef.current && !wasCachedRef.current) { // into cache

            setCradleState('cached') // replaces 'ready' as steady state

        } else if (!isCachedRef.current && wasCachedRef.current) { // out of cache

            wasCachedRef.current = false

            if (parentingTransitionRequiredRef.current) {

                parentingTransitionRequiredRef.current = false            
                setCradleState('parentingtransition')

            } else {

                if (hasBeenRenderedRef.current) {

                    setCradleState('rerenderfromcache')

                } else {

                    setCradleState('firstrenderfromcache')

                }
            }

        }

    },[isCachedRef.current, wasCachedRef.current])

    // ===================[ INITIALIZATION effects ]=========================
    // initialization effects are independent of caching

    // the new list size will always be less than current listsize
    // invoked if getItem returns null
    const nullItemSetMaxListsize = useCallback((maxListsize) => {
        const listsize = cradleInternalPropertiesRef.current.listsize

        if (maxListsize < listsize) {

            const { deleteListCallback, changeListsizeCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('getItem returned null',deleteList)

                }

            }

            cacheHandler.changeListsize(maxListsize, 
                dListCallback,
                changeListsizeCallback)

        }
    },[])

    // clear mounted flag on unmount
    useEffect(()=>{

        // unmount
        return () => {

            isMountedRef.current = false

        }

    },[])

    //send call-in functions to host
    useEffect(()=>{

        if (!userCallbacks.getFunctions) return

        const {

            scrollToItem, 
            reload, 
            setListsize,
            clearCache, 

            getCacheIndexMap, 
            getCacheItemMap,
            getCradleIndexMap,
            remapIndexes,
            moveIndex,
            insertIndex,
            removeIndex,

        } = serviceHandler

        const functions = {

            scrollToItem,
            reload,
            setListsize,
            clearCache,
            
            getCacheIndexMap,
            getCacheItemMap,
            getCradleIndexMap,
            remapIndexes,
            moveIndex,
            insertIndex,
            removeIndex,

        }

        userCallbacks.getFunctions(functions)

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
        There are two interection observers: one for the cradle wings, and another for triggerlines; 
            both against the viewport.
        There is also a resize observer for the cradle wings, to generate responses to size changes of 
            variable cells.
    */    
    useEffect(()=>{

        // intersection observer for cradle body
        // this sets up an IntersectionObserver of the cradle against the viewport. When the
        // cradle goes out of the observer scope, the 'repositioningRender' cradle state is triggered.
        const cradleintersectobserver = interruptHandler.cradleIntersect.createObserver()
        interruptHandler.cradleIntersect.connectElements()

        // triggerobserver tiggers cradle content updates 
        //     when triggerlines pass the edge of the viewport
        const triggerobserver = interruptHandler.triggerlinesIntersect.createObserver()
        interruptHandler.triggerlinesIntersect.connectElements()

        // resize observer generates compensation for changes in cell sizes for variable layout modes
        const cradleresizeobserver = interruptHandler.cradleResize.createObserver()
        interruptHandler.cradleResize.connectElements()

        return () => {

            cradleintersectobserver.disconnect()
            triggerobserver.disconnect()
            cradleresizeobserver.disconnect()

        }

    },[])

    // =====================[ RECONFIGURATION effects ]======================
    // change caching, resize (UI resize of the viewport), reconfigure, or pivot

    // caching change
    useEffect(()=> {

        if (cache == 'preload') {

            setCradleState('startpreload')

            return

        }

        if (cradleStateRef.current == 'setup') return

        switch (cache) {

            case 'keepload': {

                const modelIndexList = contentHandler.getModelIndexList()

                const { deleteListCallback } = serviceHandler.callbacks

                let dListCallback
                if (deleteListCallback) {
                    dListCallback = (deleteList) => {

                        deleteListCallback('pare cache to cacheMax',deleteList)

                    }

                }

                const cacheMax = cradleParameters.cradleInheritedPropertiesRef.current.cacheMax

                if (cacheHandler.pareCacheToMax(cacheMax, modelIndexList, dListCallback, scrollerID)) {

                    cacheHandler.cacheProps.modified = true
                    cacheHandler.renderPortalList()
                    
                }

                setCradleState('changecaching')

                break
            }

            case 'cradle': {

                const modelIndexList = contentHandler.getModelIndexList()

                const { deleteListCallback } = serviceHandler.callbacks

                let dListCallback
                if (deleteListCallback) {
                    dListCallback = (deleteList) => {

                        deleteListCallback('match cache to cradle',deleteList)

                    }

                }

                if (cacheHandler.matchCacheToCradle(modelIndexList, dListCallback)) {

                    cacheHandler.cacheProps.modified = true
                    cacheHandler.renderPortalList()

                }

                setCradleState('changecaching')

                break
            }

        }

    },[cache, cacheMax])

    // trigger viewportresizing operation based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        // movement to and from cache is independent of ui viewportresizing
        if (isCachedRef.current || wasCachedRef.current) {

            return

        }

        if (viewportInterruptPropertiesRef.current.isResizing) {

            interruptHandler.pauseInterrupts()
 
            setCradleState('viewportresizing')

        }

        // complete viewportresizing mode
        if (!viewportInterruptPropertiesRef.current.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('finishviewportresize')

        }

    },[viewportInterruptPropertiesRef.current.isResizing])

    // reconfigure for changed size parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        if (isCachedRef.current) return

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

    // pivot triggered on change of orientation
    useEffect(()=> {

        layoutHandler.cradlePositionData.blockScrollProperty = 
            (orientation == "vertical")?"scrollTop":"scrollLeft"

        if (cradleStateRef.current == 'setup') {
            layoutHandler.cradlePositionData.blockScrollPos = 0
            return

        }

        if (isCachedRef.current) {
            hasBeenRenderedRef.current = false
            return
        }

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

        const previousAxisOffset = layoutHandler.cradlePositionData.targetAxisViewportPixelOffset

        const previousratio = previousAxisOffset/previousCellPixelLength

        const pivotCellPixelLength = 
            ((orientation == 'vertical')?
                cellHeight:
                cellWidth)
            + gap

        const pivotAxisOffset = previousratio * pivotCellPixelLength
        
        layoutHandler.cradlePositionData.targetAxisViewportPixelOffset = Math.round(pivotAxisOffset)

        interruptHandler.pauseInterrupts()

        setCradleState('pivot')

    },[orientation])

    // =====================[ STYLES ]===========================

    // styles for the six scaffold components
    const [
        cradleHeadStyle, 
        cradleTailStyle, 
        cradleAxisStyle, 
        triggerlineBackwardStyle, 
        triggerlineForwardStyle,
        cradleDividerStyle
    ] = useMemo(()=> {

        return stylesHandler.getCradleStyles({

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

    // =====================[ STATE MANAGEMENT ]==========================

    // this is the core state engine (19 states), using named states
    // useLayoutEffect for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradleState) {

            // --------------[ precursors to setCradleContent ]---------------

            case 'viewportresizing': {

                // no-op
                break
            }

            case 'setup': { // cycle to allow for ref config

                if (cradleInheritedPropertiesRef.current.cache != 'preload') {
                    if (isCachedRef.current) {
                        setCradleState('cached')
                    } else {
                        setCradleState('firstrender') // load grid
                    }
                }
                break

            }
            case 'startpreload': {

                const finalCallback = () => {

                    const modelIndexList = contentHandler.getModelIndexList()

                    const { deleteListCallback } = serviceHandler.callbacks

                    let dListCallback
                    if (deleteListCallback) {
                        dListCallback = (deleteList) => {

                            deleteListCallback('pare cache to cacheMax',deleteList)

                        }

                    }

                    if (cacheHandler.pareCacheToMax(cacheMax, modelIndexList, dListCallback, scrollerID)) {
                        cacheHandler.cacheProps.modified = true
                        cacheHandler.renderPortalList()
                    }

                    if (!isCachedRef.current) {

                        setCradleState('finishpreload')

                    } else {

                        setCradleState('cached')

                    }

                }

                cacheHandler.preload(cradleParametersRef.current, finalCallback, nullItemSetMaxListsize, scrollerID)

                break
            }

            case 'cached': {

                if (!wasCachedRef.current && !isCachedRef.current){

                    if (hasBeenRenderedRef.current) {

                        setCradleState('rerenderfromcache')

                    } else {

                        setCradleState('firstrenderfromcache')

                    }

                }

                break
            }

            // moving out of cache into visible DOM tree (cellFrame)
            // resets scrollPos (scrollLeft/scrollTop) to last UI value
            case 'parentingtransition': {

                    const { cradlePositionData } = layoutHandler

                    // reset scroll position to previous value
                    if (cradlePositionData.blockScrollPos !== null) {

                        const viewportElement = viewportInterruptPropertiesRef.current.elementRef.current

                        viewportElement[cradlePositionData.blockScrollProperty] = 
                            cradlePositionData.blockScrollPos

                    }

                    setCradleState('finishparenting')

                break

            }

            case 'finishparenting':{

                interruptHandler.restoreInterrupts()

                if (hasBeenRenderedRef.current) {

                    setCradleState('ready')

                } else {

                    setCradleState('firstrenderfromcache')

                }

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

            // -------------------[ setCradleContent ]------------------

            /*
                the following 11 cradle states all resolve with
                a chain starting with setCradleContent, 
                continuing with 'preparerender', and ending with
                'normalizesignals'
            */
            case 'firstrender':
            case 'firstrenderfromcache':
            case 'rerenderfromcache':
            case 'scrollto':
            case 'changecaching':
            case 'finishpreload':
            case 'finishreposition':
            case 'finishviewportresize':
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

                if (cradleState != 'finishpreload') {

                    hasBeenRenderedRef.current = true
                    
                }

                const { cache } = cradleInheritedPropertiesRef.current
                if (cache == 'cradle') {

                    const modelIndexList = contentHandler.getModelIndexList()

                    const { deleteListCallback } = serviceHandler.callbacks

                    let dListCallback
                    if (deleteListCallback) {
                        dListCallback = (deleteList) => {

                            deleteListCallback('match cache to cradle',deleteList)

                        }

                    }

                    if (cacheHandler.matchCacheToCradle(modelIndexList, dListCallback)) {
                        
                        cacheHandler.renderPortalList()

                    }
                }

                setCradleState('preparerender')

                break
            }

            case 'preparerender': { // cycle for DOM update

                const cradleContent = contentHandler.content

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                setCradleState('normalizesignals') 

                break
            }

            case 'normalizesignals': { // normalize or resume cycling

                interruptHandler.restoreInterrupts()

                setCradleState('ready')

                break 

            }

            // ----------------------[ followup from updateCradleContent ]------------

            // renderupdatedcontent is called from updateCradleContent. 
            // it is required to integrate changed DOM configurations before 'ready' is displayed
            case 'renderupdatedcontent': { // cycle for DOM update

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

                cacheHandler.renderPortalList()

                // interruptHandler.triggerlinesIntersect.connectElements()
                // interruptHandler.signals.pauseTriggerlinesObserver = false
                setCradleState('ready')

                break
            }

            // ----------------[ user requests ]-------------

            case 'applycellframechanges': { // user intervention

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                const { portalHoldList } = cacheHandler
                const { portalMap } = cacheHandler.cacheProps

                if (portalHoldList && portalHoldList.length) {

                    for (const itemID of portalHoldList) {

                        portalMap.delete(itemID)
                        
                    }

                }

                setCradleState('ready')

                break
            }

            case 'clearcache': {

                contentHandler.clearCradle()
                cradleContent.headDisplayComponents = []
                cradleContent.tailDisplayComponents = []
                cacheHandler.clearCache()
                setCradleState('ready')

                break
            }

        }

    },[cradleState])

    // for cradle resize events
    useLayoutEffect(()=>{

        switch (cradleResizeState) {

            case 'resizeready':
                break
            case 'resizecradle':
                setCradleResizeState('resizeready')
                break
        }

    },[cradleResizeState])

    // standard rendering states (3 states)
    useEffect(()=> { 

        switch (cradleState) {

            // repositioningRender and repositioningContinuation are toggled to generate continuous 
            // repositioning renders
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

    const scrollAxisReferenceIndex = layoutHandler.cradlePositionData.targetAxisReferenceIndex
    const scrollTrackerArgs = useMemo(() => {
        if (!useScrollTracker) return null
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

    const contextvalueRef = useRef({
        scrollerPassthroughPropertiesRef, 
        cacheHandler, 
        nullItemSetMaxListsize,
        itemExceptionsCallback:serviceHandler.callbacks.itemExceptionsCallback,
        IDLECALLBACK_TIMEOUT,
    })

    return <CradleContext.Provider value = {contextvalueRef.current}>

        {(((cradleState == 'repositioningRender') || 
            (cradleState == 'repositioningContinuation')))?
            useScrollTracker?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.scrollAxisReferenceIndex} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />:null:
            <div 
                data-type = 'cradle-axis'
                style = {cradleAxisStyle} 
                ref = {axisCradleElementRef}
            >
                <div
                    data-type = 'triggerline-backward'
                    style = {triggerlineBackwardStyle}
                    ref = {backwardTriggerlineCradleElementRef}
                >
                </div>
                <div
                    data-type = 'triggerline-forward'
                    style = {triggerlineForwardStyle}
                    ref = {forwardTriggerlineCradleElementRef}
                >
                </div>

                {showAxis?
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

export default Cradle

// utility

const getCradleHandlers = (cradleParameters) => {

    const createHandler = handler => new handler(cradleParameters)

    const { cacheHandler } = cradleParameters.cradleInheritedPropertiesRef.current

    return {

        cacheHandler,
        interruptHandler:createHandler(InterruptHandler),
        scrollHandler:createHandler(ScrollHandler),
        stateHandler:createHandler(StateHandler),
        contentHandler:createHandler(ContentHandler),
        layoutHandler:createHandler(LayoutHandler),
        serviceHandler:createHandler(ServiceHandler),
        stylesHandler:createHandler(StylesHandler),

    }

}
