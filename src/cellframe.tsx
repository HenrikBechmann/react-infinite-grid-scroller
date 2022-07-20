// cellframe.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import { OutPortal } from 'react-reverse-portal'

import Placeholder from './cellframe/placeholder'

import { CradleContext } from './cradle'

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

    const { cacheHandler, cradlePassthroughPropertiesRef } = cradleContext
    
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)

    const [frameStatus, setFrameStatus] = useState('setup')
    const frameStatusRef = useRef(null)
    frameStatusRef.current = frameStatus

    const frameRef = useRef(null)

    const isMountedRef = useRef(true)

    const portalDataRef = useRef(null)

    const placeholderRef = useRef(null)

    const itemIDRef = useRef(null)
    itemIDRef.current = itemID

    // for unmount
    useEffect(()=>{

        return () => {
            isMountedRef.current = false
        }

    },[])

    useEffect(()=>{

        setFrameStatus('getusercontent')

    },[itemID])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

            return placeholder?
                React.createElement(placeholder, {index, listsize}):
                null
            
    },[index, placeholder,listsize])

    placeholderRef.current = useMemo(()=>{
        const placeholder = 
            customplaceholder?
                customplaceholder:
                <Placeholder index = {index} listsize = {listsize} error = {false}/>
        return placeholder
    }, [index, customplaceholder, listsize]);

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

    // initialize cell content
    useEffect(() => {

        // unmount
        return () => {

            cacheHandler.removeRequestedPortal(index)

            cancelidlecallback(requestIdleCallbackIdRef.current)

        }

    },[])


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

        switch (frameStatus) {
            case 'setup':
                // no-op
                break

            case 'inserting': {

                setFrameStatus('ready')

                break

            }
            case 'getusercontent': {

                const itemID = itemIDRef.current // cacheHandler.getItemID(index)
                const cached = cacheHandler.hasPortal(itemID)

                if (cached) {

                    portalDataRef.current = cacheHandler.getPortal(itemID)

                    portalNodeRef.current = portalDataRef.current.portalNode

                    portalDataRef.current.isReparentingRef.current = true

                    setFrameStatus('inserting')

                } else {

                    setFrameStatus('waiting')

                    cacheHandler.registerRequestedPortal(index)

                    // console.log('getting new index / itemID', index, itemID)

                    // TODO review implementation of async here
                    requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                        const usercontent = await getItem(index, itemID)

                        if (isMountedRef.current) {

                            if (usercontent) {

                                let content 
                                const scrollerData = {
                                    isReparentingRef:null,
                                    cradlePassthroughPropertiesRef,
                                }
                                if (usercontent.props.hasOwnProperty('scrollerData')) {
                                    content = React.cloneElement(usercontent, {scrollerData})
                                } else {
                                    content = usercontent
                                }

                                portalDataRef.current = 
                                    cacheHandler.createPortal(content, index, itemID)
                                portalNodeRef.current  = portalDataRef.current.portalNode
                                // make available to user content
                                scrollerData.isReparentingRef = portalDataRef.current.isReparentingRef

                            } else {

                                console.log('ERROR','no content item')

                            }

                        }

                        // console.log('loading portal item')
                        setFrameStatus('inserting')

                    },{timeout:IDLECALLBACK_FETCHTIMEOUT})

                }

                break
            }

            case 'waiting': {

                break

            }
        }

    }, [frameStatus])


    useEffect(()=>{

        switch (frameStatus) {

            case 'ready': { // no-op

                break
            }
        }

    }, [frameStatus])

    return <div 

        ref = { frameRef } 
        data-type = 'cellframe' 
        data-scrollerid = { scrollerID } 
        data-index = { index } 
        data-instanceid = { instanceID } 
        style = { styles }

    >

        { 
            (frameStatus != 'ready')?
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
