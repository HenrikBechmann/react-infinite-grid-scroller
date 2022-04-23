// scrollblock.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

'use strict'

import React, {useContext, useRef, useCallback, useEffect, useLayoutEffect, useState} from 'react'

import { ViewportInterrupt } from './viewport'

const Scrollblock = ({
    children,
    listsize,
    gridSpecs, 
    styles,
    scrollerID,
}) => {

    const {
        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
        dense,
    } = gridSpecs

    // -------------------------[ context and state ]-------------------------
    const viewportProperties = useContext(ViewportInterrupt)
    // console.log('running scrollblock')

    // -----------------------------------[ data heap ]-------------------------
    const scrollBlockLengthRef = useRef(null)
    // const scrollblockRef = useRef(null)
    const divlinerstyleRef = useRef(
        Object.assign(
        {

            backgroundColor:'white',
            position:'relative',
            
        } as React.CSSProperties, styles.cradle)

    )
    const [divlinerstyle,saveDivlinerstyle] = useState(divlinerstyleRef.current) // to trigger render

    const { width, height } = viewportProperties.viewportDimensions
    
    useLayoutEffect(() => {

        // console.log('updating scrollblock divlinerstyleRef')
        updateBlockLength()
        divlinerstyleRef.current = updateScrollblockStyles(orientation,divlinerstyleRef,scrollBlockLengthRef)
        saveDivlinerstyle(divlinerstyleRef.current)

    },[
        orientation,
        height,
        width,
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    ])

    const updateBlockLength = useCallback(
        () => {
            let scrollblocklength = 
                calcScrollblockLength(
                    {
                        orientation,
                        viewportheight:height,
                        viewportwidth:width,
                        listsize,
                        cellHeight,
                        cellWidth,
                        gap,
                        padding,
                    }
                )

            scrollBlockLengthRef.current = scrollblocklength

        },[
            orientation,
            height,
            width,
            listsize,
            cellHeight,
            cellWidth,
            gap,
            padding,
       ]
    )

    return <div data-type = 'scrollblock' style={divlinerstyleRef.current}>{children}</div>

} // Scrollblock

// all the parameters affect the length
const calcScrollblockLength = ({
        orientation,
        viewportheight,
        viewportwidth,
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    }) => {

    // dependents of orientation
    let crosslength
    let cellLength
    let viewportcrosslength
    if (orientation == 'vertical') {

        crosslength = cellWidth + gap
        cellLength = cellHeight + gap
        viewportcrosslength = viewportwidth 

    } else { // 'horizontal'

        crosslength = cellHeight + gap
        cellLength = cellWidth + gap
        viewportcrosslength = viewportheight

    }
    // adjustments to viewportcrosslength
    viewportcrosslength -= (padding * 2)
    viewportcrosslength += gap

    if (viewportcrosslength < crosslength) viewportcrosslength = crosslength // must be at least one
    let crosscount = Math.floor(viewportcrosslength/crosslength)

    let listlength = Math.ceil(listsize/crosscount)

    let straightlength = (listlength * cellLength) - ((listlength > 0)?gap:0) + (padding * 2)

    return straightlength

}

const updateScrollblockStyles = (orientation,stylesRef,scrollblocklengthRef) => {

    let localstyles = Object.assign({},stylesRef.current) as React.CSSProperties
    let height 
    let width
    if (orientation == 'horizontal') {
        height = '100%'
        width = scrollblocklengthRef.current + 'px'
    } else if (orientation == 'vertical') {
        height = scrollblocklengthRef.current + 'px'
        width = '100%'
    }
    localstyles.height = height
    localstyles.width = width

    return localstyles
}

export default Scrollblock
