// InfiniteGridScroller.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

/*
    react-infinite-grid-scroller = RIGS

    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the Scrollblock, which is full size for listsize of given cell height/width.
    Scrollblock in turn contains the Cradle - a component that contains CellFrames, which contain 
    displayed user content (items) or transitional placeholders. 

    Host content is instantiated in a cache of React portals (via cacheAPI). Content is then 
    portal'd to CellFrames. The cache can be configured to hold more items than the Cradle (limited by 
    device memory). Caching allows host content to maintain state.

    Scrollblock represents the entirety of the list (and is sized accordingly). It is the component that is scrolled.

    Cradle contains the list items, and is 'virtualized' -- it appears as though it scrolls through a filled 
    scrollblock, but in fact it is only slightly larger than the viewport. Content is rotated in and out of the 
    cradle through the cache.
    
    Individual host items are framed by CellFrame, which are managed by Cradle.

    Overall the InfiniteGridScroller as a package manages the asynchronous interactions of the 
    components of the mechanism. Most of the work occurs in the Cradle component.

    The RIGS liner (the top level Viewport element) is set with 'display:absolute' and 'inset:0', so the user 
    containing block should be styled accordingly.
*/

// compile types
// objects
export type GenericObject = {[prop:string]:any}
// enums
type Orientation = 'vertical' | 'horizontal'
type Layout = 'uniform' | 'variable' | 'platform'
type Cache = 'preload' | 'keepload' | 'cradle'
// functions
type GetItem = ((index:number, itemID:number) => null | undefined | Promise<any> | FC)
type GetItemPack = ((index:number, itemID:number, context:GenericObject) => GenericObject)
type GetExpansionCount = ((boundary:string, index:number) => number)

// most values are initialized if null or undefined
type RIGS = {
    // required
    cellHeight:number,
    cellWidth:number,
    // initialized
    cellMinHeight:number,
    cellMinWidth:number,
    // optional, but initialized below
    gap:number | Array<number>,
    padding:number | Array<number>,
    // startingListSize:number,
    startingIndex:number,
    runwaySize:number,
    cacheMax:null | number, // falsey means only limited by listsize
    
    startingListRange:Array<number>,

    usePlaceholder:boolean,
    useScrollTracker:boolean,

    // enums
    orientation:Orientation,
    layout:Layout,
    cache:Cache,

    // objects
    styles:GenericObject,
    placeholderMessages:GenericObject,
    callbacks:GenericObject,
    technical:GenericObject,
    dndOptions:GenericObject,
    profile:GenericObject,

    // functions
    placeholder:FC
    // getItemPack is required
    getItemPack:GetItemPack,
    // optional
    getExpansionCount:GetExpansionCount,
    // internal use only
    isDndMaster:boolean,
    platformComponent:FC, // pending
}

// React support
import React, { useEffect, useState, useCallback, useRef, useContext, FC } from 'react'

import { RigsDnd, masterDndContextBase } from './InfiniteGridScroller/RigsDnd'

export { RigsDnd } // RigsDnd is called as root instead of InfiniteGridScroller if dnd is being invoked

import './InfiniteGridScroller/rigs.css'

// isSafariIOS
const isSafariIOSFn = () => {
    const
        is_ios = /iP(ad|od|hone)/i.test(window.navigator.userAgent),
        is_safari = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/)
    return ( is_ios && is_safari ) 
}

export const isSafariIOS = isSafariIOSFn()

// defensive
import { ErrorBoundary } from 'react-error-boundary' // www.npmjs.com/package/react-error-boundary

// based on module template
function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert" style = {{margin:'3px'}}>
      <p>Something went wrong inside react-infinite-grid-scroller. See the console for details.</p>
      <p>Click to cancel the error and try to continue.</p>
      <button 
          style = {{border:'1px solid black', margin:'3px', padding:'3px'}} 
          onClick = { resetErrorBoundary }
      >
          Cancel error
      </button>
      {error.name} <br/>
      {error.message} <br/>
      {error.stack}
    </div>
  )
}

