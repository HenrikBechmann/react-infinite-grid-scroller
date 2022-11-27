// Placeholder.tsx
// copyright (c) 2019-2022 Henrik Bechmann, Toronto, Licence: MIT

/*
    The role of the default PlaceHolder is to hold the content display until the host content
    is received. The placeholder presents a waiting message, or an error message if the load
    of the host content failed.

    The default placeholder can be replaced by a placeholder provided by the host.
*/

import React, {useRef, useMemo} from 'react'

const Placeholder = ({
    index, 
    listsize, 
    message, 
    error, 
    userFrameStyles, 
    userLinerStyles,
    userErrorFrameStyles, 
    userErrorLinerStyles
}) => {

    const [frameStyles, linerStyles] = useMemo(()=>{

        const uFrameStyles = 
            (!error)?
                userFrameStyles:
                userErrorFrameStyles

        const uLinerStyles = 
            (!error)?
                userLinerStyles:
                userErrorLinerStyles

        const frameStyles = {
            border:'2px solid black',
            backgroundColor:'cyan',
            ...uFrameStyles,
            position:'relative',
            boxSizing:'border-box',
            height:'100%',
            width:'100%',
            overflow:'hidden',
        }
        const linerStyles = {
            position:'absolute',
            top:0,
            left:0,
            padding:'3px',
            margin:'3px',
            fontSize:'smaller',
            ...uLinerStyles,
        }

        return [frameStyles, linerStyles]

    }, [
        error,
        userFrameStyles, 
        userLinerStyles,
        userErrorFrameStyles, 
        userErrorLinerStyles,
    ])


    message = message ?? '(loading...)'

    return <div data-type = 'placeholderframe' style = {frameStyles}>
        { !error?
            <div data-type = 'placeholderliner' style = { linerStyles }>{index + 1}/{listsize} {message}</div>:
            <div data-type = 'placeholderliner' style = { linerStyles }>item is not available ({error.message})</div>
        }
        
    </div>
}

export default Placeholder