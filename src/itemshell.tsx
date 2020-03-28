// itemframe.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useState, useCallback } from 'react'

import {requestIdleCallback, cancelIdleCallback} from 'requestidlecallback'

import useIsMounted from 'react-is-mounted-hook'

import Placeholder from './placeholder'

const ItemShell = (props) => {
    const {orientation, cellHeight, cellWidth, index, observer, callbacks, getItem, listsize, placeholder} = props
    
    const [content, saveContent] = useState(null)
    const [error, saveError] = useState(null)
    const [styles,saveStyles] = useState({
        overflow:'hidden',
    } as React.CSSProperties)
    const shellRef = useRef(null)

    const isMounted = useIsMounted()

    useEffect(() => {
        let itemrequest = {current:null}
        let requestidlecallback = window['requestIdleCallback']?window['requestIdleCallback']:requestIdleCallback
        let cancelidlecallback = window['cancelIdleCallback']?window['cancelIdleCallback']:cancelIdleCallback
        if (getItem) {
            itemrequest = requestidlecallback(()=> {

                let value = getItem(index)
                if (value && value.then) {
                    value.then((value) => {
                        if (isMounted()) { 
                            saveContent(value)
                            saveError(null)
                        }
                    }).catch((e) => {
                        saveContent(null)
                        saveError(e)
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
            })
        }

        return () => {
            let requesthandle = itemrequest.current
            cancelidlecallback(requesthandle)
        }
    },[])

    // initialize
    useEffect(() => {

        let localcalls = callbacks.current

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
        saveStyles(newStyles)

    },[orientation,cellHeight,cellWidth])

    const getElementData = useCallback(()=>{
        return [index, shellRef]
    },[])

    const customholderRef = useRef(placeholder?React.createElement(placeholder, {index, listsize}):null)

    return <div ref = { shellRef } data-index = {index} style = {styles}>
        {styles.width?
            content?
                content:customholderRef.current?
                    customholderRef.current:<Placeholder index = {index} listsize = {listsize} error = {error}/>
        :null}
    </div>

} // ItemShell

const getShellStyles = (orientation, cellHeight, cellWidth, styles) => {

    let styleset = Object.assign({},styles)
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
