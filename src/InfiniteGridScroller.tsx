// infinitegridscroller.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    react-infinite-grid-scroller = RIGS

    ROADMAP:

        review all code

        layout: uniform, variable, dense

        cross-browser testing; smartphone testing

        release to npm

        create demo site - github pages

    BUGS: 
        - problem with remapIndexes in the presence of undefined item types

    TODO:
        - cradle can contain cells with no cache entry - check for consequences
        - rationalize calls to cacheHandler vs contentHandler or serviceHandler
            - particularly for cache paring

        - rationalize cacheProps.modified

        - test for duplicate instruction in test.controller.handleReverseCradle

        - review event cycles - they seem slower
            - review state change chains in cradle
            - try to reduce need to run renderportallist - try some kind of pagination/grouping
        - check number of passes to scrollblock; consider implementing named states

        - test changing all gridscroller parameters
            test config size edge cases - over and under sized cells

        - clear out TODO notes

        - replace top/left with transformx/y

        ----------------
        
        - prioritize fetch cells for visible cells

        - create random loading delays in test ui
        - provide way to attempt reload of a single cell (change instanceID)
        - test for memory leaks with Chrome's window.performance.memory property
        - test for two root portals
        - calc minwidth by form factor
        - review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
        - add grid-template-rows: max-content to parent for safari issue grid-auto-flow: column not filling column
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

    // console.log('InfiniteGridScroller props', props)

    let { 
        // grid specs:
        orientation = 'vertical', // vertical or horizontal
        gap = 0, // space between grid cells, not including the leading and trailing edges
        padding = 0, // the space between the items and the viewport, applied to the cradle
        cellHeight, // required. the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // required. the outer pixel width - literal for horizontal; approximate for vertical
        layout = 'uniform', // uniform, variable (uses axis), dense
        // scroller specs:
        estimatedListSize = 0, // the exact number of the size of the virtual list
        runwaySize = 3, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        startingIndex = 0, // the 0-based starting index of the list, when first loaded
        getItem, // required. function provided by host - parameter is index number, set by system; 
            // return value is host-selected component or promise of a component, or null or undefined
        placeholder, // optional. a sparse component to stand in for content until the content arrives; 
            // optional, replaces default placeholder
        styles = {}, // optional. passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, or scrolltracker
        // system specs:
        useScrollTracker = true,
        cache = 'cradle', // "preload", "keepload" or "cradle"
        cacheMax = null, // always minimum cradle null means limited by listsize
        triggerlineOffset = 10, // distance from cell head or tail for content shifts above/below axis
        callbacks = {}, // optional. closures to get direct access to some component utilites
        scrollerProperties, // required for embedded scroller, shares scroller settings with content
        advanced = {}, // optional. technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
    } = props

    // console.log('InfiniteGridScroller callbacks',callbacks)

    // avoid null
    styles = styles ?? {}
    callbacks = callbacks ?? {}
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
    if (!['uniform', 'variable', 'dense'].includes(layout)) {
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
    const callbacksRef = useRef(callbacks)

    let {
        showAxis,
        RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE,
        IDLECALLBACK_TIMEOUT,
    } = advanced

    RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE = RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE ?? 250
    IDLECALLBACK_TIMEOUT = IDLECALLBACK_TIMEOUT ?? 4000
    if (typeof showAxis != 'boolean') {
        showAxis = true
    }

    useScrollTracker = useScrollTracker ?? true

    if (typeof useScrollTracker != 'boolean') {
        useScrollTracker = true
    }

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
    if (!compareProps(callbacks, callbacksRef.current)) {
        callbacksRef.current = callbacks
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
        callbacksRef.current.newListsize && callbacksRef.current.newListsize(listsize)

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
            scrollerProperties = {scrollerProperties}
            scrollerID = { scrollerID }
            RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE = { RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE }

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
                    userCallbacks = { callbacksRef.current }
                    startingIndex = { startingIndex }
                    getItem = { getItem }
                    placeholder = { placeholder }
                    runwaySize = { runwaySize }
                    triggerlineOffset = { triggerlineOffset }

                    cacheHandler = {cacheHandlerRef.current}
                    useScrollTracker = {useScrollTracker}
                    showAxis = { showAxis }
                    IDLECALLBACK_TIMEOUT = { IDLECALLBACK_TIMEOUT }
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
