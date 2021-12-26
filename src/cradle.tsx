// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    TODO:

    - try position fixed during reparenting to preserve scroll position

    - consider eliminating cellintersectobserver in favour of head and tail intersect oberver

    - scroll reset problem recurs with repeated above and below rapid resets
        the problem comes with update content from endofscroll, after double normalize signals
        the extra reparenting is inserted during the timeout for normalize signals
    - try cleartimeout


    - fix scroll reset on reparent
    - review need for setscrollposition
    - BUG: in FF nested scroller switch from placeholder to content resets scroll position
    - unmounted warning to do with InPortal

    ObserversManager
    WingsAgent
    MessageAgent ? // message with host environment, such as referenceIndexCallback

    ScrollManager
    SignalsManager
    StateManager
    ContentManager
    CradleManager
    ServiceManager // user services
    StylesManager

    BUGS:
    - check styles in scrollTracker args
    - doreposition gets stuck at a particular number after getting behind on heavy scroll
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

import { ViewportContext } from './viewport'

import { PortalManager, PortalList } from './portalmanager'

const ITEM_OBSERVER_THRESHOLD = 0

// import agency classes - loci of data and related methods
import ScrollManager from './cradle/scrollmanager'
import StateManager from './cradle/statemanager'
import ContentManager from './cradle/contentmanager'
import CradleManager from './cradle/cradlemanager'
import InterruptManager from './cradle/interruptmanager'
import ServiceManager from './cradle/servicemanager'
import StylesManager from './cradle/stylesmanager'

// popup position trackeer
import ScrollTracker from './scrolltracker'

export const CradleContext = React.createContext(null) // for children

const portalrootstyle = {display:'none'} // static parm

