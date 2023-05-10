// CellFrame.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of CellFrame is to fetch user content from the cache, or from the host (using getItem).
    While an item is being fetched, CellFrame presents a placeholder (either the default or an 
    imported custom version). If there is an error in fetching content then the placeholder is used
    to present the error to the user. If a new itemID is set by the parent (to synchronize with an altered
    cache), then CellFrame replaces the old item with the new item.

    getItem (which is a function provided by the host) can return one of several values:
        - a React component
        - a promise of a component
        - null
        - undefined
    Anything else is treated as an error

    if a promise is returned, then the promise returns a React component, null or undefined.

    If a valid react component is returned from getItem, then it is instantiated in the cache, and rendered in the
    CellFrame. If null is returned, then CellFrame sends a message to its scroller that the host has 
    indicated the the item being fetched instead represents the end of the list, and the listsize should
    be adjusted accordingly. Any other value that is returned is treated as an error, and presented
    as such to the user through the placeholder component.

    getItem sends the index (logical index in the list) and a session itemID to the host, so that
    the host can sync its own tracking with the scroller.

    One CellFrame at a time is designated as the host of the two triggerLines with the isTriggerCell flag. 
    The triggerlines trigger an update of the Cradle through an IntersectionObserver.
*/

import React, {
    useRef, 
    useEffect, 
    useLayoutEffect, 
    useState, 
    useMemo, 
    useContext 
} from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback' // polyfill if needed

import { OutPortal } from 'react-reverse-portal' // fetch from cache

import Placeholder from './cellframe/Placeholder' // default

import { CradleContext } from './Cradle'

const defaultPlaceholderMessages = {
    loading:'(loading...)',
    retrieving:'(retrieving from cache)',
    null:'end of list',
    undefined:'host returned "undefined"',
    invalid:'invalid React element',
}

