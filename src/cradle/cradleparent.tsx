// cradleparent.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleParent {

    constructor(commonPropsRef) {

       let {managersRef, viewportdataRef, cradlePropsRef, cradleConfigRef, cradleDataRef} = commonPropsRef.current

       this._managersRef = managersRef
       this._viewportdataRef = viewportdataRef
       this._cradlePropsRef = cradlePropsRef
       this._cradleConfigRef = cradleConfigRef
       this._cradleDataRef = cradleDataRef


    }

    protected _managersRef
    protected _viewportdataRef
    protected _cradlePropsRef
    protected _cradleConfigRef
    protected _cradleDataRef

}