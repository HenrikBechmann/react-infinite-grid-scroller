# Changelog

## 1.1.0 August 13, 2023

Breaking change:
- `changeListSizeCallback` API replaces changeListsizeCallback (note the camel case)

Other changes:
- new RIGS property `startingListRange` optionally takes an array of two numbers `[lowindex, highindex]`, being the `lowindex` and `highindex` of the virtual list. `lowindex` must be <= `highindex`, but both can be positive or negative integers. `setListRange` if present supercedes `startingListSize`. If `setListRange` is given an empty array (`[]`) it creates an empty virtual list 
- `setListsize` is deprecated, replaced by `setListSize` (note the camel case)
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

Moved two pre-emptive function component error returns in InfiniteGridScroller to location after all hooks. Avoided third pre-emptive return by calling Scrollblock conditionally on listsize > 0.

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
