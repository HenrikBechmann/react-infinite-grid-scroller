# Changelog

## 2.0.0 October, 2023

Added:
- intra-list and inter-list drag and drop capability
- scroller `dndOptions` property, containing `accept` list of content types, and a scroller `profile` property to help with identification with the `getDropEffect` function
- host provided `getDropEffect` function (for `RigsDnd` higher order component only) which provides the host the opportunity to constrain the drop effect on scrollers, based on `sourceScrollerID`, `targetScrollerID`, and `context` data.
- host-provided `droppedItemCallback` function to notify host of completed drag and drop operations
- `getItemPack` (replaces `getItem`). The return object of `getItemPack` from the host includes the host-defined `component` function, and a data `profile` object; for dnd, it includes a cell `dndOptions` object with `dragText` and `type`

Renamed:
- `scrollerProperties` renamed to `scrollerContext`
- `scrollerContext` properties renamed from `cellFramePropertiesRef` to `cell`, and from `scrollerPropertiesRef` to `scroller`. Both follow the react `ref` pattern, with data held in the `current` property

Removed:
- GetItem. Use GetItemPack
- remapIndexes was removed as a service function, as dead weight
- startingListSize. Use startingListRange
- setListSize. Use setListRange
- changeListSizeCallback. Use changeListRangeCallback

Changed:
- All API functions with return values have had the shape of those return values changed. Notably all return values now include a `context` object, which contains a `contextType` name, a `scrollerID` number, and sometimes more. Where possible the return values include the host-provided item `profile` object, as included in the `getItemPack` return object, to allow for enhanced item identification regarding cache operations

## 1.4.2 August 24, 2023

fix debug error

## 1.4.1 August 24, 2023

Fix regression re programmatic scrolling

## 1.4.0 August 23, 2023

This version deals with virtual list boundaries - SOL (start-of-list) & EOL (end-of-list)

A new callback function is recognized:
- `boundaryCallback(position:string,index:number):void` provided by the host is called whenever a SOL or EOL index is loaded into the Cradle. `position` = "SOL" | "EOL", `index` being the start or end index.

A new property has been added:
- `getExpansionCount(position, index):integer` is a function optionally provided by the host. If provided, it is called whenever a SOL or EOL index is loaded into the Cradle with `position` = "SOL" | "EOL" and `index` being the start or end index. The function is expected to return the number (>=0) of indexes to add to the virtual list at the noted start or end.

## 1.3.0 August 21, 2023

This version adds flexible padding and gap configuration.

- `padding` has been moved from `Cradle` grid blocks to the `Scrollblock`.
- the `padding` property now accepts an array of integers as well as a standalone integer. Values match standard CSS order. Standalone integer = padding (in pixels) for all of top, right, bottom, left. 1-item array, same as integer. 2-item array = [t/b, r/l]. 3-item array = [t, r/l, b]. 4-item array = [t, r, b, l]
- the `gap` property now accepts an array of integers as well as a standalone integer. Values match standard CSS order. Standalone integer = gap (in pixels) for both of column-gap (horizontal) and row-gap (vertical). 1-item array, same as integer. 2-item array = [col, row]

## 1.2.0 August 18, 2023

This version introduces programmatic scrolling.

New API calls:
- scrollToPixel(pixel:number[,behavior:string])
- scrollByPixel(pixel:number[,behavior;string])

Internal updates:
- scroll mechanics for variable content was changed to accomodate scroll API calls. 

## 1.1.0 August 13, 2023

This version introduces bi-directional virtual list expansion (or contraction), by allowing negative indexes.

Breaking change:
- `changeListSizeCallback` API replaces changeListsizeCallback (note the camel case)

Other changes:
- new RIGS property `startingListRange` optionally takes an array of two numbers `[lowindex, highindex]`, being the `lowindex` and `highindex` of the virtual list. `lowindex` must be <= `highindex`, but both can be positive or negative integers. `startingListRange` if present supercedes `startingListSize`. If `startingListRange` is given an empty array (`[]`) it creates an empty virtual list 
- `setListsize` API call is deprecated, replaced by `setListSize` (note the camel case)
- new API calls: setListRange, prependIndexCount, appendIndexCount, getPropertiesSnapshot. See documentation

## 1.0.5 May 18, 2023

Internal refactors:
- promote PortalCache component to top tier
- introduce experimental capability to share cache among multiple scrollers (this currently has no operational effect)

## 1.0.4 April 22, 2023

Refactor index insert, remove, and move

A couple of corrections to list resize

## 1.0.3 January 6, 2022

Fix regression in CellFrame

## 1.0.2 January 6, 2022

Integrated multiple suggestions from a linter, including one bug fix ("=" s/b "==").
Allow startingListSize of 0.

## 1.0.1 January 5, 2022

Moved two pre-emptive function component error returns to location after all hooks. Avoided third pre-emptive return by calling Cradle conditionally on listsize > 0.

## 1.0.0-a January 2, 2022

No change, just updated the version number in the README file.

## 1.0.0 January 2, 2022

No change, just upgraded the utility to production release status

## 1.0.0-RC-1 December 16, 2022

Release candidate 1. Several cross-browser issues were identified and resolved.

RIGS now appears to be functional and stable. Feature freeze for version 1.0.0 is in effect.

## 1.0.0-Beta-4 November 24, 2022

Many issues were identified and resolved, thanks mostly to testing with the demo site.

Beta 4 should be the last testing cycle before the product is promoted to Release Candidate status. Focussing on cross-browser testing.

## 1.0.0-Beta-3 November 8, 2022

- better stability
- demo site established for exploration and testing
- some more work to do around edge cases

## 1.0.0-Beta-2 October 12, 2022

- Beta-1 has been completely refactored

## 1.0.0-Beta-1 April 9, 2020

- First release
