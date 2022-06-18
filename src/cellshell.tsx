// cellshell.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import { OutPortal } from 'react-reverse-portal'

import Placeholder from './placeholder'

import { CradleCacheContext } from './cradle'

const IDLECALLBACK_TIMEOUT = 8000 // TODO experimentally high!!

const CellShell = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    index, 
    // callbacks, 
    getItem, 
    listsize, 
    placeholder, 
    instanceID, 
    scrollerName,
    scrollerID,
}) => {

    const cacheHandler = useContext(CradleCacheContext)
    
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)

    const [cellStatus, setCellStatus] = useState('setup'); 

    console.log('cell instanceID, cellStatus', instanceID, cellStatus)

    const shellRef = useRef(null)

    const isMountedRef = useRef(true)

    const portaldataRef = useRef(null)

    // for unmount
    useEffect(()=>{

        return () => {
            isMountedRef.current = false
        }

    },[])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

            return placeholder?
                React.createElement(placeholder, {index, listsize}):
                null
            
    },[placeholder,listsize])

    const placeholderRef = useRef(null)

    placeholderRef.current = useMemo(()=>{
        const placeholder = 
            customplaceholder?
                customplaceholder:
                <Placeholder index = {index} listsize = {listsize} error = {false}/>
        return placeholder
    }, [index, customplaceholder, listsize]);

    // ---------------- [ end of placeholder definition ] ------------------------

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

        // portaldataRef.current = cacheHandler.fetchOrCreatePortal(index, placeholderRef.current)

        // const hasUserContent = !!portaldataRef.current.hasusercontent // previous InPortal creation for index

        // const { reverseportal } = portaldataRef.current

        // contentPortalRef.current = <OutPortal node = {reverseportal}/>

        contentRef.current = placeholderRef.current

        // if (!hasUserContent) {

            setCellStatus('getusercontent')

        // } else {

            // portaldataRef.current.isReparenting = true
            // if (isMountedRef.current) setCellStatus('ready')
            
        // }        

        // unmount
        return () => {

            cancelidlecallback(requestIdleCallbackIdRef.current)

        }

    },[])


    // cradle invariant ondemand callback parameter value
    const getElementData = useCallback(()=>{

        return [index, shellRef]
        
    },[])

    // ---------------------[ end of configure observer ]-------------------------

    // set styles
    useEffect(()=>{

        let newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles)
        
        if (isMountedRef.current) {
            saveStyles(newStyles)
        }

    },[orientation,cellHeight,cellWidth]) 

    // const contentPortalRef = useRef(null)
    const contentRef = useRef(null)

    useEffect(() => {

        switch (cellStatus) {
            case 'setup':
                // no-op
                break
            case 'getusercontent': {
                requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                    portaldataRef.current = cacheHandler.fetchPortal(index, placeholderRef.current)

                    const { reverseportal } = portaldataRef.current

                    const hasUserContent = !!portaldataRef.current.hasusercontent // previous InPortal creation for index

                    if (hasUserContent) {

                        console.log('fetching portal')

                        contentRef.current = <OutPortal node = {reverseportal}/>

                        portaldataRef.current.isReparenting = true

                    } else {

                        console.log('fetching new content')

                        const usercontent = await getItem(index)

                        if (isMountedRef.current) {

                            if (usercontent) {

                                portaldataRef.current.hasusercontent = true
                                portaldataRef.current = cacheHandler.updatePortal(index,usercontent)

                                // const reverseportal = portaldataRef.current.reverseportal
                                portaldataRef.current.isReparenting = true
                                contentRef.current = <OutPortal node = {reverseportal}/>

                            } else {

                                console.log('ERROR','no content item')

                            }

                        }

                    }

                    setCellStatus('ready')

                    // portaldataRef.current.isReparenting = true

                },{timeout:IDLECALLBACK_TIMEOUT})

                setCellStatus('waiting')

                break
            }

        }

    }, [cellStatus])


    useEffect(()=>{

        switch (cellStatus) {

            case 'waiting': {
                break
            }
            case 'ready': {
                break
            }
        }

    }, [cellStatus])

    return <div ref = { shellRef } 
        data-type = 'cellshell' 
        data-scrollerid = {scrollerID} 
        data-index = {index} 
        data-instanceid = {instanceID} 
        style = {styles}>

            { (cellStatus != 'setup') && contentRef.current }
            
        </div>

} // CellShell

const getShellStyles = (orientation, cellHeight, cellWidth, styles) => {

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

export default CellShell
