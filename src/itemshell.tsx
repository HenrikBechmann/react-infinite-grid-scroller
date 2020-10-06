// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useState, useCallback, useMemo, useContext } from 'react'

import ReactDOM from 'react-dom'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import useIsMounted from 'react-is-mounted-hook'

import Placeholder from './placeholder'

import { ContentContext } from './contentmanager'

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
    
    const contentManager = useContext(ContentContext)
    const linkedContentRef = useRef(false)
    const [error, saveError] = useState(null)
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    const [itemstate,setItemstate] = useState('setup')
    const shellRef = useRef(null)
    const instanceIDRef = useRef(instanceID)
    const isMounted = useIsMounted()
    const itemrequestRef = useRef(null)
    // // const portalDataRef = useRef(portalData.get(index)?portalData.get(index).current:{
    //     container:null,
    //     content:null,
    //     placeholder:null,
    //     portal:null,
    // })
    const [content, saveContent] = useState(null)

    // console.log('index itemstate', index, itemstate)
    // initialize
    useEffect(() => {
        // if (portalDataRef.current.content) {
        //     return
        // }
        // console.log('fetching item index, scrollerName',index, scrollerName)
        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback
        if (contentManager.hasContentlistItem(scrollerID,index)) {
            // console.log('content cache available for scrollerID, index',scrollerID, index)
            let contentitem = contentManager.getContentlistItem(scrollerID,index)            
            // console.log('cache contentitem',contentitem)
            saveContent(contentitem.content)
            return
        }
        if (getItem) {
            // console.log('fetching item index',index)
            itemrequestRef.current = requestidlecallback(()=> {

                let value = getItem(index)
                if (value && value.then) {
                    value.then((content) => {
                        if (isMounted()) { 
                            saveContent(content)
                            contentManager.setContentlistItem(scrollerID,index,content)
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
                            contentManager.setContentlistItem(scrollerID,index,value)
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
        return [index, shellRef]
    },[])

    // placeholder handling
    const customplaceholderRef = useRef(
            placeholder?React.createElement(placeholder, {index, listsize}):null
    )

    useEffect(() => {
        if (!(shellRef.current && content)) return
        console.log('linking content',shellRef.current,content)
        contentManager.attachContentlistItem(scrollerID,index,shellRef.current)
        linkedContentRef.current = true
        return () => {
            contentManager.detachContentlistItem(scrollerID,index)
        }
    },[shellRef.current,content])

    const child = useMemo(()=>{
        let child = customplaceholderRef.current?
                customplaceholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {error}/>
        return child
    }, [index, content, customplaceholderRef.current, listsize, error])

    const renders = useMemo(()=>{
        return <div ref = { shellRef } data-index = {index} data-instanceid = {instanceID} style = {styles}>
            { ((itemstate == 'ready') && linkedContentRef.current)?child:null}
        </div>
    },[shellRef, itemstate, child])

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
