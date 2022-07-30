// infinitegridscroller.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    react-infinite-grid-scroller = RIGS

    ROADMAP:
        organize return values of getItem
        checkmark enable console feedback (for external callbacks)
        constrain preload by cacheMax!
        organize feedback for all cache operations

        also surface external callbacks with return values for testing
        review all code

        layout: uniform, variable, dynamic, dense

        test changing all gridscroller parameters
        test config size edge cases - over and under sized cells

        create demo site - github pages, and sandbox
        release to npm

    BUGS: 
        - resizing call should not be happening on startup

    TODO:
        - try to preload all children, even if cached
        - cacheMax is also boundary for preload, and for dense, as well as keepload (?)

        - add modify listsize callback
        - getItem null return means past list - list size is adjusted;
            undefined means error; reject means error "unable to load"

        - review event cycles - they seem slower
        - return modified cachedItemMap from modify, add, and remove

        - use allSettled instead of all
        - use finally for callback
        - provide way to attempt reload of a single cell (change instanceID)
        - call matchCacheToCradle through contentHandler (?) iac rationalize calls to cacheHandler
        - test and review itemID
        - review state change chains in cradle
        - check preload intent against state machine handling
        - rationalize await handling everywhere to behave like promises
        - check number of passes to scrollblock; consider implementing named states
        - error handling for preload items -- allow recovery
        - test for memory leaks with Chrome's window.performance.memory property
        - try to reduce need to run renderportallist - try some kind of pagination/grouping
        - replace top/left with transformx/y
        - prioritize fetch cells for visible cells
        - customizable scrolltracker, or provide callback feature for scroll tracking
        - check use of useCallback
        - test for two root portals
        - promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE
        - calc minwidth by form factor
        - review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
        - add grid-template-rows: max-content to parent for safari issue grid-auto-flow: column not filling column
        - cross-browser testing
*/

import React, {useEffect, useState, useCallback, useRef} from 'react'

import {ErrorBoundary} from 'react-error-boundary'

function ErrorFallback({error, resetErrorBoundary}) {
  return (
    <div role="alert">
      <p>Oops! Something went wrong inside react-infinite-grid-scroller.</p>
      <p>Click to cancel the error and continue.</p>
      <button onClick={resetErrorBoundary}>Cancel error</button>
      <pre>{error}</pre>
    </div>
  )
}

import Viewport from './Viewport'
import Scrollblock from './Scrollblock'
import Cradle from './Cradle'

import { CacheHandler, PortalList } from './cradle/cachehandler'

// -------------------[ global session ID generator ]----------------

let globalScrollerID = 0

// ===================================[ INITIALIZE ]===========================

/*
    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the scrollblock, fullsize for adjusted cell height/width, which in turn contains the cradle 
        - a component that contains CellFrames (which contain displayed items or transitional placeholders). 
    The CellFrames are skeletons which contain the host content components.

    Host content is created in a portal cache (via PortalAgent) and then portal'd to its host CellFrame

    Scrollblock virtually represents the entirety of the list, and is the scroller

    Cradle contains the list items, and is 'virtualized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual items are framed by CellFrame, managed by Cradle

    Overall the infinitegridscroller manages the (often asynchronous) interactions of the 
    components of the mechanism
*/

