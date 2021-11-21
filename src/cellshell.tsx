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
    
    // console.log('running cellshell with scrollerID',scrollerID)

    // const portalManager = portalAgentInstance // useContext(PortalAgent)
    // const [error, saveError] = useState(null)
    const [styles,saveStyles] = useState({
        overflow:'hidden',
        // willChange:'transform', // for Chrome Android paint bug
    } as React.CSSProperties)
    // const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef(null)
    const instanceIDRef = useRef(instanceID)
    const isMounted = useRef(true)
    const itemrequestRef = useRef(null)
    const portalRecord = useRef(null)
    const [portalStatus, setPortalStatus] = useState('setup'); // 'setup' -> 'renderplaceholder' -> 'render'

    // console.log('RUNNING cellshell scrollerID, portalStatus', scrollerID, portalStatus)

    useLayoutEffect(()=>{
        return () => {isMounted.current = false}
    },[])

    // initialize
    useEffect(() => {

        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        portalRecord.current = portalManager.createPortalListItem(scrollerID,index,null, placeholderchildRef.current)

        let hasUserContent = portalManager.hasPortalUserContent(scrollerID,index)

        // console.log('cellshell hasUserContent',index,hasUserContent)

        if (!hasUserContent) {

            setPortalStatus('renderplaceholder')

            // console.log('cellshell getItem',index)

            if (isMounted.current && getItem) {

                itemrequestRef.current = requestidlecallback(()=> { // TODO make this optional
                    let contentItem = getItem(index)

                    if (contentItem && contentItem.then) {
                        contentItem.then((usercontent) => {
                            if (isMounted.current) { 
                                // console.log('saving new usercontent by promise',scrollerName, scrollerID, index, usercontent)
                                portalRecord.current = portalManager.updatePortalListItem(scrollerID,index,usercontent)
                                setPortalStatus('render')
                                // saveError(null)
                            }
                        }).catch((e) => {
                            console.log('ERROR',e)
                            // if (isMounted()) { 
                            //     saveError(e)
                            // }
                        })
                    } else {
                        // console.log('isMounted, contentItem',isMounted(), contentItem)
                        if (isMounted.current) {
                            if (contentItem) {
                                let usercontent = contentItem;
                                // (scrollerID == 0) && console.log('saving new usercontent',scrollerName, scrollerID, index, usercontent)
                                portalRecord.current = portalManager.updatePortalListItem(scrollerID,index,usercontent)
                                setPortalStatus('render')
                                // saveError(null)
                            } else {
                                console.log('ERROR','no content item')
                                // saveError(true)
                            }
                        }
                    }
                },{timeout:250})
        
            }         
        } else {
        
            setPortalStatus('render')
    
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
        if (isMounted.current) {
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
                customplaceholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {false}/>
        return child
    }, [index, customplaceholderRef.current, listsize]);

    const placeholderchildRef = useRef(placeholderchild)

    const portalchildRef = useRef(placeholderchild)
    const usingPlaceholder = useRef(true)

    portalchildRef.current = useMemo(()=>{

        let portallistitem = portalRecord.current
        if (portalStatus != 'render') {
            if (portallistitem && !portallistitem.reparenting) {
                portallistitem.reparenting = true
            }
            return portalchildRef.current 
        }

        if (!usingPlaceholder.current) return portalchildRef.current
            
        let reverseportal = portallistitem.reverseportal
        usingPlaceholder.current = false

        return <OutPortal node = {reverseportal} />

    }, [portalStatus]);

    useEffect(()=> {
        if (portalStatus != 'render') return
        if (portalRecord.current?.reparenting) {
            setTimeout(()=>{
                if (!isMounted.current) return
                portalRecord.current.reparenting = false
            })
        }
    }, [portalRecord.current?.reparenting, portalStatus])

    return <div ref = { shellRef } data-type = 'cellshell' data-scrollerid = {scrollerID} data-index = {index} data-instanceid = {instanceID} style = {styles}>
            { ((portalStatus == 'render') || (portalStatus == 'renderplaceholder')) && portalchildRef.current }
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
