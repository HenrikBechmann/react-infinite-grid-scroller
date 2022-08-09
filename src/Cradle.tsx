// cradle.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    consider formalizing state conditions (certain useRefs), together with state actions (useState)

    - rationalize pauseScrolling, and other signals
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
        useScrollTracker,
        showAxis,
        IDLECALLBACK_TIMEOUT,
        MAX_CACHE_OVER_RUN,
    }) => {

    if (listsize == 0) return null// nothing to do

    useEffect(()=>{

        const abortController = new AbortController()
        return () => {
            abortController.abort()  // defensive
        }

    },[])

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

    // console.log('==> RUNNING Cradle','-'+scrollerID+'-', cradleState)
    // console.log('performance.memory',performance['memory'])

    // flags
    const isMountedRef = useRef(true)
    const isCachedRef = useRef(false)
    const wasCachedRef = useRef(false)
    const parentingTransitionRequiredRef = useRef(false)
    const hasBeenRenderedRef = useRef(false)

    // controls
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

        if (viewportsize == 0) {

            return 0

        }
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

    // host callbacks
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

    // -----------------[ bundle parameters for handlers ]-------------------

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

    // configuration properties to share
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
        triggerlineRecordsRef,

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
        scaffoldHandler,
        serviceHandler,
        stylesHandler,
    } = handlersRef.current

    // =======================[ INTERCEPT CACHING STATE CHANGE ]=========================

    // intercept change in caching status
    // when a portal is cached, including the transition of being moved from one cellFrame to another,
    // (and the infinitegridscroller can be a component that is cached),
    // the scrollPos (scrollLeft or scrollTop) is reset to 0 (zero). When the scroller is 
    // moved to a cellFrame, this code restores the scrollPos.
    // The restore action must be the first priority to hide the scrollPos changes from the user

    // console.log('in cradle viewportwidth, viewportheight','-'+scrollerID+'-',viewportwidth, viewportheight)
    
    const isInPortal = ((viewportwidth == 0) && (viewportheight == 0)) // must be in portal (cache) state
    // const isInPortal = ((vwidth == 0) && (vheight == 0)) // must be in portal (cache) state

    const isCacheChange = (isInPortal != isCachedRef.current)

    if (isCacheChange) {
        wasCachedRef.current = isCachedRef.current
        isCachedRef.current = isInPortal
    }

    const isCachingUnderway = (isCachedRef.current || wasCachedRef.current)

    // console.log(
    //     '**>> -'+scrollerID+'-', cradleState,'\n',
    //     'isInPortal, viewportwidth, viewportheight, blockScrollPos, blockScrollPos\n', 
    //     isInPortal, viewportwidth, viewportheight, scaffoldHandler.cradlePositionData.blockScrollPos)

    // console.log('- isCacheChange, isCachingUnderway, isCachedRef.current, wasCachedRef.current\n',
    //     isCacheChange, isCachingUnderway, isCachedRef.current, wasCachedRef.current)

    // console.log('- viewportInterruptProperties.isReparentingRef?.current, viewportInterruptProperties.isResizing, orientation\n',
    //     viewportInterruptProperties.isReparentingRef?.current, viewportInterruptProperties.isResizing, orientation)

    if (
        isCacheChange || 
        viewportInterruptProperties.isReparentingRef?.current ||
        (viewportInterruptProperties.isResizing && isCachingUnderway) 
    ) { 

        // console.log(
        //     '-'+scrollerID+'-',
        //     'isInPortal', 
        //     isInPortal, 
        //     '\nisCacheChange, isCachedRef.current, wasCachedRef.current\n',
        //     isCacheChange, 
        //     isCachedRef.current, 
        //     wasCachedRef.current, 
        //     '\nisCachingUnderway, isReparentingRef.current, isResizing\n',
        //     isCachingUnderway, 
        //     viewportInterruptProperties.isReparentingRef?.current, 
        //     viewportInterruptProperties.isResizing
        // )

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

        if (parentingTransitionRequiredRef.current && !isCachedRef.current) {

            parentingTransitionRequiredRef.current = false            
            setCradleState('reparentingtransition')
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
                setCradleState('reparentingtransition')

            } else {

                setCradleState('resolvependinguncache')
            }

        }

    },[isCachedRef.current, wasCachedRef.current])

    // ===================[ INITIALIZATION effects ]=========================
    // initialization effects are independent of caching

    // this will always be less than current listsize
    const nullItemSetMaxListsize = useCallback((maxListsize) => {
        const listsize = cradleInternalPropertiesRef.current.listsize
        // console.log('cradle fielding setMaxlistsize with maxListsize, listsize',maxListsize, listsize)
        if (maxListsize < listsize) {

            const { deleteListCallback, changeListsizeCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('getItem returned null',deleteList)

                }

            }
            //
            cacheHandler.changeListsize(maxListsize, 
                dListCallback,
                changeListsizeCallback)

        }
    },[])

    // clear mounted flag on unmount
    useLayoutEffect(()=>{

        // unmount
        return () => {

            isMountedRef.current = false

        }

    },[])

    //send callback callbacks to host
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
    // change caching, resize (UI resize of the viewport), reconfigure, or pivot

    useEffect(()=> {

        // console.log('cradle - handle cache and cacheMax change:', cache, cacheMax)

        if (cache == 'preload') {

            setCradleState('dopreload')

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

                setCradleState('resetcache')

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

                setCradleState('resetcache')

                break
            }

        }

    },[cache, cacheMax])

    // trigger resizing based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        // movement to and from cache is independent of ui resizing
        if (isCachedRef.current || wasCachedRef.current) {

            return

        }

        if (viewportInterruptPropertiesRef.current.isResizing) {

            interruptHandler.pauseInterrupts()
 
            // console.log('calling resizing from isResizing useEvent','-'+scrollerID+'-')
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportInterruptPropertiesRef.current.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('finishresize')

        }

    },[viewportInterruptPropertiesRef.current.isResizing])

    // reconfigure for changed size parameters
    useEffect(()=>{

        // console.log('in reconfigure effect:cradleStateRef.current,isCachedRef.current','-'+scrollerID+'-')

        if (cradleStateRef.current == 'setup') return

        if (isCachedRef.current) return

        // const signals = interruptHandler.signals

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

        // console.log('in pivot effect: orientation, isCachedRef.current\n','-'+scrollerID+'-',orientation, isCachedRef.current)

        scaffoldHandler.cradlePositionData.blockScrollProperty = 
            (orientation == "vertical")?"scrollTop":"scrollLeft"

        if (cradleStateRef.current == 'setup') return

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

    // =====================[ STATE MANAGEMENT ]==========================

    // this is the core state engine (19 states), using named states
    // useLayoutEffect for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradleState) {

            case 'resizing': {

                // no-op
                break
            }

            case 'applycellframechanges': { // user intervention

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                // console.log('CRADLE useLayoutEffect applycellframechanges')
                setCradleState('ready')
                break
            }

            case 'setup': { // cycle to allow for ref config

                if (cradleInheritedPropertiesRef.current.cache != 'preload') {
                    if (isCachedRef.current) {
                        setCradleState('cached')
                    } else {
                        setCradleState('dosetup') // load grid
                    }
                }
                break

            }
            // case 'startpreload':{

            //     // register new array id for Object.is to trigger react re-processing
            //     // cradleContent.headDisplayComponents = []
            //     // cradleContent.tailDisplayComponents = []
            //     setCradleState('dopreload')

            //     break
            // }

            case 'dopreload': {

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

                    setCradleState('resolvependinguncache')

                }
                break
            }

            case 'finishparenting':{

                interruptHandler.restoreInterrupts()

                if (hasBeenRenderedRef.current) {

                    setCradleState('ready')

                } else {

                    setCradleState('resolvependinguncache')

                }

                break
            }

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

                // interruptHandler.axisTriggerlinesIntersect.connectElements()
                // interruptHandler.signals.pauseTriggerlinesObserver = false
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
                the following 10 cradle states all resolve with
                a chain starting with setCradleContent, 
                continuing with 'preparerender', and ending with
                'normalizesignals'
            */
            case 'doscrollto':
            case 'resetcache':
            case 'resolvependinguncache':
            case 'dosetup':
            case 'finishpreload':
            case 'doreposition': //
            case 'finishresize':
            case 'pivot':
            case 'reconfigure': //
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
                    // console.log('processing cradle content: cache', cache)
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

            // user request
            case 'clearcache': {

                contentHandler.clearCradle()
                cradleContent.headDisplayComponents = []
                cradleContent.tailDisplayComponents = []
                cacheHandler.clearCache()
                setCradleState('ready')

                break
            }

            // moving out of cache into visible DOM tree (cellFrame)
            // resets scrollPos (scrollLeft/scrollTop) to last UI value
            case 'reparentingtransition': {

                    const { cradlePositionData } = scaffoldHandler
                    // console.log('in state machine reparentingtransition', '-'+scrollerID+'-' , cradlePositionData.blockScrollPos)

                    // reset scroll position to previous value
                    if (cradlePositionData.blockScrollPos !== null) {

                        const viewportElement = viewportInterruptPropertiesRef.current.elementRef.current

                        viewportElement[cradlePositionData.blockScrollProperty] = 
                            cradlePositionData.blockScrollPos

                    }

                    setCradleState('finishparenting')

                break

            }

        }

    },[cradleState])

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

    const scrollAxisReferenceIndex = scaffoldHandler.cradlePositionData.targetAxisReferenceIndex
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
        scaffoldHandler:createHandler(ScaffoldHandler),
        serviceHandler:createHandler(ServiceHandler),
        stylesHandler:createHandler(StylesHandler),

    }

}

export default Cradle