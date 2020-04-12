// basecradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

const shadowoffset = 0

const Basecradle = (props) => {
    let {cradlestyles} = props

    console.log('cradlestyles in Basecradle',cradlestyles)

    let {
        top,
        right,
        bottom,
        left,
        height,
        width,
    } = cradlestyles

    const styles = {
        curtain:{
            backgroundColor:'white',
            position:'fixed',
            top: '-100px',
            right: '-100px',
            bottom: '-100px',
            left: '-100px',
            zIndex:-10,
        },
        wrapper:{
            position:'absolute',
            top,
            right,
            bottom,
            left,
            height,
            width,
            zIndex:-100,
        }
    }

    return <>
        <div style = {styles.curtain as React.CSSProperties} >
            <div style = {styles.wrapper as React.CSSProperties} ></div>
        </div>
    </>
}

export default Basecradle