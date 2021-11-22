// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:

    ObserversAgent
    WingsAgent
    MessageAgent ? // message with host environment, such as referenceIndexCallback

    ScrollAgent
    SignalsAgent
    StateAgent
    ContentAgent
    CradleAgent
    ServiceAgent // user services
    StylesAgent

    BUGS:
    - check styles in scrollTracker args
    - reposition gets stuck at a particular number after getting behind on heavy scroll
        check pauseScrollingEffects
    - variable cells showing signs of getItem() with portal
    - Chrome sometimes misses nested cell portals horizontally
    - reduce computing intensity to avoid battery drainage
*/

/*
    Description
    -----------
    The GridStroller provides the illusion of infinite scrolling through the use of a data 'cradle' inside a viewport.
    The illusion is maintained by synchronizing changes in cradle content with cradle location inside a scrollblock, such
    that as the scrollblock is moved, the cradle moves oppositely in the scrollblock (to stay visible within the viewport). 
    The scrollblock is sized to approximate the list being viewed, so as to have a scroll thumb size and position which 
    realistically reflects the size of the list being shown.

    The position of the cradle is controlled by a 'spine' which is a 0px height/width (along the medial - ScrollBlock can be 
    verticsl or horizontal). The purpose of the spine is to act as a 'fold', above which cell content expands 'upwards', and 
    below which the cell content expands  'downwards'. GridScroller can be viewed vertically or horizontally. When horizontal, 
    the spine has a 0px width, so that the 'fold' is vertical, and cells expand to the left and right.

    The spine is controlled to always be in the at the leading edge of the leading cellrow of the viewport. Thus
    in vertical orientation, the spine 'top' css attribute is always equal to the 'scrollTop' position of the scrollblock,
    plus an adjustment. The adjustment is the result of the alignment of the spine in relation to the top-(or left-)most cell
    in the viewport (the 'reference' row). The spine can only be placed at the leading edge of the first visible
    cell in the viewport. Therefore the spine offset from the leading edge of the viewport can be anywhere from minus to
    plus the length of the leading row. The exact amount depends on where the 'breakpoint' of transition notification is set for
    cells crossing the viewport threshold (and can be configured). The default of the breakpoint is .5 (half the length of the cell).

    Technically, there are several reference points tracked by the GridScroller. These are:
        - spineReferenceIndex (the virtual index of the item controlling the location of the spine)
            The spineReferenceIndex is also used to allocate items above (lower index value) and below (same or higher index value)
            the fold
        - cradleReferenceIndex (the virtual index of the item defining the leading bound of the cradle content)
        - spinePosOffset (pixels - plus or minus - that the spine is placed in relation to the viewport's leading edge) 
    
    These reference points are applied to the following structures:
        - the viewport
        - the scrollblock
        - the cradle, consisting of
            - the spine (contains cradle head and tail)
            - the head (contains leading items)
            - the tail (contains trailing items)

    Structure details:
        the cradle content consists of
        - the number of rows that are visible in the viewport (according to the default parameters)
            - this typically includes one partially visible row
        - the number of runway rows specified in the parameters, times 2 (one et for the head; one for the tail)
        - the number of items is the number of rows times the 'crosscount' the lateral number of cells. 
        - the last row might consist of fewer items than crosscount, to match the maximum listsize
        - the cradleRowcount (visible default rows + runwaycount * 2) and viewpointRowcount (visble rows;typicall one partial)

    Item containers:
        Client cell content is contained in CellShell's, which are configured according to GridScroller's input parameters.
        The ItemCell's are in turn contained in CSS grid structures. There are two grid structures - one in the cradle head,
        and one in the cradle tail. Each grid structure is allowed uniform padding and gaps - identical between the two.

    Overscroll handling:
        Owing to the weight of the code, and potential rapidity of scrolling, there is an overscroll protocol. 
        if the overscroll is such that part of the cradle is still within the viewport boundaries, then the overscroll
        is calculated as the number of cell rows that would fit (completely or partially) in the space between the edge of 
        the cradle that is receding from a viewport edge. 

        If the overshoot is such that the cradle has entirely passed out of the viewport, the GridScroller goes into 'Repositoining'
        mode, meaning that it tracks relative location of the spine edge of the viewport, and repaints the cradle accroding to
        this position when the scrolling stops.
*/

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

// import ResizeObserverPolyfill from 'resize-observer-polyfill'

import { ViewportContext } from './viewport'

import { portalManager } from './portalmanager'

// import { ResizeObserver } from '@juggle/resize-observer'

