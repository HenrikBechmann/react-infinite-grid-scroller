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

import { useDrop, DropTargetMonitor} from 'react-dnd'

import DndCradle from './Cradle/DndCradle'

import { ViewportContext } from './Viewport'

import { MasterDndContext, ScrollerDndContext, GenericObject } from './InfiniteGridScroller'

import handleCradleStateChanges from './Cradle/cradlestatechanges'

import { // custom hooks
    // calculations
    useCrosscount, 
    useRowblanks, 
    useRowcounts, 
    useRangerowshift,
    // configuration
    useCachedEffect,
    useFunctionsCallback,
    useEventListenerEffect,
    useObserverEffect,
    // reconfiguration
    useNullItemCallback,
    useCachingChangeEffect,
    useResizingEffect,
    useReconfigureEffect,
    useListRangeEffect,
    useItemPackEffect,
    usePivotEffect,
    // style

} from './Cradle/cradlehooks'

import { 
    restoreScrollPos, 
    getCradleHandlers, 
    getViewportDimensions 
} from './Cradle/cradlefunctions'

// called to choose between dnd or no dnd for CellFrame
const CradleController = props => {

    const masterDndContext = useContext(MasterDndContext)

    const handlerListRef = useRef(null)

    if (masterDndContext.installed) {

        return <DndCradle {...props}/>

    } else {

        const enhancedProps = {...props, handlerListRef}

        return <Cradle {...enhancedProps} />

    }

}

export default CradleController

// for children
export const CradleContext = React.createContext(null)

