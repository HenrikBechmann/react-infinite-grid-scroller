// Placeholder.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef } from 'react'

const Placeholder = ({index, listsize, message, error, userFrameStyles, userContentStyles}) => {

    const frameStylesRef = useRef({
        border:'2px solid black',
        backgroundColor:'cyan',
        ...userFrameStyles,
        position:'relative',
        boxSizing:'border-box',
        height:'100%',
        width:'100%',
    })
    const contentStylesRef = useRef({
        position:'absolute',
        top:0,
        left:0,
        padding:'3px',
        opacity:.5,
        borderRadius:'8px',
        backgroundColor:'white', 
        margin:'3px',
        fontSize:'smaller',
        ...userContentStyles,
    })

    message = message ?? '(loading...)'

    return <div style = {frameStylesRef.current}>
        { !error?
            <div style = { contentStylesRef.current }>{index + 1}/{listsize} {message}</div>:
            <div style = { contentStylesRef.current }>item is not available ({error.message})</div>
        }
        
    </div>
}

export default Placeholder