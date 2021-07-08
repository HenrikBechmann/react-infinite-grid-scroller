// stylesmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class StylesManager extends CradleManagement{

   constructor(commonPropsRef) {

      super(commonPropsRef)

    }

    setCradleGridStyles = ({

        orientation, 
        headCradleStyles:headstylesobject, 
        tailCradleStyles:tailstylesobject,
        cellHeight, 
        cellWidth, 
        gap,
        padding, 
        crosscount, 
        viewportheight, 
        viewportwidth

    }) => {

        // console.log('setCradleGridStyles orientation, crosscount',orientation, crosscount)
        // if (orientation == 'horizontal') crosscount = 8

        let headstyles = {...headstylesobject} as React.CSSProperties
        let tailstyles = {...tailstylesobject} as React.CSSProperties

        headstyles.gridGap = gap + 'px'

        tailstyles.gridGap = gap + 'px'

        if (orientation == 'horizontal') {

            headstyles.padding = `${padding}px 0 ${padding}px ${padding}px`

            headstyles.width = 'auto'
            headstyles.height = '100%'
            headstyles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            headstyles.gridTemplateRows = cellHeight?`repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:'auto'
            // headstyles.gridTemplateRows = cellHeight?`repeat(auto-fit, minmax(${cellHeight}px, 1fr))`:'auto'
            headstyles.gridTemplateColumns = 'none'

            tailstyles.padding = `${padding}px ${padding}px ${padding}px 0`

            tailstyles.width = 'auto'
            tailstyles.height = '100%'
            tailstyles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            tailstyles.gridTemplateRows = cellHeight?`repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:'auto'
            // tailstyles.gridTemplateRows = cellHeight?`repeat(auto-fit, minmax(${cellHeight}px, 1fr))`:'auto'
            tailstyles.gridTemplateColumns = 'none'

        } else if (orientation == 'vertical') {

            headstyles.padding = `${padding}px ${padding}px 0 ${padding}px`

            headstyles.width = '100%'
            headstyles.height = 'auto'
            headstyles.gridAutoFlow = 'row'
            
            headstyles.gridTemplateRows = 'none'
            headstyles.gridTemplateColumns = cellWidth?`repeat(auto-fit, minmax(${cellWidth}px, 1fr))`:'auto'

            tailstyles.padding = `0 ${padding}px ${padding}px ${padding}px`

            tailstyles.width = '100%'
            tailstyles.height = 'auto'
            tailstyles.gridAutoFlow = 'row'
            
            tailstyles.gridTemplateRows = 'none'
            tailstyles.gridTemplateColumns = cellWidth?`repeat(auto-fit, minmax(${cellWidth}px, 1fr))`:'auto'

        }

        return [headstyles,tailstyles]
        
    }
}