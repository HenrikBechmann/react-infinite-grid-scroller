// placeholder.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useEffect, useState, useCallback } from 'react'

const Placeholder = ({index, listsize, error}) => {

    const stylesRef = useRef({
        position:'relative',
        boxSizing:'border-box',
        backgroundColor:'cyan',
        border:'2px solid black',
        height:'100%',
        width:'100%'
    } as React.CSSProperties)
    const itemStylesRef = useRef(
        {
            position:'absolute',
            top:0,
            left:0,
            padding:'3px',
            opacity:.5,
            borderRadius:'8px',
            backgroundColor:'white', 
            margin:'3px',
            fontSize:'smaller',
        } as React.CSSProperties
    )

    return <div style = {stylesRef.current}>
        { !error?
            <div style = {itemStylesRef.current}>{index + 1}/{listsize} loading...</div>:
            <div style = {itemStylesRef.current}>item is not available at this time</div>
        }
        
    </div>
}

export default Placeholder