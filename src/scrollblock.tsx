// scrollblock.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useContext, useRef, useCallback, useEffect, useLayoutEffect, useState} from 'react'

import { ViewportInterrupt } from './viewport'

const Scrollblock = ({
    children,
    listsize, 
    cellHeight, 
    cellWidth, 
    gap, 
    padding, 
    orientation, 
    styles,
    scrollerID,
}) => {

    // -------------------------[ context and state ]-------------------------
    const viewportProperties = useContext(ViewportInterrupt)
    // const [blockstate,setBlockState] = useState('render') // setup -> render
    // if (viewportData.index == 0) console.log('RUNNING scrollblock viewportData.index, blockstate',viewportData.index,blockstate)

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

    let { viewportDimensions, itemobserver/*, isResizing*/ } = viewportProperties
    let { top, right, bottom, left, width, height } = viewportDimensions

    // state engine
    // useEffect(()=>{
    //     switch (blockstate) {
    //         case 'setup': {
    //             setBlockState('render')
    //             break
    //         }
    //     }
    // },[blockstate])
    
    useLayoutEffect(() => {

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
                        listsize,
                        cellHeight,
                        cellWidth,
                        gap,
                        padding,
                        orientation, 
                        viewportheight:height,
                        viewportwidth:width,
                    }
                )

            // if (viewportData.index == 0) console.log('scrollblock updateBlockLength to ', scrollblocklength)
            scrollBlockLengthRef.current = scrollblocklength

        },[
            listsize,
            cellHeight,
            cellWidth,
            gap,
            padding,
            orientation, 
            height,
            width,
       ]
    )

    return <div data-type = 'scrollblock' style={divlinerstyleRef.current}>{children}</div>

} // Scrollblock
        // <div ref = {scrollblockRef} data-type = 'scrollblock' style={divlinerstyleRef.current}>{children}</div>

// all the parameters affect the length
const calcScrollblockLength = ({
    listsize, 
    cellHeight, 
    cellWidth, 
    gap, 
    padding, 
    orientation, 
    viewportheight,
    viewportwidth,
    }) => {

    // dependents of orientation
    let crosslength
    let cellLength
    let viewportcrosslength
    if (orientation == 'vertical') {

        crosslength = cellWidth + gap
        cellLength = cellHeight + gap
        viewportcrosslength = viewportwidth 

    } else {

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
