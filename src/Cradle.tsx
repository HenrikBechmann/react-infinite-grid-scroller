// Cradle.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    The Cradle does the bulk of the work for the infinite grid scroller. It does so with the help of
    eight process handlers (class instances), and one main sub-component - the CellFrame.

    Cradle's main responsibility is to manage the ~30 state changes of the system.

    The illusion of infinite content is maintained by synchronizing changes in cradle content with the
    Cradle location inside the Scrollblock, such that as the Scrollblock is moved, the cradle moves 
    oppositely to stay visible within the viewport.

    The Scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size 
    and position which realistically reflects the size of the list being shown.

    The position of the cradle is controlled by an 'axis' which is a 0px height/width div
    (along the medial - ScrollBlock can be vertical or horizontal). The purpose of the axis is to 
    act as a 'fold', above which cradle content expands 'headwards' (up or left) in the Cradle, and 
    below which the cradle content expands 'tailwards' (doen or right). The Cradle content is held in 
    two CSS grids (children of the axis): one above or left (the 'head' grid), and one below or right, 
    of the position of the axis (the 'tail' grid).

    The axis is always kept near the leading (headward) edge of the visible cell rows of the Viewport
    (there are some edge-case exceptions).

    Technically, there are several key reference points tracked by the Cradle. These are:
        - axisReferenceIndex is the virtual index of the item controlling the location of the axis.
            The axisReferenceIndex is also used to allocate items above (lower index value) and below 
            (same or higher index value) the axis fold. The axisRefernceIndex is the first item in the 
            tail section of the Cradle.
        - (cradleReferenceIndex is inferred from the axisReferenceIndex, and is the virtual index of 
            the item defining the leading bound of the cradle content. The cradleReferenceIndex is usually 
            the first item in the head section of the Cradle, unless the cradle shows the very top of the
            list, in which case the cradleReferenceIndex is the same as the AxisReferenceIndex)
        - axisViewportPixelOffset (pixels that place the axis in relation to the viewport's leading edge)
        - the blockScrollPos, which is the amount of scroll (Viewport scrollTop or scrollLeft) of the 
            ScrollBlock
    
    Overscroll handling (repositioning):
        Owing to the potential rapidity of scrolling, which in the case of large lists and heavy content 
        can be too fast for the system to keep up, there is an overscroll protocol called 'repositioning'.

        If the overscroll is such that the cradle (including its two content grids) has entirely passed 
        out of the viewport, then the Cradle component is replaced by a ScrollTracker (or by null if 
        the host takes responsibility for feedback). The ScrollTracker displays to the user the relative 
        location in the virtual list at the edge of the viewport during repositioning. When the scrolling
        stops Cradle recreates the cradle content, according to the final position of the repositioning 
        process.

    Cradle is activated by interrupts:
    - scrolling
    - resizing of the viewport
    - observer callbacks:
        - cradle/viewport intersection for repositioning when the cradle races out of scope
        - two 'triggerline'/viewport intersections which trigger rolling of content
            - rolling content triggers re-allocation of content between cradle head and tail grids
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

import { ViewportContext } from './Viewport'

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
        placeholderMessages,
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
        usePlaceholder,
        useScrollTracker,
        showAxis,
        SCROLL_TIMEOUT_FOR_ONAFTERSCROLL,
        IDLECALLBACK_TIMEOUT,
        MAX_CACHE_OVER_RUN,
        TIMEOUT_FOR_VARIABLE_MEASUREMENTS,
        scrollerProperties,

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
        cellMinHeight,
        cellMinWidth,
        layout,

    } = gridSpecs

    // get viewport context
    const ViewportContextProperties = useContext(ViewportContext)

    const ViewportContextPropertiesRef = useRef(null)
    ViewportContextPropertiesRef.current = ViewportContextProperties // for closures

    // flags
    const isMountedRef = useRef(true)
    const isCachedRef = useRef(false)
    const wasCachedRef = useRef(false)
    const parentingTransitionRequiredRef = useRef(false)
    const hasBeenRenderedRef = useRef(false)

    //  viewport dimensions and cached state
    const getViewportDimensions = () => {
        const viewportElement = ViewportContextProperties.elementRef.current
        return {
            width:viewportElement.offsetWidth,
            height:viewportElement.offsetHeight
        }
    }

    const { viewportDimensions } = ViewportContextProperties // for scrollTracker
    const { height:viewportheight,width:viewportwidth } = getViewportDimensions() // viewportDimensions

    // zero width and height means the component must be in portal (cache) state
    const isInPortal = ((viewportwidth == 0) && (viewportheight == 0)) 

    const isCacheChange = (isInPortal != isCachedRef.current)

    if (isCacheChange) {
        wasCachedRef.current = isCachedRef.current
        isCachedRef.current = isInPortal
    }

    // console.log('immediate width/height', viewportwidth,viewportheight)

    // cradle state
    const [cradleState, setCradleState] = useState('setup')
    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState

    // console.log('==> cradleState','-'+scrollerID+'-',
    //     '~'+scrollerProperties?.cellFrameDataRef.current.index+'~', cradleState)

    // cradle scaffold element refs
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const axisCradleElementRef = useRef(null)
    const triggercellTriggerlineHeadElementRef = useRef(null)
    const triggercellTriggerlineTailElementRef = useRef(null)

    // layout bundle
    const cradleElementsRef = useRef(
        {
            headRef:headCradleElementRef, 
            tailRef:tailCradleElementRef, 
            axisRef:axisCradleElementRef,
            triggercellTriggerlineHeadRef:triggercellTriggerlineHeadElementRef,
            triggercellTriggerlineTailRef:triggercellTriggerlineTailElementRef,
        }
    )

    // console.log('Cradle scrollerProperties.cellFrameDataRef',scrollerProperties?.cellFrameDataRef)

    // ------------------------[ calculated properties ]------------------------
    // configuration calculations

    // crosscount (also calculated by Scrollblock for deriving Scrollblock length)
    const crosscount = useMemo(() => { // the number of cells crossing orientation

        if (isCachedRef.current) return 0

        const viewportcrosslength = 
            (orientation == 'vertical')?
                viewportwidth:
                viewportheight

        // console.log('viewportcrosslength', viewportcrosslength)
        // if (viewportcrosslength == 0) {

        //     return 0

        // }

        // cross length of viewport (gap to match crossLength)
        const viewportcrosslengthforcalc = viewportcrosslength - (padding * 2) + gap 

        const cellcrosslength = 
            (orientation == 'vertical')?
                (cellWidth + gap):
                (cellHeight + gap);

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

    // console.log('crosscount', crosscount)

    // various row counts
    const [
        cradleRowcount, 
        viewportRowcount, 
        viewportVisibleRowcount, // maximum number of rows completely visible at once
        listRowcount,
        runwayRowcount,
    ] = useMemo(()=> {

        const viewportLength = 
            (orientation == 'vertical')?
                viewportheight:
                viewportwidth

        let baseRowLength
        if (layout == 'uniform') {

            if (orientation == 'vertical') {

                baseRowLength = cellHeight

            } else {

                baseRowLength = cellWidth

            }

        } else { // layout == 'variable'

            if (orientation == 'vertical') {

                baseRowLength = cellMinHeight

            } else {

                baseRowLength = cellMinWidth

            }

        }

        baseRowLength += gap

        const viewportRowcount = Math.ceil(viewportLength/baseRowLength)

        const viewportVisibleRowcount = Math.floor(viewportLength/baseRowLength)

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
        cellMinWidth,
        cellMinHeight, 
        viewportheight, 
        viewportwidth,

        listsize,
        runwaySize,
        crosscount,
        layout,
    ])

    // ----------------------[ callbacks ]----------------------------

    // host callbacks, upacked by serviceHandler
    const externalCallbacksRef = useRef(
        {
            referenceIndexCallback:userCallbacks?.referenceIndexCallback,
            repositioningFlagCallback:userCallbacks?.repositioningFlagCallback,
            repositioningIndexCallback:userCallbacks?.repositioningIndexCallback,
            preloadIndexCallback:userCallbacks?.preloadIndexCallback,
            deleteListCallback:userCallbacks?.deleteListCallback,
            changeListsizeCallback:userCallbacks?.changeListsizeCallback,
            itemExceptionCallback:userCallbacks?.itemExceptionCallback,
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
        cellMinHeight,
        cellMinWidth,
        layout,
        // ...rest
        cache,
        cacheMax,
        startingIndex, 
        getItem, 
        placeholder, 
        placeholderMessages,
        triggerlineOffset,
        scrollerID,
        usePlaceholder,
        // objects
        userCallbacks,
        styles,
        cacheHandler,
        // control values
        SCROLL_TIMEOUT_FOR_ONAFTERSCROLL,
        MAX_CACHE_OVER_RUN,

    }

    const scrollerPropertiesRef = useRef(null)
    // passed to cellFrame content (user content) if requested
    scrollerPropertiesRef.current = {
        orientation, 
        gap, 
        padding, 
        cellHeight, 
        cellWidth,
        cellMinHeight,
        cellMinWidth, 
        layout,
        listsize,
        runwayRowcount,
        cache,
        cacheMax,
        startingIndex, 
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
    }

    // placeholder in cradleParameters to make available individual handlers
    const handlersRef = useRef(null)

    // cradle parameters MASTER BUNDLE
    const cradleParameters = {
        handlersRef,
        ViewportContextPropertiesRef,
        cradleInheritedPropertiesRef, 
        scrollerPropertiesRef,
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

    // console.log('viewportwidth, viewportheight',viewportwidth, viewportheight )

    // =======================[ INTERCEPT CACHING STATE CHANGE ]=========================

/*    
    Intercept change in caching status:
    when a component is is cached in a portal (in the React virtual DOM), including the transition of 
    being moved from one cellFrame to another when crossing the Cradle axis, 
    the scrollPos (scrollLeft or scrollTop) is reset to 0 (zero). When the scroller is 
    moved to a cellFrame, this code triggers restoration the scrollPos (see case 'parentingtransition'
    in the state management section below).

    Not that InfiniteGridScroller components can themselves be cached as content.

    The restore scrollPos action must be the first priority to hide these scrollPos adjustments
    from the user.
*/
    // // zero width and height means the component must be in portal (cache) state
    // const isInPortal = ((viewportwidth == 0) && (viewportheight == 0)) 

    // const isCacheChange = (isInPortal != isCachedRef.current)

    // if (isCacheChange) {
    //     wasCachedRef.current = isCachedRef.current
    //     isCachedRef.current = isInPortal
    // }

    const isCachingUnderway = (isCachedRef.current || wasCachedRef.current)

    if (isCacheChange || 
        ViewportContextProperties.isReparentingRef?.current ||
        (ViewportContextProperties.isResizing && isCachingUnderway)) { 

        if (ViewportContextProperties.isReparentingRef?.current) {

            ViewportContextProperties.isReparentingRef.current = false // no longer needed

            parentingTransitionRequiredRef.current = true

        } 

        if (ViewportContextProperties.isResizing) { // caching op is underway, so cancel

            ViewportContextProperties.isResizing = false

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

            setCradleState('cached')

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

    // clear mounted flag on unmount
    useEffect(()=>{

        isMountedRef.current = true
        // unmount
        return () => {

            isMountedRef.current = false

        }

    },[])

    //send call-in functions to host
    useEffect(()=>{

        if (!userCallbacks.functionsCallback) return

        const {

            scrollToIndex, 
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

            scrollToIndex,
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

        userCallbacks.functionsCallback(functions)

    },[])

    // initialize window scroll listener
    useEffect(() => {

        const viewportdata = ViewportContextPropertiesRef.current
        viewportdata.elementRef.current.addEventListener('scroll',scrollHandler.onScroll)

        return () => {

            viewportdata.elementRef.current && viewportdata.elementRef.current.removeEventListener('scroll',scrollHandler.onScroll)

        }

    },[])

    // observer support
    /*
        There are two interection observers: one for the cradle wings, and another for triggerlines; 
            both against the viewport.
    */    
    useEffect(()=>{

        const {
            cradleIntersect,
            triggerlinesIntersect,
        } = interruptHandler

        // intersection observer for cradle body
        // this sets up an IntersectionObserver of the cradle against the viewport. When the
        // cradle goes out of the observer scope, the 'repositioningRender' cradle state is triggered.
        const cradleintersectobserver = cradleIntersect.createObserver()
        cradleIntersect.connectElements()

        // triggerobserver tiggers cradle content updates 
        //     when triggerlines pass the edge of the viewport
        // defer connectElements until triggercell triggerlines have been assigned
        const triggerobserver = triggerlinesIntersect.createObserver()

        return () => {

            cradleintersectobserver.disconnect()
            triggerobserver.disconnect()

        }

    },[])

    // =====================[ RECONFIGURATION effects ]======================
    // change listsize, caching, resize (UI resize of the viewport), reconfigure, or pivot

    // callback: the new list size will always be less than current listsize
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

                    cacheHandler.renderPortalLists()
                    
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

                    cacheHandler.renderPortalLists()

                }

                setCradleState('changecaching')

                break
            }

        }

    },[cache, cacheMax])

    // trigger viewportresizing response based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        // movement to and from cache is independent of ui viewportresizing
        if (isCachedRef.current || wasCachedRef.current) {

            return

        }

        if ((ViewportContextPropertiesRef.current.isResizing) && 
                (cradleStateRef.current != 'viewportresizing')) {

            interruptHandler.pauseInterrupts()
 
            setCradleState('viewportresizing')

        }

        // complete viewportresizing mode
        if (!ViewportContextPropertiesRef.current.isResizing && (cradleStateRef.current == 'viewportresizing')) {

            setCradleState('finishviewportresize')

        }

    },[ViewportContextPropertiesRef.current.isResizing])

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
        triggerlineOffset,
        layout,
    ])

    // a new getItem function implies the need to reload
    useEffect(() => {

        if (cradleStateRef.current == 'setup') return

        interruptHandler.pauseInterrupts()

        setCradleState('reload')

    },[getItem])

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

        const { cradlePositionData } = layoutHandler
        
        cradlePositionData.targetAxisViewportPixelOffset = Math.round(pivotAxisOffset)

        interruptHandler.pauseInterrupts()

        setCradleState('pivot')

    },[orientation])

    // =====================[ STYLES ]===========================

    // styles for the six scaffold components
    const [
        cradleHeadStyle,
        cradleTailStyle,
        cradleAxisStyle,
        cradleDividerStyle,
        triggercellTriggerlineHeadStyle,
        triggercellTriggerlineTailStyle,
    ] = useMemo(()=> {

        return stylesHandler.getCradleStyles({

            orientation, 
            cellHeight, 
            cellWidth, 
            cellMinHeight,
            cellMinWidth,
            gap,
            padding,
            viewportheight, 
            viewportwidth,
            crosscount, 
            userstyles:styles,
            triggerlineOffset,
            layout,

        })

    },[

        orientation,
        cellHeight,
        cellWidth,
        cellMinHeight,
        cellMinWidth,
        gap,
        padding,
        viewportheight,
        viewportwidth,
        crosscount,
        styles,
        triggerlineOffset,
        layout,

      ])

    // =====================[ STATE MANAGEMENT ]==========================

    // this is the core state engine (about 30 states), using named states
    // useLayoutEffect for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradleState) {

            // --------------[ precursors to setCradleContent ]---------------
            // these are all workflow related, but
            // resize could be asynchronous when rotating phone during scroll intertia

            case 'setup': { // cycle to allow for ref assignments

                if (cradleInheritedPropertiesRef.current.cache != 'preload') {
                    if (isCachedRef.current) {
                        setCradleState('cached')
                    } else {
                        setCradleState('firstrender') // load grid
                    }
                }
                break

            }

            case 'viewportresizing': {

                // no-op, wait for resizing to end
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

                        cacheHandler.renderPortalLists()

                    }

                    if (!isCachedRef.current) {

                        setCradleState('finishpreload')

                    } else {

                        setCradleState('cached')

                    }

                }

                cacheHandler.preload(finalCallback, nullItemSetMaxListsize, scrollerID)

                break
            }

            case 'cached': {

                if (!wasCachedRef.current && !isCachedRef.current){

                    if (hasBeenRenderedRef.current) {

                        setCradleState('rerenderfromcache')

                    } else {

                        setCradleState('firstrenderfromcache')

                    }

                } // else wait for reparenting

                break
            }

            // moving out of cache into visible DOM tree (cellFrame)
            // resets scrollPos (scrollLeft/scrollTop) to last UI value
            case 'parentingtransition': {

                    const { cradlePositionData } = layoutHandler

                    // console.log('Cradle: parentingtransition: cradlePositionData',cradlePositionData)
                    // reset scroll position to previous value
                    const blockScrollPos = cradlePositionData.blockScrollPos
                    if (blockScrollPos !== null) {

                        const viewportElement = ViewportContextPropertiesRef.current.elementRef.current

                        viewportElement[cradlePositionData.blockScrollProperty] = blockScrollPos

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

                if (scrollHandler.isScrolling) {

                    setCradleState('repositioningRender') // toggles with repositioningContinuation

                } else {

                    setCradleState('finishreposition')

                }

                break

            }

            // -------------------[ setCradleContent ]------------------

            /*
                the following 11 cradle states all resolve with
                a chain starting with setCradleContent, 
                continuing with 'preparerender', and ending with
                'restoreinterrupts', with a detour for variable layout 
                to reconfigure the scrollblock
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

                if (isCachedRef.current) {
                    setCradleState('cached')
                    break
                }

                const cradleContent = contentHandler.content

                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []

                if (cradleState == 'reload') {
                    cacheHandler.clearCache()
                }

                // set data
                contentHandler.setCradleContent( cradleState )

                if (cradleState != 'finishpreload') {

                    hasBeenRenderedRef.current = true
                    
                }

                // synchronize cache if necessary
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
                        
                        cacheHandler.renderPortalLists()

                    }
                }

                // prepare the cycle for preparerender
                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                // console.log('cradleContent TAIL length', 
                //     '-'+scrollerID+'-',
                //     '~'+scrollerProperties?.cellFrameDataRef.current.index+'~',
                //     cradleContent.tailDisplayComponents.length)

                // update virtual DOM
                const { layout } = cradleInheritedPropertiesRef.current
                if (layout == 'uniform') {
    
                    setCradleState('preparerender')

                } else {

                    setCradleState('refreshDOMsetforvariability')

                }

                break
            }

            case 'refreshDOMsetforvariability': {

                setCradleState('preparesetforvariability')

                break

            }

            case 'preparesetforvariability': {

                setTimeout(() => { // give time for DOM to produce layout
            
                    contentHandler.adjustScrollblockForVariability('setcradle')

                    setCradleState('finishsetforvariability')

                },TIMEOUT_FOR_VARIABLE_MEASUREMENTS)
                
                break

            }

            case 'finishsetforvariability': {

                setCradleState('preparerender')
                
                break
            }

            case 'preparerender': { // cycle for DOM update

                // triggerlines will have been assigned to a new triggerCell by now.
                // connectElements delayed for a cycle to render triggercell triggerlines
                interruptHandler.triggerlinesIntersect.connectElements()
                interruptHandler.cradleIntersect.connectElements()

                // this can be pre-empted by reparenting, which itself restores interrupts
                setCradleState('restoreinterrupts') // to restore interrupts

                break
            }

            case 'restoreinterrupts': { // normalize or resume cycling

                interruptHandler.restoreInterrupts()

                setCradleState('ready')

                break 

            }

            // ----------------------[ followup from updateCradleContent ]------------
            // scroll effects

            // renderupdatedcontent is called from updateCradleContent. 
            // it is required to integrate changed DOM configurations before 'ready' is displayed
            case 'renderupdatedcontent': { // cycle for DOM update

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                // update virtual DOM
                setCradleState('finishupdatedcontent')

                break

            }

            case 'finishupdatedcontent': { // cycle for DOM update


                // synchronize cache
                const { cache } = cradleInternalPropertiesRef.current
                if (cache == 'keepload') {

                    contentHandler.guardAgainstRunawayCaching()

                }

                cacheHandler.renderPortalLists()

                const { layout } = cradleInheritedPropertiesRef.current
                if (layout == 'uniform') {

                    // re-activate triggers; triggerlines will have been assigned to a new triggerCell by now.
                    interruptHandler.triggerlinesIntersect.connectElements()
                    interruptHandler.signals.pauseTriggerlinesObserver = false

                    setCradleState('ready')

                } else {

                    setCradleState('refreshDOMupdateforvariability')

                }

                break
            }

            case 'refreshDOMupdateforvariability': {

                // extra cycle needed to allow time to synchronize DOM with grid changes

                setCradleState('adjustupdateforvariability')

                break

            }

            case 'adjustupdateforvariability': {

                contentHandler.adjustScrollblockForVariability('updatecradle')

                setCradleState('finishupdateforvariability')

                break

            }

            // called from onAfterScroll. 
            // This can be called twice in succession with short onAfterScroll timeout
            case 'adjustupdateforvariabilityafterscroll': {

                contentHandler.adjustScrollblockForVariability('afterscroll')

                setCradleState('finishupdateforvariability')

                break

            }

            case 'finishupdateforvariability': {

                // re-activate triggers; triggerlines will have been assigned to a new triggerCell by now.
                interruptHandler.triggerlinesIntersect.connectElements()
                interruptHandler.signals.pauseTriggerlinesObserver = false

                setCradleState('ready')

                break

            }

            // ----------------[ user requests ]-------------

            // support for various host service requests; syncs cradle content with cache changes
            case 'applycellframechanges': { // user intervention

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                const { portalItemHoldForDeleteList } = cacheHandler

                if (portalItemHoldForDeleteList && portalItemHoldForDeleteList.length) {

                    for (const item of portalItemHoldForDeleteList) {

                        cacheHandler.removePartitionPortal(item.partitionID, item.itemID)
                        
                    }
                    cacheHandler.renderPortalLists()

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

    // standard rendering states (3 states)
    useEffect(()=> { 

        switch (cradleState) {

            // repositioningRender and repositioningContinuation are toggled to generate continuous 
            // repositioning renders
            case 'repositioningRender': // no-op
                break

            case 'repositioningContinuation': // set from onScroll
                setCradleState('repositioningRender')
                break

            case 'ready': // no-op

                break

        }

    },[cradleState])

    // ==========================[ RENDER ]===========================

    const scrollAxisReferenceIndex = layoutHandler.cradlePositionData.targetAxisReferenceIndex
    const scrollTrackerArgs = useMemo(() => {
        if (!useScrollTracker) return null
        if (!['repositioningContinuation','repositioningRender'].includes(cradleState)) {
            return null
        }
        const { repositioningIndexCallback } = serviceHandler.callbacks
        repositioningIndexCallback && repositioningIndexCallback(scrollAxisReferenceIndex)
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
            useScrollTracker,
        ]
    )

    const cradleContent = contentHandler.content

    const triggercellTriggerlinesRef = useRef(null)
    triggercellTriggerlinesRef.current = useMemo(()=>{

        return [
            <div
                key = 'head'
                data-type = 'headtrigger'
                style = {triggercellTriggerlineHeadStyle}
                ref = {triggercellTriggerlineHeadElementRef}
            >
            </div>,
            <div
                key = 'tail'
                data-type = 'tailtrigger'
                style = {triggercellTriggerlineTailStyle}
                ref = {triggercellTriggerlineTailElementRef}
            >
            </div>
        ]

    },[
        triggercellTriggerlineHeadStyle,
        triggercellTriggerlineTailStyle
    ])

    const contextvalueRef = useRef({
        scrollerPropertiesRef, 
        cacheHandler, 
        nullItemSetMaxListsize,
        itemExceptionCallback:serviceHandler.callbacks.itemExceptionCallback,
        IDLECALLBACK_TIMEOUT,
        triggercellTriggerlinesRef,
    })


    // display the cradle components, the ScrollTracker, or null
    return <CradleContext.Provider value = { contextvalueRef.current }>

        {(['repositioningContinuation','repositioningRender'].includes(cradleState))?
            useScrollTracker?<ScrollTracker 
                top = { scrollTrackerArgs.top } 
                left = { scrollTrackerArgs.left } 
                offset = { scrollTrackerArgs.scrollAxisReferenceIndex } 
                listsize = { scrollTrackerArgs.listsize }
                styles = { scrollTrackerArgs.styles }
            />:null:
            <div 
                data-type = 'cradle-axis'
                style = { cradleAxisStyle } 
                ref = { axisCradleElementRef }
            >
                { showAxis? // for debug
                    <div 
                        data-type = 'cradle-divider' 
                        style = { cradleDividerStyle }
                    >
                    </div>:
                    null
                }
                <div 
                
                    data-type = 'head'
                    ref = { headCradleElementRef }
                    style = { cradleHeadStyle }
                
                >
                
                    {(cradleState != 'setup')?
                        cradleContent.headDisplayComponents:
                        null
                    }
                
                </div>
                <div 
                
                    data-type = 'tail'
                    ref = { tailCradleElementRef } 
                    style = { cradleTailStyle }
                
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

    cacheHandler.cradleParameters = cradleParameters

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
