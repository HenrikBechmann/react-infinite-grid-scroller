// basecradle.tsx
// copyright (c) 2020 Henrik Bechmann, Toronto, Licence: MIT

import React from 'react'

const shadowoffset = 0

const Basecradle = (props) => {
    let {cradlestyles} = props
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
        },
        wrapper:{
            position:'absolute',
            top:shadowoffset + top,
            right,
            bottom,
            left,
            height,
            width,
        }
    }

    return <>
        <div style = {styles.curtain as React.CSSProperties} ></div>
        <div style = {styles.wrapper as React.CSSProperties} ></div>
    </>
}

export default Basecradle