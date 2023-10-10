// DisplaceIcon.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

/*

    The role of DisplaceIcon is to show the user the direction in which the highlighted drop target CellFrame
    will be displaced.

*/

import React, {useRef, useContext, useMemo, useState, useEffect, CSSProperties} from 'react'

import displaceicon from "../../assets/east_FILL0_wght400_GRAD0_opsz24.png"

import { MasterDndContext } from '../InfiniteGridScroller'

import { isMobile } from  '../InfiniteGridScroller/RigsDnd'

import {CradleContext} from '../Cradle'

const DisplaceIcon = (props) => {

    const 
        { orientation, scrollerID, index } = props,

        [displaceState, setDisplaceState] = useState('ready'),

        masterDndContext = useContext(MasterDndContext),

        altKeyRef = useRef(masterDndContext.altKey),

        cradleContext = useContext(CradleContext),

        { dragData, prescribedDropEffect:dropEffect } = masterDndContext,

        { scrollerID:sourceScrollerID, index:sourceIndex  } = dragData,

        calculatedDropEffect = dropEffect || (masterDndContext.altKey? 'copy': null) || 'move',

        { virtualListProps } = cradleContext.scrollerPropertiesRef.current,
        { crosscount } = virtualListProps

    const intervalIDRef = useRef(null)

    useEffect(()=>{

        if (isMobile) return

        intervalIDRef.current = setInterval(()=>{

            if (masterDndContext.altKey !== altKeyRef.current) {
                altKeyRef.current = masterDndContext.altKey
                setDisplaceState('refresh')
            }

        },200)

        return () => {

            clearInterval(intervalIDRef.current)

        }

    },[])

    useEffect(()=>{

        if (displaceState != 'ready') {
            setDisplaceState('ready')
        }

    },[displaceState])

    const rotation = useMemo(()=>{

        let rotation
        const direction = 
            (scrollerID !== sourceScrollerID)?
            'forward':
            index < sourceIndex?
                'forward':
                    calculatedDropEffect == 'copy'?
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
                        '.50turn'
                    :
                    orientation == 'vertical'?
                        '.50turn':
                        '.75turn'
        }

        return rotation

    },[orientation, scrollerID, index, sourceScrollerID, sourceIndex, crosscount, calculatedDropEffect])

    const framestyleRef = useRef<CSSProperties>({
        zIndex:2, 
        position:'absolute',
        width:'100%',
        top:'0',
    })

    const imgstyles = useMemo(() => {
        const styles = {
            float:'right',
            marginRight:'6px',
            transform:`rotate(${rotation})`
        } as CSSProperties
        return styles
    },[rotation])

    return <div style = {framestyleRef.current} data-type = 'displaceicon'>
        <img style = {imgstyles} src = {displaceicon} />
    </div>

}

export default DisplaceIcon