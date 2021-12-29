// cellshell.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    Consider not using requestIdleCallback; try it.
*/

import React, {useRef, useEffect, useState, useCallback, useMemo, useContext } from 'react'

// import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import { OutPortal } from 'react-reverse-portal'

import Placeholder from './placeholder'

import { CradleContext } from './cradle'

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

    const cradleDataRef = useContext(CradleContext)
    const portalManager = cradleDataRef.current.portalManager
    // const isreparentedRef = useRef(false)
    
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    // 'setup' -> 'renderplaceholder' -> 'rendercontent' -> 'ready'
    const [cellStatus, setCellStatus] = useState('setup'); 

    // console.log('RUNNING cellshell cellStatus, index, scrollerID, instanceID',cellStatus, index, scrollerID, instanceID)

    const shellRef = useRef(null)
    const instanceIDRef = useRef(instanceID)
    const isMountedRef = useRef(true)
    // const callbackrequestRef = useRef(null)
    const portaldataRef = useRef(null)

    // console.log('RUNNING cellshell scrollerID, index, cellStatus', scrollerID, index, cellStatus)

    // for unmount
    useEffect(()=>{

        return () => {isMountedRef.current = false}

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

    // initialize cell content
    useEffect(() => {

        // const requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        // const cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        portaldataRef.current = portalManager.fetchOrCreatePortal(index, placeholderRef.current)

        const hasUserContent = !!portaldataRef.current.hasusercontent // previous InPortal creation for index

        const reverseportal = portaldataRef.current.reverseportal

        contentcomponentRef.current = <OutPortal node = {reverseportal}/>

        if (!hasUserContent) {

            setCellStatus('getusercontent')

        } else {

            portaldataRef.current.isReparenting = true
            if (isMountedRef.current) setCellStatus('ready')

            // if (isMountedRef.current && getItem) {

                // callbackrequestRef.current = requestidlecallback(()=> {

                    // const contentItem = getItem(index)

                    // if (contentItem && contentItem.then) { // it's a promise

                    //     contentItem.then((usercontent) => {
                    //         if (isMountedRef.current) { 

                    //             portaldataRef.current.hasusercontent = true
                    //             portaldataRef.current = portalManager.updatePortal(index,usercontent)
                    //             setCellStatus('rendercontent')

                    //         }

                    //     }).catch((e) => {

                    //         console.log('ERROR',e)

                    //     })

                    // } else {

                        // if (isMountedRef.current) {

                        //     if (contentItem) {
                        //         const usercontent = contentItem

                        //         portaldataRef.current.hasusercontent = true
                        //         portaldataRef.current = portalManager.updatePortal(index,usercontent)
                        //         setCellStatus('rendercontent')

                        //     } else {

                        //         console.log('ERROR','no content item')

                        //     }
                        // }

                    // }
                // },{timeout:250})
        
            // }         
            
        }        

        // unmount
        // return () => {

        //     const callbackhandle = callbackrequestRef.current
        //     cancelidlecallback(callbackhandle)

        // }
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

    useEffect(()=>{

        if (!shellRef.current) return

        observer.observe(shellRef.current)
        observerElementRef.current = shellRef.current

        return () => {

            observer.unobserve(observerElementRef.current)

        }

    },[observer, shellRef.current])

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
                const usercontent = getItem(index)

                if (isMountedRef.current) {

                    if (usercontent) {

                        portaldataRef.current.hasusercontent = true
                        portaldataRef.current = portalManager.updatePortal(index,usercontent)
                        const reverseportal = portaldataRef.current.reverseportal
                        portaldataRef.current.isReparenting = true
                        contentcomponentRef.current = <OutPortal node = {reverseportal}/>

                        setCellStatus('ready')

                    } else {

                        console.log('ERROR','no content item')

                    }
                }

                setCellStatus('ready')

                break
            }
            // case 'rendercontent': {

            //         const reverseportal = portaldataRef.current.reverseportal

            //         contentcomponentRef.current = <OutPortal node = {reverseportal}/>

            //         setCellStatus('ready')
            //     break
            // }
            case 'ready': {
                break
            }
        }

    }, [cellStatus])

    return <div ref = { shellRef } data-type = 'cellshell' data-scrollerid = {scrollerID} data-index = {index} data-instanceid = {instanceID} style = {styles}>
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
