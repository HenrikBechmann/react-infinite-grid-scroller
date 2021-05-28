// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import ReactDOM from 'react-dom'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import useIsMounted from 'react-is-mounted-hook'

import Placeholder from './placeholder'

import { PortalContext } from './portalmanager'

const ItemShell = ({
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
    
    const portalManager = useContext(PortalContext)
    // const linkedContentRef = useRef(false)
    // const portalRef = useRef(null)
    const [error, saveError] = useState(null)
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    // const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef(undefined)
    const instanceIDRef = useRef(instanceID)
    const isMounted = useIsMounted()
    const itemrequestRef = useRef(null)
    const [portalStatus, setPortalStatus] = useState('pending')

    // console.log('index itemstate', index, itemstate)
    // initialize
    useLayoutEffect(() => {
        // console.log('fetching item scrollerName-scrollerID:index',scrollerName,'-', scrollerID, index)

        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        if (portalManager.hasPortalListItem(scrollerID,index)) {

            // console.log('fetching PORTAL CACHE item', scrollerID, index)

            let portalitem = portalManager.getPortalListItem(scrollerID,index) 

            // console.log('saving cache usercontent',portalitem)
            setPortalStatus('available')

            // saveContent(portalitem.usercontent)
            return
        } else {
        if (getItem) {

            // console.log('fetching NEW item (queue)')

            itemrequestRef.current = requestidlecallback(()=> {
                let contentItem = getItem(index)
                // console.log('result of getItem(index)',contentItem)
                if (contentItem && contentItem.then) {
                    contentItem.then((usercontent) => {
                        // if (isMounted()) { 
                            // console.log('saving new usercontent by promise',scrollerName, scrollerID, index, usercontent)
                            setPortalStatus('available')
                            portalManager.createPortalListItem(scrollerID,index,usercontent)
                            saveError(null)
                        // }
                    }).catch((e) => {
                        // if (isMounted()) { 
                            // saveContent(null)
                            saveError(e)
                        // }
                    })
                } else {
                    // console.log('isMounted, contentItem',isMounted(), contentItem)
                    // if (isMounted()) {
                        if (contentItem) {
                            let usercontent = contentItem
                            // console.log('saving new usercontent',scrollerName, scrollerID, index, usercontent)
                            setPortalStatus('available')
                            portalManager.createPortalListItem(scrollerID,index,usercontent)
                            saveError(null)
                        } else {
                            saveError(true)
                            // saveContent(null)
                        }
                    // }
                }
            },{timeout:50})
        }}

        return () => {
            let requesthandle = itemrequestRef.current
            cancelidlecallback(requesthandle)
        }
    },[])

    // useEffect(()=>{
    //     if (itemstate == 'setup') {
    //         setItemstate('ready')
    //     }

    // },[itemstate])

    // initialize
    useEffect(() => {

        let localcalls = callbacks

        localcalls.getElementData && localcalls.getElementData(getElementData(),'register')

        return (()=>{

            localcalls.getElementData && localcalls.getElementData(getElementData(),'unregister')

        })

    },[callbacks])

    let shellelement

    useEffect(()=>{

        if (!shellRef.current) return
        // console.log('shellRef.current',shellRef.current)
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

    const doattach = useCallback(() => {
        if (!shellRef.current) return
        if (portalStatus == 'attached') return
        // console.log('linking scrollerName, scrollerID, index, shellRef.current, content; ',scrollerName, scrollerID, index, shellRef.current,content)
        if (portalStatus == 'available') {
            // console.log('attaching scrollerID, index', scrollerID, index)
            setTimeout(() => {
                portalManager.attachPortalListItem(scrollerID,index,shellRef.current)
                // console.log('setting hasportal true for scrollerID, index', scrollerID, index)
                setPortalStatus('attached')
            })

            // return () => {
            //     portalManager.detachPortalListItem(scrollerID,index)
            // }

        }
    },[shellRef.current, portalStatus])

    doattach()

    const placeholderchild = useMemo(()=>{
        let child = customplaceholderRef.current?
                customplaceholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {error}/>
        return child
    }, [index, customplaceholderRef.current, listsize, error])

    return <div ref = { shellRef } data-index = {index} data-instanceid = {instanceID} style = {styles}>
            { (!(portalStatus == 'attached')) && placeholderchild }
    </div>

} // ItemShell

// TODO: memoize this
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

export default ItemShell
