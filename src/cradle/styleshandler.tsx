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

    private headTriggerlineOffset
    private axisTriggerlineOffset
    private headTriggercellTriggerlineOffset
    private tailTriggercellTriggerlineOffset

    public getCradleStyles = ({

        orientation, 
        cellHeight, 
        cellWidth, 
        gap,
        padding, 
        crosscount, 
        viewportheight, 
        viewportwidth,
        userstyles,
        triggerlineOffset,

    }) => {

        const headstyles = this.getHeadStyles(gap, padding, orientation, userstyles.cradle)
        const tailstyles = this.getTailStyles(gap, padding, orientation, userstyles.cradle)
        const axisstyles = this.getAxisStyles(gap, padding, orientation, userstyles.axis)

        const { layoutHandler } = this.cradleParameters.handlersRef.current
        const triggerlineaxisstyles = 
            this.getTriggerlineAxisStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)
        const triggerlineheadstyles = 
            this.getTriggerlineHeadStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)

        const triggercelltriggerlineheadstyles =
            this.getTriggercellTriggerlineHeadStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)
        const triggercelltriggerlinetailstyles = 
            this.getTriggercellTriggerlineTailStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)


        layoutHandler.triggerlineSpan = this.axisTriggerlineOffset - this.headTriggerlineOffset

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

        if (orientation == 'horizontal') {

            headstyles.padding = `${padding}px 0 ${padding}px ${padding}px`

            headstyles.width = 'auto'
            headstyles.height = '100%'
            headstyles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            headstyles.gridTemplateRows = 
                cellHeight?
                    `repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:
                    'auto'
            headstyles.gridTemplateColumns = 'none'

            tailstyles.padding = `${padding}px ${padding}px ${padding}px 0`

            tailstyles.width = 'auto'
            tailstyles.height = '100%'
            tailstyles.gridAutoFlow = 'column'
            // explict crosscount next line as workaround for FF problem - 
            //     sets length of horiz cradle items in one line (row), not multi-row config
            tailstyles.gridTemplateRows = 
                cellHeight?
                    `repeat(${crosscount}, minmax(${cellHeight}px, 1fr))`:
                    'auto'
            tailstyles.gridTemplateColumns = 'none'

        } else if (orientation == 'vertical') {

            headstyles.padding = `${padding}px ${padding}px 0 ${padding}px`

            headstyles.width = '100%'
            headstyles.height = 'auto'
            headstyles.gridAutoFlow = 'row'
            
            headstyles.gridTemplateRows = 'none'
            headstyles.gridTemplateColumns = 
                cellWidth?
                    `repeat(auto-fill, minmax(${cellWidth}px, 1fr))`:
                    'auto'

            tailstyles.padding = `0 ${padding}px ${padding}px ${padding}px`

            tailstyles.width = '100%'
            tailstyles.height = 'auto'
            tailstyles.gridAutoFlow = 'row'
            
            tailstyles.gridTemplateRows = 'none'
            tailstyles.gridTemplateColumns = 
                cellWidth?
                    `repeat(auto-fill, minmax(${cellWidth}px, 1fr))`:
                    'auto'

        }

        return [
            headstyles,
            tailstyles,
            axisstyles,
            triggerlineaxisstyles,
            triggerlineheadstyles,
            cradledividerstyles,
            triggercelltriggerlineheadstyles,
            triggercelltriggerlinetailstyles,
        ]
        
    }

    private getHeadStyles = (gap,padding,orientation,userheadstyles) => {

        let bottom, left, top, right

        if (orientation == 'vertical') {
            bottom = 0
            left = 0
            right = 0
            top = 'auto'
        } else {
            bottom = 0
            left = 'auto'
            right = 0
            top = 0
        }

        return {
            ...userheadstyles,
            position: 'absolute',
            display: 'grid',
            gridGap: gap + 'px',
            padding: padding + 'px',
            justifyContent:'start',
            alignContent:'start',
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
            bottom = 'auto'
            left = 0
            right = 0
            top = 0
        } else {
            bottom = 0
            left = 0
            right = 'auto'
            top = 0
        }

        return {
            ...usertailstyles,
            position: 'absolute',
            // backgroundColor: 'blue',
            display: 'grid',
            gridGap: gap + 'px',
            padding: padding + 'px',
            justifyContent:'start',
            alignContent:'start',
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

    private getTriggerlineAxisStyles = (orientation, cellHeight, cellWidth, triggerlineOffset, gap) => {

        const position = 'absolute',
            width = '100%',
            height = '100%'

        this.axisTriggerlineOffset = triggerlineOffset

        const transform = // for position relative to axis
            (orientation == 'horizontal')?
                `translateX(${triggerlineOffset + 'px'})`:
                `translateY(${triggerlineOffset + 'px'})`

        return {
            position,
            width,
            height,
            transform,
        }
    }


    private getTriggerlineHeadStyles = (orientation, cellHeight, cellWidth, triggerlineOffset, gap) => {

        const position = 'absolute',
            width = '100%',
            height = '100%'

        this.headTriggerlineOffset = 
            (orientation == 'horizontal')?
                -(cellWidth + gap -triggerlineOffset):
                -(cellHeight + gap -triggerlineOffset)
                
        const transform = // for position relative to axis
            (orientation == 'horizontal')?
                `translateX(${this.headTriggerlineOffset + 'px'})`:
                `translateY(${this.headTriggerlineOffset + 'px'})`

        return {
            position,
            width,
            height,
            transform,
        }
    }

    private getTriggercellTriggerlineHeadStyles = (orientation, cellHeight, cellWidth, triggerlineOffset, gap) => {

        const position = 'absolute'

        let width, height, top, left
        if (orientation == 'horizontal') {

            height = '100%'
            width = '0px'
            left = triggerlineOffset + 'px'
            top = 'auto'

        } else {
            height = '0px'
            width = '100%'
            left = 'auto'
            top = triggerlineOffset + 'px'
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
        if (orientation == 'horizontal') {

            height = '100%'
            width = '0px'
            bottom = 'auto'
            right = triggerlineOffset + 'px'

        } else {
            height = '0px'
            width = '100%'
            bottom = triggerlineOffset + 'px'
            right = 'auto'
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
