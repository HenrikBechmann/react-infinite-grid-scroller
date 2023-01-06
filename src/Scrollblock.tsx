// Scrollblock.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*

    The scrollblock provides the scrollable element (scrolled by Viewport) of the infinite grid scroller.
    It is sized according to the given cell size and row counts, adjusted for variable cradle content.
    Its only state change is change of styles.

*/

import React, {useContext, useRef, useCallback, useLayoutEffect, useState, useMemo} from 'react'

import { ViewportContext } from './Viewport'

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
        
    } = gridSpecs

    // -------------------------[ context and state ]-------------------------

    const ViewportContextProperties = useContext(ViewportContext)

    // -----------------------------------[ data heap ]-------------------------

    const baseScrollBlockLengthRef = useRef(null)

    // just for init
    const linerStyle = useMemo(() =>{

        return {
            ...styles.scrollblock,
            position:'relative',
        }

    }, [])

    const divlinerstyleRef = useRef(linerStyle)

    const [divlinerstyle,saveDivlinerstyle] = useState(divlinerstyleRef.current) // to trigger render

    const { width, height } = ViewportContextProperties.viewportDimensions
    
    // reconfigure
    useLayoutEffect(() => {

        updateBaseBlockLength(
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
        divlinerstyleRef.current = 
            updateScrollblockStyles(
                orientation,
                divlinerstyleRef,
                baseScrollBlockLengthRef,
                cellWidth,
                cellHeight,
                padding
            )
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

    const updateBaseBlockLength = useCallback(
        (layoutspecs) => {
            
            const basescrollblocklength = calcBaseScrollblockLength(layoutspecs)

            baseScrollBlockLengthRef.current = basescrollblocklength

        },[]
    )

    return <div data-type = 'scrollblock' style={divlinerstyleRef.current}>{children}</div>

} // Scrollblock

export default Scrollblock

// any of the parameters can affect the length
const calcBaseScrollblockLength = ({
        orientation,
        viewportheight,
        viewportwidth,
        listsize,
        cellHeight,
        cellWidth,
        gap,
        padding,
    }) => {

    // ---------------[ calculate crosscount ]------------------
    //crosscount is also calculated by Cradle

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
    viewportcrosslength += gap // to match crossLength

    if (viewportcrosslength < crosslength) viewportcrosslength = crosslength // must be at least one

    const crosscount = Math.floor(viewportcrosslength/crosslength)

    // -------------------[ calculate scrollblock length ]-----------------

    const listrowcount = Math.ceil(listsize/crosscount)

    const baselength = (listrowcount * cellLength) - 
        ((listrowcount > 0)?
            gap: // final cell has no trailing gap
            0) 
        + (padding * 2) // leading and trailing padding

    return baselength

}

const updateScrollblockStyles = (
    orientation, stylesRef, baseScrollblocklengthRef, cellWidth, cellHeight, padding) => {

    const localstyles = {...stylesRef.current} // new object
    let height, width, minHeight, minWidth
    if (orientation == 'vertical') {
        height = baseScrollblocklengthRef.current + 'px'
        width = '100%'
        minWidth = (cellWidth + (padding * 2)) + 'px'
        minHeight = null
    } else { // orientation == 'horizontal'
        height = '100%'
        width = baseScrollblocklengthRef.current + 'px'
        minHeight = (cellHeight + (padding * 2)) + 'px'
        minWidth = null
    }
    localstyles.height = height
    localstyles.width = width
    localstyles.minHeight = minHeight
    localstyles.minWidth = minWidth

    return localstyles

}
