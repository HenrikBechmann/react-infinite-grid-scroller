// Cradle.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The Cradle does the bulk of the work for the infinite grid scroller. It does so with the help of
    eight process handlers (class instances), and one main sub-component - the CellFrame.

    Cradle's main responsibility is to manage the ~35 state changes of the system.

    The illusion of infinite content is maintained by synchronizing changes in cradle content with the
    Cradle location inside the Scrollblock, such that as the Scrollblock is moved, the cradle moves 
    oppositely to stay visible within the Viewport.

    The Scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size 
    and position which realistically reflects the size of the list being shown.

    The position of the cradle is controlled by an 'axis' which is a 0px height/width div
    (along the medial - ScrollBlock can be vertical or horizontal). The purpose of the axis is to 
    act as a 'fold', above which cradle content expands 'headwards' (up or left) in the Cradle, and 
    below which the cradle content expands 'tailwards' (down or right). The Cradle content is held in 
    two CSS grids (children of the axis): one above or left (the 'head' grid), and one below or right, 
    of the position of the axis (the 'tail' grid).

    The axis is kept near the leading (headward) edge of the visible cell rows of the Viewport

    Technically, there are several key reference points tracked by the Cradle. These are:
        - targetAxisReferencePosition is the virtual 0-based position of the item controlling the location 
          of the axis.
        - The axisReferenceIndex is inferred from the targetAxisReferencePosition, by adding the virtual index 
            range low index to the targetAxisReferencePosition.
            The axisReferenceIndex is also used to allocate items above (lower index value) and below 
            (same or higher index value) the axis fold. The axisReferenceIndex is the first item in the 
            tail section of the Cradle.
        - (cradleReferenceIndex is inferred from the axisReferenceIndex, and is the virtual index of 
            the item defining the leading bound of the cradle content. The cradleReferenceIndex is usually 
            the first item in the head section of the Cradle, unless the cradle shows the very top of the
            list, in which case the cradleReferenceIndex is the same as the AxisReferenceIndex)
        - axisViewportPixelOffset (pixels that place the axis in relation to the viewport's leading edge)
        - the trackingBlockScrollPos, which is the amount of scroll (Viewport scrollTop or scrollLeft) of the 
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

    Cradle changes are activated by interrupts:
    - scrolling
    - resizing of the viewport
    - IntersectionObserver callbacks:
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

// support code; process handlers
import ScrollHandler from './cradle/scrollhandler'
import StateHandler from './cradle/statehandler'
import ContentHandler from './cradle/contenthandler'
import LayoutHandler from './cradle/layouthandler'
import InterruptHandler from './cradle/interrupthandler'
import ServiceHandler from './cradle/servicehandler'
import StylesHandler from './cradle/styleshandler'
// cacheAPI is imported as a property; instantiated at the root

// import { isSafariIOS } from './InfiniteGridScroller'

// for children
export const CradleContext = React.createContext(null)

// component
const Cradle = ({ 
        gridSpecs,
        paddingProps,
        gapProps,
        // basics
        runwaySize, 
        virtualListSpecs,
        setVirtualListSize,
        setVirtualListRange,
        startingIndex, 
        getItem, 
        getExpansionCount,
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
        cacheAPI,
        // system
        usePlaceholder,
        // useScrollTracker,
        showAxis,
        ONAFTERSCROLL_TIMEOUT,
        IDLECALLBACK_TIMEOUT,
        MAX_CACHE_OVER_RUN,
        VARIABLE_MEASUREMENTS_TIMEOUT,
        scrollerProperties,

    }) => {

    const { 

        size:listsize,
        lowindex, 
        highindex,

    } = virtualListSpecs

    // ========================[ DATA SETUP ]========================

    // unpack gridSpecs
    const {

        orientation,
        // gap,
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
    const 
        isMountedRef = useRef(true),
        isCachedRef = useRef(false),
        wasCachedRef = useRef(false),
        hasBeenRenderedRef = useRef(false),
        // trigger control
        triggerHistoryRef = useRef({
            previousTriggerNameAtBorder:null,
        })

    //  viewport dimensions and cached state
    const getViewportDimensions = () => {
        const viewportElement = ViewportContextProperties.elementRef.current
        return {
            width:viewportElement.offsetWidth,
            height:viewportElement.offsetHeight
        }
    }

    const { height:viewportheight,width:viewportwidth } = getViewportDimensions() // viewportDimensions

    // cache test
    // zero width and height means the component must be in portal (cache) state
    const 
        isInPortal = ((viewportwidth == 0) && (viewportheight == 0)),
        isCacheChange = (isInPortal != isCachedRef.current)

    if (isCacheChange) {
        wasCachedRef.current = isCachedRef.current
        isCachedRef.current = isInPortal
    }

    // cradle state
    const 
        [cradleState, setCradleState] = useState('setup'),
        cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState

    // if (!scrollerProperties) { // root scroller
        console.log('--> cradleState','-'+scrollerID+'-', cradleState)
        // console.log('-- index','~'+scrollerProperties?.cellFramePropertiesRef.current.index+'~')
        // console.log('-- itemID','+'+scrollerProperties?.cellFramePropertiesRef.current.itemID+'+')
    // }

    // cradle scaffold element refs
    const 
        headCradleElementRef = useRef(null),
        tailCradleElementRef = useRef(null),
        axisCradleElementRef = useRef(null),
        triggercellTriggerlineHeadElementRef = useRef(null),
        triggercellTriggerlineTailElementRef = useRef(null),
        // layout bundle
        cradleElementsRef = useRef(
            {
                headRef:headCradleElementRef, 
                tailRef:tailCradleElementRef, 
                axisRef:axisCradleElementRef,
                triggercellTriggerlineHeadRef:triggercellTriggerlineHeadElementRef,
                triggercellTriggerlineTailRef:triggercellTriggerlineTailElementRef,
            }
        )

    // ------------------------[ calculated properties ]------------------------
    // configuration calculations

    // crosscount (also calculated by Scrollblock for deriving Scrollblock length)
    const crosscount = useMemo(() => { // the number of cells crossing orientation

        if (isCachedRef.current) return 0

        const 
            viewportcrosslength = 
                (orientation == 'vertical')?
                    viewportwidth:
                    viewportheight,

            crosspadding = 
                (orientation == 'vertical')?
                    paddingProps.left + paddingProps.right:
                    paddingProps.top + paddingProps.bottom,

            crossgap = 
                (orientation == 'vertical')?
                    gapProps.column:
                    gapProps.row,

            // cross length of viewport (gap to match crossLength)
            viewportcrosslengthforcalc = viewportcrosslength - crosspadding + crossgap,

            cellcrosslength = 
                ((orientation == 'vertical')?
                    cellWidth:
                    cellHeight) 
                + crossgap,

            cellcrosslengthforcalc = 
                Math.min(cellcrosslength,viewportcrosslengthforcalc), // result cannot be less than 1

            crosscount = Math.floor(viewportcrosslengthforcalc/cellcrosslengthforcalc)

        return crosscount

    },[
        orientation, 
        gapProps, 
        paddingProps,
        cellWidth, 
        cellHeight, 
        viewportheight, 
        viewportwidth,
    ])

    const [ baserowblanks, endrowblanks ] = useMemo(()=> {

        if (listsize == 0) {
            return [undefined, undefined]
        }
        // add position adjustment for 0
        const endadjustment =
            (highindex < 0)?
                -1:
                1

        // get initial values
        let baserowblanks = Math.abs(lowindex) % crosscount
        let endrowblanks = (Math.abs(highindex) + endadjustment) % crosscount

        // take inverse depending on direction
        if (lowindex < 0) {
            baserowblanks =
                (baserowblanks == 0)? 
                0:
                crosscount - baserowblanks
        }

        if (highindex >= 0) {
            endrowblanks =
                (endrowblanks == 0)? 
                0:
                crosscount - endrowblanks
        }

        return [baserowblanks, endrowblanks]

    },[crosscount, listsize, lowindex, highindex])


    // various row counts
    const [

        cradleRowcount, 
        viewportRowcount,
        listRowcount,
        runwayRowcount,

    ] = useMemo(()=> {

        const 
            viewportLength = 
                (orientation == 'vertical')?
                    viewportheight:
                    viewportwidth,

            gaplength = 
                (orientation == 'vertical')?
                    gapProps.column:
                    gapProps.row

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

        baseRowLength += gaplength

        const viewportRowcount = Math.ceil(viewportLength/baseRowLength)

        const listRowcount = 
            listsize == 0?
            0:
            Math.ceil((listsize + baserowblanks + endrowblanks)/crosscount)

        const calculatedCradleRowcount = viewportRowcount + (runwaySize * 2)

        let cradleRowcount = Math.min(listRowcount, calculatedCradleRowcount)

        let runwayRowcount
        if (cradleRowcount == calculatedCradleRowcount) {

            runwayRowcount = runwaySize

        } else { // cradleRowcount is less than calculatedCradleRowCount

            const diff = (calculatedCradleRowcount - cradleRowcount)
            runwayRowcount = runwaySize - Math.floor(diff/2)
            runwayRowcount = Math.max(0,runwayRowcount)

        }

        let itemcount = cradleRowcount * crosscount
        if (itemcount > listsize) {

            itemcount = listsize
            cradleRowcount = Math.ceil((itemcount + baserowblanks + endrowblanks)/crosscount)

        }

        return [
            cradleRowcount, 
            viewportRowcount, 
            listRowcount,
            runwayRowcount,
            layout,
        ]

    },[
        orientation, 
        gapProps, 
        cellWidth, 
        cellHeight,
        cellMinWidth,
        cellMinHeight, 
        viewportheight, 
        viewportwidth,

        listsize,
        baserowblanks, 
        endrowblanks,
        runwaySize,
        crosscount,
        layout,
    ])

    const rangerowshift = useMemo(() => {

        return listsize == 0?
            undefined:
            Math.floor(lowindex/crosscount)

    },[crosscount,lowindex, listsize])

    const virtualListProps = 
        {

            ...virtualListSpecs,
            baserowblanks,
            endrowblanks,
            crosscount,
            rowcount:listRowcount,
            rowshift:rangerowshift,

        }

    const cradleContentPropsRef = useRef({
        cradleRowcount,
        viewportRowcount,
        runwayRowcount,
        SOL:undefined, // start of list
        EOL:undefined, // end of list
        lowindex:undefined,
        highindex:undefined,
        size:0,
     })

     const cradleContentProps = cradleContentPropsRef.current
     Object.assign(cradleContentProps, 
         {
             cradleRowcount:cradleRowcount,
             viewportRowcount:viewportRowcount,
             runwayRowcount:runwayRowcount,
         }
     )

    // ----------------------[ callbacks ]----------------------------

    // host callbacks, upacked by serviceHandler
    const externalCallbacksRef = useRef(
        {
            referenceIndexCallback:userCallbacks?.referenceIndexCallback,
            repositioningFlagCallback:userCallbacks?.repositioningFlagCallback,
            repositioningIndexCallback:userCallbacks?.repositioningIndexCallback,
            preloadIndexCallback:userCallbacks?.preloadIndexCallback,
            deleteListCallback:userCallbacks?.deleteListCallback,
            changeListSizeCallback:userCallbacks?.changeListSizeCallback,
            changeListRangeCallback:userCallbacks?.changeListRangeCallback,
            itemExceptionCallback:userCallbacks?.itemExceptionCallback,
            boundaryCallback:userCallbacks?.boundaryCallback,
        }
    )

    // -----------------[ bundle properties for handlers ]-------------------

    // bundle all cradle props to pass to handlers - ultimately cradleParametersRef

    const cradleInheritedPropertiesRef = useRef(null) // access by closures and support callbacks
    // up to date values
    cradleInheritedPropertiesRef.current = {
        // gridSpecs
        orientation, layout,
        cellHeight, cellWidth, cellMinHeight, cellMinWidth,
        // ...rest
        cache, cacheMax,
        startingIndex, 
        runwaySize,
        getItem, 
        getExpansionCount,
        placeholder, placeholderMessages, usePlaceholder,
        triggerlineOffset,
        scrollerID,
        // objects
        userCallbacks, styles, cacheAPI,
        // control values
        ONAFTERSCROLL_TIMEOUT, MAX_CACHE_OVER_RUN, 
        scrollerProperties,

    }

    const scrollerPropertiesRef = useRef(null)
    // passed to cellFrame content (user content) if requested
    scrollerPropertiesRef.current = {
        orientation, gapProps, paddingProps, layout,
        cellHeight, cellWidth, cellMinHeight, cellMinWidth,
        virtualListProps,
        cradleContentProps,
        cache,
        cacheMax,
        startingIndex,
        scrollerID,
    }

    // configuration properties to share with handlers
    const cradleInternalPropertiesRef = useRef(null)
    cradleInternalPropertiesRef.current = {

        // updated values
        virtualListProps,
        setVirtualListSize,
        setVirtualListRange,

        cradleContentProps:cradleContentPropsRef.current,
        paddingProps,
        gapProps,
        // the following values are maintained elsewhere
        isMountedRef,
        cradleElementsRef,
        isCachedRef,
        wasCachedRef,
        triggerHistoryRef,

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
    const { // cacheAPI already available
        interruptHandler,
        scrollHandler,
        // stateHandler, // not used
        contentHandler,
        layoutHandler,
        serviceHandler,
        stylesHandler,
    } = handlersRef.current

    // =======================[ INTERCEPT CACHING STATE CHANGE ]=========================

/*    
    Intercept change in caching status:
    when a component is cached in a portal (in the React virtual DOM), including the transition of 
    being moved from one cellFrame to another when crossing the Cradle axis, 
    the scrollPos (scrollLeft or scrollTop) is reset to 0 (zero). When the scroller is 
    moved to a cellFrame, this code triggers restoration the scrollPos (see case 'parentingtransition'
    in the state management section below).

    This supports InfiniteGridScroller components to be cached as content.

    The restore scrollPos action must be the first priority to hide these scrollPos adjustments
    from the user.
*/
    
    const restoreScrollPos = () => {

        const 
            { cradlePositionData } = layoutHandler,
            trackingBlockScrollPos = cradlePositionData.trackingBlockScrollPos,
            trackingXBlockScrollPos = cradlePositionData.trackingXBlockScrollPos

        if (trackingBlockScrollPos !== null) {

            const viewportElement = ViewportContextPropertiesRef.current.elementRef.current

            let scrollOptions
            if (cradlePositionData.blockScrollProperty == 'scrollTop') {
                scrollOptions = {
                    top:trackingBlockScrollPos,
                    left:trackingXBlockScrollPos,
                    behavior:'instant',
                }
            } else {
                scrollOptions = {
                    left:trackingBlockScrollPos,
                    top:trackingXBlockScrollPos,
                    behavior:'instant',
                }            
            }

            viewportElement.scroll(scrollOptions)

        }

    }

    if (isCacheChange && !isCachedRef.current) {

        restoreScrollPos()        

    }

    // change state for entering or leaving cache
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return // nothing to do

        if (isCachedRef.current && !wasCachedRef.current) { // into cache

            setCradleState('cached')

        } else if (!isCachedRef.current && wasCachedRef.current) { // out of cache

            wasCachedRef.current = false

            if (hasBeenRenderedRef.current) {

                setCradleState('rerenderfromcache')

            } else {

                setCradleState('firstrenderfromcache')

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
            scrollToPixel,
            scrollByPixel,
            reload, 
            setListsize, // deprecated
            setListSize,
            setListRange,
            prependIndexCount,
            appendIndexCount,
            clearCache, 

            getCacheIndexMap, 
            getCacheItemMap,
            getCradleIndexMap,
            getPropertiesSnapshot,

            remapIndexes,
            moveIndex,
            insertIndex,
            removeIndex,

        } = serviceHandler

        const functions = {

            scrollToIndex,
            scrollToPixel,
            scrollByPixel,
            reload,
            setListsize, // deprecated
            setListSize,
            setListRange,
            prependIndexCount,
            appendIndexCount,
            clearCache,
            
            getCacheIndexMap,
            getCacheItemMap,
            getCradleIndexMap,
            getPropertiesSnapshot,

            remapIndexes,
            moveIndex,
            insertIndex,
            removeIndex,

        }

        userCallbacks.functionsCallback(functions)

    },[])

    // initialize window scroll listeners
    useEffect(() => {

        const viewportElement = ViewportContextPropertiesRef.current.elementRef.current
        viewportElement.addEventListener('scroll',scrollHandler.onScroll)

        return () => {

            viewportElement && 
                viewportElement.removeEventListener('scroll',scrollHandler.onScroll)

        }

    },[])

    // observer support
    /*
        There are two interection observers: one for the two cradle grids, and another for triggerlines; 
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

        // triggerobserver triggers cradle content updates 
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

    // inernal callback: the new list size will always be less than current listsize
    // invoked if getItem returns null
    const nullItemSetMaxListsize = useCallback((maxListsize) => {
        const listsize = cradleInternalPropertiesRef.current.virtualListProps.size

        if (maxListsize < listsize) {

            const { deleteListCallback, changeListSizeCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('getItem returned null',deleteList)

                }

            }

            contentHandler.updateVirtualListSize(maxListsize)
            cacheAPI.changeCacheListSize(maxListsize, 
                dListCallback,
                changeListSizeCallback)

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

                const { cacheMax } = cradleParameters.cradleInheritedPropertiesRef.current

                if (cacheAPI.pareCacheToMax(cacheMax, modelIndexList, dListCallback)) {

                    cacheAPI.renderPortalLists()
                    
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

                if (cacheAPI.matchCacheToCradle(modelIndexList, dListCallback)) {

                    cacheAPI.renderPortalLists()

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
        cellHeight,
        cellWidth,
        gapProps,
        paddingProps,
        triggerlineOffset,
        layout,
        runwaySize,
    ])

    useEffect(()=>{ // change of list range

        if (cradleStateRef.current == 'setup') return

        if (isCachedRef.current) return // TODO: ??

        interruptHandler.pauseInterrupts()

        setCradleState('reconfigureforlistrange')

    },[
        lowindex,
        highindex,
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
            (orientation == "vertical")?
                "scrollTop":
                "scrollLeft"

        layoutHandler.cradlePositionData.blockXScrollProperty = 
            (orientation == "horizontal")?
                "scrollTop":
                "scrollLeft"

        if (cradleStateRef.current == 'setup') {
            layoutHandler.cradlePositionData.trackingBlockScrollPos = 0
            layoutHandler.cradlePositionData.trackingXBlockScrollPos = 0
            return

        }

        interruptHandler.pauseInterrupts()
        // interruptHandler.triggerlinesIntersect.disconnect()
        
        if (isCachedRef.current) {
            // cacheAPI.measureMemory('pivot cached')
            // interruptHandler.pauseInterrupts() // suppress triggerline callbacks; will render for first render from cache
            // setCradleState('cached')
            hasBeenRenderedRef.current = false
            return
        }

        // cacheAPI.measureMemory('pivot')

        const 
            { layout } = cradleInheritedPropertiesRef.current,
            { cradlePositionData } = layoutHandler,

            gaplength = 
                (orientation == 'vertical')?
                    gapProps.column:
                    gapProps.row,

            gapxlength = 
                (orientation == 'vertical')?
                    gapProps.row:
                    gapProps.column

        if (layout == 'uniform') {

            const 
                { 
                    cellWidth,
                    cellHeight,
                    gapProps,
                } = cradleInheritedPropertiesRef.current,

            // get previous ratio
                previousCellPixelLength = 
                    ((orientation == 'vertical')?
                        cellWidth:
                        cellHeight)
                    + gapxlength,

                previousPixelOffsetAxisFromViewport = 
                    layoutHandler.cradlePositionData.targetPixelOffsetAxisFromViewport,

                previousratio = previousPixelOffsetAxisFromViewport/previousCellPixelLength,

                pivotCellPixelLength = 
                    ((orientation == 'vertical')?
                        cellHeight:
                        cellWidth)
                + gaplength,

                pivotAxisOffset = previousratio * pivotCellPixelLength

            cradlePositionData.targetPixelOffsetAxisFromViewport = Math.round(pivotAxisOffset)

        } else {

            cradlePositionData.targetPixelOffsetAxisFromViewport = gapxlength

        }

        setCradleState('pivot')

    },[orientation, layout]) // TODO: check for side-effects of layout-only change

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
            gapProps,
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
        gapProps,
        viewportheight,
        viewportwidth,
        crosscount,
        styles,
        triggerlineOffset,
        layout,

      ])

    // =====================[ STATE MANAGEMENT ]==========================

    // this is the core state engine (about 32 states), using named states
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

                    if (cacheAPI.pareCacheToMax(cacheMax, modelIndexList, dListCallback)) {

                        cacheAPI.renderPortalLists()

                    }

                    if (!isCachedRef.current) {

                        setCradleState('finishpreload')

                    } else {

                        setCradleState('cached')

                    }

                }

                cacheAPI.preload(finalCallback, nullItemSetMaxListsize)

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

            case 'startreposition': {

                const { signals } = interruptHandler

                signals.pauseTriggerlinesObserver = true

                // avoid recursive cradle intersection interrupts
                signals.pauseCradleIntersectionObserver = true
                signals.repositioningRequired = false // because now underway

                if (scrollHandler.isScrolling) {

                    const {lowindex, size:listsize } = cradleInternalPropertiesRef.current.virtualListProps

                    ViewportContextPropertiesRef.current.scrollTrackerAPIRef.current.startReposition(
                        layoutHandler.cradlePositionData.targetAxisReferencePosition, 
                        lowindex, listsize
                    )

                    setCradleState('repositioningRender') // toggles with repositioningContinuation

                } else {

                    setCradleState('finishreposition')

                }

                break

            }

            // -------------------[ setCradleContent ]------------------

            /*
                the following 12 cradle states all resolve with
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
            case 'reconfigureforlistrange':
            case 'reload': {

                if (!isMountedRef.current) return // possible async latency with nested scrollers

                if (isCachedRef.current) {
                    setCradleState('cached')
                    break
                }

                const cradleContent = contentHandler.content

                cradleContent.headModelComponents = []
                cradleContent.tailModelComponents = []

                const { layout } = cradleInheritedPropertiesRef.current

                interruptHandler.triggerlinesIntersect.disconnect()
                interruptHandler.cradleIntersect.disconnect()

                if (layout == 'variable') { // restore base config to scrollblock

                    // already done for reposition
                    (cradleState != 'finishreposition') && layoutHandler.restoreBaseScrollblockConfig()

                }

                if (cradleState == 'reload') {
                    cacheAPI.clearCache()
                }

                if (cradleState == 'finishreposition') {

                    ViewportContextPropertiesRef.current.scrollTrackerAPIRef.current.finishReposition()
                    scrollHandler.calcImpliedRepositioningData('finishreposition')
                    
                }

                const listsize = cradleInternalPropertiesRef.current.virtualListProps.size
                // set data
                if (listsize) contentHandler.setCradleContent( cradleState )

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

                    if (cacheAPI.matchCacheToCradle(modelIndexList, dListCallback)) {
                        
                        cacheAPI.renderPortalLists()

                    }
                }

                // prepare the cycle for preparerender
                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                // update virtual DOM
                if (layout == 'uniform') {
    
                    setCradleState('preparerender')

                } else {

                    setCradleState('refreshDOMsetforvariability')

                }

                break
            }

            case 'preparerender': { // cycle for DOM update

                // triggerlines will have been assigned to a new triggerCell by now.
                // connectElements was delayed for a cycle to render triggercell triggerlines
                interruptHandler.triggerlinesIntersect.connectElements()
                interruptHandler.cradleIntersect.connectElements()

                setCradleState('restoreinterrupts')

                break
            }

            case 'restoreinterrupts': { // normalize

                interruptHandler.restoreInterrupts()

                setCradleState('ready')

                break 

            }

            case 'triggerboundarynotications': {

                serviceHandler.triggerBoundaryCallbacks()

                setCradleState('ready')

                break

            }

            // ----------------------[ followup from axisTriggerlinesObserverCallback ]------------
            // scroll effects

            // renderupdatedcontent is called from interruptHandler.axisTriggerlinesObserverCallback. 
            // it is required to integrate changed DOM configurations before 'ready' is displayed
            case 'renderupdatedcontent': { // cycle for DOM update

                // if (isCachedRef.current) return // DEBUG!!

                contentHandler.updateCradleContent()

                setCradleState('finishupdatedcontent')

                break

            }

            case 'finishupdatedcontent': { // cycle for DOM update

                // synchronize cache
                const { cache } = cradleInternalPropertiesRef.current
                if (cache == 'keepload') {

                    contentHandler.guardAgainstRunawayCaching()

                }

                // cacheAPI.measureMemory('finish update')

                const { layout } = cradleInheritedPropertiesRef.current
                if (layout == 'uniform') {

                    interruptHandler.triggerlinesIntersect.connectElements()

                    setCradleState('ready')

                } else { // 'variable' content requiring reconfiguration

                    setCradleState('refreshDOMupdateforvariability')

                }

                break
            }

            // ---------------------[ adjust scrollblock for set variable content ]--------------

            case 'refreshDOMsetforvariability': {

                setCradleState('preparesetforvariability')

                break

            }

            case 'preparesetforvariability': {

                setTimeout(() => { // give time for DOM to produce layout
            
                    if (isMountedRef.current) {

                        contentHandler.adjustScrollblockForVariability('setcradle')

                        setCradleState('finishsetforvariability')
                        
                    }

                }, VARIABLE_MEASUREMENTS_TIMEOUT)
                
                break

            }

            case 'finishsetforvariability': {

                setCradleState('preparerender')
                
                break
            }

            // ------------------------[ adjust scrollblock for update variable content ]--------------

            case 'refreshDOMupdateforvariability': {

                // extra cycle to allow for DOM synchronizion with grid changes

                setCradleState('adjustupdateforvariability')

                break

            }

            case 'adjustupdateforvariability': {

                setTimeout(()=> { // allow more DOM update

                    contentHandler.adjustScrollblockForVariability('updatecradle')

                    setCradleState('finishupdateforvariability')

                },0)

                break

            }

            case 'finishupdateforvariability': {

                // re-activate triggers; triggerlines will have been assigned to a new triggerCell by now.
                interruptHandler.triggerlinesIntersect.connectElements()
                interruptHandler.signals.pauseCradleIntersectionObserver = false

                setCradleState('ready')

                break

            }

            // ----------------[ user requests ]-------------

            case 'channelcradleresetafterinsertremove': {

                cacheAPI.applyPortalPartitionItemsForDeleteList()

                setCradleState('changelistsizeafterinsertremove')

                break
            }

            // support for various host service requests; syncs cradle content with cache changes
            case 'applyinsertremovechanges':
            case 'applyremapchanges':
            case 'applymovechanges': {

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                cacheAPI.applyPortalPartitionItemsForDeleteList()

                if (cradleState == 'applyinsertremovechanges') {

                    setCradleState('changelistsizeafterinsertremove')

                } else {

                    setCradleState('ready')

                }

                break
            }

            case 'changelistsizeafterinsertremove': {

                const newlistsize = serviceHandler.newListSize
                serviceHandler.newListSize = null

                setCradleState('ready')

                // service handler called because this is a followon of a user intervention
                serviceHandler.setListSize(newlistsize)

                break
            }

            case 'clearcache': {

                contentHandler.clearCradle()
                cradleContent.headDisplayComponents = []
                cradleContent.tailDisplayComponents = []
                cacheAPI.clearCache()
                setCradleState('ready')

                break
            }

        }

    },[cradleState])

    // standard rendering states (2 states)
    useEffect(()=> { 

        switch (cradleState) {

            // repositioningRender and repositioningContinuation are toggled to generate continuous 
            // repositioning renders
            case 'repositioningRender': // no-op
                break

            case 'ready':

                if (layoutHandler.boundaryNotificationsRequired()) {

                    setCradleState('triggerboundarynotications')

                }

                break

        }

    },[cradleState])

    // ==========================[ RENDER ]===========================

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
        cacheAPI, 
        nullItemSetMaxListsize,
        itemExceptionCallback:serviceHandler.callbacks.itemExceptionCallback,
        IDLECALLBACK_TIMEOUT,
        triggercellTriggerlinesRef,
    })


    // display the cradle components, the ScrollTracker, or null
    return <CradleContext.Provider value = { contextvalueRef.current }>

        {(cradleState == 'repositioningRender')?null:
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
        </div>}
        
    </CradleContext.Provider>

} // Cradle

export default Cradle

// utility

const getCradleHandlers = (cradleParameters) => {

    const createHandler = handler => new handler(cradleParameters)

    const { cacheAPI } = cradleParameters.cradleInheritedPropertiesRef.current

    cacheAPI.cradleParameters = cradleParameters

    return {

        cacheAPI,
        interruptHandler:createHandler(InterruptHandler),
        scrollHandler:createHandler(ScrollHandler),
        stateHandler:createHandler(StateHandler),
        contentHandler:createHandler(ContentHandler),
        layoutHandler:createHandler(LayoutHandler),
        serviceHandler:createHandler(ServiceHandler),
        stylesHandler:createHandler(StylesHandler),

    }

}
