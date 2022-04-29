// styleshandler.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class StylesHandler { 

   constructor(cradleParameters) {

      this.cradleParameters = cradleParameters

    }

    cradleParameters

    setCradleStyles = ({

        orientation, 
        cellHeight, 
        cellWidth, 
        gap,
        padding, 
        crosscount, 
        viewportheight, 
        viewportwidth,
        userstyles,
        breaklineOffset,

    }) => {

        // TODO: change 'cradle' to 'head' and 'tail' for more granularity
        const headstyles:React.CSSProperties = this.getHeadStyles(gap, padding, orientation, userstyles.cradle)
        const tailstyles:React.CSSProperties = this.getTailStyles(gap, padding, orientation, userstyles.cradle)
        const axisstyles:React.CSSProperties = this.getAxisStyles(gap, padding, orientation, userstyles.axis)
        const breaklineheadstyles:React.CSSProperties = this.getBreaklineHeadStyles(orientation,cellHeight, cellWidth, breaklineOffset)
        const breaklinetailstyles:React.CSSProperties = this.getBreaklineTailStyles(orientation,cellHeight, cellWidth, breaklineOffset)
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

        return [
            headstyles,
            tailstyles,
            axisstyles,
            breaklineheadstyles,
            breaklinetailstyles,
            cradledividerstyles
        ]
        
    }

    getHeadStyles = (gap,padding,orientation,userheadstyles) => {

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

    getTailStyles = (gap,padding,orientation,usertailstyles) => {

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

    getAxisStyles = (gap, padding, orientation, useraxisstyles) => {
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

    getBreaklineTailStyles = (orientation, cellHeight, cellWidth, breaklineOffset) => {
        let transform // for position relative to axis
        const position = 'absolute',
            width = '100%',
            height = '100%'

        if (orientation == 'horizontal') {
            // width = 0
            // height = cellHeight + 'px'
            transform = `translateX(${breaklineOffset + 'px'})`
        } else {
            // width = 'auto'
            // height = 0
            transform = `translateY(${breaklineOffset + 'px'})`
        }
        return { ...{
            position,
            width,
            height,
            transform
        } as React.CSSProperties}
    }


    getBreaklineHeadStyles = (orientation, cellHeight, cellWidth, breaklineOffset) => {
        let transform // for position relative to axis
        const position = 'absolute',
            width = '100%',
            height = '100%'
        if (orientation == 'horizontal') {
            // width = 0
            // height = cellHeight + 'px'
            transform = `translateX(${-(cellHeight -breaklineOffset) + 'px'})`
        } else {
            // width = 'auto'
            // height = 0
            transform = `translateY(${-(cellWidth -breaklineOffset) + 'px'})`
        }
        return { ...{
            position,
            width,
            height,
            transform
        } as React.CSSProperties}
    }
}
