# Branches and Homey release channels

Updated 2026-11-26. The maintainer submitted 0.4.1 for Live review. Athom approval and publication are pending. This is the active policy. Earlier documents are historical snapshots.

| Branch | Role | Source |
| --- | --- | --- |
| `main` | Live 0.3.3 | `61577d8` (published anchor `130854f4c6d1b5a3537e956d941eb2e3caec9a9a`) |
| `dev` | Test 0.4.1 | `46a4a6b8ac8806d65530667e7c8341d57ca7491c` |
| `develop-0.4.2` | Frozen candidate for Test 0.4.2 | `6a720be663d4abc2750d682a9b57b93cbe5b2637` |
| `develop-0.4.3` | Frozen candidate for Test 0.4.3 | #1584; freeze commit recorded in #1579 |
| `develop-0.4.1` | Frozen published Test source | `46a4a6b` |
| `develop-0.4` | Frozen unpublished 0.4.0 | `f4af3d4` |
| `archive/dev-0.4.0-2026-11-24` | Prior dev history | `8706d6b` |

0.3.4 (published anchor `21b60ce07d91421aeba08357960c8fc910d87593`) was superseded; 0.4.0 never published. Source anchors are not cryptographic Store package comparisons. Keep `main` and `dev` aligned with actual Store channels. Prepare changes on dedicated branches; promote only after actual publication. Preserve unique history before any non-fast-forward promotion. The feature set for 0.4.3 is frozen. Only necessary pre-Test fixes target `develop-0.4.3`. Track further feature work separately. Keep SDK3 for history per maintainer decision; preserve other legacy and experimental branches pending independent review. The three merged Cursor branches were removed by maintainer. No further branch deletion authorized.

- [#1579](https://github.com/JohanBendz/com.tuya.zigbee/issues/1579): 0.4.3 freeze, pre-Test fixes and hardware acceptance.
- [#1557](https://github.com/JohanBendz/com.tuya.zigbee/issues/1557): 0.4.1 physical acceptance / Live readiness.
- [#1562](https://github.com/JohanBendz/com.tuya.zigbee/issues/1562): 0.4.2 candidate and hardware acceptance. The maintainer plans to publish it to Test after 0.4.1 goes Live.
- Annotated tag `v0.4.1` verified at the published SHA `46a4a6b`.
- CI and publish validation are not physical acceptance. Keep existing compatibility fixtures and device/Flow contracts intact. Physical verification occurs in public Test, before Live promotion.
- README and Homey changelog remain user-facing and channel-neutral. Do not publish branch or rollout plans in Store metadata.

Historical branch audit (2026-10-26): [original policy at the published source](https://github.com/JohanBendz/com.tuya.zigbee/blob/46a4a6b8ac8806d65530667e7c8341d57ca7491c/docs/BRANCHES.md).
