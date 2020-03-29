/******************************************************************************************
 ------------------------------------[ SUPPORTING FUNCTIONS ]------------------------------
*******************************************************************************************/
import React from 'react';
export declare const calcVisibleItems: (itemsArray: any, viewportElement: any, cradleElement: any, orientation: any) => any[];
export declare const getReferenceIndexData: ({ orientation, viewportData, cellSpecsRef, crosscountRef, listsize, }: {
    orientation: any;
    viewportData: any;
    cellSpecsRef: any;
    crosscountRef: any;
    listsize: any;
}) => {
    index: number;
    scrolloffset: number;
};
export declare const getContentListRequirements: ({ orientation, cellHeight, cellWidth, viewportheight, viewportwidth, runwaylength, gap, padding, visibletargetindexoffset, targetScrollOffset, crosscount, listsize, }: {
    orientation: any;
    cellHeight: any;
    cellWidth: any;
    viewportheight: any;
    viewportwidth: any;
    runwaylength: any;
    gap: any;
    padding: any;
    visibletargetindexoffset: any;
    targetScrollOffset: any;
    crosscount: any;
    listsize: any;
}) => {
    indexoffset: number;
    referenceoffset: number;
    contentCount: number;
    scrollblockoffset: number;
    cradleoffset: number;
};
export declare const normalizeCradleAnchors: (cradleElement: any, orientation: any) => void;
export declare const getUIContentList: (props: any) => any;
export declare const setCradleStyles: ({ orientation, divlinerStyles: stylesobject, cellHeight, cellWidth, gap, crosscount, viewportheight, viewportwidth }: {
    orientation: any;
    divlinerStyles: any;
    cellHeight: any;
    cellWidth: any;
    gap: any;
    crosscount: any;
    viewportheight: any;
    viewportwidth: any;
}) => React.CSSProperties;
export declare const setCradleStyleRevisionsForDrop: ({ cradleElement, parentElement, scrollforward, orientation }: {
    cradleElement: any;
    parentElement: any;
    scrollforward: any;
    orientation: any;
}) => React.CSSProperties;
export declare const setCradleStyleRevisionsForAdd: ({ cradleElement, parentElement, scrollforward, orientation, }: {
    cradleElement: any;
    parentElement: any;
    scrollforward: any;
    orientation: any;
}) => React.CSSProperties;
