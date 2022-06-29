// infinitegridscroller.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    ROADMAP:
        cache management
            // cacheMax; cacheMax over-run
            preload
            // keepload
            // cradle
        review all code
        layout: uniform, variable, dynamic, dense
        insert, remove, swap functions
        test changing all gridscroller parameters
        test config size edge cases - over and under sized cells

    BUGS: 
        - embedded list loses functional cycles on safari when list axis reference is changed
            and cached; also on Edge; intermittent; suspect cache sentinel
        - test for memory leaks with Chrome's window.performance.memory property

    TODO:
        try to reduce need to run renderportallist - try some kind of pagination/grouping
        surface cache, cacheMax & runway to test options
        replace top/left with transformx/y; try requestanimationframe
        warn usercontent of both resizing (?) and isReparenting
        prioritize fetch cells for visible cells
        customizable scrolltracker, or provide callback feature for scroll tracking
        reload from/to for insertions and substitutions
        check use of useCallback
        test for two root portals
        promote system constants to 'advanced' parameter, eg RESIZE_TIMEOUT_FOR_ONAFTERSRESIZE
        calc minwidth by form factor
        review scroller-frame for appropriate dimensions - s/b inset:0;position:absolute
        add grid-template-rows: max-content to parent for safari issue grid-auto-flow: column not filling column
        cross-browser testing
*/

'use strict'

import React, {useEffect, useState, useRef} from 'react'

import Viewport from './viewport'
import Scrollblock from './scrollblock'
import Cradle from './cradle'

import { CacheHandler, PortalList } from './cradle/cachehandler'

// -------------------[ global session ID generator ]----------------

let globalScrollerID = 0

// ===================================[ INITIALIZE ]===========================

/*
    The job of InfiniteGridScroller is to pass parameters to dependents.
    Viewport contains the scrollblock, fullsize for adjusted cell height/width, which in turn contains the cradle 
        - a component that contains CellShells (which contain displayed items or transitional placeholders). 
    The CellShells are skeletons which contain the host content components.

    Host content is created in a portal cache (via PortalAgent) and then portal'd to its host CellShell

    Scrollblock virtually represents the entirety of the list, and is the scroller

    Cradle contains the list items, and is 'virtualized' -- it appears as
      though it is the full scrollblock, but in fact it is only slightly larger than
      the viewport.
    - individual items are framed by CellShell, managed by Cradle

    Overall the infinitegridscroller manages the (often asynchronous) interactions of the 
    components of the mechanism
*/

const InfiniteGridScroller = (props) => {

    // ------------------[ normalize properties ]--------------------

    // const props = Object.assign({},args) // args should be immutable

    let { 
        orientation, // vertical or horizontal
        gap, // space between grid cells, not including the leading and trailing edges
        padding, // the space between the items and the viewport, applied to the cradle
        cellHeight, // the outer pixel height - literal for vertical; approximate for horizontal
        cellWidth, // the outer pixel width - literal for horizontal; approximate for vertical
        layout, // uniform, variable (doesn't use axis), dynamic (uses axis), dense

        runwaySize, // the number of items outside the view of each side of the viewport 
            // -- gives time to assemble before display
        listSize, // the exact number of the size of the virtual list; will eventually be changable.
        indexOffset:defaultVisibleIndex, // the 0-based starting index of the list, when first loaded
        getItem, // function provided by host - parameter is index number, set by system; return value is 
            // host-selected component or promise of a component
        functions, // properties to get direct access to some component utilites, optional
        placeholder, // a sparse component to stand in for content until the content arrives; 
            // optional, replaces default placeholder
        styles, // passive style over-rides (eg. color, opacity); has 
            // properties viewport, scrollblock, cradle, or scrolltracker
        // to come...
        cache, //  = "preload" or "keepload" or "cradle"
        cacheMax, // (always minimum cradle)
        advanced, // technical settings like useRequestIdleCallback, and RequestIdleCallbackTimeout
        triggerlineOffset,
        indexOffset,
        scrollerData
    } = props

    const gridSpecs = { // package
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
    }

    // allow scrollerID to be set by useEffect. Inline setting causes double processing
    const [scrollerState, setScrollerState] = useState('setup')

    // set defaults
    functions ?? (functions = {})
    styles ?? (styles = {})
    gap ?? (gap = 0)
    padding ?? (padding = 0)
    runwaySize ?? (runwaySize = 3)
    runwaySize = Math.max(0,runwaySize)
    indexOffset ?? (indexOffset = 0)
    listSize ?? (listSize = 0)
    listSize = Math.max(0,listSize)
    layout ?? (layout = 'uniform')
    cache ?? (cache = 'keepload')
    cacheMax ?? (cacheMax = 100)
    // constraints
    indexOffset = Math.max(0,indexOffset) // non-negative
    indexOffset = Math.min((listSize -1), indexOffset) // not larger than list
    if (!['horizontal','vertical'].includes(orientation)) {
        orientation = 'vertical'
    }
    if (!['preload','keepload','cradle'].includes(cache)) {
        cache = 'cradle'
    }
    // TODO: rationalize with cellHeight & cellWidth; must be less than half
    triggerlineOffset ?? (triggerlineOffset = 10) 

    const gridSpecsRef = useRef(gridSpecs)
    const stylesRef = useRef(styles)
    const functionsRef = useRef(functions)

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

    // for mount
    const scrollerSessionIDRef = useRef(null);

    const cacheHandlerRef = useRef(null)

    useEffect (() => {
        scrollerSessionIDRef.current = globalScrollerID++
        cacheHandlerRef.current = new CacheHandler(scrollerSessionIDRef.current)
    },[])

    const scrollerID = scrollerSessionIDRef.current

    // console.log('infinite scroller scrollerID, scrollerState', '-'+scrollerID+'-',scrollerState)

    // --------------------[ render ]---------------------

    useEffect(() => {

        switch (scrollerState) {
            case 'setup':
                setScrollerState('ready')
        }

    },[scrollerState])

    return (<>
        {(scrollerState != 'setup') && <Viewport

            gridSpecs = { gridSpecsRef.current }
            styles = { stylesRef.current }
            scrollerData = {scrollerData}
            scrollerID = { scrollerID }

        >
        
            <Scrollblock

                gridSpecs = { gridSpecsRef.current }
                styles = { stylesRef.current }
                listsize = { listSize }
                scrollerID = { scrollerID }
                
            >
                <Cradle 

                    gridSpecs = { gridSpecsRef.current }
                    styles = { stylesRef.current }
                    listsize = { listSize }
                    cache = {cache}
                    cacheMax = {cacheMax}
                    functions = { functionsRef.current }
                    defaultVisibleIndex = { defaultVisibleIndex }
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
            <PortalList scrollerProps = {cacheHandlerRef.current.scrollerProps}/>
        </div>}
        </>)
}

const cacherootstyle = {position:'fixed', left: '10000px', display:'none'} as React.CSSProperties // static, out of view 

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
