// cellshell.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useState, useCallback, useMemo, useContext } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import { OutPortal } from 'react-reverse-portal'

import Placeholder from './placeholder'

import { CradlePortalsContext } from './cradle'

const IDLECALLBACK_TIMEOUT = 1000

const CellShell = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    index, 
    observer, // intersection observer
    callbacks, 
    getItem, 
    listsize, 
    placeholder, 
    instanceID, 
    scrollerName,
    scrollerID,
}) => {

    const portalHandler = useContext(CradlePortalsContext)
    
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)

    const [cellStatus, setCellStatus] = useState('setup'); 

    // console.log('RUNNING cellshell cellStatus, index, scrollerID, instanceID',cellStatus, index, scrollerID, instanceID)

    const shellRef = useRef(null)
    // const instanceIDRef = useRef(instanceID)
    const isMountedRef = useRef(true)

    const portaldataRef = useRef(null)

    // console.log('RUNNING cellshell scrollerID, index, cellStatus', scrollerID, index, cellStatus)

    // for unmount
    useEffect(()=>{

        return () => {
            isMountedRef.current = false
            // console.log('UNsetting observer for index',index)
            observer.unobserve(observerElementRef.current)
        }

    },[])

    // ----------------- [ placeholder definition ] -------------------------

    const customplaceholder = useMemo(() => {

            return placeholder?React.createElement(placeholder, {index, listsize}):null
            
    },[placeholder,listsize])

    const placeholderRef = useRef(null)

    placeholderRef.current = useMemo(()=>{
        const placeholder = customplaceholder?
                customplaceholder:<Placeholder index = {index} listsize = {listsize} error = {false}/>
        return placeholder
    }, [index, customplaceholder, listsize]);

    // ---------------- [ end of placeholder definition ] ------------------------

    const requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
    const cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

    const requestIdleCallbackIdRef = useRef(null)

    // initialize cell content
    useEffect(() => {

        // console.log('CELLSHELL mounting index',index)

        portaldataRef.current = portalHandler.fetchOrCreatePortal(index, placeholderRef.current)

        const hasUserContent = !!portaldataRef.current.hasusercontent // previous InPortal creation for index

        const { reverseportal } = portaldataRef.current

        contentcomponentRef.current = <OutPortal node = {reverseportal}/>

        if (!hasUserContent) {

            setCellStatus('getusercontent')

        } else {

            portaldataRef.current.isReparenting = true
            if (isMountedRef.current) setCellStatus('ready')
            
        }        

        // unmount
        return () => {

            // console.log('CELLSHELL UNmounting index',index)
            cancelidlecallback(requestIdleCallbackIdRef.current)

        }

    },[])


    // cradle invariant ondemand callback parameter value
    const getElementData = useCallback(()=>{

        return [index, shellRef]
        
    },[])

    // initialize callbacks
    useEffect(() => {

        const localcalls = callbacks

        localcalls.setElementData && localcalls.setElementData(getElementData(),'register')

        return (()=>{

            localcalls.setElementData && localcalls.setElementData(getElementData(),'unregister')

        })

    },[callbacks])

    // ---------------------[ configure observer ]--------------------------
    
    const observerElementRef = useRef(null) // persistent observer element ref for unmount

    // const observersetRef = useRef(false)
    useEffect(()=>{

        // console.log('index, cellStatus', index, shellRef.current)

        // if ((!shellRef.current) || observersetRef.current) {
        //     return
        // }

        // console.log('setting observer for index',index)

        observer.observe(shellRef.current)
        observerElementRef.current = shellRef.current
        // observersetRef.current = true

    },[])//[observer, shellRef.current, cellStatus])

    // ---------------------[ end of configure observer ]-------------------------

    // set styles
    useEffect(()=>{

        let newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles)
        
        if (isMountedRef.current) {
            saveStyles(newStyles)
        }

    },[orientation,cellHeight,cellWidth]) 

    const contentcomponentRef = useRef(null)

    useEffect(() => {

        switch (cellStatus) {
            case 'setup':
                // no-op
                break
            case 'getusercontent': {
                requestIdleCallbackIdRef.current = requestidlecallback(async ()=>{
                    const usercontent = await getItem(index)

                    if (isMountedRef.current) {

                        if (usercontent) {

                            portaldataRef.current.hasusercontent = true
                            portaldataRef.current = portalHandler.updatePortal(index,usercontent)
                            const reverseportal = portaldataRef.current.reverseportal
                            portaldataRef.current.isReparenting = true
                            contentcomponentRef.current = <OutPortal node = {reverseportal}/>

                        } else {

                            console.log('ERROR','no content item')

                        }

                        setCellStatus('ready')

                    }

                },{timeout:IDLECALLBACK_TIMEOUT})
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

            { (cellStatus != 'setup') && contentcomponentRef.current }
            
        </div>

} // CellShell

const getShellStyles = (orientation, cellHeight, cellWidth, styles) => {

    let styleset = Object.assign({position:'relative'},styles)

    if (orientation == 'horizontal') {
        styleset.width = cellWidth?(cellWidth + 'px'):'auto'
        styleset.height = 'auto'

    } else if (orientation === 'vertical') {

        styleset.width = 'auto'
        styleset.height = cellHeight?(cellHeight + 'px'):'auto'
        
    }

    return styleset

}

export default CellShell
