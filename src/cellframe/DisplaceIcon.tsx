// DisplaceIcon.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useRef, useContext, useMemo, CSSProperties} from 'react'

import displaceicon from "../../assets/east_FILL0_wght400_GRAD0_opsz24.png"

import { MasterDndContext } from '../InfiniteGridScroller'

import {CradleContext} from '../Cradle'

const DisplaceIcon = (props) => {

    const 
        { orientation, scrollerID, index } = props,
        masterDndContext = useContext(MasterDndContext),
        cradleContext = useContext(CradleContext),
        { virtualListProps } = cradleContext.scrollerPropertiesRef.current,
        { crosscount } = virtualListProps,
        {scrollerID:sourceScrollerID, index:sourceIndex} = masterDndContext.dragData

    const rotation = useMemo(()=>{

        let rotation
        const direction = 
            (scrollerID !== sourceScrollerID)?
            'forward':
            index < sourceIndex?
                'forward':
                'back'

        if (direction == 'forward') {
            rotation = 
                crosscount === 1?
                orientation == 'vertical'?
                    '.25turn':
                    '0turn'
                :
                orientation == 'vertical'?
                    '0turn':
                    '.25turn'
        } else { // 'back'
            rotation = 
                crosscount === 1?
                orientation == 'vertical'?
                    '.75turn':
                    '.5turn'
                :
                orientation == 'vertical'?
                    '.50turn':
                    '.75turn'
        }

        return rotation

    },[orientation, scrollerID, index, sourceScrollerID, sourceIndex, crosscount])

    const framestyleRef = useRef<CSSProperties>({
        zIndex:2, 
        position:'absolute',
        width:'100%',
    })

    const imgstyleRef = useRef<CSSProperties>({
        textAlign:'right',
        // width:'30px', 
        // height:'30px',
        float:'right',
        marginRight:'6px',
        transform:`rotate(${rotation})`
    })

    return <div style = {framestyleRef.current} data-type = 'displaceicon'>
        <img style = {imgstyleRef.current} src = {displaceicon} />
    </div>

}

export default DisplaceIcon