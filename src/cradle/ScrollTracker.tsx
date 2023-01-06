// scrolltracker.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of ScrollTracker is to provide feedback to the user of the relative position in the
    virtual list during repositiong.

    ScrollTracker can be suppressed by the host (in favour of the host's own location feedback)
*/

import React, {useRef} from 'react'

const ScrollTracker = ({ top, left, offset, listsize, styles }) => {

    const trackdata = `${offset + 1}/${listsize}`

    const styleRef = useRef({
        top: top + 'px',
        left: left + 'px',
        position:'fixed',
        zIndex:3,
        backgroundColor:'white',
        border: '1px solid gray',
        borderRadius:'10px',
        fontSize:'smaller',
        padding:'3px',
        ...styles.scrolltracker
    })

    return <div data-name = 'scrolltracker' style = {styleRef.current} >{trackdata}</div>
}

export default ScrollTracker