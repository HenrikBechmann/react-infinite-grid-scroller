// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useState, useCallback, useMemo } from 'react'

import ReactDOM from 'react-dom'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import useIsMounted from 'react-is-mounted-hook'

import Placeholder from './placeholder'

const ItemShell = (props) => {
    const {orientation, cellHeight, cellWidth, index, observer, callbacks, getItem, listsize, placeholder, instanceID, scrollerName,portalData} = props
    
    const [content, saveContent] = useState(null)
    const [error, saveError] = useState(null)
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef(null)
    const instanceIDRef = useRef(instanceID)
    const isMounted = useIsMounted()
    const itemrequestRef = useRef(null)
    const portalDataRef = useRef(portalData.get(index)?portalData.get(index):{
        container:null,
        content:null,
        placeholder:null,
    })

    // initialize
    useEffect(() => {
        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback
        if (getItem) {
            itemrequestRef.current = requestidlecallback(()=> {

                let value = getItem(index)
                if (value && value.then) {
                    value.then((value) => {
                        if (isMounted()) { 
                            saveContent(value)
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

        portalDataRef.current.container = ctr

        return ctr
    },[])

    // const localportal = useMemo(() => {
    //     // console.log('updating local portal')
    //     if (portalRef.current.content) {
    //         return portalRef.current.portal
    //     }

    //     (!portalRef.current.content) && content && (portalRef.current.content = content)

    //     if (itemstate != 'ready') return null

    //     let localportal = ReactDOM.createPortal(child,container)
    //     portalRef.current.portal = localportal
    //     console.log('SETTING LOCALPORTAL index, child, container, itemstate, localportal',
    //         index, child, container, itemstate, localportal)
    //     return localportal

    // },[child, container, itemstate, content])

    useEffect(() => {
        if (itemstate != 'ready') return
        shellRef.current.appendChild(container)
        return () => {
            shellRef.current.removeChild(container)
        }
    },[itemstate, container])

    return <div ref = { shellRef } data-index = {index} data-instanceid = {instanceID} style = {styles}>
        { /*itemstate == 'ready'?child:null*/ }
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
