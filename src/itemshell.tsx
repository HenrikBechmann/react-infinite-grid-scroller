// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useState, useCallback, useMemo } from 'react'

import ReactDOM from 'react-dom'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import useIsMounted from 'react-is-mounted-hook'

import Placeholder from './placeholder'

const ItemShell = (props) => {
    const {orientation, cellHeight, cellWidth, index, observer, callbacks, getItem, listsize, placeholder, instanceID, scrollerName,portalData} = props
    
    // if (scrollerName == 'NESTED OUTER') {
    //     console.log('NESTED OUTER portalData',portalData)
    // }

    const [error, saveError] = useState(null)
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef(null)
    const instanceIDRef = useRef(instanceID)
    const isMounted = useIsMounted()
    const itemrequestRef = useRef(null)
    const portalDataRef = useRef(portalData.get(index)?portalData.get(index).current:{
        container:null,
        content:null,
        placeholder:null,
        portal:null,
    })
    const [content, saveContent] = useState(portalDataRef.current.content)

    console.log('index itemstate', index, itemstate)
    // initialize
    useEffect(() => {
        if (portalDataRef.current.content) {
            return
        }
        // console.log('fetching item index, scrollerName',index, scrollerName)
        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback
        if (getItem) {
            console.log('fetching item index',index)
            itemrequestRef.current = requestidlecallback(()=> {

                let value = getItem(index)
                if (value && value.then) {
                    value.then((content) => {
                        if (isMounted()) { 
                            saveContent(content)
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
                        if (value) {
                            saveContent(value)
                            saveError(null)
                        } else {
                            saveError(true)
                            saveContent(null)
                        }
                    }
                }
            },{timeout:200})
        }

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

    useEffect(()=>{

        observer.observe(shellRef.current)

        return () => {

            observer.unobserve(shellRef.current)

        }

    },[observer])

    useEffect(()=>{

        let newStyles = getShellStyles(orientation, cellHeight, cellWidth, styles)
        if (isMounted()) {
            saveStyles(newStyles)
        }

    },[orientation,cellHeight,cellWidth])

    // cradle ondemand callback parameter value
    const getElementData = useCallback(()=>{
        return [index, shellRef, portalDataRef]
    },[])

    // placeholder handling
    const customholderRef = useRef(
            placeholder?React.createElement(placeholder, {index, listsize}):null
    )

    const child = useMemo(()=>{
        let child = content?
            content:customholderRef.current?
                customholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {error}/>
        return child
    }, [index, content, customholderRef.current, listsize, error])

    // const wrapper = useMemo(()=>{
    //     let e 
    //     // if (portalDataRef.current.container) {
    //     //     ctr = portalDataRef.current.container
    //     //     return ctr 
    //     // }
    //     e = document.createElement('div')
    //     e.style.top = '0px'
    //     e.style.right = '0px'
    //     e.style.left = '0px'
    //     e.style.bottom = '0px'
    //     e.style.position = 'absolute'

    //     // console.log('portalDataRef in container memo',portalDataRef)
    //     // portalDataRef.current.container = ctr

    //     return e
    // },[])

    const container = useMemo(()=>{
        let ctr 
        if (portalDataRef.current.container) {
            ctr = portalDataRef.current.container
            return ctr 
        }
        ctr = document.createElement('div')
        ctr.style.top = '0px'
        ctr.style.right = '0px'
        ctr.style.left = '0px'
        ctr.style.bottom = '0px'
        ctr.style.position = 'absolute'

        // console.log('portalDataRef in container memo',portalDataRef)
        // portalDataRef.current.container = ctr

        return ctr
    },[])

    const localportal = useMemo(() => {
        // console.log('updating local portal')
        // if (portalDataRef.current.content && Object.is(portalDataRef.current.content, content)) {
        //     return portalDataRef.current.portal
        // }

        (!portalDataRef.current.content) && content && (portalDataRef.current.content = content)

        if (itemstate != 'ready') return null

        let portal = ReactDOM.createPortal(child,container)
        portalDataRef.current.portal = portal
        // console.log('SETTING LOCALPORTAL index, itemstate, container, child',
        //     index, itemstate, container, child)
        portalDataRef.current.container = container
        return portal

    },[child, container, itemstate, content])

    useEffect(() => {
        if (itemstate != 'ready') return
        // console.log('appending container; index, itemstate, shellRef.current, container', 
        //     index, itemstate, shellRef.current, container)
        shellRef.current.appendChild(container)
        // wrapper.appendChild(container)
        return () => {
            // wrapper.removeChild(container)
            shellRef.current.removeChild(container)
        }
    },[itemstate, container])

    const renders = useMemo(()=>{
        return <>
        {localportal}

        <div ref = { shellRef } data-index = {index} data-instanceid = {instanceID} style = {styles}>
        </div>
    </>
    },[shellRef, localportal])

    return renders

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
