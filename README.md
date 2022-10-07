# react-infinite-grid-scroller (RIGS)
Vertical or horizontal infinite scroller using simple css grid layout

[![npm](https://img.shields.io/badge/npm-1.0.0--Beta--1-brightgreen)](https://www.npmjs.com/package/react-infinite-grid-scroller) ![version](https://img.shields.io/badge/version-1.0.0--Beta--1-blue) [![licence](https://img.shields.io/badge/licence-MIT-green)](https://github.com/HenrikBechmann/react-infinite-grid-scroller/blob/master/LICENSE.md)

# Key Features

- designed for "heavy" or "light" cell content (React components)
- supports both uniform and variable cell lengths (vertical or horizontal)
- single or multiple rows or columns
- limited sparse memory cache, to preserve content state, with an API
- repositioning mode when rapidly scrolling (such as by using the scroll thumb)
- dynamic pivot (horizontal/vertical back and forth) while maintaining position in list
- automatic reconfiguration with viewport resize
- dynamic recalibration with async content refresh
- supports nested lists

# Key Technologies

RIGS uses these key technologies:
- [css grid layout](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [React hooks](https://reactjs.org/docs/hooks-intro.html)
- [React portals](https://www.npmjs.com/package/react-reverse-portal)
- [IntersectionObserver](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)

Therefore RIGS is best suited for modern browsers.

# Architecture
![Architecture](demo/Architecture.png)

Notes: The `Cradle` is kept in view of the `Viewport`, such that the `axis` is always near the top or left of the `Viewport` (depending on vertical or horizontal orientation). There are two CSS grids in the `Cradle`, one on each side of the `axis`. As `CellFrame`s are added to or removed from the grids, the grid on the left expands toward or contracts away from the top or left of the `Scrollblock` (depending on orientation), and the grid on the right expands toward or contracts away from the bottom or right of the `Scrollblock`. 

`CellFrame`s display individual user components. `CellFrame`s are created and destroyed on a rolling basis as the `Cradle` re-configures and moves around the `Scrollblock` to stay in view, but user components are maintained in the internal cache until they go out of scope. New `CellFrame`s fetch user components from the internal cache (portals in the React virtual DOM) or from the host through the user-supplied `getItem` function, as needed.

Not shown are two triggerlines (0 width or height `div`s, depending on orientation) which straddle the top or left edge of the `Viewport`. Whenever one of these triggerlines crosses the `Viewport` edge (through scrolling), an `IntersectionObserver` sends an interrupt to the `Cradle` to update its content and configuration.

# Usage

This is the minimum configuration.

```JSX
import Scroller from 'react-infinite-grid-scroller'

// ...

<div style = { containerstyle }>
  <Scroller 
      cellHeight = { cellHeight }
      cellWidth = { cellWidth }
      estimatedListSize = { estimatedListSize } // this constitutes a virtual 0-based array
      getItem = { getItem } // a function called by RIGS to obtain a specified user component by index number
  />
</div>
```
The scroller's highest level component, the `Viewport`, is a `div` with `position:absolute`, and `inset:0`, so the host container should be styled accordingly.

# RIGS properties
| property | value | notes |
|---|---|---|
|cellHeight|integer: number of pixels for cell height|required. Applied to `height` for 'uniform' layout, 'vertical' orientation. Applied to `max-height` for 'variable' layout, 'vertical' orientation. Approximate, used for `fr` (fractional allocation) for 'horizontal' orientation |
|cellWidth|integer: number of pixels for cell width|required. Applied to `width` for 'uniform' layout, 'horizontal' orientation. Applied to `max-width` for 'variable' layout, 'horizontal' orientation. Approximate, used for `fr` (fractional allocation) for 'vertical' orientation|
|estimatedListSize|integer: the estimated number of items in the virtual list|required. Can be modified at runtime. Constitutes a 0-based virtual array|
|getItem|host-provided function. Parameters: `index` (integer, 0 based), and session `itemID` (integer) for tracking and matching. Arguments provided by system|required. Must return a React component or promise of a component (`React.isValidElement`), or `undefined` = unavailable, or `null` = end-of-list|
|orientation|string: 'vertical' (default) or 'horizontal'|direction of scroll|
|gap|integer: number of pixels between cells|there is no gap at start or end of rows or columns; default = 0|
|padding|integer: number of pixels padding the `Cradle`| default = 0|
|layout|string: 'uniform' (default) or 'variable'|specifies handling of the height or width of cells, depending on orientation. 'uniform' is fixed cellHeight/cellWidth. 'variable' is constrained by cellHeight/cellWidth (maximum) and cellMinHeight/cellMinWidth (minimum)|
|cellMinHeight|integer: default = 25, minimum = 25, maximum = cellHeight|used for 'variable' layout with 'vertical' orientation. Applied to `min-height`|
|cellMinWidth|integer: default = 25, minimum = 25, maximum = cellWidth|used for 'variable' layout with 'horizontal' orientation. Applied to `min-width`|
|runwaySize|integer: number of rows in the `Cradle` just out of view at head and tail of list|default = 1. minimum = 1. Gives time to assemble cellFrames before display
|startingIndex|integer: starting index when the scroller first loads|default = 0|
|cache|string: 'cradle' (default), 'keepload', 'preload'|'cradle' matches the cache to the contents of the `Cradle`. 'keepload' keeps user components in the cache as loaded, up to `cacheMax` (and always `Cradle` user components). 'preload' loads user components up to `cacheMax`, then adjusts cache such that `Cradle` user components are always in the cache|
|cacheMax|integer: at minimum (maintained by system) the number of user components in the `Cradle`|allows optimization of cache size for memory limits and performance|
|placeholder|a lightweight React component for `cellFrame`s to load while waiting for the intended `cellFrame` components|optional (replaces default placeholder). parameters are index, listsize, message, error. Arguments set by system|
|useScrollTracker|boolean: default = `true`|allows suppression of system feedback on position within list while in reposition mode, if the host wants to provide alternative feedback based on data from callbacks |
|styles|object: collection of styles for scroller components|optional. These should be "passive" styles like backgroundColor. See below for details|
|callbacks|object: collection of functions for feedback, and interactions with scroller components|optional. See below for details|
|advanced|object: collection of values used to control system behaviour|use with caution. optional. See below for details|
|scrollerProperties|requested by user components by being set to null by user, instantiated with an object by system|required for nested RIGS; available for all user components. Contains key scroller settings. See below for details|

Notes:

### `styles` details

Create a style object for each of the elements you want to modify. The styles are not screened, though the RIGS essential styles pre-empt user styles. Be careful to only include "passive" styles (like color, backgroundColor) so as not to confuse the scroller. Do not add structural items like borders, padding etc.

~~~javascript
styles = {
  viewport: {}, 
  scrollblock: {}, 
  cradle: {},
  scrolltracker: {},
  placeholderframe: {},
  placeholderliner: {},
}
~~~
The scrolltracker is the small rectangular component that appears at the top left of the viewport when the list is being rapidly repositioned. The scrolltracker gives the user the current index and total listsize during the repositioning process.

The placeholder styles are applied only to the default placeholder.

### `callbacks` details
Callbacks are host defined closure functions which the `Cradle` calls to provide data back to the host. Include the callbacks in the callbacks object that you want the `Cradle` to use. The following are recognized by the `Cradle`:
~~~javascript
callbacks: {
     getFunctions, // (functions)
     referenceIndexCallback, // (index, location, cradleState)
     preloadIndexCallback, // (index)
     deleteListCallback, // (reason, deleteList)
     changeListsizeCallback, // (newlistsize)
     itemExceptionsCallback, // (index, itemID, returnvalue, location, error)
     repositioningFlagCallback, // (flag) // boolean
}
~~~

Here's an example of a closure you could write:
~~~javascript
const scrollerFunctionsRef = useRef(null)

const getFunctions = (functions) => {

    scrollerFunctionsRef.current = functions // assign the functions object

}
~~~
Here are details about the callbacks:

|callback|parameters:datatypes|notes|
|---|---|---|
|getFunctions|functions:object||
|referenceIndexCallback|index: integer, location: string, cradleState: string||
|preloadIndexCallback|index: integer||
|deleteListCallback|reason: string, deleteList: array||
|changeListsizeCallback|newlistsize: integer||
|itemExceptionsCallback|index: integer, itemID: integer, returnvalue: any, location: string, error: Error||
|repositioningFlagCallback|flag: boolean||

Here are details about the functions returned by getFunctions

|functions|parameters|return values|notes|
|---|---|---|---|
|scrollToIndex|callbacks.scrollToIndex(index)||places the requested index at the top left of the list|
|getContentList|callbacks.getContentList()||returns an array of current content data, where the content includes both visible items and items that are invisible in the *runways* at the head and tail of lists|
|reload|callbacks.reload()||causes a reload of all cradle content items (visible or invisible). Useful if you want content of those items to be reset on the fly -- this re-triggers `getItem` for each of those cells |
|reportReferenceIndex|assign your callback function to this property||called by scroller (with `index`, `reason` parameters) whenever the reference item index changes -- that's the item visible at the top left of the viewport|

### `advanced` details

### `scrollerProperties` details

### Notes

The ItemShell for each grid cell is a `div`, controlled by the grid layout, with `position:relative`. Your content can be anything that works in this context. Your content should be slightly liquid to accommodate adjustments that the grid will make to fit cells into the crosslength of the viewport. These adjustments can be slightly variable width for 'vertical' orientation and slightly variable height for 'horizontal' orientation.

# Design

The scroller consists of the following components:

### InfiniteGridScroller

The API. Distributes parameters to Viewport, Scrollblock, and Cradle. 

Contains Viewport.

### Viewport

The top level component. `position:absolute`; `top`, `right`, `bottom`, `left` all set to 0. Requires a container. Responds to component resize based on [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver). 

Contains Scrollblock.

### Scrollblock

Scrolled by viewport. Length is set by item medial length (`CellHeight` for 'vertical' orientation and `CellWdith` for 'horizontal' orientation x number of items (adjusted for gap and padding). 

Contains Cradle.

### Cradle

This provides the illusion of infitite scroll by dropping items that scroll outside the cradle scope, and replacing those items with added items at the other, incoming, end of the cradle. The cradle scope includes the length or width of the viewport, plus the length or width of the runways at either end. The runways allow for formation of grid cells outside the view of the user. This dynamic is triggered by IntersectionObserver, which watches the flow of ItemShell components in relation to the Viewport.

The Cradle is also observed by IntersectionObserver. When the cradle is scrolled so fast that its operations cause a lag of motion, and this lag causes the Cradle to fall completely outside the viewport, then the scroller gives up on updating content, and instead brings into view a ScrollTracker, which informs the user that repoistioning is underway. The scrolltracker provides the user with index information. The host can optionally track these positions, and can ehance the context cues by providing, for example, grouping information. When that scroll operation is completed, then Cradle reconstitutes its contents according to its new position.

Contains ItemShells.

### ItemShell

This implements the cell components of the grid. It manages its own contents: a placeholder on initialization, replaced by a user component as fetched by `getItem`. The `getItem` function must be provided by the host. It is given an index number, and returns either a component or a promise of a component.

### ScrollTracker

This is the small rectangle that appears when the user rapidly repositions, using the thumb of the scrollbar or very rapid swipes. The scrolltracker shows the user the item number (at top left = index + 1) against the size of the list. It only appears during rapid scrolling.

### Placeholder

The default placeholder, showing the item number (index + 1) and the length of the list.

# Licence

MIT &copy; 2020 [Henrik Bechmann](https://twitter.com/HenrikBechmann)
