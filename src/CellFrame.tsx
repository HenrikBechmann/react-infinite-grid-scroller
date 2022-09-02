// CellFrame.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of CellFrame is to fetch user content from the cache, or from the host (using getItem).
    While an item is being fetched, CellFrame presents a placeholder (either the default or an 
    imported custom version). If there is an error in fetching content then the placeholder is used
    to present the error to the user. If a new itemID is set by the parent (to synchromize with an altered
    cache), then CellFrame replaces the old item with the new item.

    getItem (which is a function provided by the host) can return one of several values:
        - a React component
        - a promise of a component
        - null
        - undefined
    if a promise is returned, then the promise returns a React component, null or undefined.

    If a valid react component is returned, then it is instantiated in the cache, and rendered in the
    CellFrame. If null is returned, then CellFrame sends a message to its parent that the host has 
    indicated the the item being fetched instead represents the end of the list, and the listsize should
    be adjusted accordingly. Any other value that is returned is treated as an error, and presented
    as such to the user through the placeholder component.

    getItem sends the index (logical position in the list) and session itemID to the host, so that
    the host can sync its own tracking with the scroller.
*/

import React, {
    useRef, 
    useEffect, 
    useLayoutEffect, 
    useState, 
    useCallback, 
    useMemo, 
    useContext 
} from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback' // polyfill if needed

import { OutPortal } from 'react-reverse-portal' // fetch from cache

import Placeholder from './cellframe/Placeholder' // default

import { CradleContext } from './Cradle'

