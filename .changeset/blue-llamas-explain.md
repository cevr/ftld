---
"ftld": major
---

remove records as collections in option/result/task types

Supporting records greatly complicated the code and increased the bundle size for relatively little gain. It's not common to use records as iterable collections in JS, and the ergonomics of using records as collections in the API were not great. This change removes the ability to use records as collections in option/result/task types.

This is a breaking change for users who were using records as collections in option/result/task types.
