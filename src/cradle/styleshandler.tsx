// styleshandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StylesHandler { 

   constructor(cradleParameters) {

      this.cradleParameters = cradleParameters

    }

    private cradleParameters

    public setCradleStyles = ({

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

        // TODO: change 'cradle' to 'head' and 'tail' for more granularity
        // TODO: triggerline offset for head styles experimentally set to negative
        //    to assure a brealline is always available for notification
        const headstyles:React.CSSProperties = this.getHeadStyles(gap, padding, orientation, userstyles.cradle)
        const tailstyles:React.CSSProperties = this.getTailStyles(gap, padding, orientation, userstyles.cradle)
        const axisstyles:React.CSSProperties = this.getAxisStyles(gap, padding, orientation, userstyles.axis)
        const triggerlineheadstyles:React.CSSProperties = this.getTriggerlineHeadStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)
        const triggerlinetailstyles:React.CSSProperties = this.getTriggerlineTailStyles(orientation,cellHeight, cellWidth, triggerlineOffset, gap)
        const cradledividerstyles:React.CSSProperties = 
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
                    `repeat(auto-fit, minmax(${cellWidth}px, 1fr))`:
                    'auto'

            tailstyles.padding = `0 ${padding}px ${padding}px ${padding}px`

            tailstyles.width = '100%'
            tailstyles.height = 'auto'
            tailstyles.gridAutoFlow = 'row'
            
            tailstyles.gridTemplateRows = 'none'
            tailstyles.gridTemplateColumns = 
                cellWidth?
                    `repeat(auto-fit, minmax(${cellWidth}px, 1fr))`:
                    'auto'

        }

        return [
            headstyles,
            tailstyles,
            axisstyles,
            triggerlineheadstyles,
            triggerlinetailstyles,
            cradledividerstyles
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

        return {...{

            position: 'absolute',
            backgroundColor: 'blue',
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

        } as React.CSSProperties,...userheadstyles}

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

        return {...{

            position: 'absolute',
            backgroundColor: 'blue',
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

        } as React.CSSProperties,...usertailstyles}

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

        return { ...{
            position: 'relative',
            top,
            left,
            width,
            height,

        } as React.CSSProperties,...useraxisstyles}

    }

    private getTriggerlineTailStyles = (orientation, cellHeight, cellWidth, triggerlineOffset, gap) => {
        let transform // for position relative to axis
        let position = 'absolute',
            // backgroundColor = 'blue',
            width = '100%',
            height = '100%'

        if (orientation == 'horizontal') {
            // width = '5px'
            // height = '100%'
            transform = `translateX(${triggerlineOffset + 'px'})`
        } else {
            // width = '100%'
            // height = '5px'
            transform = `translateY(${triggerlineOffset + 'px'})`
        }
        return { ...{
            position,
            width,
            height,
            transform,
            // backgroundColor
        } as React.CSSProperties}
    }


    private getTriggerlineHeadStyles = (orientation, cellHeight, cellWidth, triggerlineOffset, gap) => {
        let transform // for position relative to axis

        let position = 'absolute',
            // backgroundColor = 'blue',
            width = '100%',
            height = '100%'
        if (orientation == 'horizontal') {
            // width = '5px'
            // height = '100%'
            transform = `translateX(${-(cellWidth + gap -triggerlineOffset) + 'px'})`
        } else {
            // width = '100%'
            // height = '5px'
            transform = `translateY(${-(cellHeight + gap -triggerlineOffset) + 'px'})`
        }
        return { ...{
            position,
            width,
            height,
            transform,
            // backgroundColor,
        } as React.CSSProperties}
    }
}
