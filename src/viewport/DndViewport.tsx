// DndViewport.tsx
// copyright (c) 2019-2023 Henrik Bechmann, Toronto, Licence: MIT

import React, {useContext, useRef } from 'react'

import { useDrop} from 'react-dnd'

import { MasterDndContext, ScrollerDndContext, GenericObject } from '../InfiniteGridScroller'

import { Viewport, ViewportContext } from '../Viewport'

// HoC for DnD functionality
const DndViewport = (props) => {



    return <Viewport {...props}/>

}

export default DndViewport