// import scroller components
import Viewport from './Viewport'
import Scrollblock from './Scrollblock'
import Cradle from './Cradle'
import PortalCache from './PortalCache'

// global session ID generator
let globalScrollerID = 0

// contexts
export const RigsGlobalContext = React.createContext({cacheAPI:null}) // global cache for drag and drop
export const MasterDndContext = React.createContext({...masterDndContextBase}) // tree scope
export const ScrollerDndContext = React.createContext(null) // scroller scope

const InfiniteGridScroller = (props) => {

    // state. Start with 'initialize' for the case in which root is !isDndMaster but masterDndContext.installed 
    //    is still true after rapid switch of root. In this case RigsDnd needs another cycle to reset masterDndContext. 
    //    see useLocalCache
    const [scrollerState, setScrollerState] = useState('initialize') // initialize, setup, setlistprops, ready
    
    // ------------------[ collect properties ]--------------------

    let { 

        // required
        cellHeight, // required. the outer pixel height - literal for vertical; approximate for horizontal
            // max for variable layout
        cellWidth, // required. the outer pixel width - literal for horizontal; approximate for vertical
            // max for variable layout
        cellMinHeight, // for layout == 'variable' && orientation == 'vertical'
        cellMinWidth, // for layout == 'variable' && orientation == 'horizontal'
        getItemPack, // returns a simple object with item components: content, profile, options, dragText
        // optional
        getExpansionCount, // optional, function provided by host, returns the number of indexes to add to
            // the virtual list when the scroller hits the start or end of the list
        placeholder, // optional. a sparse component to stand in for content until the content arrives; 
            // replaces default placeholder if present

        // the following are initialized below if they are found to be null or undefined
        // startingListSize, // the starting number of items in the virtual list. can be changed (deprecated)
        startingListRange, // supercedes startingListSize if present
        orientation, // vertical or horizontal
        gap, // space between grid cells
        padding, // the padding around the Scrollblock
        layout, // ** uniform, variable 

        // scroller specs:
        runwaySize, // the number of rows outside the view of each side of the viewport 
            // -- gives time to assemble cellFrames before display
        startingIndex, // the starting index of the list, when first loaded

        // system specs:
        cache, // "preload", "keepload" or "cradle"
        cacheMax, // always minimum cradle content size; falsey means limited by listsize
        usePlaceholder, // no placeholder rendered if false
        useScrollTracker, // the internal component to give feedback for repositioning

        // advanced objects
        styles, // optional. passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, scrolltracker, placeholderframe, 
            // placeholdererrorframe, placeholderliner or placeholdererrorliner. Do not make structural changes!
        placeholderMessages = {}, // messages presented by default placeholder. See documentation
        callbacks, // optional. closures to get direct information streams of some component utilites
            // can contain functionsCallback, which provides access to internal scroller functions 
            //(mostly cache management)
        technical, // optional. technical settings like VIEWPORT_RESIZE_TIMEOUT
        dndOptions, // ** for drag and drop
        profile, // host provided scroller data
        isDndMaster, // internal, set for root dnd only

        platformComponent, // ** planned; supercedes most other properties with layout == 'platform'

    }:RIGS = props

    // -----------------------[ normalize data ]---------------------

    // initialize with defaults if values are empty
    orientation = orientation ?? 'vertical'
    gap = gap ?? 0
    padding = padding ?? 0
    layout = layout ?? 'uniform'
    cellMinHeight = cellMinHeight ?? 25
    cellMinWidth = cellMinWidth ?? 25
    runwaySize = runwaySize ?? 1
    startingIndex = startingIndex ?? 0
    cache = cache ?? 'cradle'
    cacheMax = cacheMax ?? 0
    usePlaceholder = usePlaceholder ?? true
    useScrollTracker = useScrollTracker ?? true
    styles = styles ?? {}
    placeholderMessages = placeholderMessages ?? {}
    callbacks = callbacks ?? {}
    technical = technical ?? {}
    isDndMaster = isDndMaster ?? false

    const 
        masterDndContext = useContext(MasterDndContext),
        rigsGlobalContext = useContext(RigsGlobalContext),

        scrollerSessionIDRef = useRef(null),
        scrollerID = scrollerSessionIDRef.current

    // console.log('rigs scrollerState', scrollerID, scrollerState)

    // minimal constraints
    let isMinimalPropsFail = false

    if (!(
        cellWidth 
            && cellHeight) 
        || !getItemPack) {
        console.log('RIGS: cellWidth, cellHeight, and getItemPack required')
        isMinimalPropsFail = true
    }

    if (!isMinimalPropsFail) {
        cellWidth = +cellWidth
        cellHeight = +cellHeight
        if (isNaN(cellWidth) || isNaN(cellHeight) || !(typeof getItemPack == 'function')) {
            console.log('RIGS: cellWidth and cellHeifht must be numbers; getItemPack must be a functions')
            isMinimalPropsFail = true
        }
    }

    // check enums for runtime
    if (!['horizontal','vertical'].includes(orientation)) { 
        orientation = 'vertical'
    }
    if (!['preload','keepload','cradle'].includes(cache)) {
        cache = 'cradle'
    }
    if (!['uniform', 'variable'].includes(layout)) {
        layout = 'uniform'
    }

    // type checks for runtime
    if (typeof usePlaceholder !== 'boolean') usePlaceholder = true
    if (typeof useScrollTracker !== 'boolean') useScrollTracker = true
    if (typeof technical !== 'object') technical = {}

    if (typeof styles !== 'object') styles = {}
    if (typeof callbacks !== 'object') callbacks = {}
    if (typeof placeholderMessages !== 'object') placeholderMessages = {}

    const // persist
        stylesRef = useRef(styles),
        callbacksRef = useRef(callbacks),
        placeholderMessagesRef = useRef(placeholderMessages)

    // ---------------------[ padding and gap data setup ]----------------------

    // padding
    const paddingPropsRef = useRef({
        top:null,
        right:null,
        bottom:null,
        left:null,
        source:null,
        original:null,
        list:[],
        CSS:'',
    })
    let paddingProps = paddingPropsRef.current
    if (String(props.padding) !== String(paddingProps.source)) {
        paddingProps.source = props.padding
        if (!Array.isArray(padding)) {
            padding = +padding
            if (!isNaN(padding)) {
                paddingProps.original = [padding]
            } else {
                paddingProps.original = [0]
            }
        } else {
            let isProblem = false
            if (padding.length > 4) {
                isProblem = true
            }
            if (!isProblem) padding.forEach((value,index,list) => {
                if (isNaN(value)) {
                    isProblem = true
                }
            })
            if (!isProblem) {
                paddingProps.original = padding
            } else {
                paddingProps.original = [0]
            }
        }
        const list = [...paddingProps.original]
        paddingProps.CSS = list.join('px ') + 'px'
        const lgth = list.length
        let a,b,c
        switch (lgth) {
        case 1:
            [a] = list // t/b/r/l
            list.push(a,a,a) //r,b,l
            break
        case 2:
            [a,b] = list // t/b, r/l
            list.push(a,b) //b,l
        case 3:
            [a,b] = list // t, r/l, b
            list.push(b) //l
        }
        paddingProps.list = list
        const [top, right, bottom, left] = list
        Object.assign(paddingProps,{top:+top,right:+right,bottom:+bottom,left:+left}) // assure numeric
        paddingPropsRef.current = paddingProps = {...paddingProps} // signal change to React
    }

    // gap
    const gapPropsRef = useRef({
        column:null,
        row:null,
        source:null,
        original:null,
        list:[],
        CSS:'',
    })
    let gapProps = gapPropsRef.current
    if (String(props.gap) !== String(gapProps.source)) {
        gapProps.source = props.gap
        if (!Array.isArray(gap)) {
            gap = +gap
            if (!isNaN(gap)) {
                gapProps.original = [gap]
            } else {
                gapProps.original = [0]
            }
        } else {
            let isProblem = false
            if (gap.length > 2) {
                isProblem = true
            }
            if (!isProblem) gap.forEach((value,index,list) => {
                if (isNaN(value)) {
                    isProblem = true
                }
            })
            if (!isProblem) {
                gapProps.original = gap
            } else {
                gapProps.original = [0]
            }
        }
        const list = [...gapProps.original]
        gapProps.CSS = list.join('px ') + 'px'
        const lgth = list.length
        let a
        if (lgth == 1) {
            [a] = list // t/b/r/l
            list.push(a) //r,b,l
        }
        gapProps.list = list
        const [column, row] = list
        Object.assign(gapProps,{column:+column,row:+row}) // assure numeric
        gapPropsRef.current = gapProps = {...gapProps} // signal change to React
    }

    // ------------------------[ verify numeric values ]----------------

    // verify numbers for runtime
    const originalValues = {
        cellMinHeight,
        cellMinWidth,
        startingIndex,
        runwaySize,
        cacheMax,
    }

    const verifiedValues = {
        cellMinHeight,
        cellMinWidth,
        startingIndex,
        runwaySize,
        cacheMax,        
    }

    let problemCount = 0
    for (const prop in verifiedValues) {
        if (isNaN(verifiedValues[prop])) {
            problemCount++
        } 
    }

    if (problemCount) {
        console.error('Error: invalid number - compare originalValues and verifiedValues', 
            originalValues, verifiedValues)
    }

    // ----------------[ apply constraints ]----------------

    if (!problemCount) {

        cellMinHeight = Math.max(cellMinHeight, 25)
        cellMinWidth = Math.max(cellMinWidth, 25)
        cellMinHeight = Math.min(cellHeight, cellMinHeight)
        cellMinWidth = Math.min(cellWidth, cellMinWidth)

        // prop constraints - non-negative values
        runwaySize = Math.max(1,runwaySize) // runwaysize must be at least 1

    }

    // rationalize startingListRange
    if (!problemCount && scrollerState == 'setup') {

        let goodrange = true
        if (!startingListRange 
            || !Array.isArray(startingListRange) 
            || !((startingListRange.length == 2) 
                || (startingListRange.length == 0))) {
            goodrange = false
        }
        if (goodrange) {
            let [lowindex,highindex] = startingListRange
            lowindex = +lowindex
            highindex = +highindex
            if (isNaN(lowindex) || isNaN(highindex)) {
                goodrange = false
            } else if (lowindex > highindex) {
                goodrange = false
            }
        }
        if (!goodrange) {
            startingListRange = []
        }
    }

    // -----------------[ system settings ]------------------

    let {

        showAxis, // boolean; axis can be made visible for debug
        triggerlineOffset, // distance from cell head or tail for content shifts above/below axis
        // timeouts
        VIEWPORT_RESIZE_TIMEOUT,
        ONAFTERSCROLL_TIMEOUT,
        IDLECALLBACK_TIMEOUT,
        // ratios:
        MAX_CACHE_OVER_RUN, // max streaming over-run as ratio to cacheMax
        CACHE_PARTITION_SIZE, 

        SCROLLTAB_INTERVAL_MILLISECONDS,
        SCROLLTAB_INTERVAL_PIXELS,

    } = technical

    VIEWPORT_RESIZE_TIMEOUT = VIEWPORT_RESIZE_TIMEOUT ?? 250
    ONAFTERSCROLL_TIMEOUT = ONAFTERSCROLL_TIMEOUT ?? 100
    IDLECALLBACK_TIMEOUT = IDLECALLBACK_TIMEOUT ?? 250
    
    MAX_CACHE_OVER_RUN = MAX_CACHE_OVER_RUN ?? 1.5
    CACHE_PARTITION_SIZE = CACHE_PARTITION_SIZE ?? 30

    SCROLLTAB_INTERVAL_MILLISECONDS = SCROLLTAB_INTERVAL_MILLISECONDS ?? 100
    SCROLLTAB_INTERVAL_PIXELS = SCROLLTAB_INTERVAL_PIXELS ?? 100

    if (typeof showAxis != 'boolean') showAxis = false

    triggerlineOffset = triggerlineOffset ?? 10

    // ------------------------[ control data ]----------------------

    const 
        // package gridSpecs
        gridSpecs = {
            orientation,
            cellHeight,
            cellWidth,
            cellMinHeight,
            cellMinWidth,
            layout,
        },

        cacheAPIRef = useRef(null),

        portalCacheForceUpdateFunctionRef = useRef(null),

        listRangeRef = useRef(startingListRange),

        listrange = listRangeRef.current,
        [lowlistrange, highlistrange] = listrange, // ranges undefined if listrange length is 0
        listsize = 
            listrange.length == 0
                ?0
                :highlistrange - lowlistrange + 1,

        virtualListSpecs = {
            size:listsize,
            range:listrange,
            lowindex:lowlistrange,
            highindex:highlistrange,
        },

        virtualListSpecsRef = useRef(virtualListSpecs),

        // scroller scoped dnd data initialization
        scrollerDndContextRef = useRef({
            scrollerID, // placeholder, but assertion with scrollerID useEffect below
            dndOptions, // scroller scoped, but assertion with dndOptions useEffect below
            profile,
            droppedIndex:null, // polled by CellFrames
            displacedIndex:null, // polled by CellFrames
            dndFetchIndex:null, // polled by CellFrames
            dndFetchItem:null, // data to pass to host
            // access to frequently used operations by dnd processes...
            cacheAPI:null,
            stateHandler:null,
            serviceHandler:null,
            handlersRef:null,
            // general access...
            cradleParameters:null,
        })

    const 
        gridSpecsRef = useRef(gridSpecs),
        [lowindex, highindex] = listRangeRef.current

    if (lowindex !== undefined) {
        startingIndex = Math.max(lowindex,startingIndex)
    }

    // placing cradlePositionData in the root here preserves values for switch from dnd enabled to not enabled
    // it is passed to the layoutHandler through the cradle
    // the switch causes scroller controllers to load alternate components, causing new setup and initialization processes
    // this includes viewport, cradle and cellframe. See notes in RigsDnd for more detail
    const cradlePositionDataRef = useRef({

        /*
            "block" = cradleblock, which is the element that is scrolled

            trackingBlockScrollPos is set by scrollHandler during and after scrolling,
            and by setCradleContent in contentHandler, which repositions the cradle.

            trackingBlockScrollPos is used by
                - cradle initialization in response to reparenting interrupt
                - setCradleContent
        */
        trackingBlockScrollPos:null, // the edge of the viewport
        trackingXBlockScrollPos:null, // the cross position for oversized scrollBlock

        /*
            values can be "scrollTop" or "scrollLeft" (of the viewport element) depending on orientation

            blockScrollProperty is set by the orientation reconfiguration effect in cradle module.

            it is used where trackingBlockScrollPos is used above.
        */
        blockScrollProperty: null,
        blockXScrollProperty: null,

        /*
            targetAxisReferencePosition is set by
                - setCradleContent
                - updateCradleContent
                - layoutHandler (initialization)
                - scrollHandler (during and after scroll)
                - host scrollToIndex call

            targetAxisReferencePosition is used by
                - scrollTrackerArgs in cradle module
                - requestedAxisReferenceIndex in setCradleContent
        */
        targetAxisReferencePosition:null,

        /*
            targetPixelOffsetAxisFromViewport is set by
                - setCradleContent
                - updateCradleContent
                - layoutHandler (initialization)
                - scrollHandler (during and after scroll)
                - pivot effect (change of orientation) in cradle module

            targetPixelOffsetAxisFromViewport is used by
                - previousAxisOffset in pivot effect
                - setCradleContent

        */
        targetPixelOffsetAxisFromViewport:null, // pixels into the viewport

    })

    // assure that cradlePositionData is always the same object
    const cradlePositionData = cradlePositionDataRef.current

    // --------------------[ test for changed properties ]-----------------------

    // tests for React with Object.is for changed properties; avoid re-renders with no change

    if (!compareProps(virtualListSpecs, virtualListSpecsRef.current)) {
        virtualListSpecsRef.current = virtualListSpecs
    }

    if (!compareProps(gridSpecs, gridSpecsRef.current)) {
        gridSpecsRef.current = gridSpecs
    }

    if (!compareProps(styles, stylesRef.current)) {
        stylesRef.current = styles
    }
    if (!compareProps(callbacks, callbacksRef.current)) {
        callbacksRef.current = callbacks
    }
    if (!compareProps(placeholderMessages, placeholderMessagesRef.current)) {
        placeholderMessagesRef.current = placeholderMessages
    }

    // ---------------------[ system initialization resources ]-------------------

    // prevent unregistering in strict dev mode (React double setup)
    const isMountedRef = useRef(true)

    // set cacheAPI global or local. getCacheAPI is called with isLocalCache on 'setup' cycle
    const getCacheAPI = (cacheAPI) => {

        cacheAPIRef.current = cacheAPI
        if (isDndMaster) {

            rigsGlobalContext.cacheAPI = cacheAPI

        } else {

            if (rigsGlobalContext.cacheAPI) rigsGlobalContext.cacheAPI = null
                
        }

    }

    // made available if useLocalCache is true; called with isLocalCache on 'setup' cycle
    const getPortalCacheUpdateFunction = (fn) => {

        portalCacheForceUpdateFunctionRef.current = fn

    }

    // useLocalCache for root only with drag and drop
    const useLocalCache = !masterDndContext.installed || isDndMaster

    // if use global cache, obtain from rigsGlobalContext
    if (scrollerState == 'setup' && !useLocalCache) {

        cacheAPIRef.current = rigsGlobalContext.cacheAPI

    }

    // prepare to reset with clearScrollerDndContext
    const clearScrollerDndContext = () => {
        scrollerDndContextRef.current = {
            scrollerID:null,
            dndOptions:null, // scroller scoped
            profile:null,
            droppedIndex:null, // polled by CellFrames
            displacedIndex:null, // polled by CellFrames
            dndFetchIndex:null, // polled by CellFrames
            dndFetchItem:null, // data to pass to host
            // access to frequently used operations by dnd processes...
            cacheAPI:null,
            stateHandler:null,
            serviceHandler:null,
            handlersRef:null,
            // general access...
            cradleParameters:null,
        }
    }

    // ------------------------[ system initialization effects ]--------------------

    // isMounted
    useEffect(()=>{

        isMountedRef.current = true

        return () => {

            isMountedRef.current = false

        }

    },[])

    // scrollerID
    useEffect (() => {

        if (scrollerSessionIDRef.current === null) { // defend against React.StrictMode double run
            scrollerSessionIDRef.current = globalScrollerID++
            isDndMaster && (masterDndContext.scrollerID = scrollerSessionIDRef.current)
        }

        return () => {
            clearScrollerDndContext()
        }

    },[]);

    // default cradlePositionData
    useEffect (()=>{

        if (listsize) { // only applies to startup; no change tracking required

            startingIndex = Math.max(startingIndex, lowindex)
            startingIndex = Math.min(startingIndex, highindex)

            cradlePositionData.targetAxisReferencePosition = startingIndex - lowindex

        } else {

            cradlePositionData.targetAxisReferencePosition = 0
        }

        cradlePositionData.targetPixelOffsetAxisFromViewport = 0

    },[])

    // CSS highlights
    useEffect(()=>{
        const { dndHighlights } = stylesRef.current
        if (dndHighlights) {
            const root:HTMLElement = document.querySelector(':root')
            dndHighlights.source && root.style.setProperty('--rigs-highlight-source',dndHighlights.source)
            dndHighlights.target && root.style.setProperty('--rigs-highlight-target',dndHighlights.target)
            dndHighlights.dropped && root.style.setProperty('--rigs-highlight-dropped',dndHighlights.dropped)
            dndHighlights.scroller && root.style.setProperty('--rigs-highlight-scrollercandrop',dndHighlights.scroller)
            dndHighlights.scrolltab && root.style.setProperty('--rigs-highlight-scrolltab',dndHighlights.scrolltab)
        }
    },[])

    // --------------------[ rationalize scroller drag and drop settings ]--------------------

    // dndOptions
    useEffect (() => {

        // assert reset if dndOptions is set without dnd
        if (!masterDndContext.installed) {
            if (scrollerDndContextRef.current.dndOptions) {
                clearScrollerDndContext()
            }
            return
        }

        // dnd is installed...
        scrollerDndContextRef.current.dndOptions = scrollerDndContextRef.current.dndOptions ?? {}

        const wasEnabled = scrollerDndContextRef.current.dndOptions?.enabled

        scrollerDndContextRef.current.dndOptions = dndOptions

        const enabled = scrollerDndContextRef.current.dndOptions.enabled ?? masterDndContext.enabled
        if (scrollerDndContextRef.current.dndOptions.enabled !== enabled) {
            scrollerDndContextRef.current.dndOptions.enabled = enabled
        }
        if (wasEnabled !== enabled) {
            setScrollerState('update')
        }

    },[dndOptions, masterDndContext.installed])

    // ---------------------[ propagate list range change ]--------------------

    // utility to ripple through list range change
    const setVirtualListRange = useCallback((listrange) =>{

        let listsize
        if (listrange.length == 0) {
            listsize = 0
        } else {
            const [lowrange, highrange] = listrange
            listsize = highrange - lowrange + 1
        }

        // listSizeRef.current = listsize
        listRangeRef.current = listrange

        // inform the user
        callbacksRef.current.changeListRangeCallback 
            && callbacksRef.current.changeListRangeCallback(listrange, {
                contextType:'changeListRange',
                scrollerID:scrollerSessionIDRef.current,
            })

        setScrollerState('setlistprops')

    },[])

    // ---------------------[ State handling ]------------------------

    const itemSetRef = useRef(null) // used for unRegisterScroller

    useEffect(() => {

        if (isMinimalPropsFail || problemCount) return

        switch (scrollerState) {

            case 'initialize':{
                setScrollerState('setup')
                break
            }

            case 'setup':{
                // replace cacheAPI with facade which includes hidden scrollerID
                cacheAPIRef.current = cacheAPIRef.current.registerScroller(scrollerSessionIDRef.current)
                itemSetRef.current = cacheAPIRef.current.itemSet // for unmount unRegisterScroller

                if (portalCacheForceUpdateFunctionRef.current) { // obtained from PortalCache

                    cacheAPIRef.current.partitionRepoForceUpdate = portalCacheForceUpdateFunctionRef.current

                }
                setScrollerState('ready')
                break
            }
            case 'update':
            case 'setlistprops':{
                setScrollerState('ready')
                break
            }
        }

        return () => {

            if (!isMountedRef.current) {

                const unRegisterScroller = cacheAPIRef.current.unRegisterScroller

                unRegisterScroller && unRegisterScroller(itemSetRef.current)

            }

        }

    },[scrollerState, isMinimalPropsFail, problemCount])

    // --------------------[ Render ]---------------------

    if (problemCount || isMinimalPropsFail) {

        return <div>error: see console.</div>

    }

    // component calls are deferred by scrollerState to give cacheAPI a chance to initialize
    return <ScrollerDndContext.Provider value = {scrollerDndContextRef.current} >
    <ErrorBoundary
        FallbackComponent= { ErrorFallback }
        // elaboration TBD
        onReset = { () => {} }
        onError = { () => {} }
        // onError = {(error: Error, info: {componentStack: string}) => {
        //     console.log('react-infinite-grid-scroller captured error', error)
        // }}
    >

        {(!['setup','initialize'].includes(scrollerState)) 
        && <Viewport

            gridSpecs = { gridSpecsRef.current }
            styles = { stylesRef.current }
            scrollerID = { scrollerID }
            useScrollTracker = { useScrollTracker }
            VIEWPORT_RESIZE_TIMEOUT = { VIEWPORT_RESIZE_TIMEOUT }
            SCROLLTAB_INTERVAL_MILLISECONDS = { SCROLLTAB_INTERVAL_MILLISECONDS }
            SCROLLTAB_INTERVAL_PIXELS = { SCROLLTAB_INTERVAL_PIXELS }

        >
        
            <Scrollblock

                gridSpecs = { gridSpecsRef.current }
                paddingProps = {paddingProps}
                gapProps = { gapProps }
                styles = { stylesRef.current }
                virtualListSpecs = {virtualListSpecsRef.current}
                scrollerID = { scrollerID }
                
            >
                <Cradle 

                    gridSpecs = { gridSpecsRef.current }
                    paddingProps = { paddingProps }
                    gapProps = { gapProps }
                    styles = { stylesRef.current }
                    virtualListSpecs = {virtualListSpecsRef.current}
                    setVirtualListRange = { setVirtualListRange }
                    cache = { cache }
                    cacheMax = { cacheMax }
                    userCallbacks = { callbacksRef.current }
                    startingIndex = { startingIndex }
                    getItemPack = { getItemPack }
                    getExpansionCount = { getExpansionCount }
                    placeholder = { placeholder }
                    placeholderMessages = { placeholderMessagesRef.current }
                    runwaySize = { runwaySize }
                    triggerlineOffset = { triggerlineOffset }
                    cradlePositionData = {  cradlePositionData}
                    scrollerProfile = { profile }

                    cacheAPI = { cacheAPIRef.current }
                    usePlaceholder = { usePlaceholder }
                    showAxis = { showAxis }
                    ONAFTERSCROLL_TIMEOUT = { ONAFTERSCROLL_TIMEOUT }
                    IDLECALLBACK_TIMEOUT = { IDLECALLBACK_TIMEOUT }
                    MAX_CACHE_OVER_RUN = { MAX_CACHE_OVER_RUN }
                    scrollerID = { scrollerID }

                />
            </Scrollblock>
        </Viewport>}
        {(scrollerState !== 'initialize') && <div data-type = 'cachewrapper'>
            {useLocalCache 
            && <div data-type = 'cacheroot' style = { cacherootstyle }>
                <PortalCache 

                    getCacheAPI = { getCacheAPI } 
                    getPortalCacheUpdateFunction = { getPortalCacheUpdateFunction }
                    CACHE_PARTITION_SIZE = { CACHE_PARTITION_SIZE } />

            </div>}
        </div>}
    </ErrorBoundary>
    </ScrollerDndContext.Provider>
}

export default InfiniteGridScroller

// ----------------------------[ Support ]------------------------------

const cacherootstyle = {display:'none'} // static, out of view 

// utility
function compareProps (obj1,obj2) {
    if (!obj1 || !obj2) return false
    const keys = Object.keys(obj1)
    for (const key of keys) {
        if (!Object.is(obj1[key],obj2[key])) {
            return false
        }
    }
    return true
}
