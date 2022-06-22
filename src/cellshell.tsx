// cellshell.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

// import { OutPortal } from 'react-reverse-portal'

import Placeholder from './placeholder'

import { CradleCacheContext } from './cradle'

const IDLECALLBACK_FETCHTIMEOUT = 8000 // TODO experimentally high!!
const IDLECALLBACK_CACHETIMEOUT = 1000

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

    // console.log('cell instanceID, cellStatus', instanceID, cellStatus)

    const shellRef = useRef(null)

    const isMountedRef = useRef(true)

    const portaldataRef = useRef(null)

    const placeholderRef = useRef(null)

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

        contentRef.current = placeholderRef.current

        setCellStatus('getusercontent')

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

    useLayoutEffect(() => {

        switch (cellStatus) {
            case 'setup':
                // no-op
                break
            case 'inserting': {
                setCellStatus('ready')
                break
            }
            case 'getusercontent': {
                // const dimensions = shellRef.current?.getBoundingClientRect()
                // console.log('cellShell dimensions',dimensions)
                const cached = cacheHandler.hasPortal(index)

                if (cached) {

                    // console.log('fetching portal for scrollerID, instanceID, index', 
                    //     scrollerID, instanceID, index)

                    portaldataRef.current = cacheHandler.getPortal(index)

                    const portalRecord = portaldataRef.current.contentenvelope

                    portaldataRef.current.isReparenting = true

                    shellRef.current.append(portalRecord)

                    setCellStatus('inserting')

                } else {

                    setCellStatus('waiting')

                    requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{

                        const usercontent = await getItem(index)

                        if (isMountedRef.current) {

                            if (usercontent) {

                                portaldataRef.current = cacheHandler.fetchPortal(index, usercontent, cellWidth, cellHeight)

                                const portalRecord  = portaldataRef.current.contentenvelope

                                // console.log('FETCHED portalRecord in cellShell', portalRecord, portaldataRef)

                                contentRef.current = portalRecord// <OutPortal node = {portalRecord}/>

                                shellRef.current.append(portalRecord)

                            } else {

                                console.log('ERROR','no content item')

                            }

                        }

                        setCellStatus('inserting')

                    },{timeout:IDLECALLBACK_FETCHTIMEOUT})

                }

                // console.log('contentRef.current',contentRef.current)

                break
            }

            case 'waiting': {

                break

            }
        }

    }, [cellStatus])


    useEffect(()=>{

        switch (cellStatus) {

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

            {(cellStatus == 'waiting' || cellStatus == 'inserting') && placeholderRef.current}
            
        </div>

} // CellShell

            // { (cellStatus != 'setup') && contentRef.current }

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
