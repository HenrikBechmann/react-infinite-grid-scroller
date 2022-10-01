// styleshandler.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module provides the Cradle component with one key function: getCradleStyles.
    It returns an array of style objects for
        headstyles,
        tailstyles,
        axisstyles,
        triggerlineaxisstyles,
        triggerlineheadstyles,
        cradledividerstyles
*/

export default class StylesHandler { 

   constructor(cradleParameters) {

      this.cradleParameters = cradleParameters

    }

    private cradleParameters

    public getCradleStyles = ({

        orientation, 
        cellHeight, 
        cellWidth, 
        cellMinHeight,
        cellMinWidth,
        gap,
        padding, 
        crosscount, 
        viewportheight, 
        viewportwidth,
        userstyles,
        triggerlineOffset,
        layout,

    }) => {

        const headstyles = this.getHeadStyles(gap, padding, orientation, userstyles.cradle)
        const tailstyles = this.getTailStyles(gap, padding, orientation, userstyles.cradle)
        const axisstyles = this.getAxisStyles(gap, padding, orientation, userstyles.axis)

        const triggercelltriggerlineheadstyles =
            this.getTriggercellTriggerlineHeadStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)
        const triggercelltriggerlinetailstyles = 
            this.getTriggercellTriggerlineTailStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)


        // layoutHandler.triggerlineSpan = this.axisTriggerlineOffset - this.headTriggerlineOffset

        const cradledividerstyles = 
            {
                zIndex:1, 
                position:'absolute',
                width:'100%',
                height:'100%',
                boxShadow:'0 0 5px 3px red'
            }

        headstyles.gridGap = gap + 'px'

        tailstyles.gridGap = gap + 'px'

        if (orientation == 'vertical') {

            // headgrid
            headstyles.padding = `${padding}px ${padding}px 0 ${padding}px`

            headstyles.width = '100%'
            headstyles.height = 'auto'
            headstyles.gridAutoFlow = 'row'
            
            headstyles.gridTemplateRows = null
            headstyles.gridAutoColumns = null
            headstyles.gridAutoRows = 
                (layout == 'uniform')?
                    null:
                    'max-content'
            headstyles.gridTemplateColumns = 
                cellWidth?
                    `repeat(auto-fill, minmax(${cellWidth}px, 1fr))`:
                    'auto'

            // tailgrid
            tailstyles.padding = `0 ${padding}px ${padding}px ${padding}px`

            tailstyles.width = '100%'
            tailstyles.height = 'auto'
            tailstyles.gridAutoFlow = 'row'
            
            tailstyles.gridTemplateRows = null
            tailstyles.gridAutoColumns = null    
            tailstyles.gridAutoRows = 
                (layout == 'uniform')?
                    null:
                    'max-content'
            tailstyles.gridTemplateColumns = 
                cellWidth?
                    `repeat(auto-fill, minmax(${cellWidth}px, 1fr))`:
                    'auto'

        } else { // orientation == 'horizontal'

            // headgrid
            headstyles.padding = `${padding}px 0 ${padding}px ${padding}px`

            headstyles.width = 'auto'
            headstyles.height = '100%'
            headstyles.gridAutoFlow = 'column'
            // explict crosscount next line for some browsers - 
            headstyles.gridTemplateRows = 
                cellHeight?
                    `repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:
                    'auto'
            headstyles.gridTemplateColumns = null

            headstyles.gridAutoColumns = 
                (layout == 'uniform')?
                    null:
                    'max-content'
            headstyles.gridAutoRows = null

            // tailgrid
            tailstyles.padding = `${padding}px ${padding}px ${padding}px 0`

            tailstyles.width = 'auto'
            tailstyles.height = '100%'
            tailstyles.gridAutoFlow = 'column'
            // explict crosscount next line for some browsers - 
            tailstyles.gridTemplateRows = 
                cellHeight?
                    `repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:
                    'auto'
            tailstyles.gridTemplateColumns = null
            tailstyles.gridAutoColumns = 
                (layout == 'uniform')?
                    null:
                    'max-content'
            tailstyles.gridAutoRows = null
            
        }

        return [
            headstyles,
            tailstyles,
            axisstyles,
            cradledividerstyles,
            triggercelltriggerlineheadstyles,
            triggercelltriggerlinetailstyles,
        ]
        
    }

    private getHeadStyles = (gap,padding,orientation,userheadstyles) => {

        let bottom, left, top, right

        if (orientation == 'vertical') {
            bottom = 0
            left = null
            right = null
            top = null
        } else {
            bottom = null
            left = null
            right = 0
            top = null
        }

        return {
            ...userheadstyles,
            position: 'absolute',
            display: 'grid',
            gridGap: gap + 'px',
            padding: padding + 'px',
            // justifyContent:'start',
            // alignContent:'start',
            boxSizing:'border-box',
            bottom,
            left,
            right,
            top,
        }
    }

    private getTailStyles = (gap,padding,orientation,usertailstyles) => {

        let bottom, left, top, right

        if (orientation == 'vertical') {
            bottom = null
            left = null
            right = null
            top = 0
        } else {
            bottom = null
            left = 0
            right = null
            top = null
        }

        return {
            ...usertailstyles,
            position: 'absolute',
            // backgroundColor: 'blue',
            display: 'grid',
            gridGap: gap + 'px',
            padding: padding + 'px',
            // justifyContent:'start',
            // alignContent:'start',
            boxSizing:'border-box',
            top,
            left,
            right,
            bottom,
        } 
    }

    private getAxisStyles = (gap, padding, orientation, useraxisstyles) => {
        let top, left, width, height // for axis

        if (orientation == 'vertical') {
            top = padding + 'px'
            left = 'auto'
            width = '100%'
            height = 'auto'
        } else {
            top = 'auto'
            left = padding + 'px'
            width = 0
            height = '100%'
        }

        return {
            ...useraxisstyles,
            position: 'relative',
            top,
            left,
            width,
            height,

        }

    }

    private getTriggercellTriggerlineHeadStyles = (orientation, cellHeight, cellWidth, triggerlineOffset, gap) => {

        const position = 'absolute'

        let width, height, top, left
        if (orientation == 'vertical') {

            height = '0px'
            width = '100%'
            left = 'auto'
            top = triggerlineOffset + 'px'

        } else {

            height = '100%'
            width = '0px'
            left = triggerlineOffset + 'px'
            top = 'auto'

        }
                
        return {

            position,
            width,
            height,
            top,
            left,

        }
    }
    private getTriggercellTriggerlineTailStyles = (orientation, cellHeight, cellWidth, triggerlineOffset, gap) => {

        const position = 'absolute'

        let width, height, bottom, right
        if (orientation == 'vertical') {

            height = '0px'
            width = '100%'
            bottom = -(triggerlineOffset + gap) + 'px'
            right = 'auto'

        } else {

            height = '100%'
            width = '0px'
            bottom = 'auto'
            right = -(triggerlineOffset + gap) + 'px'

        }
                
        return {

            position,
            width,
            height,
            bottom,
            right,
            
        }
    }
}
