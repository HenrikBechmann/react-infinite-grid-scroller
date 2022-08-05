// cellframe.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import { OutPortal } from 'react-reverse-portal'

import Placeholder from './cellframe/Placeholder'

import { CradleContext } from './Cradle'

const IDLECALLBACK_FETCHTIMEOUT = 4000 // TODO make cofigurable

const CellFrame = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    getItem, 
    listsize, 
    placeholder,
    itemID, 
    index, 
    instanceID, 
    scrollerID,
}) => {

    const cradleContext = useContext(CradleContext)

    const { cacheHandler, scrollerPassthroughPropertiesRef, setMaxListsize, itemExceptionsCallback } = cradleContext
    
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)

    const [frameState, setFrameState] = useState('setup')
    const frameStateRef = useRef(null)
    frameStateRef.current = frameState

    const frameRef = useRef(null)

    const isMountedRef = useRef(true)

    const portalDataRef = useRef(null)

    const placeholderRef = useRef(null)

    const itemIDRef = useRef(null)
    itemIDRef.current = itemID

    const errorRef = useRef(false)

    // for unmount
    useEffect(()=>{

        return () => {

            isMountedRef.current = false

            cancelidlecallback(requestIdleCallbackIdRef.current)

            cacheHandler.removeRequestedPortal(index)

        }

    },[])

    useEffect(()=>{

        setFrameState('getusercontent')

    },[itemID])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

            return placeholder?
                React.createElement(placeholder, {index, listsize, error:errorRef.current}):
                null
            
    },[index, placeholder,listsize, errorRef.current])

    placeholderRef.current = useMemo(()=>{
        // console.log('refreshing placeholder for index, listsize, customplaceholder', index, listsize, customplaceholder)
        const placeholder = 
            customplaceholder?
                customplaceholder:
                <Placeholder index = {index} listsize = {listsize} error = {errorRef.current}/>
        return placeholder
    }, [index, customplaceholder, listsize, errorRef.current]);

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

    // cradle invariant ondemand callback parameter value
    const getElementData = useCallback(()=>{

        return [index, frameRef]
        
    },[])

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

                const itemID = itemIDRef.current // cacheHandler.getItemID(index)
                const cached = cacheHandler.hasPortal(itemID)

                if (cached) {

                    portalDataRef.current = cacheHandler.getPortal(itemID)

                    portalNodeRef.current = portalDataRef.current.portalNode

                    portalDataRef.current.isReparentingRef.current = true

                    setFrameState('inserting')

                } else {

                    setFrameState('waiting')

                    cacheHandler.registerRequestedPortal(index)

                    requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                        let returnvalue, usercontent, error

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

                        if ((usercontent !== null) && (usercontent !== undefined)) {

                            if (!React.isValidElement(usercontent)) {
                                returnvalue = usercontent
                                usercontent = undefined
                                error = new Error('invalid React element')
                            }

                        }

                        // console.log('index, usercontent', index, usercontent)

                        if (isMountedRef.current) {

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

                            } else { // null or undefined

                                // console.log('processing no-component index',index, usercontent)
                                if (usercontent === null) {
                                    // truncate listsize at this index
                                    // console.log('cellFrame calling setMaxListsize with index', index)
                                    itemExceptionsCallback && 
                                        itemExceptionsCallback(
                                            index, itemID, returnvalue, 'cellFrame', new Error('end of list')
                                        )
                                    setMaxListsize(index)
                                } else { // usercontent === undefined, meaning an error has occurred
                                    // change placeholder message to error message
                                    // console.log('updating placeholder with error', error)
                                    errorRef.current = error
                                    itemExceptionsCallback && 
                                        itemExceptionsCallback(
                                            index, itemID, returnvalue, 'cellFrame', error
                                        )

                                    setFrameState('error')
                                }

                            }

                        }

                    },{timeout:IDLECALLBACK_FETCHTIMEOUT})

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

const getFrameStyles = (orientation, cellHeight, cellWidth, styles) => {

    let styleset = Object.assign({position:'relative'},styles)

    if (orientation == 'horizontal') {
        styleset.width = 
            cellWidth?
                (cellWidth + 'px'):
                'auto'
        styleset.height = 'auto'

    } else if (orientation === 'vertical') {

        styleset.width = 'auto'
        styleset.height = 
            cellHeight?
                (cellHeight + 'px'):
                'auto'
        
    }

    return styleset

}

export default CellFrame