const CellFrame = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    cellMinHeight,
    cellMinWidth,
    layout,
    getItem, // function provided by host
    listsize, // for feedback in placeholder
    placeholder, // optionally provided by host
    itemID, // session itemID
    index, // logical index in infinite list
    instanceID, // CellFrame session ID
    scrollerID, // scroller ID (for debugging)
    isTriggercell,
    placeholderFrameStyles,
    placeholderLinerStyles,
    placeholderErrorFrameStyles,
    placeholderErrorLinerStyles,
    placeholderMessages,
    usePlaceholder,
}) => {

    const coreConfigRef = useRef(null)
    coreConfigRef.current = {
        orientation,
        layout,
        cellWidth,
        cellHeight
    }

    // ----------------------[ setup ]----------------------

    const cradleContext = useContext(CradleContext)

    const { 
        cacheAPI, 
        scrollerPropertiesRef, // for the user content, if requested
        nullItemSetMaxListsize, // for internal notification of end-of-list
        itemExceptionCallback, // for notification to host of error
        IDLECALLBACK_TIMEOUT, // to optimize requestIdleCallback
        triggercellTriggerlinesRef,
    } = cradleContext
    
    // style change generates state refresh
    const stylesRef = useRef({})
    const holderStylesRef = useRef({})

    const placeholderMessagesRef = useRef(null)

   placeholderMessagesRef.current = useMemo(() => {

        const newMessages = {...defaultPlaceholderMessages,...placeholderMessages}

        return newMessages

    },[placeholderMessages])

    // processing state
    const [frameState, setFrameState] = useState('setup')
    const frameStateRef = useRef(null)
    frameStateRef.current = frameState

    // DOM ref
    const frameRef = useRef(null)
    // to track unmount interrupt
    const isMountedRef = useRef(true)
    // cache data
    const portalMetadataRef = useRef(null)
    // the placeholder to use
    const placeholderRef = useRef(null)
    // the session itemID to use; could be updated by parent
    const itemIDRef = useRef(null)
    itemIDRef.current = itemID
    const cellFramePropertiesRef = useRef(null)
    cellFramePropertiesRef.current = {
        itemID,
        index
    }
    // fetch error
    const errorRef = useRef(false)
    // placeholder message
    const messageRef = useRef(null)

    useEffect(()=>{

        isMountedRef.current = true

        return () => {

            isMountedRef.current = false

        }

    },[])

    // for unmount
    useEffect(()=>{

        return () => {

            cancelidlecallback(requestIdleCallbackIdRef.current)

            cacheAPI.unregisterPendingPortal(index)

        }

    },[])

    // refresh content if itemID changes
    useLayoutEffect(()=>{

        if (frameStateRef.current == 'setup') return

        if (isMountedRef.current) setFrameState('getusercontent')

    },[itemID])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

        if (!usePlaceholder) return null        

        return placeholder?
            React.createElement(placeholder, 
                {index, listsize, message:messageRef.current, error:errorRef.current}):
            null
            
    },[
        index, 
        placeholder,
        listsize, 
        messageRef.current, 
        errorRef.current, 
        usePlaceholder
    ])

    placeholderRef.current = useMemo(()=>{

        if (!usePlaceholder) return null

        const placeholder = 
            customplaceholder?
                customplaceholder:
                <Placeholder 
                    key = 'placeholder'
                    index = { index } 
                    listsize = { listsize } 
                    message = { messageRef.current }
                    error = { errorRef.current }
                    userFrameStyles = { placeholderFrameStyles }
                    userLinerStyles = { placeholderLinerStyles }
                    userErrorFrameStyles = { placeholderErrorFrameStyles }
                    userErrorLinerStyles = { placeholderErrorLinerStyles }
                />

        return placeholder

    }, [
        index, 
        customplaceholder, 
        listsize, 
        messageRef.current, 
        errorRef.current,
        usePlaceholder,
        placeholderFrameStyles,
        placeholderLinerStyles,
        placeholderErrorFrameStyles,
        placeholderErrorLinerStyles,
    ])

    // ---------------- [ requestidlecallback config ] ------------------------

    const requestidlecallback = // requestIdleCallback
        window['requestIdleCallback']?
            window['requestIdleCallback']:
            requestIdleCallback

    const cancelidlecallback = // cancelIdleCallback
        window['cancelIdleCallback']?
            window['cancelIdleCallback']:
            cancelIdleCallback

    const requestIdleCallbackIdRef = useRef(null)

    // --------------------[ processing ]-----------------

    // set styles
    useEffect(()=>{

        const newStyles = getFrameStyles(
            orientation, cellHeight, cellWidth, cellMinHeight, cellMinWidth, layout, stylesRef.current)
        
        const newHolderStyles = getContentHolderStyles(layout, orientation, cellMinWidth, cellMinHeight)

        if (isMountedRef.current) {

            stylesRef.current = newStyles
            holderStylesRef.current = newHolderStyles

        }

    },[orientation, cellHeight, cellWidth, cellMinHeight, cellMinWidth, layout]) 

    const portalNodeRef = useRef(null)

    useLayoutEffect(() => {

        switch (frameState) {

            case 'setup': {

                setFrameState('working') // 'getusercontent' will be called

                break

            }

            case 'working': {

                setFrameState('getusercontent') // delay paint while working
                
                break

            }

            case 'getusercontent': {

                const itemID = itemIDRef.current
                const cached = cacheAPI.hasPortal(itemID)
                const {
                    layout,
                    orientation,
                    cellWidth,
                    cellHeight,
                } = coreConfigRef.current

                if (cached) {

                    messageRef.current = placeholderMessagesRef.current.retrieving

                    if (isMountedRef.current) {

                        // get cache data
                        portalMetadataRef.current = cacheAPI.getPortalMetadata(itemID)
                        // update cell and scroller properties ref in case of switch in either
                        portalMetadataRef.current.scrollerProperties.cellFramePropertiesRef = cellFramePropertiesRef
                        portalMetadataRef.current.scrollerProperties.scrollerPropertiesRef = scrollerPropertiesRef
                        // get OutPortal node
                        portalNodeRef.current = portalMetadataRef.current.portalNode
                        setContainerStyles(
                            portalNodeRef.current.element, layout, orientation, cellWidth, cellHeight)

                        setFrameState('retrieved')

                    }

                } else {

                    messageRef.current = placeholderMessagesRef.current.loading

                    // reserve space in the cache
                    cacheAPI.registerPendingPortal(index)

                    // enqueue the fetch
                    requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                        let returnvalue, usercontent, error
                        // process the fetch
                        try {

                            usercontent = await getItem(index, itemID)

                            if (usercontent === null) returnvalue = usercontent

                            if (usercontent === undefined) {

                                error = new Error(placeholderMessagesRef.current.undefined)

                            }

                        } catch(e) {

                            returnvalue = usercontent = undefined
                            error = e

                        }
                        // process the return value
                        if ((usercontent !== null) && (usercontent !== undefined)) {

                            const isValidElement = React.isValidElement(usercontent)
                            if (!isValidElement) {

                                returnvalue = usercontent
                                usercontent = undefined
                                error = new Error(placeholderMessagesRef.current.invalid)
                                
                            }

                        }

                        if (isMountedRef.current) {
                            // prepare the content
                            if ((usercontent !== null) && (usercontent !== undefined)) {

                                // if usercontent is otherwise disallowed, let error handling deal with it.
                                let content 
                                const scrollerProperties = {
                                    cellFramePropertiesRef,
                                    scrollerPropertiesRef,
                                }
                                if (usercontent.props?.hasOwnProperty('scrollerProperties')) {
                                    content = React.cloneElement(usercontent, 
                                        {
                                            scrollerProperties,
                                        }
                                    )
                                } else {
                                    content = usercontent
                                }

                                portalMetadataRef.current = await cacheAPI.createPortal(content, index, itemID, scrollerProperties)

                                portalNodeRef.current = portalMetadataRef.current.portalNode
                                setContainerStyles(
                                    portalNodeRef.current.element, layout, orientation, cellWidth, cellHeight)

                                isMountedRef.current && setFrameState('inserting')

                            } else { // null or undefined; handle non-component value

                                cacheAPI.unregisterPendingPortal(index) // create portal failed

                                if (usercontent === null) {

                                    // truncate listsize at this index
                                    itemExceptionCallback && 
                                        itemExceptionCallback(
                                            index, itemID, returnvalue, 'cellFrame', 
                                                new Error(placeholderMessagesRef.current.null)
                                        )
                                    nullItemSetMaxListsize(index)

                                } else { // usercontent === undefined, meaning an error has occurred

                                    // change placeholder message to error message
                                    errorRef.current = error
                                    // notify the host
                                    itemExceptionCallback && 
                                        itemExceptionCallback(
                                            index, itemID, returnvalue, 'cellFrame', error
                                        )

                                    isMountedRef.current && setFrameState('error')
                                }

                            }

                        }

                    },{timeout:IDLECALLBACK_TIMEOUT})

                }

                break
            }

            case 'inserting':
            case 'retrieved': {

                setFrameState('ready')

                break

            }

        }

    }, [frameState])

    // Note: the contentholder type layer is included to provide an anchor for the triggerlines.
    return <div 

        ref = { frameRef } 
        data-type = 'cellframe' 
        data-scrollerid = { scrollerID } 
        data-index = { index } 
        data-instanceid = { instanceID } 
        style = { stylesRef.current }

    >

        {(frameState != 'setup')?
            (<div data-type = 'contentholder' style = {holderStylesRef.current}> 
                {((frameState != 'ready')?
                placeholderRef.current:
                <OutPortal key = 'portal' node = { portalNodeRef.current }/>)}
            </div>):<div></div>}
        {(isTriggercell?
            triggercellTriggerlinesRef.current:
            null)
        }

    </div>

} // CellFrame
//(frameState != 'setup') && 
export default CellFrame

