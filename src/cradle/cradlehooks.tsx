// cradlehooks.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useMemo, useEffect, useLayoutEffect}from 'react'

export const useCrosscount = ({
        orientation, 
        gapProps, 
        paddingProps,
        cellWidth, 
        cellHeight, 
        viewportheight, 
        viewportwidth,
        isCachedRef,
    }) => {

    // crosscount (also calculated by Scrollblock for deriving Scrollblock length)
    const crosscount = useMemo(() => { // the number of cells crossing orientation

        if (isCachedRef.current) return 0

        const 
            viewportcrosslength = 
                (orientation == 'vertical')?
                    viewportwidth:
                    viewportheight,

            crosspadding = 
                (orientation == 'vertical')?
                    paddingProps.left + paddingProps.right:
                    paddingProps.top + paddingProps.bottom,

            crossgap = 
                (orientation == 'vertical')?
                    gapProps.column:
                    gapProps.row,

            // cross length of viewport (gap to match crossLength)
            viewportcrosslengthforcalc = viewportcrosslength - crosspadding + crossgap,

            cellcrosslength = 
                ((orientation == 'vertical')?
                    cellWidth:
                    cellHeight) 
                + crossgap,

            cellcrosslengthforcalc = 
                Math.min(cellcrosslength,viewportcrosslengthforcalc), // result cannot be less than 1

            crosscount = Math.floor(viewportcrosslengthforcalc/cellcrosslengthforcalc)

        return crosscount

    },[
        orientation, 
        gapProps, 
        paddingProps,
        cellWidth, 
        cellHeight, 
        viewportheight, 
        viewportwidth,
    ])

    return crosscount
 }

export const useRowblanks = ({crosscount, listsize, lowindex, highindex}) => {
    const [ baserowblanks, endrowblanks ] = useMemo(()=> {

        if (listsize == 0) {
            return [undefined, undefined]
        }
        // add position adjustment for 0
        const endadjustment =
            (highindex < 0)?
                -1:
                1

        // get initial values
        let baserowblanks = Math.abs(lowindex) % crosscount
        let endrowblanks = (Math.abs(highindex) + endadjustment) % crosscount

        // take inverse depending on direction
        if (lowindex < 0) {
            baserowblanks =
                (baserowblanks == 0)? 
                0:
                crosscount - baserowblanks
        }

        if (highindex >= 0) {
            endrowblanks =
                (endrowblanks == 0)? 
                0:
                crosscount - endrowblanks
        }

        return [baserowblanks, endrowblanks]

    },[crosscount, listsize, lowindex, highindex])

    return [ baserowblanks, endrowblanks ]

}

export const useRowcounts = ({
    orientation, 
    gapProps, 
    cellWidth, 
    cellHeight,
    cellMinWidth,
    cellMinHeight, 
    viewportheight, 
    viewportwidth,

    listsize,
    baserowblanks, 
    endrowblanks,
    runwaySize,
    crosscount,
    layout,

}) => {
    // various row counts
    const [

        cradleRowcount, 
        viewportRowcount,
        listRowcount,
        runwayRowcount,

    ] = useMemo(()=> {

        const 
            viewportLength = 
                (orientation == 'vertical')?
                    viewportheight:
                    viewportwidth,

            gaplength = 
                (orientation == 'vertical')?
                    gapProps.column:
                    gapProps.row

        let baseRowLength
        if (layout == 'uniform') {

            if (orientation == 'vertical') {

                baseRowLength = cellHeight

            } else {

                baseRowLength = cellWidth

            }

        } else { // layout == 'variable'

            if (orientation == 'vertical') {

                baseRowLength = cellMinHeight

            } else {

                baseRowLength = cellMinWidth

            }

        }

        baseRowLength += gaplength

        const viewportRowcount = Math.ceil(viewportLength/baseRowLength)

        const listRowcount = 
            listsize == 0?
            0:
            Math.ceil((listsize + baserowblanks + endrowblanks)/crosscount)

        const calculatedCradleRowcount = viewportRowcount + (runwaySize * 2)

        let cradleRowcount = Math.min(listRowcount, calculatedCradleRowcount)

        let runwayRowcount
        if (cradleRowcount == calculatedCradleRowcount) {

            runwayRowcount = runwaySize

        } else { // cradleRowcount is less than calculatedCradleRowCount

            const diff = (calculatedCradleRowcount - cradleRowcount)
            runwayRowcount = runwaySize - Math.floor(diff/2)
            runwayRowcount = Math.max(0,runwayRowcount)

        }

        let itemcount = cradleRowcount * crosscount
        if (itemcount > listsize) {

            itemcount = listsize
            cradleRowcount = Math.ceil((itemcount + baserowblanks + endrowblanks)/crosscount)

        }

        return [
            cradleRowcount, 
            viewportRowcount, 
            listRowcount,
            runwayRowcount,
            layout,
        ]

    },[
        orientation, 
        gapProps, 
        cellWidth, 
        cellHeight,
        cellMinWidth,
        cellMinHeight, 
        viewportheight, 
        viewportwidth,

        listsize,
        baserowblanks, 
        endrowblanks,
        runwaySize,
        crosscount,
        layout,
    ])

    return [

        cradleRowcount, 
        viewportRowcount,
        listRowcount,
        runwayRowcount,

    ]

}

export const useRangerowshift = ({crosscount,lowindex, listsize}) => {
    const rangerowshift = useMemo(() => {

        return listsize == 0?
            undefined:
            Math.floor(lowindex/crosscount)

    },[crosscount,lowindex, listsize])

    return rangerowshift

}

export const useCachedEffect = ({isCachedRef, wasCachedRef, hasBeenRenderedRef, cradleState, setCradleState}) => {
    // change state for entering or leaving cache
    useLayoutEffect(()=>{

        if (cradleState == 'setup') return // nothing to do

        if (isCachedRef.current && !wasCachedRef.current) { // into cache

            setCradleState('cached')

        } else if (!isCachedRef.current && wasCachedRef.current) { // out of cache

            wasCachedRef.current = false

            if (hasBeenRenderedRef.current) {

                setCradleState('rerenderfromcache')

            } else {

                setCradleState('firstrenderfromcache')

            }

        }

    },[isCachedRef.current, wasCachedRef.current, cradleState])
}

export const useFunctionsCallback = ({functionsCallback, serviceHandler}) => {
    
    useEffect(()=>{

        if (!functionsCallback) return

        const {

            scrollToIndex, 
            scrollToPixel,
            scrollByPixel,
            reload, 
            setListsize, // deprecated
            setListSize,
            setListRange,
            prependIndexCount,
            appendIndexCount,
            clearCache, 

            getCacheIndexMap, 
            getCacheItemMap,
            getCradleIndexMap,
            getPropertiesSnapshot,

            // remapIndexes,
            moveIndex,
            insertIndex,
            removeIndex,

        } = serviceHandler

        const functions = {

            scrollToIndex,
            scrollToPixel,
            scrollByPixel,
            reload,
            setListsize, // deprecated
            setListSize,
            setListRange,
            prependIndexCount,
            appendIndexCount,
            clearCache,
            
            getCacheIndexMap,
            getCacheItemMap,
            getCradleIndexMap,
            getPropertiesSnapshot,

            // remapIndexes,
            moveIndex,
            insertIndex,
            removeIndex,

        }

        functionsCallback(functions)

    },[])

}
