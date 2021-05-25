// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useState, useCallback, useMemo, useContext } from 'react'

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
    const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef(undefined)
    const instanceIDRef = useRef(instanceID)
    let isMounted = useIsMounted()
    const itemrequestRef = useRef(null)
    const [content, saveContent] = useState(null)
    const [portal, savePortal] = useState(null)

    // console.log('index itemstate', index, itemstate)
    // initialize
    useEffect(() => {
        console.log('fetching item scrollerName-scrollerID:index',scrollerName,'-', scrollerID, index)

        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        if (portalManager.hasPortalListItem(scrollerID,index)) {

            console.log('fetching PORTAL CACHE item')

            let contentitem = portalManager.getPortalListItem(scrollerID,index) 

            console.log('saving cache contentitem',contentitem)

            saveContent(contentitem.content)
            return
        } else {
        if (getItem) {
            console.log('fetching NEW item (queue)')
            itemrequestRef.current = requestidlecallback(()=> {
                // isMounted = useIsMounted()
                let contentItem = getItem(index)
                if (contentItem && contentItem.then) {
                    contentItem.then((content) => {
                        if (isMounted()) { 
                            console.log('saving new contentitem promise',scrollerName, scrollerID, index, content)
                            saveContent(content)
                            portalManager.createPortalListItem(scrollerID,index,content)
                            saveError(null)
                        }
                    }).catch((e) => {
                        if (isMounted()) { 
                            saveContent(null)
                            saveError(e)
                        }
                    })
                } else {
                    if (isMounted()) {
                        if (contentItem) {
                            console.log('saving new contentitem',scrollerName, scrollerID, index, contentItem)
                            saveContent(contentItem)
                            portalManager.createPortalListItem(scrollerID,index,contentItem)
                            saveError(null)
                        } else {
                            saveError(true)
                            saveContent(null)
                        }
                    }
                }
            },{timeout:50})
        }}

        return () => {
            let requesthandle = itemrequestRef.current
            cancelidlecallback(requesthandle)
        }
    },[])

    useEffect(()=>{
        if (itemstate == 'setup') {
            setItemstate('ready')
        }

    },[itemstate])

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

        // if (!shellRef.current) return
        // console.log('shellRef.current',shellRef.current)
        observer.observe(shellRef.current)
        shellelement = shellRef.current

        return () => {

            // console.log('unobserving',shellRef.current)
            // if (!shellRef.current) return // TODO: memory leak?
            // console.log('unobserve',shellRef.current)
            // observer.unobserve(shellRef.current)

            // console.log('unobserving',shellelement)
            // if (!shellelement) return // TODO: memory leak?
            // console.log('unobserve',shellRef.current)
            // observer.unobserve(shellelement)
        }

    },[observer])

    useEffect(()=>{

        let newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles)
        // isMounted = useIsMounted()
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

    useEffect(() => {
        if (!shellRef.current) return
        console.log('linking scrollerName, scrollerID, index, shellRef.current, content; ',scrollerName, scrollerID, index, shellRef.current,content)
        if (content) {
            observer.unobserve(shellRef.current)
            portalManager.attachPortalListItem(scrollerID,index,shellRef.current)
            // console.log('scrollerID, setting linkedContentRef', scrollerID)
            // linkedContentRef.current = true
            return () => {
                portalManager.detachPortalListItem(scrollerID,index)
            }
        }
    },[shellRef.current,content])

    const placeholderchild = useMemo(()=>{
        let child = customplaceholderRef.current?
                customplaceholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {error}/>
        return child
    }, [index, content, customplaceholderRef.current, listsize, error])

    // console.log('scrollerID, linkedContentRef.current',scrollerID, linkedContentRef.current)
    return <div ref = { shellRef } data-index = {index} data-instanceid = {instanceID} style = {styles}>
            {(!content)?placeholderchild:null}
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