// component
export const Cradle = ({ 
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
        getItemPack,
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
        scrollerContext,
        handlerListRef,

    }) => {

    // unpack core list specs
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

    // get contexts
    const 
        viewportContext = useContext(ViewportContext),
        masterDndContext = useContext(MasterDndContext),
        scrollerDndContext = useContext(ScrollerDndContext),
        viewportContextRef = useRef(null)

    viewportContextRef.current = viewportContext // for closures

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

    //  viewport dimensions for cached state determination
    const { height:viewportheight,width:viewportwidth } = getViewportDimensions({
        viewportElement:viewportContext.elementRef.current
    })

    // --------------------[ cache test ]----------------------

    // zero width and height means the component must be in portal (cache) state
    const 
        isInPortal = ((viewportwidth == 0) && (viewportheight == 0)),
        isCacheChange = (isInPortal != isCachedRef.current)

    if (isCacheChange) {
        wasCachedRef.current = isCachedRef.current
        isCachedRef.current = isInPortal
    }

    // ----------------------[ cradle state ]--------------------
    const 
        [cradleState, setCradleState] = useState('setup'),
        cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState

    // if (!scrollerContext) { // root scroller
        // console.log('--> cradleState','-'+scrollerID+'-', cradleState)
        // console.log('-- index','~'+scrollerContext?.cellFramePropertiesRef.current.index+'~')
        // console.log('-- itemID','+'+scrollerContext?.cellFramePropertiesRef.current.itemID+'+')
    // }

    // ------------------------[ calculated properties ]------------------------
    // configuration calculations

    // crosscount (also calculated by Scrollblock for deriving Scrollblock length)
    const crosscount = useCrosscount({
        orientation, 
        gapProps, 
        paddingProps,
        cellWidth, 
        cellHeight, 
        viewportheight, 
        viewportwidth,
        isCachedRef,        
    })

    // used to configure the start and end of cradle cell displays
    const [ baserowblanks, endrowblanks ] = useRowblanks({
        crosscount, 
        listsize, 
        lowindex, 
        highindex
    })

    // various rowcounts
    const [
        cradleRowcount, 
        viewportRowcount,
        listRowcount,
        runwayRowcount,
    ] = useRowcounts({
        orientation, 
        cellWidth, cellHeight, cellMinWidth, cellMinHeight, 
        viewportheight, viewportwidth,
        listsize, baserowblanks, endrowblanks, runwaySize, crosscount,
        gapProps, layout,
    })

    // used to calculate content config
    const rangerowshift = useRangerowshift({crosscount,lowindex, listsize})

    // =========================[ bundles ]===================

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

    // bundle all cradle props to pass to handlers - ultimately cradleParametersRef

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
        getItemPack,
        getExpansionCount,
        placeholder, placeholderMessages, usePlaceholder,
        triggerlineOffset,
        scrollerID,
        // objects
        userCallbacks, styles, cacheAPI,
        // control values
        ONAFTERSCROLL_TIMEOUT, MAX_CACHE_OVER_RUN, 
        scrollerContext,

    }

    const scrollerPropertiesRef = useRef(null)
    // passed to cellFrame content (user content) if requested
    scrollerPropertiesRef.current = {
        orientation, gapProps, paddingProps, layout,
        cellHeight, cellWidth, cellMinHeight, cellMinWidth,
        virtualListProps,
        cradleContentProps,
        cache,
        dndInstalled:masterDndContext.installed,
        dndEnabled:(masterDndContext.installed && masterDndContext.enabled && scrollerDndContext.dndOptions.enabled),
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
        viewportContextRef,
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
        stateHandler, // available for scrollerDndContext
        contentHandler,
        layoutHandler,
        serviceHandler,
        stylesHandler,
    } = handlersRef.current

    // possibly for dnd
    handlerListRef.current = handlersRef.current

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
    
    if (isCacheChange && !isCachedRef.current) {

        restoreScrollPos(layoutHandler, viewportContext)        

    }

    useCachedEffect({isCachedRef, wasCachedRef, hasBeenRenderedRef, cradleState, setCradleState})

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

    // instantiate some properties of scrollerDndContext if needed
    useEffect(()=>{

        if (!masterDndContext.installed) return

        // available for source drop processing
        scrollerDndContext.cacheAPI = cacheAPI
        scrollerDndContext.stateHandler = stateHandler
        scrollerDndContext.serviceHandler = serviceHandler

    },[])

    // return functions to host
    useFunctionsCallback({
        functionsCallback:userCallbacks.functionsCallback, 
        serviceHandler
    })

    // initialize window scroll listeners
    useEventListenerEffect({
        viewportElement:viewportContextRef.current.elementRef.current, 
        scrollHandler
    })

    // observer support
    useObserverEffect({interruptHandler})

    // =====================[ RECONFIGURATION effects ]======================
    // change listsize, caching, resize (UI resize of the viewport), reconfigure, or pivot

    // inernal callback: the new list size will always be less than current listsize
    // invoked if getItem returns null
    const nullItemSetMaxListsize = useNullItemCallback({
        listsize:cradleInternalPropertiesRef.current.virtualListProps.size,
        serviceHandler,
        contentHandler,
        cacheAPI,
    })

    // change cache or cacheMax
    useCachingChangeEffect({
        cache, 
        cacheMax, 
        cradleStateRef, 
        contentHandler, 
        serviceHandler, 
        cacheAPI, 
        setCradleState
    })

    // trigger viewportresizing response based on viewport state
    useResizingEffect({
        isResizing:viewportContextRef.current.isResizing,
        cradleStateRef, 
        isCachedRef, 
        wasCachedRef,
        interruptHandler, 
        setCradleState
    })

    // reconfigure dimensions
    useReconfigureEffect({
        // reconfiguration
        cellHeight,
        cellWidth,
        gapProps,
        paddingProps,
        triggerlineOffset,
        layout,
        runwaySize,
        // support
        cradleStateRef,
        isCachedRef,
        interruptHandler,
        setCradleState,        
    })

    // change list range
    useListRangeEffect({
        // list range
        lowindex,
        highindex,
        // support
        cradleStateRef,
        isCachedRef,
        interruptHandler,
        setCradleState,
    })

    // a new getItem function implies the need to reload
    useItemPackEffect({
        getItem, 
        getItemPack,
        cradleStateRef,
        interruptHandler,
        setCradleState,
    })

    // pivot triggered on change of orientation
    usePivotEffect({
        // pivot
        orientation, 
        layout,
        // support
        gapProps,
        isCachedRef,
        hasBeenRenderedRef,
        cradleInheritedPropertiesRef,
        cradleStateRef,
        layoutHandler,
        interruptHandler,
        setCradleState,

    })

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
        handleCradleStateChanges({ // delegated to a very long switch statement
            cradleState,
            cradleParameters, 
            isCachedRef, 
            wasCachedRef,
            hasBeenRenderedRef,
            nullItemSetMaxListsize,
        })

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
