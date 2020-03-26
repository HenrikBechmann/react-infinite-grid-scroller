// scrolltracker.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef} from 'react'

const ScrollTracker = ({ top, left, offset, listsize, styles }) => {

    let trackdata = `${offset + 1}/${listsize}`

    let styleRef = useRef(Object.assign({
        top: top + 'px',
        left: left + 'px',
        position:'fixed',
        zIndex:3,
        backgroundColor:'white',
        border: '1px solid gray',
        borderRadius:'10px',
        fontSize:'smaller',
        padding:'3px'
    } as React.CSSProperties,styles?.scrolltracker))

    return <div data-name = 'scrolltracker' style = {styleRef.current} >{trackdata}</div>
}

export default ScrollTracker