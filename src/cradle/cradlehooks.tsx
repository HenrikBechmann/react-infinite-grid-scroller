// cradlehooks.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useMemo, useEffect, useLayoutEffect, useCallback}from 'react'

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

export const useEventListenerEffect = ({viewportElement, scrollHandler}) => {

    useEffect(() => {

        viewportElement.addEventListener('scroll',scrollHandler.onScroll)

        return () => {

            viewportElement && 
                viewportElement.removeEventListener('scroll',scrollHandler.onScroll)

        }

    },[])

}

// There are two interection observers: one for the two cradle grids, and another for triggerlines; 
// both against the viewport.
export const useObserverEffect = ({interruptHandler}) => {

    useEffect(()=>{

        const {
            cradleIntersect,
            triggerlinesIntersect,
        } = interruptHandler

        // intersection observer for cradle body
        // this sets up an IntersectionObserver of the cradle against the viewport. When the
        // cradle goes out of the observer scope, the 'repositioningRender' cradle state is triggered.
        const cradleintersectobserver = cradleIntersect.createObserver()
        cradleIntersect.connectElements()

        // triggerobserver triggers cradle content updates 
        //     when triggerlines pass the edge of the viewport
        // defer connectElements until triggercell triggerlines have been assigned
        const triggerobserver = triggerlinesIntersect.createObserver()

        return () => {

            cradleintersectobserver.disconnect()
            triggerobserver.disconnect()

        }

    },[])

}

export const useNullItemCallback = ({listsize, serviceHandler, contentHandler, cacheAPI}) => {

    const nullItemSetMaxListsize = useCallback((maxListsize) => {

        if (maxListsize < listsize) {

            const { deleteListCallback, changeListSizeCallback } = serviceHandler.callbacks

            let dListCallback
            if (deleteListCallback) {
                dListCallback = (deleteList) => {

                    deleteListCallback('getItem returned null',deleteList)

                }

            }

            contentHandler.updateVirtualListSize(maxListsize)
            cacheAPI.changeCacheListSize(maxListsize, 
                dListCallback,
                changeListSizeCallback)

        }
    },[listsize])

}

export const useCachingChangeEffect = ({

    cradleStateRef, 
    cache, 
    cacheMax, 
    contentHandler, 
    serviceHandler, 
    cacheAPI, 
    setCradleState

}) => {

    // caching change
    useEffect(()=> {

        if (cache == 'preload') {

            setCradleState('startpreload')

            return

        }

        if (cradleStateRef.current == 'setup') return

        switch (cache) {

            case 'keepload': {

                const modelIndexList = contentHandler.getModelIndexList()

                const { deleteListCallback } = serviceHandler.callbacks

                let dListCallback
                if (deleteListCallback) {
                    dListCallback = (deleteList) => {

                        deleteListCallback('pare cache to cacheMax',deleteList)

                    }

                }

                // const { cacheMax } = cradleParameters.cradleInheritedPropertiesRef.current

                if (cacheAPI.pareCacheToMax(cacheMax, modelIndexList, dListCallback)) {

                    cacheAPI.renderPortalLists()
                    
                }

                setCradleState('changecaching')

                break
            }

            case 'cradle': {

                const modelIndexList = contentHandler.getModelIndexList()

                const { deleteListCallback } = serviceHandler.callbacks

                let dListCallback
                if (deleteListCallback) {
                    dListCallback = (deleteList) => {

                        deleteListCallback('match cache to cradle',deleteList)

                    }

                }

                if (cacheAPI.matchCacheToCradle(modelIndexList, dListCallback)) {

                    cacheAPI.renderPortalLists()

                }

                setCradleState('changecaching')

                break
            }

        }

    },[cache, cacheMax])

}

export const useResizingEffect = ({
    cradleStateRef, 
    isCachedRef, 
    wasCachedRef,
    isResizing, 
    interruptHandler, 
    setCradleState
}) => {

    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        // movement to and from cache is independent of ui viewportresizing
        if (isCachedRef.current || wasCachedRef.current) {

            return

        }

        if ((isResizing) && 
                (cradleStateRef.current != 'viewportresizing')) {

            interruptHandler.pauseInterrupts()
 
            setCradleState('viewportresizing')

        }

        // complete viewportresizing mode
        if (!isResizing && (cradleStateRef.current == 'viewportresizing')) {

            setCradleState('finishviewportresize')

        }

    },[isResizing])

}

export const useReconfigureEffect = ({

    cellHeight,
    cellWidth,
    gapProps,
    paddingProps,
    triggerlineOffset,
    layout,
    runwaySize,
    cradleStateRef,
    isCachedRef,
    interruptHandler,
    setCradleState,        

}) => {

    // reconfigure for changed size parameters
    useEffect(()=>{

        if (cradleStateRef.current == 'setup') return

        if (isCachedRef.current) return

        interruptHandler.pauseInterrupts()

        setCradleState('reconfigure')

    },[
        cellHeight,
        cellWidth,
        gapProps,
        paddingProps,
        triggerlineOffset,
        layout,
        runwaySize,
    ])

}

