// cellfunctions.tsx
// copyright (c) 2019-present Henrik Bechmann, Toronto, Licence: MIT

import type { CSSProperties } from 'react'

// utilities
export const getFrameStyles = 
    (orientation, cellHeight, cellWidth, cellMinHeight, cellMinWidth, layout, styles) => {

    const styleset = {...styles,position:'relative', overflow:'visible'}

    if (orientation === 'vertical') {

        styleset.width = null
        if (layout == 'uniform') {

            styleset.height = cellHeight + 'px'
            styleset.minHeight = null
            styleset.maxHeight = null

        } else { // 'variable'

            styleset.height = null
            styleset.minHeight = cellMinHeight + 'px'
            styleset.maxHeight = cellHeight + 'px'

        }
        
    } else { // 'horizontal'

        styleset.height = null
        if (layout == 'uniform') {

            styleset.width = cellWidth + 'px'
            styleset.minWidth = null
            styleset.maxWidth = null

        } else { // 'variable'

            styleset.width = null
            styleset.minWidth = cellMinWidth + 'px'
            styleset.maxWidth = cellWidth + 'px'

        }

    }

    return styleset

}

export const getContentHolderStyles = (layout,orientation,cellMinWidth, cellMinHeight ) => {
    let styles:CSSProperties = {}
    if (layout == 'uniform') {
        styles = {
            inset:'0px',
            position:'absolute',
            height:null,
            width:null,
            minWidth:null,
            minHeight:null,
        }
    } else { // variable
        styles.inset = null
        styles.position = null
        if (orientation == 'vertical') {
            styles.width = '100%'
            styles.height = null
            styles.minWidth = null
            styles.minHeight = cellMinHeight + 'px'
        } else {
            styles.width = null
            styles.height = '100%'
            styles.minWidth = cellMinWidth + 'px'
            styles.minHeight = null
        }
    }
    return styles
}

// see also some base styles set in cacheAPI
export const setContainerStyles = (container, layout, orientation, cellWidth, cellHeight) => {

    // container.style.overflow = 'hidden'

    if (layout == 'uniform') {

        container.style.inset = '0px' 
        container.style.position = 'absolute'
        container.style.maxWidth = null
        container.style.maxHeight = null
        container.style.height = null
        container.style.width = null

    } else { // variable

        container.style.inset = null 
        container.style.position = null

        if (orientation == 'vertical') {

            container.style.width = '100%'
            container.style.height = null
            container.style.maxWidth = null
            container.style.maxHeight = cellHeight + 'px'

        } else {

            container.style.width = null
            container.style.height = '100%'
            container.style.maxWidth = cellWidth + 'px'
            container.style.maxHeight = null

        }

    }
}