// utilities
const getFrameStyles = 
    (orientation, cellHeight, cellWidth, cellMinHeight, cellMinWidth, layout, styles) => {

    const styleset = {...styles,position:'relative', overflow:'visible'}

    if (orientation === 'vertical') {

        styleset.width = null
        if (layout == 'uniform') {

            styleset.height = cellHeight + 'px'
            styleset.minHeight = null
            styleset.maxHeight = null

        } else { // 'variable'

            styleset.height = null
            styleset.minHeight = cellMinHeight + 'px'
            styleset.maxHeight = cellHeight + 'px'

        }
        
    } else { // 'horizontal'

        styleset.height = null
        if (layout == 'uniform') {

            styleset.width = cellWidth + 'px'
            styleset.minWidth = null
            styleset.maxWidth = null

        } else { // 'variable'

            styleset.width = null
            styleset.minWidth = cellMinWidth + 'px'
            styleset.maxWidth = cellWidth + 'px'

        }

    }

    return styleset

}

const getContentHolderStyles = (layout,orientation,cellMinWidth, cellMinHeight ) => {
    let styles:React.CSSProperties = {}
    if (layout == 'uniform') {
        styles = {
            inset:'0px',
            position:'absolute',
            height:null,
            width:null,
            minWidth:null,
            minHeight:null,
        }
    } else { // variable
        styles.inset = null
        styles.position = null
        if (orientation == 'vertical') {
            styles.width = '100%'
            styles.height = null
            styles.minWidth = null
            styles.minHeight = cellMinHeight + 'px'
        } else {
            styles.width = null
            styles.height = '100%'
            styles.minWidth = cellMinWidth + 'px'
            styles.minHeight = null
        }
    }
    return styles
}

// see also some base styles set in cachehandler
const setContainerStyles = (container, layout, orientation, cellWidth, cellHeight) => {

    container.style.overflow = 'hidden'

    if (layout == 'uniform') {

        container.style.inset = '0px' 
        container.style.position = 'absolute'
        container.style.maxWidth = null
        container.style.maxHeight = null
        container.style.height = null
        container.style.width = null

    } else { // variable

        container.style.inset = null 
        container.style.position = null

        if (orientation == 'vertical') {

            container.style.width = '100%'
            container.style.height = null
            container.style.maxWidth = null
            container.style.maxHeight = cellHeight + 'px'

        } else {

            container.style.width = null
            container.style.height = '100%'
            container.style.maxWidth = cellWidth + 'px'
            container.style.maxHeight = null

        }

    }
}

