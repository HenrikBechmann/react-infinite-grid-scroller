// scrolltracker.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of ScrollTracker is to provide feedback to the user of the relative position in the
    virtual list during repositiong.

    ScrollTracker can be suppressed by the host (in favour of the host's own location feedback)
*/

import React, { useRef, useCallback, useEffect, useState } from 'react'

const ScrollTracker = ({ scrollTrackerAPIRef, styles }) => {

    const [index, setIndex] = useState(null)
    const indexRef = useRef(null)
    indexRef.current = index
    const lowindexRef = useRef(null)
    const listsizeRef = useRef(null)

    const tracktext = `${index} (${index - lowindexRef.current + 1}/${listsizeRef.current})`

    const stylesRef = useRef({
        top: '3px',
        left: '3px',
        position:'absolute',
        zIndex:3,
        backgroundColor:'white',
        border: '1px solid gray',
        borderRadius:'10px',
        fontSize:'smaller',
        padding:'3px',
        visibility:'hidden',
        ...styles
    })

    useEffect(()=>{

        scrollTrackerAPIRef.current = {

            beginReposition,
            updateReposition,
            finishReposition,

        }

    },[])

    const beginReposition = useCallback((position, lowindex, listsize)=> {

        setIndex(position + lowindex)
        lowindexRef.current = lowindex
        listsizeRef.current = listsize
        stylesRef.current = {...stylesRef.current,visibility:'visible'}

    },[])

    const updateReposition = useCallback((position)=>{

        const currentindex = position + lowindexRef.current;

        (indexRef.current != currentindex) && setIndex(currentindex)

    },[])

    const finishReposition = useCallback(() => {

        stylesRef.current = {...stylesRef.current,visibility:'hidden'}
        setIndex(null)

    },[])

    return <div data-name = 'scrolltracker' style = {stylesRef.current} >{tracktext}</div>
}

export default ScrollTracker