const CellFrame = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    getItem, // function provided by host
    listsize, // for feedback in placeholder
    placeholder, // optionally provided by host
    itemID, // session itemID
    index, // logical position in infinite list
    instanceID, // CellFrame session ID
    scrollerID, // scroller ID (for debugging)
}) => {

    // ----------------------[ setup ]----------------------

    const cradleContext = useContext(CradleContext)

    const { 
        cacheHandler, 
        scrollerPassthroughPropertiesRef, // for the user content, if requested
        nullItemSetMaxListsize, // for internal notification of end-of-list
        itemExceptionsCallback, // or notification to host of error
        IDLECALLBACK_TIMEOUT, // to optimize requestIdleCallback
    } = cradleContext
    
    // style change generates state refresh
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    })

    // processing state
    const [frameState, setFrameState] = useState('setup')
    const frameStateRef = useRef(null)
    frameStateRef.current = frameState

    // DOM ref
    const frameRef = useRef(null)
    // to track unmount interrupt
    const isMountedRef = useRef(true)
    // cache data
    const portalDataRef = useRef(null)
    // the placeholder to use
    const placeholderRef = useRef(null)
    // the session itemID to use; could be updated by parent
    const itemIDRef = useRef(null)
    itemIDRef.current = itemID
    // fetch error
    const errorRef = useRef(false)
    // placeholder message
    const messageRef = useRef(null)

    // for unmount
    useEffect(()=>{

        return () => {

            isMountedRef.current = false

            cancelidlecallback(requestIdleCallbackIdRef.current)

            cacheHandler.removeRequestedPortal(index)

        }

    },[])

    // refresh content if itemID changes
    useEffect(()=>{

        if (isMountedRef.current) setFrameState('getusercontent')

    },[itemID])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

            return placeholder?
                React.createElement(placeholder, 
                    {index, listsize, message:messageRef.current, error:errorRef.current}):
                null
            
    },[index, placeholder,listsize, errorRef.current])

    placeholderRef.current = useMemo(()=>{

        const placeholder = 
            customplaceholder?
                customplaceholder:
                <Placeholder 
                    index = {index} 
                    listsize = {listsize} 
                    message = {messageRef.current}
                    error = {errorRef.current}
                />

        return placeholder

    }, [
        index, 
        customplaceholder, 
        listsize, 
        messageRef.current, 
        errorRef.current
    ])

    // ---------------- [ requestidlecallback config ] ------------------------

    const requestidlecallback = 
        window['requestIdleCallback']?
            window['requestIdleCallback']:
            requestIdleCallback

    const cancelidlecallback = 
        window['cancelIdleCallback']?
            window['cancelIdleCallback']:
            cancelIdleCallback

    const requestIdleCallbackIdRef = useRef(null)

    // --------------------[ processing ]-----------------

    // set styles
    useEffect(()=>{

        let newStyles = getFrameStyles(orientation, cellHeight, cellWidth, styles)
        
        if (isMountedRef.current) {
            saveStyles(newStyles)
        }

    },[orientation,cellHeight,cellWidth]) 

    const portalNodeRef = useRef(null)

    const isReparentingRef = useRef(false)

    useLayoutEffect(() => {

        switch (frameState) {
            case 'setup':
                // no-op
                break

            case 'inserting': {

                setFrameState('ready')

                break

            }
            case 'getusercontent': {

                const itemID = itemIDRef.current
                const cached = cacheHandler.hasPortal(itemID)

                if (cached) {

                    messageRef.current = '(retrieving from cache)'

                    if (isMountedRef.current) {
                        // get cache data
                        portalDataRef.current = cacheHandler.getPortal(itemID)
                        // get OutPortal node
                        portalNodeRef.current = portalDataRef.current.portalNode
                        // notify fetched component that reparenting is underway
                        portalDataRef.current.isReparentingRef.current = true

                        setFrameState('inserting')

                    }

                } else {

                    messageRef.current = '(loading...)'

                    setFrameState('waiting')

                    // reserve space in the cache
                    cacheHandler.registerRequestedPortal(index)
                    // enqueue the fetch
                    requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                        let returnvalue, usercontent, error
                        // process the fetch
                        try {

                            usercontent = await getItem(index, itemID)

                            if (usercontent === null) returnvalue = usercontent

                            if (usercontent === undefined) {

                                error = new Error('host returned "undefined"')

                            }

                        } catch(e) {

                            returnvalue = usercontent = undefined
                            error = e

                        }
                        // process the return value
                        if ((usercontent !== null) && (usercontent !== undefined)) {

                            if (!React.isValidElement(usercontent)) {

                                returnvalue = usercontent
                                usercontent = undefined
                                error = new Error('invalid React element')
                                
                            }

                        }

                        if (isMountedRef.current) {
                            // prepare the content
                            if ((usercontent !== null) && (usercontent !== undefined)) {

                                // if usercontent is otherwise disallowed, let error handling deal with it.
                                let content 
                                const scrollerProperties = {
                                    isReparentingRef:null,
                                    scrollerPassthroughPropertiesRef,
                                }
                                if (usercontent.props?.hasOwnProperty('scrollerProperties')) {
                                    content = React.cloneElement(usercontent, {scrollerProperties})
                                } else {
                                    content = usercontent
                                }

                                portalDataRef.current = 
                                    cacheHandler.createPortal(content, index, itemID)
                                portalNodeRef.current  = portalDataRef.current.portalNode
                                // make available to user content
                                scrollerProperties.isReparentingRef = portalDataRef.current.isReparentingRef

                                setFrameState('inserting')

                            } else { // null or undefined; handle non-component value

                                if (usercontent === null) {

                                    // truncate listsize at this index
                                    itemExceptionsCallback && 
                                        itemExceptionsCallback(
                                            index, itemID, returnvalue, 'cellFrame', new Error('end of list')
                                        )
                                    nullItemSetMaxListsize(index)

                                } else { // usercontent === undefined, meaning an error has occurred

                                    // change placeholder message to error message
                                    errorRef.current = error
                                    // notify the host
                                    itemExceptionsCallback && 
                                        itemExceptionsCallback(
                                            index, itemID, returnvalue, 'cellFrame', error
                                        )

                                    setFrameState('error')
                                }

                            }

                        }

                    },{timeout:IDLECALLBACK_TIMEOUT})

                }

                break
            }

            case 'waiting': {

                break

            }
        }

    }, [frameState])


    useEffect(()=>{

        switch (frameState) {

            case 'ready': { // no-op

                break
            }
        }

    }, [frameState])

    return <div 

        ref = { frameRef } 
        data-type = 'cellframe' 
        data-scrollerid = { scrollerID } 
        data-index = { index } 
        data-instanceid = { instanceID } 
        style = { styles }

    >

        { 
            (frameState != 'ready')?
                placeholderRef.current:
                <OutPortal node = { portalNodeRef.current }/>
        }
        
    </div>

} // CellFrame

// utility
const getFrameStyles = (orientation, cellHeight, cellWidth, styles) => {

    let styleset = {...styles,position:'relative'}

    if (orientation == 'horizontal') {
        styleset.width = cellWidth + 'px'
            // cellWidth?
            //     (cellWidth + 'px'):
            //     'auto'
        styleset.height = 'auto'

    } else if (orientation === 'vertical') {

        styleset.width = 'auto'
        styleset.height = cellHeight + 'px'
            // cellHeight?
            //     (cellHeight + 'px'):
            //     'auto'
        
    }

    return styleset

}

export default CellFrame
