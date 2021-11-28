// cellshell.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

/*
    Consider not using requestIdleCallback; try it.
*/

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import { OutPortal } from 'react-reverse-portal'

import Placeholder from './placeholder'

import { portalManager } from './portalmanager'

const CellShell = ({
    orientation, 
    cellHeight, 
    cellWidth, 
    index, 
    observer, 
    callbacks, 
    getItem, 
    listsize, 
    placeholder, 
    instanceID, 
    scrollerName,
    scrollerID,
}) => {
    
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    // const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef(null)
    const instanceIDRef = useRef(instanceID)
    const isMounted = useRef(true)
    const callbackrequestRef = useRef(null)
    const portalDataRef = useRef(null)
    const [cellStatus, setCellStatus] = useState('setup'); // 'setup' -> 'renderplaceholder' -> 'render'

    // console.log('RUNNING cellshell scrollerID, instanceID, index, cellStatus', scrollerID, instanceID, index, cellStatus)

    // for unmount
    useLayoutEffect(()=>{

        return () => {isMounted.current = false}

    },[])

    // initialize
    useEffect(() => {

        const requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        const cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        portalDataRef.current = portalManager.fetchOrCreatePortal(scrollerID, index, placeholderRef.current)

        const hasUserContent = !!portalDataRef.current.hasusercontent

        if (!hasUserContent) {

            setCellStatus('renderplaceholder')

            if (isMounted.current && getItem) {

                callbackrequestRef.current = requestidlecallback(()=> { // TODO make this optional
                    const contentItem = getItem(index)

                    if (contentItem && contentItem.then) { // it's a promise

                        contentItem.then((usercontent) => {
                            if (isMounted.current) { 

                                portalDataRef.current.hasusercontent = true
                                portalDataRef.current = portalManager.updatePortal(scrollerID,index,usercontent)
                                setCellStatus('render')

                            }

                        }).catch((e) => {

                            console.log('ERROR',e)

                        })

                    } else {

                        if (isMounted.current) {

                            if (contentItem) {
                                const usercontent = contentItem;
                                portalDataRef.current.hasusercontent = true
                                // (scrollerID == 0) && console.log('saving new usercontent',scrollerName, scrollerID, index, usercontent)
                                portalDataRef.current = portalManager.updatePortal(scrollerID,index,usercontent)
                                setCellStatus('render')
                                // saveError(null)

                            } else {

                                console.log('ERROR','no content item')

                            }
                        }

                    }
                },{timeout:250})
        
            }         
        } else {
        
            setCellStatus('render')
    
        }        

        // cleanup
        return () => {

            const callbackhandle = callbackrequestRef.current
            cancelidlecallback(callbackhandle)

        }
    },[])


    // initialize
    useEffect(() => {

        const localcalls = callbacks

        localcalls.setElementData && localcalls.setElementData(getElementData(),'register')

        return (()=>{

            localcalls.setElementData && localcalls.setElementData(getElementData(),'unregister')

        })

    },[callbacks])

    const observerelementRef = useRef(null) // invariant observer ref

    useEffect(()=>{

        if (!shellRef.current) return

        observer.observe(shellRef.current)
        observerelementRef.current = shellRef.current

        return () => {

            observer.unobserve(observerelementRef.current)

        }

    },[observer, shellRef.current])

    useEffect(()=>{

        let newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles)
        if (isMounted.current) {
            saveStyles(newStyles)
        }

    },[orientation,cellHeight,cellWidth])

    // cradle invariant ondemand callback parameter value
    const getElementData = useCallback(()=>{
        return [index, shellRef]
    },[])

    // placeholder handling
    const customplaceholderRef = useRef(null)

    customplaceholderRef.current = useMemo(() => {

            placeholder?React.createElement(placeholder, {index, listsize}):null
            
    },[placeholder,listsize])

    const placeholderchild = useMemo(()=>{
        let child = customplaceholderRef.current?
                customplaceholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {false}/>
        return child
    }, [index, customplaceholderRef.current, listsize]);

    const placeholderRef = useRef(placeholderchild)

    const portalchildRef = useRef(null) //placeholderchild)

    const reverseportal = useMemo(()=>{

        if (cellStatus == 'setup') return null

        return portalDataRef.current.reverseportal

    }, [cellStatus]);

    return <div ref = { shellRef } data-type = 'cellshell' data-scrollerid = {scrollerID} data-index = {index} data-instanceid = {instanceID} style = {styles}>
            { ((cellStatus == 'render') || (cellStatus == 'renderplaceholder')) && <OutPortal node = {reverseportal}/> }
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
