// Placeholder.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of the default PlaceHolder is to hold the content display until the host content
    is received. The placeholder presents a waiting message, or an error message if the load
    of the host content failed.

    The default placeholder can be replaced by a placeholder provided by the host.
*/

import React, {useRef } from 'react'

const Placeholder = ({index, listsize, message, error, userFrameStyles, userLinerStyles}) => {

    const frameStylesRef = useRef({
        border:'2px solid black',
        backgroundColor:'cyan',
        ...userFrameStyles,
        position:'relative',
        boxSizing:'border-box',
        height:'100%',
        width:'100%',
    })
    const linerStylesRef = useRef({
        position:'absolute',
        top:0,
        left:0,
        padding:'3px',
        opacity:.5,
        borderRadius:'8px',
        backgroundColor:'white', 
        margin:'3px',
        fontSize:'smaller',
        ...userLinerStyles,
    })

    message = message ?? '(loading...)'

    return <div data-type = 'placeholderframe' style = {frameStylesRef.current}>
        { !error?
            <div data-type = 'placeholderliner' style = { linerStylesRef.current }>{index + 1}/{listsize} {message}</div>:
            <div data-type = 'placeholderliner' style = { linerStylesRef.current }>item is not available ({error.message})</div>
        }
        
    </div>
}

export default Placeholder