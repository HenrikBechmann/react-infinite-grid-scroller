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
    styles,
    scrollerID,
}) => {

    const {

        orientation,
        gap,
        // padding,
        cellHeight,
        cellWidth,
        
    } = gridSpecs

    const 
        { size:listsize } = virtualListSpecs,

        // -------------------------[ context and state ]-------------------------

        ViewportContextProperties = useContext(ViewportContext),

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
        const viewportElement = ViewportContextProperties.elementRef.current
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
                gap,
                // padding,
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
                // padding,
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
        gap,
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
        gap,
        // padding,
        paddingProps,
    }) => {

    // ---------------[ calculate crosscount ]------------------
    //crosscount is also calculated by Cradle
    let crosslength, cellLength, viewportcrosslength

    if (orientation == 'vertical') {

        crosslength = cellWidth + gap
        cellLength = cellHeight + gap
        viewportcrosslength = viewportwidth - paddingProps.left - paddingProps.right

    } else { // 'horizontal'

        crosslength = cellHeight + gap
        cellLength = cellWidth + gap
        viewportcrosslength = viewportheight - paddingProps.top - paddingProps.bottom

    }

    // adjustments to viewportcrosslength
    viewportcrosslength += gap // to match crossLength

    if (viewportcrosslength < crosslength) viewportcrosslength = crosslength // must be at least one

    const 
        crosscount = Math.floor(viewportcrosslength/crosslength),

        // -------------------[ calculate scrollblock length ]-----------------

        listrowcount = Math.ceil(listsize/crosscount),

        baselength = (listrowcount * cellLength) - 
            ((listrowcount > 0)?
                gap: // final cell has no trailing gap
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