const InfiniteGridScroller = (props) => {

    // ------------------[ normalize properties ]--------------------

    let { 
        // grid specs:
        orientation = 'vertical', // vertical or horizontal
        gap = 0, // space between grid cells, not including the leading and trailing edges
        padding = 0, // the space between the items and the viewport, applied to the cradle
        cellHeight, // required. the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // required. the outer pixel width - literal for horizontal; approximate for vertical
        layout = 'uniform', // uniform, variable (doesn't use axis), dynamic (uses axis), dense
        // scroller specs:
        estimatedListSize = 0, // the exact number of the size of the virtual list
        runwaySize = 3, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        startingIndex = 0, // the 0-based starting index of the list, when first loaded
        getItem, // required. function provided by host - parameter is index number, set by system; return value is 
            // host-selected component or promise of a component
        placeholder, // optional. a sparse component to stand in for content until the content arrives; 
            // optional, replaces default placeholder
        styles = {}, // optional. passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, or scrolltracker
        // system specs:
        cache = 'cradle', // "preload", "keepload" or "cradle"
        cacheMax = null, // always minimum cradle null means limited by listsize
        triggerlineOffset = 10, // distance from cell head or tail for content shifts above/below axis
        functions = {}, // optional. properties to get direct access to some component utilites, optional
        scrollerData, // required for embedded scroller, shares scroller settings with content
        advanced = {}, // optional. technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
    } = props

    // avoid null
    styles = styles ?? {}
    functions = functions ?? {}
    advanced = advanced ?? {}

    // prop constraints - non-negative values
    runwaySize = Math.max(0,runwaySize)
    estimatedListSize = Math.max(0,estimatedListSize)
    startingIndex = Math.max(0,startingIndex)

    // enums
    if (!['horizontal','vertical'].includes(orientation)) { 
        orientation = 'vertical'
    }
    if (!['preload','keepload','cradle'].includes(cache)) {
        cache = 'cradle'
    }
    if (!['uniform', 'variable', 'dynamic', 'dense'].includes(layout)) {
        layout = 'uniform'
    }

    const gridSpecs = { // package
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
    }

    const [scrollerState, setScrollerState] = useState('setup')

    const gridSpecsRef = useRef(gridSpecs)
    const stylesRef = useRef(styles)
    const functionsRef = useRef(functions)

    // for mount
    const scrollerSessionIDRef = useRef(null);

    const scrollerID = scrollerSessionIDRef.current

    // scrollerID && console.log('==> SCROLLER cache, scrollerState','-' + scrollerID + '-',cache, scrollerState)

    // satisfy React Object.is for attributes
    if (!compareProps(gridSpecs, gridSpecsRef.current)) {
        gridSpecsRef.current = gridSpecs
    }

    if (!compareProps(styles, stylesRef.current)) {
        stylesRef.current = styles
    }
    if (!compareProps(functions, functionsRef.current)) {
        functionsRef.current = functions
    }

    const cacheHandlerRef = useRef(null)

    useEffect (() => {
        scrollerSessionIDRef.current = globalScrollerID++
        cacheHandlerRef.current = new CacheHandler(scrollerSessionIDRef.current, setListsize, listsizeRef)
    },[])

    const listsizeRef = useRef(estimatedListSize)

    const listsize = listsizeRef.current

    // console.log('infinite scroller listsizeRef','-'+scrollerID+'-' , scrollerState, listsizeRef)
    // console.log('infinite scroller scrollerID, scrollerState, cache, cacheMax', 
    //     '-'+scrollerID+'-',scrollerState, cache, cacheMax)

    const setListsize = useCallback((listsize) =>{

        if (listsize == listsizeRef.current) return

        listsizeRef.current = listsize

        // inform the user
        functionsRef.current.newListsize && functionsRef.current.newListsize(listsize)

        setScrollerState('setlistsize')
    },[])

    // --------------------[ render ]---------------------

    useEffect(() => {

        switch (scrollerState) {
            case 'setup':
            case 'setlistsize':
                setScrollerState('ready')
        }

    },[scrollerState])

    return <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={() => {
          // reset the state of your app so the error doesn't happen again
        }}
        onError = {(error: Error, info: {componentStack: string}) => {
            console.log('react-infinite-grid-scroller captured error', error)
        }}
    >

        {(scrollerState != 'setup') && <Viewport

            gridSpecs = { gridSpecsRef.current }
            styles = { stylesRef.current }
            scrollerData = {scrollerData}
            scrollerID = { scrollerID }

        >
        
            <Scrollblock

                gridSpecs = { gridSpecsRef.current }
                styles = { stylesRef.current }
                listsize = { listsize }
                scrollerID = { scrollerID }
                
            >
                <Cradle 

                    gridSpecs = { gridSpecsRef.current }
                    styles = { stylesRef.current }
                    listsize = { listsize }
                    cache = { cache }
                    cacheMax = { cacheMax }
                    userFunctions = { functionsRef.current }
                    startingIndex = { startingIndex }
                    getItem = { getItem }
                    placeholder = { placeholder }
                    runwaySize = { runwaySize }
                    triggerlineOffset = { triggerlineOffset }

                    cacheHandler = {cacheHandlerRef.current}
                    scrollerID = { scrollerID }

                />
            </Scrollblock>
        </Viewport>}
        {(scrollerState != 'setup') && <div data-type = 'cacheroot' style = { cacherootstyle }>
            <PortalList cacheProps = {cacheHandlerRef.current.cacheProps}/>
        </div>}
    </ErrorBoundary>
}

const cacherootstyle = {display:'none'} as React.CSSProperties // static, out of view 

export default InfiniteGridScroller

// utilities
function compareProps (obj1,obj2) {
    const keys = Object.keys(obj1)
    let same
    for (let key of keys) {
        if (!Object.is(obj1[key],obj2[key])) {
            return false
        }
    }
    return true
}
