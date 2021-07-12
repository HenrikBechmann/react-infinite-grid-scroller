// cellshell.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import ReactDOM from 'react-dom'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import useIsMounted from 'react-is-mounted-hook'

import { OutPortal } from 'react-reverse-portal'

import Placeholder from './placeholder'

import { portalManager as portalAgentInstance } from './portalmanager'

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
    
    // console.log('running cellshell with scrollerID',scrollerID)

    const portalManager = portalAgentInstance // useContext(PortalAgent)
    const [error, saveError] = useState(null)
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    // const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef()
    const instanceIDRef = useRef(instanceID)
    const isMounted = useIsMounted()
    const itemrequestRef = useRef(null)
    const portalRecord = useRef(null)
    const [portalStatus, setPortalStatus] = useState('setup'); // 'setup' -> 'render'
    // (scrollerID == 3) && console.log('RUNNING cellshell scrollerID, portalStatus', scrollerID, portalStatus)

    // initialize
    useEffect(() => {

        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        portalRecord.current = portalManager.createPortalListItem(scrollerID,index,null, placeholderchildRef.current)

        // console.log('cellshell scrollerID, index, instanceID, portalRecord.current',scrollerID, index, instanceID, portalRecord.current)

        setPortalStatus('render')

        let hasUserContent = portalManager.hasPortalUserContent(scrollerID,index)

        // console.log('cellshell hasUserContent',index,hasUserContent)

        if (!hasUserContent) {

            // console.log('cellshell getItem',index)

            if (isMounted() && getItem) {

                itemrequestRef.current = requestidlecallback(()=> { // TODO make this optional
                    let contentItem = getItem(index)

                    if (contentItem && contentItem.then) {
                        contentItem.then((usercontent) => {
                            if (isMounted()) { 
                                // console.log('saving new usercontent by promise',scrollerName, scrollerID, index, usercontent)
                                portalManager.updatePortalListItem(scrollerID,index,usercontent)
                                saveError(null)
                            }
                        }).catch((e) => {
                            if (isMounted()) { 
                                saveError(e)
                            }
                        })
                    } else {
                        // console.log('isMounted, contentItem',isMounted(), contentItem)
                        if (isMounted()) {
                            if (contentItem) {
                                let usercontent = contentItem;
                                // (scrollerID == 0) && console.log('saving new usercontent',scrollerName, scrollerID, index, usercontent)
                                portalManager.updatePortalListItem(scrollerID,index,usercontent)
                                saveError(null)
                            } else {
                                saveError(true)
                            }
                        }
                    }
                },{timeout:250})
            }
        }

        // cleanup
        return () => {
            let requesthandle = itemrequestRef.current
            cancelidlecallback(requesthandle)
        }
    },[])


    // initialize
    useEffect(() => {

        let localcalls = callbacks

        localcalls.setElementData && localcalls.setElementData(getElementData(),'register')

        return (()=>{

            localcalls.setElementData && localcalls.setElementData(getElementData(),'unregister')

        })

    },[callbacks])

    let shellelement

    useEffect(()=>{

        if (!shellRef.current) return

        observer.observe(shellRef.current)
        shellelement = shellRef.current

        return () => {

            observer.unobserve(shellelement)

        }

    },[observer, shellRef.current])

    useEffect(()=>{

        let newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles)
        if (isMounted()) {
            saveStyles(newStyles)
        }

    },[orientation,cellHeight,cellWidth])

    // cradle ondemand callback parameter value
    const getElementData = useCallback(()=>{
        return [index, shellRef]
    },[])

    // placeholder handling
    const customplaceholderRef = useRef(
            placeholder?React.createElement(placeholder, {index, listsize}):null
    )

    const placeholderchild = useMemo(()=>{
        let child = customplaceholderRef.current?
                customplaceholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {error}/>
        return child
    }, [index, customplaceholderRef.current, listsize, error]);

    const placeholderchildRef = useRef(placeholderchild)

    const portalchildRef = useRef(placeholderchild)
    const usingPlaceholder = useRef(true)

    portalchildRef.current = useMemo(()=>{

        if (portalStatus != 'render') return portalchildRef.current
        if (!usingPlaceholder.current) return portalchildRef.current
        let portallistitem = portalRecord.current
        portallistitem.reparenting = true
        let reverseportal = portallistitem.reverseportal
        usingPlaceholder.current = false
        // setPortalStatus('reparenting')
        // setTimeout(() => {
        //     let container = portallistitem.container
        //     // container.style.display = 'none'
        //     // container.style.offsetWidth
        //     container.style.display = 'block'
        // },200)

        return <OutPortal node = {reverseportal} />

    }, [portalStatus]);

    // useEffect(()=>{
    //     if (portalStatus == 'reparenting') {
    //         let portallistitem = portalRecord.current
    //         portallistitem.container.style.display = 'block'
    //         setPortalStatus('render')
    //     }
    // },[portalStatus])

    useEffect(()=> {
        if (portalRecord.current?.reparenting) {
            setTimeout(()=>{
                if (!isMounted()) return
                portalRecord.current.reparenting = false
            })
        }
    }, [portalRecord.current?.reparenting])

    // useLayoutEffect(()=> {

    //     if (portalStatus == 'reparenting') {
    //         setPortalStatus('reparentingdone')
    //     }

    // },[portalStatus])

    // useEffect(()=>{
    //     if (portalStatus == 'reparentingdone') {
    //         setPortalStatus('render')
    //     }
    // })

    return <div ref = { shellRef } data-type = 'cellshell' data-scrollerid = {scrollerID} data-index = {index} data-instanceid = {instanceID} style = {styles}>
            { (portalStatus == 'render') && portalchildRef.current }
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
