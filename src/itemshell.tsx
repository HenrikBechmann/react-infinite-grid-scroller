// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo, useContext } from 'react'

import ReactDOM from 'react-dom'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import useIsMounted from 'react-is-mounted-hook'

import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal'

import Placeholder from './placeholder'

import { PortalManager } from './portalmanager'

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
    
    // console.log('running itemshell with scrollerID',scrollerID)

    const portalManager = useContext(PortalManager)
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
    const [portalStatus, setPortalStatus] = useState('pending'); // 'pending' -> 'prepare' -> 'render'; 'reparent' -> 'render'

    // (scrollerID == 0) && console.log('RUNNING ITEMSHELL scrollerName, scrollerID, index, portalStatus', scrollerName, scrollerID, index, portalStatus)
    // initialize
    useEffect(() => {
        // console.log('fetching item scrollerName-scrollerID:index',scrollerName,'-', scrollerID, index)

        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        portalManager.createPortalListItem(scrollerID,index,null, placeholderchildRef.current)

        setPortalStatus('prepare')

        if (!portalManager.hasPortalUserContent(scrollerID,index)) {

            // console.log('fetching PORTAL CACHE item', scrollerID, index)

            // let portalitem = portalManager.getPortalListItem(scrollerID,index) 

            // console.log('saving cache usercontent',portalitem)

            // saveContent(portalitem.usercontent)
            // return
        // } else {
        if (getItem) {

            // console.log('fetching NEW item (queue)')

            // TODO: createPoralListitem in any case, then update with usercontent when found
            // this will allow requestidlecallback to be used.
            itemrequestRef.current = requestidlecallback(()=> { // TODO make this optional
                let contentItem = getItem(index)
                // console.log('result of getItem(index)',contentItem)
                if (contentItem && contentItem.then) {
                    contentItem.then((usercontent) => {
                        // if (isMounted()) { 
                            // console.log('saving new usercontent by promise',scrollerName, scrollerID, index, usercontent)
                            portalManager.updatePortalListItem(scrollerID,index,usercontent)
                            saveError(null)
                        // }
                    }).catch((e) => {
                        // if (isMounted()) { 
                            saveError(e)
                        // }
                    })
                } else {
                    // console.log('isMounted, contentItem',isMounted(), contentItem)
                    // if (isMounted()) {
                        if (contentItem) {
                            let usercontent = contentItem;
                            // (scrollerID == 0) && console.log('saving new usercontent',scrollerName, scrollerID, index, usercontent)
                            portalManager.updatePortalListItem(scrollerID,index,usercontent)
                            saveError(null)
                        } else {
                            saveError(true)
                            // saveContent(null)
                        }
                    // }
                }
            },{timeout:250})
        }}

        return () => {
            let requesthandle = itemrequestRef.current
            cancelidlecallback(requesthandle)
        }
    },[])


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

    useEffect(() => {
        switch (portalStatus) {
            case 'reparent':
                // portalManager.getPortalListItem(scrollerID, index).reparenting = false
            case 'prepare':
                setPortalStatus('render')
                break
        }
    },[portalStatus])

    const placeholderchild = useMemo(()=>{
        let child = customplaceholderRef.current?
                customplaceholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {error}/>
        return child
    }, [index, customplaceholderRef.current, listsize, error]);

    const placeholderchildRef = useRef(placeholderchild)

    const portalchild = useMemo(()=>{
        if (portalStatus == 'pending') return null
        let portallistitem = portalManager.getPortalListItem(scrollerID, index)
        let reverseportal = portallistitem.reverseportal
        // portallistitem.reparenting = true
        // setPortalStatus('reparent')
        return <OutPortal node = {reverseportal} />
    }, [portalStatus]);

    return <div ref = { shellRef } data-type = 'itemshell' data-scrollerid = {scrollerID} data-index = {index} data-instanceid = {instanceID} style = {styles}>
            { portalchild }
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
