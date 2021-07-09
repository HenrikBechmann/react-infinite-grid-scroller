// cradlemanagement.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

export default class CradleManagement {

    constructor(commonPropsRef) {

       let {managersRef, viewportdataRef, cradlePropsRef, cradleConfigRef} = commonPropsRef.current

       this._managersRef = managersRef
       this._viewportdataRef = viewportdataRef
       this._cradlePropsRef = cradlePropsRef
       this._cradleconfigRef = cradleConfigRef

    }

    protected _managersRef
    protected _viewportdataRef
    protected _cradlePropsRef
    protected _cradleconfigRef

}