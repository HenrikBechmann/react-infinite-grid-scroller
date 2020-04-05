// cradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, { useState, useRef, useContext, useEffect, useCallback, useMemo, useLayoutEffect } from 'react'

import { ViewportContext } from './viewport'

import useIsMounted from 'react-is-mounted-hook'

import { 
    setCradleStyles, 
    getUIContentList, 
    calcVisibleItems, 
    getReferenceIndexData,
    getContentListRequirements,
    setCradleStyleRevisionsForDrop,
    setCradleStyleRevisionsForAdd,
    normalizeCradleAnchors,

} from './cradlefunctions'

import ScrollTracker from './scrolltracker'

const SCROLL_TIMEOUT_FOR_ONAFTERSCROLL = 200

const Cradle = ({ 
        gap, 
        padding, 
        runwaylength, 
        listsize, 
        offset, 
        orientation, 
        cellHeight, 
        cellWidth, 
        getItem, 
        placeholder, 
        component,
        styles,
    }) => {

    // =============================================================================================
    // --------------------------------------[ initialization ]-------------------------------------

    const isMounted = useIsMounted()

    const viewportData = useContext(ViewportContext)
    const [cradlestate, saveCradleState] = useState('setup')
    const cradlestateRef = useRef(null) // access by closures
    cradlestateRef.current = cradlestate

    const [scrollstate, saveScrollState] = useState('ready')

    // console.log('running cradle with cradlestate, scrollstate', cradlestate, scrollstate)

    // -----------------------------[ data heap ]-----------------------
    const listsizeRef = useRef(null)
    listsizeRef.current = listsize

    const viewportDataRef = useRef(null)
    viewportDataRef.current = viewportData

    const isResizingRef = useRef(false)

    const pauseObserversRef = useRef(false)

    const reportReferenceIndexRef = useRef(component?.reportReferenceIndex)

    // -----------------------[ effects ]-------------------------

    // initialize window listener, and component elements
    useEffect(() => {

        viewportData.elementref.current.addEventListener('scroll',onScroll)

        if (component?.hasOwnProperty('getVisibleList')) {
            component.getVisibleList = getVisibleList
        } 

        if (component?.hasOwnProperty('getContentList')) {
            component.getContentList = getContentList
        } 

        if (component?.hasOwnProperty('scrollToItem')) {
            component.scrollToItem = scrollToItem
        } 

        if (component?.hasOwnProperty('reload')) {
            component.reload = reload
        }

        return () => {

            viewportData.elementref.current && viewportData.elementref.current.removeEventListener('scroll',onScroll)

        }

    },[])

    // triger resizing based on viewport state
    useEffect(()=>{

        isResizingRef.current = viewportData.isResizing

        if (isResizingRef.current) {

            callingReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

            pauseObserversRef.current = true
            saveCradleState('resizing')

        }
        if (!isResizingRef.current && (cradlestateRef.current == 'resizing')) {

            saveCradleState('resize')

        }

    },[viewportData.isResizing])

    // ------------------------[ session data ]-----------------------
    // current location
    const [referenceindexdata, saveReferenceindex] = useState({
        index:Math.min(offset,(listsize - 1)) || 0,
        scrolloffset:0
    })
    const referenceIndexDataRef = useRef(null) // access by closures
    referenceIndexDataRef.current = referenceindexdata
    const lastReferenceIndexDataRef = useRef(null)

    const isCradleInViewRef = useRef(true)

    const [dropentries, saveDropentries] = useState(null) // trigger add entries

    const [addentries, saveAddentries] = useState(null) // add entries

    const contentlistRef = useRef([])

    const isScrollingRef = useRef(false)

    const itemobserverRef = useRef(null)

    const cradleobserverRef = useRef(null)

    const cellSpecs = useMemo(() => {
        return {
            cellWidth,cellHeight,gap, padding
        }
    },[cellWidth,cellHeight,gap, padding])
    const cellSpecsRef = useRef(null)
    cellSpecsRef.current = cellSpecs

    const divlinerStylesRef = useRef(Object.assign({
        position: 'absolute',
        backgroundColor: 'blue',
        display: 'grid',
        gridGap: gap + 'px',
        padding: padding + 'px',
        justifyContent:'start',
        alignContent:'start',
        boxSizing:'border-box',

    } as React.CSSProperties,styles?.cradle))

    const orientationRef = useRef(orientation)
    orientationRef.current = orientation // availability in closures

    const divlinerStyleRevisionsRef = useRef(null) // for modifications by observer actions

    const cradleElementRef = useRef(null)

    const { viewportDimensions } = viewportData

    let { height:viewportheight,width:viewportwidth } = viewportDimensions

    const crosscount = useMemo(() => {

        let crosscount
        let size = (orientation == 'horizontal')?viewportheight:viewportwidth
        let crossLength = (orientation == 'horizontal')?cellHeight:cellWidth

        let lengthforcalc = size - (padding * 2) + gap // length of viewport
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

    // ==============================================================================================
    // ----------------------------------[ config management ]--------------------------------

    const crosscountRef = useRef(crosscount) // for easy reference by observer
    const previousCrosscountRef = useRef() // available for resize logic
    previousCrosscountRef.current = crosscountRef.current // available for resize logic
    crosscountRef.current = crosscount // available for observer closure

    divlinerStylesRef.current = useMemo(()=> {

        // merge base style and revisions (by observer)
        let divlinerStyles:React.CSSProperties = Object.assign({...divlinerStylesRef.current},divlinerStyleRevisionsRef.current)
        let styles = setCradleStyles({

            orientation, 
            divlinerStyles, 
            cellHeight, 
            cellWidth, 
            gap,
            crosscount, 
            viewportheight, 
            viewportwidth, 

        })

        return styles
    },[
        orientation,
        cellHeight,
        cellWidth,
        gap,
        padding,
        viewportheight,
        viewportwidth,
        crosscount,
        divlinerStyleRevisionsRef.current
      ])

    useEffect(()=>{
        pauseObserversRef.current = true
        callingReferenceIndexDataRef.current = {...referenceIndexDataRef.current}
        saveCradleState('reload')
    },[
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    const itemElementsRef = useRef(new Map())
    const scrollTimeridRef = useRef(null)

    // =================================================================================
    // -------------------------[ IntersectionObserver support]-------------------------

    // There are two observers, one for the cradle, and another for itemShells; both against
    // the viewport.

    // --------------------------[ cradle observer ]-----------------------------------
    // this sets up an IntersectionObserver of the cradle against the viewport. When the
    // cradle goes out of the observer scope, the "repositioning" cradle state is triggerd.
    useEffect(() => {

        cradleobserverRef.current = new IntersectionObserver(

            cradleobservercallback,
            {root:viewportData.elementref.current}

        )

        cradleobserverRef.current.observe(cradleElementRef.current)

    },[])

    const cradleobservercallback = useCallback((entries) => {

        isCradleInViewRef.current = entries[0].isIntersecting
        // console.log('isCradleInViewRef.current',isCradleInViewRef.current)

    },[])

    // --------------------------[ item shell observer ]-----------------------------

    /*
        The cradle content is driven by notifications from the IntersectionObserver.
        - as the user scrolls the cradle, which has a runway at both the leading
            and trailing edges, itemShells scroll into or out of the scope of the observer 
            (defined by the width/height of the viewport + the lengths of the runways). The observer
            notifies the app (through itemobservercallback() below) at the crossings of the itemshells 
            of the defined observer cradle boundaries.

            The no-longer-intersecting notifications trigger dropping of that number of affected items from 
            the cradle contentlist. The dropping of items from the trailing end of the content list
            triggers the addition of an equal number of items at the leading edge of the cradle content.

            Technically, the opposite end position spec is set (top or left depending on orientation), 
            and the matching end position spec is set to 'auto' when items are added. This causes items to be 
            "squeezed" into the leading or trailing ends of the ui content (out of view) as appropriate.

            There are exceptions for setup and edge cases.
    */

    const dropcontentRef = useRef(null)
    const dropstylesRef = useRef(null)
    const dropcontentlistRef = useRef(null)
    const addcontentRef = useRef(null)
    const addstylesRef = useRef(null)
    const addcontentlistRef = useRef(null)

    // the async callback from IntersectionObserver.
    const itemobservercallback = useCallback((entries)=>{

        console.log('pauseObserversRef.current, cradlestateRef.current',pauseObserversRef.current, cradlestateRef.current)

        if (pauseObserversRef.current) {

            return

        }

        if (cradlestateRef.current == 'ready') {

            let dropentries = entries.filter(entry => (!entry.isIntersecting))

            // console.log('dropentries',dropentries)

            if (dropentries.length) {

                dropcontentRef.current = dropentries
                // isMounted() && saveScrollState('dropcontent')
                isMounted() && saveDropentries(dropentries)
                // console.log('dropentries', dropentries)

            }
        }

    },[])

    // drop scroll content
    useEffect(()=>{
        if (dropentries === null) return
        // if (scrollstate != 'dropcontent') return

        // let dropentries = dropcontentRef.current
        dropcontentRef.current = null

        let sampleEntry = dropentries[0]

        let cradleElement = cradleElementRef.current
        let parentElement = cradleElement.parentElement
        let viewportElement = viewportData.elementref.current

        let scrollforward
        let localContentList

        // -- isolate forward and backward lists
        //  then set scrollforward
        let forwardcount = 0, backwardcount = 0
        for (let droprecordindex = 0; droprecordindex <dropentries.length; droprecordindex++ ) {
            if (orientation == 'vertical') {

                if (sampleEntry.boundingClientRect.y - sampleEntry.rootBounds.y < 0) {
                    forwardcount++
                } else {
                    backwardcount++
                }
            
            } else {
            
                if (sampleEntry.boundingClientRect.x - sampleEntry.rootBounds.x < 0) {
                    forwardcount++
                } else {
                    backwardcount++
                }
            
            }
        }

        let netshift = forwardcount - backwardcount
        if (netshift == 0) {
            // saveScrollState('ready')
            return
        }

        scrollforward = (forwardcount > backwardcount)

        netshift = Math.abs(netshift)

        // set localContentList
        let indexoffset = contentlistRef.current[0].props.index
        let pendingcontentoffset
        let newcontentcount = Math.ceil(netshift/crosscountRef.current)*crosscountRef.current
        let headindexcount, tailindexcount

        if (scrollforward) {
            pendingcontentoffset = indexoffset + netshift
            let proposedtailoffset = pendingcontentoffset + newcontentcount + ((contentlistRef.current.length - netshift ) - 1)

            if ((proposedtailoffset) > (listsize -1) ) {
                newcontentcount -= (proposedtailoffset - (listsize -1))
                if (newcontentcount <=0) { // defensive
                    // saveScrollState('ready')
                    return
                }
            }

            headindexcount = -netshift
            tailindexcount = 0

        } else {

            pendingcontentoffset = indexoffset
            let proposedindexoffset = pendingcontentoffset - newcontentcount
            if (proposedindexoffset < 0) {
                proposedindexoffset = -proposedindexoffset
                newcontentcount = newcontentcount - proposedindexoffset
                if (newcontentcount <= 0) {
                    // saveScrollState('ready')
                    return 
                }
            }

            headindexcount = 0
            tailindexcount = -netshift

        }

        localContentList = getUIContentList({

            indexoffset,
            localContentList:contentlistRef.current,
            headindexcount,
            tailindexcount,
            callbacksRef,

        })

        let styles = setCradleStyleRevisionsForDrop({ 

            cradleElement, 
            parentElement, 
            scrollforward, 
            orientation 

        })

        // console.log('drop styles',{...styles})

        // immediate change for modification, but an anti-pattern
        let elementstyle = cradleElementRef.current.style
        elementstyle.top = styles.top
        elementstyle.bottom = styles.bottom
        elementstyle.left = styles.left
        elementstyle.right = styles.right

        // console.log('drop styles',styles)

        divlinerStyleRevisionsRef.current = styles 

        contentlistRef.current = localContentList
        // dropcontentlistRef.current = localContentList
        // dropstylesRef.current = styles


        // saveDropentries(null)
        // addcontentRef.current = {count:newcontentcount,scrollforward,contentoffset:pendingcontentoffset}
        saveAddentries({count:newcontentcount,scrollforward,contentoffset:pendingcontentoffset})
        // saveScrollState('addcontent') // -> applydropcontent -> addcontent


    },[dropentries])

    // add scroll content
    useEffect(()=>{
        // saveAddentries(null)
        // return
        if (addentries === null) return
        // if (scrollstate != 'addcontent') return

        // console.log('ADDING scroll content')


        // let addentries = addcontentRef.current
        addcontentRef.current = null

        let cradleElement = cradleElementRef.current
        let parentElement = cradleElement.parentElement
        let viewportElement = viewportData.elementref.current

        let { scrollforward } = addentries
        let localContentList

        // set localContentList
        let { contentoffset, count:newcontentcount } = addentries

        let headindexcount, tailindexcount
        if (scrollforward) {

            headindexcount = 0,
            tailindexcount =  newcontentcount

        } else {

            headindexcount = newcontentcount
            tailindexcount = 0

        }

        localContentList = getUIContentList({

            localContentList: contentlistRef.current,
            headindexcount,
            tailindexcount,
            indexoffset: contentoffset,
            orientation,
            cellHeight,
            cellWidth,
            observer: itemobserverRef.current,
            crosscount,
            callbacksRef,
            getItem,
            listsize,
            placeholder,

        })

        let styles = setCradleStyleRevisionsForAdd({

            cradleElement,
            parentElement,
            scrollforward,
            orientation,

        })

        // console.log('add styles',{...styles})

        // console.log('styles, cradle offsetHeight, offsetTop',styles, cradleElement.offsetHeight, cradleElement.offsetTop)

        // immediate change for modification
        let elementstyle = cradleElementRef.current.style
        elementstyle.top = styles.top
        elementstyle.bottom = styles.bottom
        elementstyle.left = styles.left
        elementstyle.right = styles.right

        // addstylesRef.current = styles
        divlinerStyleRevisionsRef.current = styles

        // addcontentlistRef.current = localContentList
        contentlistRef.current = localContentList

        // saveScrollState('applyaddstyles') // -> applyaddcontent -> ready

        // console.log('addentries',addentries)
        // saveScrollState('ready')
        saveAddentries(null)

    },[addentries])
    // End of IntersectionObserver support

    // ========================================================================================
    // -------------------------------[ Assembly of content]-----------------------------------
    
    // reset cradle
    const setCradleContent = useCallback((cradleState, referenceIndexData) => {

        let { index: visibletargetindexoffset, 
            scrolloffset: visibletargetscrolloffset } = referenceIndexData

        if (cradleState == 'reposition') visibletargetscrolloffset = 0

        let localContentList = [] // any duplicated items will be re-used by react

        let {indexoffset, referenceoffset, contentCount, scrollblockoffset, cradleoffset} = 
            getContentListRequirements({
                cellHeight, 
                cellWidth, 
                orientation, 
                viewportheight, 
                viewportwidth, 
                runwaylength, 
                gap,
                padding,
                visibletargetindexoffset,
                targetScrollOffset:visibletargetscrolloffset,
                crosscount,
                listsize,
            })

        referenceIndexDataRef.current = {
            index:referenceoffset,
            scrolloffset:visibletargetscrolloffset,
        }

        reportReferenceIndexRef.current && reportReferenceIndexRef.current(referenceIndexDataRef.current.index)

        saveReferenceindex(referenceIndexDataRef.current)

        let childlist = getUIContentList({
            indexoffset, 
            headindexcount:0, 
            tailindexcount:contentCount, 
            orientation, 
            cellHeight, 
            cellWidth, 
            localContentList,
            observer:itemobserverRef.current,
            crosscount,
            callbacksRef,
            getItem,
            listsize,
            placeholder,
        })

        contentDataRef.current = childlist

        let elementstyle = cradleElementRef.current.style

        let styles:React.CSSProperties = {}

        if (orientation == 'vertical') {

            styles.top = cradleoffset + 'px'
            styles.bottom = 'auto'
            styles.left = 'auto'
            styles.right = 'auto'

            positionDataRef.current = {property:'scrollTop',value:scrollblockoffset}

        } else { // orientation = 'horizontal'

            styles.top = 'auto'
            styles.bottom = styles.bottom = 'auto'
            styles.left = cradleoffset + 'px'
            styles.right = 'auto'

            positionDataRef.current = {property:'scrollLeft',value:scrollblockoffset}

        }

        layoutDataRef.current = styles

    },[
        cellHeight,
        cellWidth,
        orientation,
        viewportheight,
        viewportwidth,
        runwaylength,
        gap,
        padding,
        crosscount,
      ]
    )

    // =====================================================================================
    // ----------------------------------[ state management ]-------------------------------

    // callback for scroll
    const onScroll = useCallback(() => {

        if (!isScrollingRef.current)  {

            isScrollingRef.current = true

        }

        clearTimeout(scrollTimeridRef.current)
        scrollTimeridRef.current = setTimeout(() => {

            isScrollingRef.current = false;
            let cradleState = cradlestateRef.current
            if ((!isResizingRef.current) && (!viewportDataRef.current.isResizing)) {

                (cradleState != 'repositioning') && normalizeCradleAnchors(cradleElementRef.current, orientationRef.current)

                saveReferenceindex({...referenceIndexDataRef.current}) // trigger re-run to capture end of scroll session values
                lastReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

            }
            switch (cradleState) {

                case 'repositioning': {

                    pauseObserversRef.current = true
                    callingReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

                    saveCradleState('reposition')
                    break
                } 

            }

        },SCROLL_TIMEOUT_FOR_ONAFTERSCROLL)

        if ((!isResizingRef.current) && (!viewportDataRef.current.isResizing)) {

            let cradleState = cradlestateRef.current
            if (cradleState == 'ready' || cradleState == 'repositioning') {

                referenceIndexDataRef.current = getReferenceIndexData({
                    orientation:orientationRef.current,
                    viewportData:viewportDataRef.current,
                    cellSpecsRef,
                    crosscountRef,
                    listsize:listsizeRef.current,
                })
                reportReferenceIndexRef.current && reportReferenceIndexRef.current(referenceIndexDataRef.current.index)

                saveReferenceindex(referenceIndexDataRef.current)

            }

        }

        if (
            !isCradleInViewRef.current && 
            !pauseObserversRef.current && 
            !isResizingRef.current &&
            !(cradlestateRef.current == 'resize') &&
            !(cradlestateRef.current == 'repositioning') && 
            !(cradlestateRef.current == 'reposition')) {

            let rect = viewportDataRef.current.elementref.current.getBoundingClientRect()
            let {top, right, bottom, left} = rect
            let width = right - left, height = bottom - top
            viewportDataRef.current.viewportDimensions = {top, right, bottom, left, width, height} // update for scrolltracker

            saveCradleState('repositioning')

        }

    },[])

    // trigger pivot on change in orientation
    useEffect(()=> {

        let rootMargin
        if (orientation == 'horizontal') {
            rootMargin = `0px ${runwaylength}px 0px ${runwaylength}px`
        } else {
            rootMargin = `${runwaylength}px 0px ${runwaylength}px 0px`
        }
        // console.log('rootMargin',options)
        itemobserverRef.current = new IntersectionObserver(
            itemobservercallback,
            {root:viewportData.elementref.current, rootMargin,threshold:1} 
        )

        contentlistRef.current = []

        if (cradlestate != 'setup') {
            pauseObserversRef.current = true
            callingReferenceIndexDataRef.current = {...lastReferenceIndexDataRef.current}

            saveCradleState('pivot')
        }

    },[
        orientation,
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    useLayoutEffect(()=>{
        // console.log('processing scrollstate',scrollstate)
        switch (scrollstate) {
            case 'applydropstyles':{
                // console.log('APPLYING drop styles')
                divlinerStyleRevisionsRef.current = dropstylesRef.current
                saveScrollState('applydropcontent')
                break
            }
            case 'applydropcontent':{
                // console.log('APPLYING drop content')
                contentlistRef.current = dropcontentlistRef.current
                saveScrollState('addcontent')
                break
            }
            case 'applyaddstyles':{
                // console.log('APPLYING add styles')
                divlinerStyleRevisionsRef.current = addstylesRef.current
                saveScrollState('applyaddcontent')
                break
            }
            case 'applyaddcontent': {
                // console.log('APPLYING add content')
                contentlistRef.current = addcontentlistRef.current
                saveScrollState('ready')
                break
            }
        }
    },[scrollstate])

    // data for state processing
    const callingCradleState = useRef(cradlestateRef.current)
    const callingReferenceIndexDataRef = useRef(referenceIndexDataRef.current)
    const layoutDataRef = useRef(null)
    const positionDataRef = useRef(null)
    const contentDataRef = useRef(null)

    // this is the core state engine
    // useLayout for suppressing flashes
    useLayoutEffect(()=>{

        switch (cradlestate) {
            case 'reload':
                contentlistRef.current = []
                saveCradleState('reposition')
                break;
            case 'position': {

                viewportData.elementref.current[positionDataRef.current.property] =
                    positionDataRef.current.value

                saveCradleState('layout')

                break
            }
            case 'layout': {

                divlinerStyleRevisionsRef.current = layoutDataRef.current

                saveCradleState('content')

                break
            }
            case 'content': {
                contentlistRef.current = contentDataRef.current
                saveCradleState('normalize')
                break
            }
        }

    },[cradlestate])

    // standard processing stages
    useEffect(()=> {

        switch (cradlestate) {
            case 'setup': 
            case 'resize':
            case 'pivot':
            case 'reposition':

                callingCradleState.current = cradlestate
                saveCradleState('settle')

                break

            case 'settle': {

                setCradleContent(callingCradleState.current, callingReferenceIndexDataRef.current)

                saveCradleState('position')

                break
            }
            case 'normalize': {
                setTimeout(()=> {

                    // redundant scroll position to avoid accidental positioning at tail end of reposition
                    if (viewportData.elementref.current) { // already unmounted if fails
                        viewportData.elementref.current[positionDataRef.current.property] =
                            positionDataRef.current.value

                        normalizeCradleAnchors(cradleElementRef.current, orientationRef.current)

                        lastReferenceIndexDataRef.current = {...referenceIndexDataRef.current}

                        pauseObserversRef.current  && (pauseObserversRef.current = false)
                    }

                },66)
                saveCradleState('ready')
                break 
            }          

            case 'ready':
                break
        }
    },[cradlestate])

    // =============================================================================
    // ------------------------------[ callbacks ]----------------------------------

    // on host demand
    const getVisibleList = useCallback(() => {

        let itemlist = Array.from(itemElementsRef.current)

        return calcVisibleItems(
            itemlist,viewportData.elementref.current,cradleElementRef.current, orientationRef.current
        )

    },[])

    const getContentList = useCallback(() => {
        return Array.from(itemElementsRef.current)
    },[])

    const reload = useCallback(() => {
        saveCradleState('reload')
    },[])

    const scrollToItem = useCallback((index, alignment = 'nearest') => {
        console.log('requested scrollToItem',index, alignment)
        callingReferenceIndexDataRef.current = {index:0, scrolloffset:0}
        saveCradleState('reposition')
    },[])

    // content item registration
    const getItemElementData = useCallback((itemElementData, reportType) => { // candidate to export

        const [index, shellref] = itemElementData

        if (reportType == 'register') {

            itemElementsRef.current.set(index,shellref)

        } else if (reportType == 'unregister') {

            itemElementsRef.current.delete(index)

        }

    },[])

    const callbacksRef = useRef({
        getElementData:getItemElementData
    })

    // =============================================================================
    // ------------------------------[ render... ]----------------------------------

    let divlinerstyles = divlinerStylesRef.current

    return <>

        { cradlestateRef.current == 'repositioning'
            ?<ScrollTracker 
                top = {viewportDimensions.top + 3} 
                left = {viewportDimensions.left + 3} 
                offset = {referenceIndexDataRef.current.index} 
                listsize = {listsize}
                styles = { styles }
            />
            :null}

        <div 
        
            ref = {cradleElementRef} 
            style = {divlinerstyles}
        
        >
        
            {(cradlestateRef.current != 'setup')?contentlistRef.current:null}
        
        </div>
        
    </>

} // Cradle


export default Cradle