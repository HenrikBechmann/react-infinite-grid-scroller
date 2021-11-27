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
    const [cellStatus, setCellStatus] = useState('setup'); // 'setup' -> 'renderplaceholder' -> 'render'

    console.log('RUNNING cellshell scrollerID, instanceID, index, cellStatus', scrollerID, instanceID, index, cellStatus)

    useLayoutEffect(()=>{
        return () => {isMounted.current = false}
    },[])

    // const usingPlaceholder = useRef(null)

    // initialize
    useEffect(() => {

        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback

        portalRecord.current = portalManager.fetchPortal(scrollerID, index, placeholderchildRef.current)

        let hasUserContent = portalManager.hasPortalUserContent(scrollerID,index)

        console.log('hasUserContent',hasUserContent)

        if (!hasUserContent) {

            setCellStatus('renderplaceholder')
            // usingPlaceholder.current = true
            // console.log('cellshell getItem',index)

            if (isMounted.current && getItem) {

                itemrequestRef.current = requestidlecallback(()=> { // TODO make this optional
                    let contentItem = getItem(index)

                    if (contentItem && contentItem.then) {
                        contentItem.then((usercontent) => {
                            if (isMounted.current) { 
                                // console.log('saving new usercontent by promise',scrollerName, scrollerID, index, usercontent)
                                portalRecord.current = portalManager.updatePortal(scrollerID,index,usercontent)
                                setCellStatus('render')
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
                                portalRecord.current = portalManager.updatePortal(scrollerID,index,usercontent)
                                setCellStatus('render')
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
        
            // usingPlaceholder.current = false
            setCellStatus('render')
    
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

        console.log('setting cell styles scrollerID, index',scrollerID,index)
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

    const portalchildRef = useRef(null) //placeholderchild)

    let reverseportal
    [portalchildRef.current,reverseportal] = useMemo(()=>{

        if (cellStatus == 'setup') return [portalchildRef.current,null]

        let portallistitem = portalRecord.current
        let reverseportal = portallistitem.reverseportal
        if (cellStatus != 'render') {
            (cellStatus != 'setup') && (portalchildRef.current = placeholderchildRef.current)
            return [portalchildRef.current,reverseportal] 
        }

        if (portallistitem.outportal) {
            console.log('returning outportal for index, cellStatus', index, cellStatus)
            return [portallistitem.outportal,reverseportal]
            // return portalchildRef.current
        }
            
        // usingPlaceholder.current = false

        let child = <OutPortal node = {reverseportal} />
        portallistitem.outportal = child

        console.log('index,cellStatus,creating outportal',index,cellStatus,child)

        return [child,reverseportal]

    }, [cellStatus]);

    useEffect(()=>{
        if (cellStatus == 'render') {
            console.log('switching to render1 for scrollerID, index',scrollerID,index)
            setCellStatus('render1')
        }
        if (cellStatus == 'render1') {
            console.log('switching to render2 for scrollerID, index',scrollerID,index)
            setCellStatus('render2')
        }

    },[cellStatus, reverseportal])

    return <div ref = { shellRef } data-type = 'cellshell' data-scrollerid = {scrollerID} data-index = {index} data-instanceid = {instanceID} style = {styles}>
            { ((cellStatus == 'render') || (cellStatus == 'renderplaceholder')) && <OutPortal node = {reverseportal} /> }
            { (cellStatus == 'render1') && <OutPortal node = {reverseportal} /> }
            { (cellStatus == 'render2') && <OutPortal node = {reverseportal} /> }
        </div>

} // CellShell
            // { ((cellStatus == 'render') || (cellStatus == 'renderplaceholder')) && portalchildRef.current }

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