// const ResizeObserverClass = window['ResizeObserver'] || ResizeObserver

const ITEM_OBSERVER_THRESHOLD = 0

// import agency classes - loci of data and related methods
import ScrollAgent from './cradle/scrollagent'
import SignalsAgent from './cradle/signalsagent'
import StateAgent from './cradle/stateagent'
import ContentAgent from './cradle/contentagent'
import CradleAgent from './cradle/cradleagent'
import ObserversAgent from './cradle/observersagent'
import ServiceAgent from './cradle/serviceagent'
import StylesAgent from './cradle/stylesagent'

// popup position trackeer
import ScrollTracker from './scrolltracker'

const Cradle = ({ 
        gap, 
        padding, 
        runwaycount, 
        listsize, 
        defaultVisibleIndex, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
        functions,
        styles,
        scrollerName,
        scrollerID,
    }) => {

    // --------------------------[ bundle cradleProps ]----------------------------

    // functions and styles handled separately
    const cradlePropsRef = useRef(null) // access by closures
    const isMounted = useRef(true)
    useLayoutEffect(()=>{
        return () => {isMounted.current = false}
    },[])
    cradlePropsRef.current = useMemo(() => {
        return { 
            gap, 
            padding, 
            runwaycount, 
            listsize, 
            defaultVisibleIndex, 
            orientation, 
            cellHeight, 
            cellWidth, 
            getItem, 
            placeholder, 
            scrollerName,
            scrollerID,
    }},[
        gap, 
        padding, 
        runwaycount, 
        listsize, 
        defaultVisibleIndex, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
        scrollerName,
        scrollerID,
    ])

    const cradleProps = cradlePropsRef.current

    // =============================================================================================
    // --------------------------------------[ INITIALIZATION ]-------------------------------------
    // =============================================================================================

    // -----------------------------------------------------------------------
    // -----------------------------------[ utilites ]------------------------

    // const portalManager = portalAgentInstance// useContext(PortalAgent)
    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)

    // -----------------------------------------------------------------------
    // ---------------------------[ context data ]----------------------------

    const viewportData = useContext(ViewportContext)
    const viewportDataRef = useRef(null)
    viewportDataRef.current = viewportData

    const [cradleState, setCradleState] = useState('setup')

    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState

    const isReparentingRef = useRef(false)

    // -----------------------------------------------------------------------
    // -------------------------[ configuration ]-----------------

    const { viewportDimensions } = viewportData

    let { height:viewportheight,width:viewportwidth } = viewportDimensions
    
    const crosscount = useMemo(() => {

        // console.log('in cradle calc crosscount viewportheight, viewportwidth', 
        //     viewportheight, viewportwidth, Object.assign({},viewportDataRef.current))

        let crosscount
        let size = (orientation == 'horizontal')?viewportheight:viewportwidth
        let crossLength = (orientation == 'horizontal')?cellHeight:cellWidth

        let lengthforcalc = size - (padding * 2) + gap // length of viewport
        let tilelengthforcalc = crossLength + gap
        tilelengthforcalc = Math.min(tilelengthforcalc,lengthforcalc) // result cannot be less than 1
        crosscount = Math.floor(lengthforcalc/(tilelengthforcalc))

        // console.log('crosscount calculated in cradle', scrollerID, crosscount)

        return crosscount

    },[
        orientation, 
        cellWidth, 
        cellHeight, 
        gap, 
        padding, 
        viewportheight, 
        viewportwidth,
    ])

    const [cradleRowcount,viewportRowcount] = useMemo(()=> {

        let viewportLength, cellLength
        if (orientation == 'vertical') {
            viewportLength = viewportheight
            cellLength = cellHeight
        } else {
            viewportLength = viewportwidth
            cellLength = cellWidth
        }

        cellLength += gap

        let viewportrowcount = Math.ceil(viewportLength/cellLength)
        let cradleRowcount = viewportrowcount + (runwaycount * 2)
        let itemcount = cradleRowcount * crosscount
        if (itemcount > listsize) {
            itemcount = listsize
            cradleRowcount = Math.ceil(itemcount/crosscount)
        }
        return [cradleRowcount, viewportrowcount]

    },[
        orientation, 
        cellWidth, 
        cellHeight, 
        gap, 
        listsize,
        // padding,
        viewportheight, 
        viewportwidth,
        runwaycount,
        crosscount,
    ])


    // const signalsRef = useRef(Object.assign({},signalsbaseline))
    const cradleConfigRef = useRef(null)

    cradleConfigRef.current = {
        crosscount,
        cradleRowcount,
        viewportRowcount,
        cellObserverThreshold:ITEM_OBSERVER_THRESHOLD,
        listRowcount:Math.ceil(listsize/crosscount),
    }

    // -----------------------------------------------------------------------
    // -------------------------[ cradle management nodes ]-----------------

    const managersRef = useRef(null) // make available to individual managers
    const commonPropsRef = useRef({managersRef,viewportdataRef:viewportDataRef,cradlePropsRef, cradleConfigRef})
    const serviceCallsRef = useRef({referenceIndexCallbackRef})

    // cradle butterfly html components
    const headCradleElementRef = useRef(null)
    const tailCradleElementRef = useRef(null)
    const spineCradleElementRef = useRef(null)

    const cradleElementsRef = useRef(
        {
            head:headCradleElementRef, 
            tail:tailCradleElementRef, 
            spine:spineCradleElementRef
        }
    )
    const setItemElementData = useCallback((itemElementData, reportType) => { // candidate to export

        const [index, shellref] = itemElementData

        if (reportType == 'register') {

            contentAgent.itemElements.set(index,shellref)

        } else if (reportType == 'unregister') {

            contentAgent.itemElements.delete(index)

        }

    },[])

    const contentCallbacksRef = useRef({
        setElementData:setItemElementData
    })

    const [
        scrollAgent,
        signalsAgent,
        stateAgent,
        contentAgent,
        cradleAgent,
        observersAgent,
        serviceAgent,
        stylesAgent,
    ] = useMemo(()=>{
        return [
            new ScrollAgent(commonPropsRef),
            new SignalsAgent(commonPropsRef),
            new StateAgent(commonPropsRef,cradleStateRef,setCradleState,isMounted),
            new ContentAgent(commonPropsRef, contentCallbacksRef),
            new CradleAgent(commonPropsRef, cradleElementsRef.current),
            new ObserversAgent(commonPropsRef),
            new ServiceAgent(commonPropsRef,serviceCallsRef),
            new StylesAgent(commonPropsRef),
        ]
    },[])

    // to instantiate managersRef
    const managementsetRef = useRef({
        scroll:scrollAgent,
        signals:signalsAgent, 
        state:stateAgent,
        content:contentAgent, 
        cradle:cradleAgent, 
        service:serviceAgent,
        observers:observersAgent,
        styles:stylesAgent,
    })

    managersRef.current = managementsetRef.current

    if (viewportData.isReparenting) {
        signalsAgent.resetSignals() 
        viewportData.isReparenting = false
        isReparentingRef.current = true
        setCradleState('reparenting')
    }

    // ------------------------------------------------------------------------
    // -----------------------[ initialization effects ]-----------------------

    //initialize host functions properties
    useEffect(()=>{

        if (functions?.hasOwnProperty('scrollToItem')) {
            functions.scrollToItem = serviceAgent.scrollToItem
        } 

        if (functions?.hasOwnProperty('getVisibleList')) {
            functions.getVisibleList = serviceAgent.getVisibleList
        } 

        if (functions?.hasOwnProperty('getContentList')) {
            functions.getContentList = serviceAgent.getContentList
        } 

        if (functions?.hasOwnProperty('reload')) {
            functions.reload = serviceAgent.reload
        }

        referenceIndexCallbackRef.current = functions?.referenceIndexCallback

    },[functions])

    // initialize window scroll listener
    useEffect(() => {
        let viewportdata = viewportDataRef.current
        viewportdata.elementref.current.addEventListener('scroll',scrollAgent.onScroll)

        return () => {

            viewportdata.elementref.current && viewportdata.elementref.current.removeEventListener('scroll',scrollAgent.onScroll)

        }

    },[])

    // -----------------------------------------------------------------------
    // -----------------------[ reconfiguration effects ]---------------------

    // trigger resizing based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        if (viewportData.isResizing) {

            cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex
            cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset

            let signals = signalsAgent.signals
            signals.pauseCellObserver = true
            signals.pauseCradleIntersectionObserver = true
            signals.pauseCradleResizeObserver = true
            signals.pauseScrollingEffects = true
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportData.isResizing && (cradleStateRef.current == 'resizing')) {

            setCradleState('resized')

        }

    },[viewportData.isResizing])

    // reload for changed parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex
        cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset

        let signals = signalsAgent.signals

        signals.pauseCellObserver = true
        signals.pauseScrollingEffects = true

        setCradleState('reload')

    },[
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    // trigger pivot on change in orientation
    useEffect(()=> {

        if (cradleStateRef.current != 'setup') {

            cradleAgent.cellReferenceData.nextReferenceIndex = cradleAgent.cellReferenceData.readyReferenceIndex
            cradleAgent.cellReferenceData.nextSpineOffset = cradleAgent.cellReferenceData.readySpineOffset

            // get previous ratio
            let previousCellPixelLength = (orientation == 'vertical')?
                cradlePropsRef.current.cellWidth:cradlePropsRef.current.cellHeight
            let previousSpineOffset = cradleAgent.cellReferenceData.nextSpineOffset

            let previousratio = previousSpineOffset/previousCellPixelLength

            let currentCellPixelLength = (orientation == 'vertical')?
                cradlePropsRef.current.cellHeight:cradlePropsRef.current.cellWidth

            let currentSpineOffset = previousratio * currentCellPixelLength
            
            cradleAgent.cellReferenceData.nextSpineOffset = Math.round(currentSpineOffset)

            let signals = signalsAgent.signals

            signals.pauseCellObserver = true
            // pauseCradleIntersectionObserverRef.current = true
            signals.pauseScrollingEffects = true

            setCradleState('pivot')

        }

        // let cradleContent = contentAgentRef.current.content
        cradleContent.headModel = []
        cradleContent.tailModel = []
        cradleContent.headView = []
        cradleContent.tailView = []

    },[orientation])

    // =======================================================================
    // -------------------------[ OPERATION ]---------------------------------
    // =======================================================================

    // -----------------------------------------------------------------------
    // ------------------------[ style data ]-------------------------------

    // styles for wings and spine
    const [cradleHeadStyle, cradleTailStyle, cradleSpineStyle] = useMemo(()=> {

        return stylesAgent.setCradleStyles({

            orientation, 
            cellHeight, 
            cellWidth, 
            gap,
            padding,
            viewportheight, 
            viewportwidth,
            crosscount, 
            userstyles:styles,

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

      ])

    // =================================================================================
    // -------------------------[ Observer support]-------------------------
    // =================================================================================

    /*
        There are two interection observers, one for the cradle, and another for itemShells; 
            both against the viewport.
        There is also a resize observer for the cradle wings, to respond to size changes of 
            variable cells.
    */    

    // --------------------------[ resize observer ]-----------------------------------

    // set up cradle resizeobserver
    useEffect(() => {

        let observer = observersAgent.cradleResize.create()
        let cradleElements = cradleAgent.elements
        observer.observe(cradleElements.headRef.current)
        observer.observe(cradleElements.tailRef.current)

        return () => {

            observer.disconnect()

        }

    },[])

    // --------------------[ intersection observer for cradle body ]-----------------------

    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioning" cradle state is triggerd.
    useEffect(() => {

        let observer = observersAgent.cradleIntersect.create()
        let cradleElements = cradleAgent.elements
        observer.observe(cradleElements.headRef.current)
        observer.observe(cradleElements.tailRef.current)

        return () => {

            observer.disconnect()

        }

    },[])

    // --------------------------[ item shell observer ]-----------------------------

    /*
        The cradle content is driven by notifications from the IntersectionObserver.
        - as the user scrolls the cradle, which has a runwaycount at both the leading
            and trailing edges, CellShells scroll into or out of the scope of the observer 
            (defined by the width/height of the viewport + the lengths of the runways). The observer
            notifies the app (through cellobservercallback() below) at the crossings of the itemshells 
            of the defined observer cradle boundaries.

            The no-longer-intersecting notifications trigger dropping of that number of affected items from 
            the cradle contentlist. The dropping of items from the trailing end of the content list
            triggers the addition of an equal number of items at the leading edge of the cradle content.

            Technically, the opposite end position spec is set (top or left depending on orientation), 
            and the matching end position spec is set to 'auto' when items are added. This causes items to be 
            "squeezed" into the leading or trailing ends of the ui content (out of view) as appropriate.

            There are exceptions for setup and edge cases.
    */

    // responds to change of orientation
    useEffect(() => {

        let observer = observersAgent.cellIntersect.observer
        if (observer) observer.disconnect()
        observer = observersAgent.cellIntersect.create()

        return () => {

            observer.disconnect()

        }

    },[orientation])

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------
    // =====================================================================================

    // data for state processing
    const callingCradleState = useRef(cradleStateRef.current)
    const headlayoutDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        let viewportData = viewportDataRef.current
        let cradleContent = contentAgent.content
        switch (cradleState) {
            case 'reload':
                // cradleContent.portalData.clear()
                setCradleState('setreload')
                break;
            case 'updatereposition':
                setCradleState('repositioning')
                break;
            case 'repositioning':
                break;

            case 'reparenting':
                isReparentingRef.current = false
                setCradleState('setscrollposition')
                break;

            case 'setscrollposition': {

                // const cradleAgent = managersRef.current.scrollRef.current
                viewportData.elementref.current[cradleAgent.blockScrollProperty] =
                    Math.max(0,cradleAgent.blockScrollPos)

                setCradleState('normalizesignals')

                break
            }
            case 'updatecontent': { // scroll

                setCradleState('ready')
                break

            }
            case 'preparerender': {

                let cradleContent = contentAgent.content
                cradleContent.headView = cradleContent.headModel
                cradleContent.tailView = cradleContent.tailModel

                setCradleState('setscrollposition')
                break
            }
        }

    },[cradleState])

    // standard processing stages
    useEffect(()=> {

        let viewportData = viewportDataRef.current
        switch (cradleState) {
            case 'setup': 
            case 'resized':
            case 'pivot':
            case 'setreload':
            case 'reposition':

                callingCradleState.current = cradleState
                setCradleState('preparecontent')

                break

            case 'preparecontent': {

                cradleContent.headModel = []
                cradleContent.tailModel = []
                cradleContent.headView = []
                cradleContent.tailView = []
                portalManager.resetScrollerPortalContent(scrollerID)
                contentAgent.setCradleContent(callingCradleState.current)

                setCradleState('preparerender')

                break
            }
            case 'normalizesignals': {
                setTimeout(()=> {

                    if (!isMounted.current) return
                    // console.log('normalizesignals for cradle',scrollerID)
                    if (!viewportData.isResizing) {
                        // redundant scroll position to avoid accidental positioning at tail end of reposition
                        let signals = signalsAgent.signals
                        if (viewportData.elementref.current) { // already unmounted if fails (?)
                            signals.pauseCellObserver  && (signals.pauseCellObserver = false)
                            signals.pauseScrollingEffects && (signals.pauseScrollingEffects = false)
                            signals.pauseCradleIntersectionObserver && (signals.pauseCradleIntersectionObserver = false)
                            signals.pauseCradleResizeObserver && (signals.pauseCradleResizeObserver = false)
                            // signals.isReparenting && (signals.isReparenting = false)
                        } else {
                            console.log('ERROR: viewport element not set in normalizesignals', scrollerID, viewportData)
                        }

                        if (signals.isCradleInView) {
                            setCradleState('ready')
                        } else {
                            setCradleState('repositioning')
                        }

                    } else {
                        setCradleState('resizing')
                    }

                },100)

                break 

            }          

            case 'ready':
                break

        }

    },[cradleState])

    // =============================================================================
    // ------------------------------[ RENDER... ]----------------------------------
    // =============================================================================

    const scrollTrackerArgs = useMemo(() => {
        if (!(cradleStateRef.current == 'updatereposition' || cradleStateRef.current == 'repositioning')) {
            return
        }
        let trackerargs = {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            referenceIndexOffset:cradleAgent.cellReferenceData.scrollReferenceIndex,
            listsize:cradlePropsRef.current.listsize,
            styles:cradlePropsRef.current.styles,
        }
        return trackerargs
    },[cradleStateRef.current, viewportDimensions, cradleAgent.cellReferenceData.scrollReferenceIndex, cradlePropsRef])

    let cradleContent = contentAgent.content

    return <>

        {(cradleStateRef.current == 'updatereposition' || cradleStateRef.current == 'repositioning')
            ?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.referenceIndexOffset} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />
            :null}
        <div 
            data-type = 'cradle'
            style = {cradleSpineStyle} 
            ref = {spineCradleElementRef}
        >
            {true?<div style = {{zIndex:1, position:'absolute',width:'100%',height:'100%',boxShadow:'0 0 5px 3px red'}}></div>:null}
            <div 
            
                data-type = 'head'
                ref = {headCradleElementRef} 
                style = {cradleHeadStyle}
            
            >
            
                {(cradleStateRef.current != 'setup')?cradleContent.headView:null}
            
            </div>
            <div 
            
                data-type = 'tail'
                ref = {tailCradleElementRef} 
                style = {cradleTailStyle}
            
            >
            
                {(cradleStateRef.current != 'setup')?cradleContent.tailView:null}
            
            </div>
        </div>
        
    </>

} // Cradle


export default Cradle