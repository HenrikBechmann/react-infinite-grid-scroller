// scrollblock.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React, {useContext, useRef, useCallback, useEffect, useLayoutEffect, useState} from 'react'

import { ViewportContext } from './viewport'

const Scrollblock = ({
    children,
    listsize, 
    cellHeight, 
    cellWidth, 
    gap, 
    padding, 
    orientation, 
    component, 
    styles 
}) => {

    // -------------------------[ context and state ]-------------------------
    const viewportData = useContext(ViewportContext)
    const [blockstate,setBlockState] = useState('prepare')

    // -----------------------------------[ data heap ]-------------------------
    const scrollBlockLengthRef = useRef(null)
    const scrollblockRef = useRef(null)
    const divlinerstyleRef = useRef(
        Object.assign(
        {

            backgroundColor:'white',
            position:'relative',
            
        } as React.CSSProperties, styles?.cradle)

    )
    const [divlinerstyle,saveDivlinerstyle] = useState(divlinerstyleRef.current) // to trigger render

    let { viewportDimensions, itemobserver, isResizing } = viewportData
    let { top, right, bottom, left, width, height } = viewportDimensions

    // state engine
    useEffect(()=>{
        switch (blockstate) {
            case 'prepare': {
                setBlockState('render')
                break
            }
        }
    },[blockstate])
    
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

    return (blockstate != 'prepare')
        ?<div ref = {scrollblockRef} style={divlinerstyleRef.current}>{children}</div>
        :null

} // Scrollblock

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

    let crosscount = Math.floor(viewportcrosslength/crosslength)

    let listlength = Math.ceil(listsize/crosscount)

    let straightlength = (listlength * cellLength) - ((listlength > 0)?gap:0) + (padding * 2)

    return straightlength

}

const updateScrollblockStyles = (orientation,stylesRef,scrollblocklengthRef) => {

    let localstyles = Object.assign({},stylesRef.current) as React.CSSProperties
    if (orientation == 'horizontal') {
        localstyles.height = '100%'
        localstyles.width = scrollblocklengthRef.current + 'px'
    } else if (orientation == 'vertical') {
        localstyles.height = scrollblocklengthRef.current + 'px'
        localstyles.width = '100%'
    }
    return localstyles
}

export default Scrollblock