export const useListRangeEffect = ({
    lowindex,
    highindex,
    cradleStateRef,
    isCachedRef,
    interruptHandler,
    setCradleState,
}) => {
    useEffect(()=>{ // change of list range

        if (cradleStateRef.current == 'setup') return

        if (isCachedRef.current) return // TODO: ??

        interruptHandler.pauseInterrupts()

        setCradleState('reconfigureforlistrange')

    },[
        lowindex,
        highindex,
    ])
}

export const useItemPackEffect = ({
    getItem, 
    getItemPack,
    cradleStateRef,
    interruptHandler,
    setCradleState,
}) => {
    useEffect(() => {

        if (cradleStateRef.current == 'setup') return

        interruptHandler.pauseInterrupts()

        setCradleState('reload')

    },[getItem, getItemPack])
}

export const usePivotEffect = ({
    orientation, 
    layout,
    gapProps,
    isCachedRef,
    hasBeenRenderedRef,
    cradleInheritedPropertiesRef,
    cradleStateRef,
    layoutHandler,
    interruptHandler,
    setCradleState,
}) => {
    useEffect(()=> {

        layoutHandler.cradlePositionData.blockScrollProperty = 
            (orientation == "vertical")?
                "scrollTop":
                "scrollLeft"

        layoutHandler.cradlePositionData.blockXScrollProperty = 
            (orientation == "horizontal")?
                "scrollTop":
                "scrollLeft"

        if (cradleStateRef.current == 'setup') {
            layoutHandler.cradlePositionData.trackingBlockScrollPos = 0
            layoutHandler.cradlePositionData.trackingXBlockScrollPos = 0
            return

        }

        interruptHandler.pauseInterrupts()
        // interruptHandler.triggerlinesIntersect.disconnect()
        
        if (isCachedRef.current) {
            // cacheAPI.measureMemory('pivot cached')
            // interruptHandler.pauseInterrupts() // suppress triggerline callbacks; will render for first render from cache
            // setCradleState('cached')
            hasBeenRenderedRef.current = false
            return
        }

        // cacheAPI.measureMemory('pivot')

        const 
            // { layout } = cradleInheritedPropertiesRef.current,
            { cradlePositionData } = layoutHandler,

            gaplength = 
                (orientation == 'vertical')?
                    gapProps.column:
                    gapProps.row,

            gapxlength = 
                (orientation == 'vertical')?
                    gapProps.row:
                    gapProps.column

        if (layout == 'uniform') {

            const 
                { 
                    cellWidth,
                    cellHeight,
                    gapProps,
                } = cradleInheritedPropertiesRef.current,

            // get previous ratio
                previousCellPixelLength = 
                    ((orientation == 'vertical')?
                        cellWidth:
                        cellHeight)
                    + gapxlength,

                previousPixelOffsetAxisFromViewport = 
                    layoutHandler.cradlePositionData.targetPixelOffsetAxisFromViewport,

                previousratio = previousPixelOffsetAxisFromViewport/previousCellPixelLength,

                pivotCellPixelLength = 
                    ((orientation == 'vertical')?
                        cellHeight:
                        cellWidth)
                + gaplength,

                pivotAxisOffset = previousratio * pivotCellPixelLength

            cradlePositionData.targetPixelOffsetAxisFromViewport = Math.round(pivotAxisOffset)

        } else {

            cradlePositionData.targetPixelOffsetAxisFromViewport = gapxlength

        }

        setCradleState('pivot')

    },[orientation, layout]) // TODO: check for side-effects of layout-only change
}

export const useCradleStyles = ({
    orientation,
    cellHeight,
    cellWidth,
    cellMinHeight,
    cellMinWidth,
    gapProps,
    viewportheight,
    viewportwidth,
    crosscount,
    styles,
    triggerlineOffset,
    layout,
    stylesHandler,
}) => {

    const [
        cradleHeadStyle,
        cradleTailStyle,
        cradleAxisStyle,
        cradleDividerStyle,
        triggercellTriggerlineHeadStyle,
        triggercellTriggerlineTailStyle,
    ] = useMemo(()=> {

        return stylesHandler.getCradleStyles({

            orientation, 
            cellHeight, 
            cellWidth, 
            cellMinHeight,
            cellMinWidth,
            gapProps,
            viewportheight, 
            viewportwidth,
            crosscount, 
            userstyles:styles,
            triggerlineOffset,
            layout,

        })

    },[

        orientation,
        cellHeight,
        cellWidth,
        cellMinHeight,
        cellMinWidth,
        gapProps,
        viewportheight,
        viewportwidth,
        crosscount,
        styles,
        triggerlineOffset,
        layout,

      ])
    return [
        cradleHeadStyle,
        cradleTailStyle,
        cradleAxisStyle,
        cradleDividerStyle,
        triggercellTriggerlineHeadStyle,
        triggercellTriggerlineTailStyle,
    ]
}

export const useCradleStateStandardEffects = ({
    cradleState,
    layoutHandler,
    setCradleState
}) => {
    useEffect(()=> { 

        switch (cradleState) {

            // repositioningRender and repositioningContinuation are toggled to generate continuous 
            // repositioning renders
            case 'repositioningRender': // no-op
                break

            case 'ready':

                if (layoutHandler.boundaryNotificationsRequired()) {

                    setCradleState('triggerboundarynotications')

                }

                break

        }

    },[cradleState])
}

