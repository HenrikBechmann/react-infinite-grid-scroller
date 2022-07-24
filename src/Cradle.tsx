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
    useMemo 
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
        userFunctions,
        styles,
        triggerlineOffset,
        cache,
        cacheMax,
        // for debugging
        scrollerID,
        // for handler list
        cacheHandler,
    }) => {

    if (listsize == 0) return null// nothing to do

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

    console.log('RUNNING cradleState','-'+scrollerID+'-', cradleState)

    // controls
    const isMountedRef = useRef(true)
    const isCachedRef = useRef(false)
    const wasCachedRef = useRef(false)
    const parentingTransitionRequiredRef = useRef(false)
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
    // const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)
    // const preloadIndexCallbackRef = useRef(functions?.preloadIndexCallback)

    const externalCallbacksRef = useRef(
        {
            referenceIndexCallback:userFunctions?.referenceIndexCallback,
            preloadIndexCallback:userFunctions?.preloadIndexCallback,
            cacheDeleteListCallback:userFunctions?.cacheDeleteListCallback,
            newListSizeCallback:userFunctions?.newListSizeCallback,
        }
    )

    // -----------------[ bundle parameters for handlers ]-------------------

    // bundle all cradle props to pass to handlers - ultimately cradleParametersRef
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
        cache,
        cacheMax,
        startingIndex, 
        getItem, 
        placeholder, 
        triggerlineOffset,
        scrollerID,
        // objects
        userFunctions,
        styles,
        cacheHandler,

    }

    const cradlePassthroughPropertiesRef = useRef(null)

    // passed to cellFrame content (user content) if requested
    cradlePassthroughPropertiesRef.current = {
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
        cradlePassthroughPropertiesRef,
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

    // =======================[ CACHING STATE CHANGE SENTINEL ]=========================

    // intercept change in caching status
    // when a portal is cached, including the transition of being moved from one cellFrame to another,
    // (and the infinitegridscroller can be a component that is cached),
    // the scrollPos (scrollLeft or scrollTop) is reset to 0 (zero). When the scroller is 
    // moved to a cellFrame, this code restores the scrollPos.
    // The restore action must be the first priority to hide the scrollPos changes from the user
    
    const isInPortal = ((viewportwidth == 0) && (viewportheight == 0)) // must be in portal (cache) state

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

            } else if ((!isCachedRef.current) && wasCachedRef.current) { // change out of cache

                interruptHandler.restoreInterrupts()

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

        if (cradleStateRef.current == 'setup') return // nothing to do

        if (isCachedRef.current && !wasCachedRef.current) { // into cache

            setCradleState('cached') // replaces 'ready' as steady state

        } else if (!isCachedRef.current && wasCachedRef.current) { // out of cache

            wasCachedRef.current = false

            if (cradleStateRef.current == 'cachedwaiting') {

                setCradleState('ready')

            } else {

                setCradleState('setcradlecontent')
            }

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

        if (!userFunctions.getCallbacks) return

        const {

            scrollToItem, 
            reload, 
            setListsize,
            clearCache, 

            getCacheIndexMap, 
            getCacheItemMap,
            getCradleIndexMap,
            changeIndexMap,
            moveIndex,
            insertIndex,
            removeIndex,

        } = serviceHandler

        const callbacks = {

            scrollToItem,
            reload,
            setListsize,
            clearCache,
            
            getCacheIndexMap,
            getCacheItemMap,
            getCradleIndexMap,
            changeIndexMap,
            moveIndex,
            insertIndex,
            removeIndex,

        }

        userFunctions.getCallbacks(callbacks)

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

    // initiate preload if requested
    useEffect(()=> {

        switch (cache) {

            case 'preload': {
                setCradleState('startpreload')
                break

            }

            case 'keepload': {

                const modelIndexList = contentHandler.getModelIndexList()

                const { cacheDeleteListCallback } = serviceHandler.callbacks

                // const cacheMax = cradleParameters.cradleInheritedPropertiesRef.current.cacheMax

                cacheHandler.pareCacheToMax(cacheMax, modelIndexList, cacheDeleteListCallback)

                break
            }

            case 'cradle': {

                const modelIndexList = contentHandler.getModelIndexList()

                const { cacheDeleteListCallback } = serviceHandler.callbacks

                cacheHandler.matchCacheToCradle(modelIndexList, cacheDeleteListCallback)

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

    // pivot triggered on change of orientation
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

    // =====================[ STATE MANAGEMENT ]==========================

    // this is the core state engine (19 states), using named states
    // useLayoutEffect for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradleState) {

            case 'applycellframechanges': { // user intervention

                cradleContent.headDisplayComponents = cradleContent.headModelComponents
                cradleContent.tailDisplayComponents = cradleContent.tailModelComponents

                console.log('CRADLE useLayoutEffect applycellframechanges')
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
            case 'startpreload':{

                contentHandler.clearCache()
                setCradleState('dopreload')

                break
            }

            case 'dopreload': {

                const callback = () => {

                    setCradleState('finishpreload')

                }

                // TODO: move API to contentHandler
                cacheHandler.preload(cradleParametersRef.current, callback, scrollerID)

                break
            }

            case 'cachedwaiting': {

                if (!wasCachedRef.current && !isCachedRef.current){

                    setCradleState('ready')

                }
                break
            }

            case 'cached': {

                if (!wasCachedRef.current && !isCachedRef.current){

                    setCradleState('setcradlecontent')

                }
                break
            }

            case 'finishparenting':{

                if (isCachedRef.current) { // interrupt until caching is resolved
                    
                    setCradleState('cachedwaiting')

                } else {

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
                the following 8 cradle states all resolve with
                a chain starting with setCradleContent, 
                continuing with 'preparerender', and ending with
                'normalizesignals'
            */
            case 'setcradlecontent':
            case 'dosetup':
            case 'finishpreload':
            case 'doreposition': //
            case 'finishresize':
            case 'pivot':
            case 'reconfigure': //
            case 'reload': {

                if (isCachedRef.current) { // interrupt until caching is resolved
                    setCradleState('cached')
                    break
                }

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

                const { cache } = cradleInternalPropertiesRef.current
                if (cache == 'cradle') {
                    const modelIndexList = contentHandler.getModelIndexList()
                    cacheHandler.matchCacheToCradle(modelIndexList, serviceHandler.callbacks.cacheDeleteListCallback)
                    cacheHandler.renderPortalList()
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

                // prioritize interrupts TODO: validate this

                // if ((!isCachedRef.current) && viewportInterruptPropertiesRef.current.isResizing) {
                //     console.log('calling resizing from normalizesignals','-'+scrollerID+'-')
                //     setCradleState('resizing')

                // } else if (interruptHandler.signals.repositioningRequired) {

                //     setCradleState('startreposition')

                // } else {                     

                interruptHandler.restoreInterrupts()

                setCradleState('ready')

                // }

                break 

            }

            // user request
            case 'clearcache': {

                contentHandler.clearCache()
                setCradleState('ready')

                break
            }

            // moving out of cache into visible DOM tree (cellFrame)
            // resets scrollPos (scrollLeft/scrollTop) to last UI value
            case 'reparentingtransition': {

                    const { cradlePositionData } = scaffoldHandler

                    // reset scroll position to previous value
                    if (cradlePositionData.blockScrollPos !== null) {

                        // console.log('resetting scroll position to','-'+scrollerID+'-' , cradlePositionData.blockScrollPos)

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