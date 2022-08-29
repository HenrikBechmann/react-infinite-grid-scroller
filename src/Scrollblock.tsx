// scrollblock.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    
    TODO update length for cradle adjustments based on variable length changes in cell frames.

*/

import React, {useContext, useRef, useCallback, useEffect, useLayoutEffect, useState, useMemo} from 'react'

import { ViewportInterrupt } from './Viewport'

const Scrollblock = ({
    children,
    listsize,
    gridSpecs, 
    styles,
    scrollerID,
}) => {

    // console.log('==> RUNNING Scrollblock','-'+scrollerID+'-')
    // console.log('performance.memory',performance['memory'])

    const {

        orientation,
        gap,
        padding,
        cellHeight,
        cellWidth,
        layout,
        
    } = gridSpecs

    // -------------------------[ context and state ]-------------------------

    useEffect(()=>{

        const abortController = new AbortController()

        return () => {
            abortController.abort() // defensive
        }

    },[])

    const viewportInterruptProperties = useContext(ViewportInterrupt)

    // -----------------------------------[ data heap ]-------------------------

    const baseScrollBlockLengthRef = useRef(null)

    // just for init
    const linerStyle = useMemo(() =>{
        return Object.assign(
        {

            backgroundColor:'white',
            position:'relative',
            
        } as React.CSSProperties, styles.cradle)


    }, [])

    const divlinerstyleRef = useRef(linerStyle)

    const [divlinerstyle,saveDivlinerstyle] = useState(divlinerstyleRef.current) // to trigger render

    const { width, height } = viewportInterruptProperties.viewportDimensions
    
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
                baseScrollBlockLengthRef
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

// all the parameters can affect the length
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

    let straightlength = (listlength * cellLength) - 
        ((listlength > 0)?
            gap:
            0) 
        + (padding * 2)

    return straightlength

}

const updateScrollblockStyles = (orientation,stylesRef,baseScrollblocklengthRef) => {

    let localstyles = Object.assign({},stylesRef.current) as React.CSSProperties
    let height 
    let width
    if (orientation == 'horizontal') {
        height = '100%'
        width = baseScrollblocklengthRef.current + 'px'
    } else if (orientation == 'vertical') {
        height = baseScrollblocklengthRef.current + 'px'
        width = '100%'
    }
    localstyles.height = height
    localstyles.width = width

    return localstyles
}

export default Scrollblock
