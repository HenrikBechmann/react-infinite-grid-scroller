// contentmanager.tsx
// copyright (c) 2021 Henrik Bechmann, Toronto, Licence: MIT

import CradleManagement from './cradlemanagement'

export default class ContentManager extends CradleManagement{

   constructor(commonPropsRef) {

      super(commonPropsRef)

   }

   content = {

      cradleModel: null,
      headModel: null,
      tailModel: null,
      headView: [],
      tailView: [],

    }

}