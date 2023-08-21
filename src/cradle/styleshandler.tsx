// styleshandler.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*
    This module provides the Cradle component with one key public function: getCradleStyles.
    It returns an array of style objects for
        headstyles,
        tailstyles,
        axisstyles,
        cradledividerstyles
        triggercelltriggerlineheadstyles,
        triggercelltriggerlinetailstyles,
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
        gapProps,
        crosscount, 
        userstyles,
        triggerlineOffset,
        layout,

    }) => {

        const 
            headstyles = this.getBaseHeadStyles(gapProps, orientation, userstyles.cradle),
            tailstyles = this.getBaseTailStyles(gapProps, orientation, userstyles.cradle),
            axisstyles = this.getAxisStyles(gapProps, orientation),

            triggercelltriggerlineheadstyles =
                this.getTriggercellTriggerlineHeadStyles(
                    orientation,cellHeight, cellWidth, triggerlineOffset, gapProps),
            triggercelltriggerlinetailstyles = 
                this.getTriggercellTriggerlineTailStyles(
                    orientation,cellHeight, cellWidth, triggerlineOffset, gapProps),

            cradledividerstyles = 
                {
                    zIndex:1, 
                    position:'absolute',
                    width:'100%',
                    height:'100%',
                    boxShadow:'0 0 5px 3px red'
                }

        headstyles.gap = tailstyles.gap = gapProps.CSS

        // headstyles.padding set in contentHandler setCradleContent and updateCradleContent
        if (orientation == 'vertical') {

            // padding varies
            tailstyles.padding = `0px`

            // the following are identical for head and tail
            headstyles.width = tailstyles.width = '100%'
            headstyles.height = tailstyles.height = 'auto'

            headstyles.gridTemplateRows = tailstyles.gridTemplateRows = null

            headstyles.gridTemplateColumns = 
            tailstyles.gridTemplateColumns = 
                    `repeat(${crosscount}, minmax(${cellWidth}px, 1fr))`

            headstyles.gridAutoFlow = tailstyles.gridAutoFlow = 'row'

            headstyles.gridAutoRows = 
            tailstyles.gridAutoRows =
                (layout == 'uniform')?
                    null:
                    'max-content'

            headstyles.gridAutoColumns = tailstyles.gridAutoColumns = null

        } else { // orientation == 'horizontal'

            tailstyles.padding = `0px`

            headstyles.width = tailstyles.width = 'auto'
            headstyles.height = tailstyles.height = '100%'

            headstyles.gridTemplateRows = 
            tailstyles.gridTemplateRows = 
                    `repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`

            headstyles.gridTemplateColumns = tailstyles.gridTemplateColumns = null

            headstyles.gridAutoFlow = tailstyles.gridAutoFlow = 'column'
            headstyles.gridAutoRows = tailstyles.gridAutoRows = null

            headstyles.gridAutoColumns = 
            tailstyles.gridAutoColumns = 
                (layout == 'uniform')?
                    null:
                    'max-content'
            
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

    // the top, right, bottom, left setting determine the direction of expansion of the grid block
    private getBaseHeadStyles = 
        (gapProps,orientation,userheadstyles) => {

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
            gridGap: gapProps.CSS,
            boxSizing:'border-box',
            bottom,
            left,
            right,
            top,
        }
    }

    // the top, right, bottom, left setting determine the direction of expansion of the grid block
    private getBaseTailStyles = 
        (gapProps,orientation,usertailstyles) => {

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
            display: 'grid',
            gridGap: gapProps.CSS,
            boxSizing:'border-box',
            top,
            left,
            right,
            bottom,
        } 
    }

    private getAxisStyles = 
        (gapProps, orientation) => {

        let top, left, width, height // for axis

        if (orientation == 'vertical') {

            top = 0 // default
            left = 'auto'
            width = '100%'
            height = 0

        } else {

            top = 'auto'
            left = 0 // default
            width = 0
            height = '100%'

        }

        return {

            position: 'relative',
            top,
            left,
            width,
            height,

        }

    }

    private getTriggercellTriggerlineHeadStyles = 
        (orientation, cellHeight, cellWidth, triggerlineOffset, gapProps) => {

        const position = 'absolute'

        let width, height, top, right, bottom, left

        if (orientation == 'vertical') {

            width = '100%'
            height = 0
            top = triggerlineOffset + 'px'
            right = '0px'
            bottom = null
            left = '0px'

        } else {

            width = 0
            height = '100%'
            top = '0px'
            right = null
            bottom = '0px'
            left = triggerlineOffset + 'px'

        }
                
        return {

            position,
            width,
            height,
            top,
            right,
            bottom,
            left,

        }
    }
    private getTriggercellTriggerlineTailStyles = 
        (orientation, cellHeight, cellWidth, triggerlineOffset, gapProps) => {

        const position = 'absolute'

        let width, height, top, right, bottom, left
        
        if (orientation == 'vertical') {

            width = '100%'
            height = 0
            top = null
            right = '0px'
            bottom = -(triggerlineOffset + gapProps.column) + 'px'
            left = '0px'

        } else {

            width = 0
            height = '100%'
            top = '0px'
            right = -(triggerlineOffset + gapProps.row) + 'px'
            bottom = '0px'
            left = null

        }
                
        return {

            position,
            width,
            height,
            top,
            right,
            bottom,
            left,
            
        }
    }
}
