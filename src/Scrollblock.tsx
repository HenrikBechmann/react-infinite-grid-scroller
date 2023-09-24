// Scrollblock.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    The scrollblock provides the scrollable element (scrolled by Viewport) of the infinite grid scroller.
    It is sized according to the given cell size and row counts, adjusted for variable cradle content.
    Its only state change is change of styles.

*/

import React, {useContext, useRef, useCallback, useLayoutEffect, useState, useMemo} from 'react'

import { ViewportContext } from './Viewport'

const Scrollblock = ({
    children,
    virtualListSpecs,
    gridSpecs,
    paddingProps,
    gapProps,
    styles,
    scrollerID,
}) => {

    const {

        orientation,
        // gap,
        cellHeight,
        cellWidth,
        
    } = gridSpecs

    const 
        { size:listsize } = virtualListSpecs,

        // -------------------------[ context and state ]-------------------------

        viewportContext = useContext(ViewportContext),

        [blockState,setBlockState] = useState('setup'), // to trigger render

        // -----------------------------------[ data ]-------------------------

        baseScrollBlockLengthRef = useRef(null),

        // just for init
        linerStyle = useMemo(() =>{

            return {
                ...styles.scrollblock,
                position:'relative',
            }

        }, []),

        divlinerstyleRef = useRef(linerStyle)

    const getViewportDimensions = () => {
        const viewportElement = viewportContext.elementRef.current
        return {
            width:viewportElement.offsetWidth,
            height:viewportElement.offsetHeight
        }
    }

    const { height, width } = getViewportDimensions() // viewportDimensions

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
                gapProps,
                paddingProps,
            }
        )
        divlinerstyleRef.current = 
            updateScrollblockStyles(
                orientation,
                divlinerstyleRef,
                baseScrollBlockLengthRef,
                cellWidth,
                cellHeight,
                paddingProps,
            )
        setBlockState('update')

    },[
        orientation,
        height,
        width,
        listsize,
        cellHeight,
        cellWidth,
        gapProps,
        paddingProps,
    ])

    const updateBaseBlockLength = useCallback((layoutspecs) => {
            
        const basescrollblocklength = calcBaseScrollblockLength(layoutspecs)

        baseScrollBlockLengthRef.current = basescrollblocklength

    },[])

    useLayoutEffect(()=>{

        switch (blockState) {
            case 'setup':
            case 'update': {
                setBlockState('ready')
            }
        }

    },[blockState])

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
        gapProps,
        paddingProps,
    }) => {

    // ---------------[ calculate crosscount ]------------------
    //crosscount is also calculated by Cradle
    let crosslength, cellLength, viewportcrosslength

    let gaplength, gapxlength
    if (orientation == 'vertical') {

        gaplength = gapProps.column
        gapxlength = gapProps.row
        crosslength = cellWidth + gapxlength
        cellLength = cellHeight + gaplength
        viewportcrosslength = viewportwidth - paddingProps.left - paddingProps.right

    } else { // 'horizontal'

        gaplength = gapProps.row
        gapxlength = gapProps.column
        crosslength = cellHeight + gaplength
        cellLength = cellWidth + gapxlength
        viewportcrosslength = viewportheight - paddingProps.top - paddingProps.bottom

    }

    // adjustments to viewportcrosslength
    viewportcrosslength += gapxlength // to match crosslength

    if (viewportcrosslength < crosslength) viewportcrosslength = crosslength // must be at least one

    const 
        crosscount = Math.floor(viewportcrosslength/crosslength),

        // -------------------[ calculate scrollblock length ]-----------------

        listrowcount = Math.ceil(listsize/crosscount),

        baselength = (listrowcount * cellLength) - 
            ((listrowcount > 0)?
                gaplength: // final cell has no trailing gap
                0)
    if (orientation == 'vertical') {
        baselength + paddingProps.top + paddingProps.bottom
    } else {
        baselength + paddingProps.left + paddingProps.right
    }

    return baselength

}

const updateScrollblockStyles = (
    orientation, stylesRef, baseScrollblocklengthRef, cellWidth, cellHeight, paddingProps) => {

    const localstyles = {...stylesRef.current} // new object

    let height, width, minHeight, minWidth

    if (orientation == 'vertical') {
    
        height = baseScrollblocklengthRef.current + 'px'
        width = '100%'
        minWidth = (cellWidth + (paddingProps.left + paddingProps.right)) + 'px'
        minHeight = null
    
    } else { // orientation == 'horizontal'
    
        height = '100%'
        width = baseScrollblocklengthRef.current + 'px'
        minHeight = (cellHeight + (paddingProps.top + paddingProps.bottom)) + 'px'
        minWidth = null
    
    }
    
    localstyles.height = height
    localstyles.width = width
    localstyles.minHeight = minHeight
    localstyles.minWidth = minWidth
    localstyles.padding = paddingProps.CSS

    return localstyles

}