const NORMALIZE_SIGNALS_TIMEOUT = 250

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

    const cradlePropsRef = useRef(null) // access by closures

    cradlePropsRef.current =  {
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
    }

    const [cradleState, setCradleState] = useState('setup')
    const isReparentingRef = useRef(false)
    const viewportData = useContext(ViewportContext)
    const viewportDataRef = useRef(null)
    viewportDataRef.current = viewportData

    if (viewportData.index == 6) {
        console.log('RUNNING index cradleState', viewportData.index, cradleState)
    }

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

    const { viewportDimensions } = viewportData

    let { height:viewportheight,width:viewportwidth } = viewportDimensions
    

    const crosscount = useMemo(() => {

        let crosscount
        const size = (orientation == 'horizontal')?viewportheight:viewportwidth
        const crossLength = (orientation == 'horizontal')?cellHeight:cellWidth

        const lengthforcalc = size - (padding * 2) + gap // length of viewport
        let tilelengthforcalc = crossLength + gap
        tilelengthforcalc = Math.min(tilelengthforcalc,lengthforcalc) // result cannot be less than 1
        crosscount = Math.floor(lengthforcalc/(tilelengthforcalc))

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


    const cradleConfigRef = useRef(null)

    cradleConfigRef.current = {
        crosscount,
        cradleRowcount,
        viewportRowcount,
        cellObserverThreshold:ITEM_OBSERVER_THRESHOLD,
        listRowcount:Math.ceil(listsize/crosscount),
    }

    const cradleDataRef = useRef({
        portalManager:null,
        scrollerID,
        viewportDataRef,
    })

    const managersRef = useRef(null) // make available to individual managers
    const commonProps = {managersRef,viewportdataRef:viewportDataRef,cradlePropsRef, cradleConfigRef, cradleDataRef}

    const referenceIndexCallbackRef = useRef(functions?.referenceIndexCallback)
    const serviceCallsRef = useRef({referenceIndexCallbackRef})

    const setItemElementData = useCallback((itemElementData, reportType) => { // candidate to export

        const [index, shellref] = itemElementData

        if (reportType == 'register') {

            contentManager.itemElements.set(index,shellref)

        } else if (reportType == 'unregister') {

            contentManager.itemElements.delete(index)

        }

    },[])

    const contentCallbacksRef = useRef({
        setElementData:setItemElementData
    })

    const isMountedRef = useRef(true)
    useLayoutEffect(()=>{
        const portalmanager = cradleDataRef.current.portalManager = new PortalManager()

        // cleanup portal repository; clear isMountedRef
        return () => {
            isMountedRef.current = false
        }

    },[])

    const cradleStateRef = useRef(null) // access by closures
    cradleStateRef.current = cradleState;

    const [
        scrollManager,
        stateManager,
        contentManager,
        cradleManager,
        interruptManager,
        serviceManager,
        stylesManager,
    ] = useMemo(()=>{
        return [
            new ScrollManager(commonProps),
            new StateManager(commonProps,cradleStateRef,setCradleState,isMountedRef),
            new ContentManager(commonProps, contentCallbacksRef),
            new CradleManager(commonProps, cradleElementsRef.current),
            new InterruptManager(commonProps),
            new ServiceManager(commonProps,serviceCallsRef),
            new StylesManager(commonProps),
        ]
    },[])

    const normalizetimerRef = useRef(null)
    // if ((cradleState == 'normalizesignals') && viewportData.portal?.isReparenting) {
    if (viewportData.portal?.isReparenting) { 
        if (viewportData.index == 6) {
                console.log('restoring scrollpos ', viewportData.index,Math.max(0,cradleManager.cradleReferenceData.blockScrollPos))
        }
        // interruptManager.signals.pauseCellObserver = true
        viewportData.elementref.current[cradleManager.cradleReferenceData.blockScrollProperty] =
            Math.max(0,cradleManager.cradleReferenceData.blockScrollPos)
        viewportData.portal.isReparenting = false
        // setCradleState('restorescrollposition')
        // clearTimeout(normalizetimerRef.current)
    }

    // if (viewportDataRef.current.index == 0)
    //     console.log('RUNNING CRADLE index, cradleState',viewportDataRef.current.index, cradleState)
    // --------------------------[ bundle cradleProps ]----------------------------

    // functions and styles handled separately
    // const cradleProps = cradlePropsRef.current

    // =============================================================================================
    // --------------------------------------[ INITIALIZATION ]-------------------------------------
    // =============================================================================================

    // -----------------------------------------------------------------------
    // -----------------------------------[ utilites ]------------------------


    // -----------------------------------------------------------------------
    // ---------------------------[ context data ]----------------------------

    // if (viewportData.index == 0) console.log('cradle index, cradleState, props',
    //     viewportData.index,cradleState, cradlePropsRef.current)

    // -----------------------------------------------------------------------
    // -------------------------[ configuration ]-----------------------------

    // -----------------------------------------------------------------------
    // -------------------------[ cradle management nodes ]-----------------

    // to instantiate managersRef
    const managementsetRef = useRef({
        scroll:scrollManager,
        // signals:signalsManager, 
        state:stateManager,
        content:contentManager, 
        cradle:cradleManager, 
        service:serviceManager,
        interrupts:interruptManager,
        styles:stylesManager,
    });

    managersRef.current = managementsetRef.current

    // if ((viewportDataRef.current.index == 6) /*|| (viewportDataRef.current.index === null)*/) {
    //     console.log('RUNNING CRADLE index',
    //         viewportDataRef.current.index, '\n',
    //         '==>','cradleState:',cradleState,'\n',
    //         'isRepositioning signal:',interruptManager.states.isRepositioning,'\n',
    //         // 'isReparenting signal, state:',viewportDataRef.current.portal?.isReparenting,
    //         // isReparentingRef.current,'\n',
    //         'isResizing signal:',viewportData.isResizing,'\n',
    //         'repositioningRequired:',interruptManager.signals.repositioningRequired)
    // }

    // ------------------------------------------------------------------------
    // -----------------------[ initialization effects ]-----------------------

    //initialize host functions properties
    useEffect(()=>{

        if (functions?.hasOwnProperty('scrollToItem')) {
            functions.scrollToItem = serviceManager.scrollToItem
        } 

        if (functions?.hasOwnProperty('getVisibleList')) {
            functions.getVisibleList = serviceManager.getVisibleList
        } 

        if (functions?.hasOwnProperty('getContentList')) {
            functions.getContentList = serviceManager.getContentList
        } 

        if (functions?.hasOwnProperty('reload')) {
            functions.reload = serviceManager.reload
        }

        referenceIndexCallbackRef.current = functions?.referenceIndexCallback

    },[functions])

    // initialize window scroll listener
    useEffect(() => {
        let viewportdata = viewportDataRef.current
        viewportdata.elementref.current.addEventListener('scroll',scrollManager.onScroll)

        return () => {

            viewportdata.elementref.current && viewportdata.elementref.current.removeEventListener('scroll',scrollManager.onScroll)

        }

    },[])

    // -----------------------------------------------------------------------
    // -----------------------[ reconfiguration effects ]---------------------

    // trigger resizing based on viewport state
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        if (viewportData.isResizing) {

            const signals = interruptManager.signals
            signals.pauseCellObserver = true
            signals.pauseCradleIntersectionObserver = true
            signals.pauseCradleResizeObserver = true
            signals.pauseScrollingEffects = true
            const states = interruptManager.states
            states.isResizing = true
            setCradleState('resizing')

        }

        // complete resizing mode
        if (!viewportData.isResizing && (cradleStateRef.current == 'resizing')) {

            interruptManager.states.isResizing = false
            setCradleState('resized')

        }

    },[viewportData.isResizing])

    // useLayoutEffect(()=>{

    //     if (!viewportDataRef.current.portal) return // not nested

    //     if (viewportDataRef.current.portal.isReparenting) { // configure for reParenting

    //         viewportDataRef.current.portal.isReparenting = false

    //         if (cradleState == 'setup') return

    //         if ((!isReparentingRef.current) || (cradleState == 'normalizesignals')) {

    //             isReparentingRef.current = true

    //             if ((viewportDataRef.current.index == 6) /*|| (viewportDataRef.current.index === null)*/) {
    //                 console.log('setting reparenting + signals for index, state', viewportDataRef.current.index, cradleState)
    //             }

    //             const signals = interruptManager.signals
    //             signals.pauseCellObserver = true
    //             signals.pauseScrollingEffects = true
    //             // signals.pauseCradleIntersectionObserver = true
    //             // interruptManager.signals.repositioningRequired = false
    //             setCradleState('restorescrollposition')

    //         }

    //     }

    // },[cradleState,viewportDataRef.current.portal?.isReparenting])

    // reload for changed parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        let signals = interruptManager.signals

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

        if (cradleStateRef.current == 'setup') return

        // get previous ratio
        let previousCellPixelLength = (orientation == 'vertical')?
            cradlePropsRef.current.cellWidth:cradlePropsRef.current.cellHeight
        // let previousSpineOffset = cradleManager.cradleReferenceData.theNextSpinePixelOffset
        let previousSpineOffset = cradleManager.cradleReferenceData.nextCradlePosOffset

        let previousratio = previousSpineOffset/previousCellPixelLength

        let currentCellPixelLength = (orientation == 'vertical')?
            cradlePropsRef.current.cellHeight:cradlePropsRef.current.cellWidth

        let currentSpineOffset = previousratio * currentCellPixelLength
        
        cradleManager.cradleReferenceData.nextCradlePosOffset = Math.round(currentSpineOffset)

        let signals = interruptManager.signals

        signals.pauseCellObserver = true
        // pauseCradleIntersectionObserverRef.current = true
        signals.pauseScrollingEffects = true

        setCradleState('pivot')

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

        return stylesManager.setCradleStyles({

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

        let observer = interruptManager.cradleResize.create()
        let cradleElements = cradleManager.elements
        observer.observe(cradleElements.headRef.current)
        observer.observe(cradleElements.tailRef.current)

        return () => {

            observer.disconnect()

        }

    },[])

    // --------------------[ intersection observer for cradle body ]-----------------------

    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioningA" cradle state is triggerd.
    useEffect(()=>{

        const observer = interruptManager.cradleIntersect.create()
        const cradleElements = cradleManager.elements
        observer.observe(cradleElements.headRef.current)
        observer.observe(cradleElements.tailRef.current)

        return () => {

            observer.disconnect()

        }

    },[])
    useEffect(() => {

        if ((cradleState != 'startreposition') && (cradleState != 'finishreposition')) return

        const observer = interruptManager.cradleIntersect.observer

        if (cradleState == 'startreposition') {
            observer.disconnect()
        }
        if (cradleState == 'finishreposition') {
            const cradleElements = cradleManager.elements
            observer.observe(cradleElements.headRef.current)
            observer.observe(cradleElements.tailRef.current)
        }

    },[cradleState])

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

        let observer = interruptManager.cellIntersect.observer
        if (observer) observer.disconnect()
        observer = interruptManager.cellIntersect.create()

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
        let cradleContent = contentManager.content
        switch (cradleState) {

            // the following three messsages are initiated independent of one another

            case 'reload': // called after size configuration changes, or direct host call

                setCradleState('setreload')

                break;

            // case 'restorescrollposition': { // triggered by viewpoint reParenting

            //     if (viewportDataRef.current.index == 6) {
            //         console.log('setting scroll to ',cradleManager.cradleReferenceData.blockScrollPos)
            //     }
            //     viewportData.elementref.current[cradleManager.cradleReferenceData.blockScrollProperty] =
            //         Math.max(0,cradleManager.cradleReferenceData.blockScrollPos)
            //     isReparentingRef.current = false
            //     setCradleState('normalizesignals')

            //     break
            // }

            // 'renderupdatedcontent' is called from updateCradleContent, which is...
            // called from cellintersectionobservercallback (interruptManager), and 
            // called from onAfterScroll (scrollManager)
            case 'renderupdatedcontent': {

                setCradleState('ready')
                break

            }

            // ----------------------------------------------------------------------
            // ------------[ reposition when repositioningRequired is true ]---------------

            case 'startreposition': {
                interruptManager.states.isRepositioning = true
                interruptManager.signals.pauseCradleIntersectionObserver = true
                setCradleState('repositioningA')
                break
            }

            case 'finishreposition': {
                // interruptManager.signals.repositioningRequired = false
                interruptManager.signals.pauseCradleIntersectionObserver = false
                setCradleState('updatepositionreferences')
                break
            }
            case 'updatepositionreferences':{
                scrollManager.updateReferenceData()
                setCradleState('doreposition')
                break
            }

            // -----------------------------------------------------------------------
            // ------------[ the following 5 cradle states all resolve with ]---------
            // ------------[ a chain starting with 'preparecontent', which  ]---------
            // ------------[ calls setCradleContent                         ]---------

            case 'doreposition': {
                interruptManager.states.isRepositioning = false
            } // no break; follow through to preparecontent
            case 'setup': 
            case 'resized':
            case 'pivot':
            case 'setreload':

                callingCradleState.current = cradleState // message for setCradleContent
                setCradleState('preparecontent')

                break

            case 'preparecontent': {

                cradleContent.headModel = []
                cradleContent.tailModel = []
                cradleContent.headView = []
                cradleContent.tailView = []
                cradleDataRef.current.portalManager.resetScrollerPortalRepository()
                contentManager.setCradleContent(callingCradleState.current)

                setCradleState('preparerender')

                break
            }

            case 'preparerender': {

                let cradleContent = contentManager.content
                cradleContent.headView = cradleContent.headModel
                cradleContent.tailView = cradleContent.tailModel

                setCradleState('setscrollposition')
                break
            }

            case 'setscrollposition': { // always calculated with setCradleContent

                viewportData.elementref.current[cradleManager.cradleReferenceData.blockScrollProperty] =
                    Math.max(0,cradleManager.cradleReferenceData.blockScrollPos)

                setCradleState('normalizesignals') // call a timeout for ready (or interrupt continuation)

                break
            }

            case 'normalizesignals': {
                normalizetimerRef.current = setTimeout(()=> {

                    if (!isMountedRef.current) return

                    // allow short-circuit fallbacks to continue interrupt responses
            /*1*/   if (!viewportData.isResizing) { // resize short-circuit
                        
            /*2*/       if (!interruptManager.signals.repositioningRequired) { // repositioning short-circuit

            // /*3*/           if ((!viewportDataRef.current.portal) || (!viewportDataRef.current.portal.isReparenting))
            //                     /*&& (!isReparentingRef.current))*/ { // reparent (restorescrollpos) short-circuit
                            
                                const signals = interruptManager.signals
                                if (viewportData.elementref.current) { // already unmounted if fails (?)
                                    signals.pauseCellObserver  && (signals.pauseCellObserver = false)
                                    signals.pauseScrollingEffects && (signals.pauseScrollingEffects = false)
                                    signals.pauseCradleIntersectionObserver && (signals.pauseCradleIntersectionObserver = false)
                                    signals.pauseCradleResizeObserver && (signals.pauseCradleResizeObserver = false)
                                } else {
                                    console.log('ERROR: viewport element not set in normalizesignals', scrollerID, viewportData)
                                }

            /*default outcome*/ if (isMountedRef.current) setCradleState('ready')

            //                 } else {
            // /*3*/               if (isMountedRef.current) setCradleState('restorescrollposition')
            //                 }

                        } else {
            /*2*/           if (isMountedRef.current) setCradleState('startreposition')
                        }

                    } else {
            /*1*/       if (isMountedRef.current) setCradleState('resizing')
                    }

                },NORMALIZE_SIGNALS_TIMEOUT)

                break 

            }          

        }

    },[cradleState])

    // standard processing stages
    useEffect(()=> { // TODO: verify benefit of useLayoutEffect

        let viewportData = viewportDataRef.current
        switch (cradleState) {

            case 'repositioningA':
                break

            case 'repositioningB':
                setCradleState('repositioningA')
                break

            case 'ready':
                break

        }

    },[cradleState])

    // =============================================================================
    // ------------------------------[ RENDER... ]----------------------------------
    // =============================================================================

    const scrollTrackerArgs = useMemo(() => {
        if (!(cradleStateRef.current == 'repositioningB' || cradleStateRef.current == 'repositioningA')) {
            return
        }
        let trackerargs = {
            top:viewportDimensions.top + 3,
            left:viewportDimensions.left + 3,
            referenceIndexOffset:cradleManager.cradleReferenceData.scrollImpliedItemIndexReference,
            listsize:cradlePropsRef.current.listsize,
            styles:cradlePropsRef.current.styles,
        }
        return trackerargs
    },[cradleStateRef.current, viewportDimensions, cradleManager.cradleReferenceData.scrollImpliedItemIndexReference, cradlePropsRef])

    let cradleContent = contentManager.content

    return <CradleContext.Provider value = {cradleDataRef}>
        {(cradleStateRef.current != 'setup') && <div data-type = 'portalroot' style = { portalrootstyle }>
            <PortalList scrollerData = {cradleDataRef.current.portalManager.scrollerData}/>
        </div>}

        {((cradleStateRef.current == 'repositioningB') || (cradleStateRef.current == 'repositioningA'))
            ?<ScrollTracker 
                top = {scrollTrackerArgs.top} 
                left = {scrollTrackerArgs.left} 
                offset = {scrollTrackerArgs.referenceIndexOffset} 
                listsize = {scrollTrackerArgs.listsize}
                styles = {scrollTrackerArgs.styles}
            />
            :
        <div 
            data-type = 'cradle-spine'
            style = {cradleSpineStyle} 
            ref = {spineCradleElementRef}
        >
            {true?<div data-type = 'cradle-divider' style = {{zIndex:1, position:'absolute',width:'100%',height:'100%',boxShadow:'0 0 5px 3px red'}}></div>:null}
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
        </div>}
        
    </CradleContext.Provider>

} // Cradle


export default Cradle