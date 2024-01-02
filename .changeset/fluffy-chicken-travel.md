---
"ftld": minor
---

- allow Result/Task to flatMap/recover with any type and parse the result. While not correct, it is convenient.
- fix Collection.filterMap behaviour in objects. It now correctly omits nullish values from the object, and is reflected in the return type.
- reimplement Result/Option types to use single class which reduces footprint substantially
