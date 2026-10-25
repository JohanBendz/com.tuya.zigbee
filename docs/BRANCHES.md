# Branches and Homey release channels

Updated 2026-10-25. This is the current branch policy; dated release snapshots
and older GitHub comments remain historical evidence.

## Current channels and source anchors

| Branch | Role | Version / published source |
| --- | --- | --- |
| `main` | Homey App Store Live | 0.3.3, source `130854f4c6d1b5a3537e956d941eb2e3caec9a9a` |
| `dev` | Homey App Store Test | 0.3.4, source `21b60ce07d91421aeba08357960c8fc910d87593` |
| `develop-0.4` | Frozen next Test candidate; not published | 0.4.0, pre-migration source `3e5695667cab9d6a3296d58909b90a8dc0376e93` |
| `develop-0.4.1` | New development after the 0.4.0 feature freeze | Pre-migration source `08d85dd59177826ff35436b9802f305f372e9bc7`; inherited 0.4.0 metadata until a coordinated 0.4.1 version bump |

Observed directly on the official Store pages on 2026-10-25:
- Live: https://homey.app/en-us/app/com.tuya.zigbee/Tuya-Zigbee/ shows 0.3.3.
- Test: https://homey.app/en-us/app/com.tuya.zigbee/Tuya-Zigbee/test/ shows 0.3.4.

The Store pages establish channel versions; the release-source mapping also uses
tracker #1469 and PR #1525. Source anchors above identify the repository source
of those releases; they are not a cryptographic comparison with Store packages.
Documentation/CI-only commits may follow the anchors without changing the
published runtime, manifests, dependencies, version or changelog. A GitHub merge
or branch move never publishes to Homey by itself.

## Work and promotion policy

- Keep `main` aligned with the actual Live runtime and `dev` with the actual Test
  runtime. Prepare runtime changes on dedicated branches. Review narrow Test
  corrections against `dev`; move the tested source into `dev` in coordination
  with its actual Homey Test publication.
- Direct new features and device additions to `develop-0.4.1`. Do not use the
  default branch as a blanket contribution target. Keep frozen `develop-0.4`
  limited to identified release corrections and presentation cleanup.
- Before publishing 0.4.0 Test, review current 0.3.4 feedback and its Smart Knob
  correction (#1389), the frozen candidate's final CI and remaining artwork.
  After actual 0.4.0 Test publication, advance `dev` to the selected candidate
  without pulling in unrelated 0.4.1 work. Preserve any unique dev history when
  promotion is not a fast-forward.
- Once a tested version is approved and actually published Live, advance `main`
  to that release source. Carry reviewed fixes into the future branches
  selectively. Preserve existing saved-device/Flow contracts.
- CI runs on `main`, `dev`, `develop-0.4`, `develop-0.4.1` and pull requests.
- Use `main` as the GitHub default branch. At migration inspection the default
  was still `SDK3`; changing it requires repository administration access.
  Check the actual repository setting before deleting `SDK3`.
- `SDK3`, `modernize-*` and `release-0.3.*` are historical sources, not active
  contribution targets. Use pinned commit URLs for immutable review evidence.
- README and Homey changelog stay user-facing and channel-neutral. Keep branch,
  CI and rollout detail in maintainer docs and GitHub release tracking.

## Outstanding pull requests

- #1470 and #1514: historical 0.3.1/0.3.2 release proposals; their full history is
  already retained by `main`. Close as superseded without merging them again.
- #1525: the published 0.3.4 Test source is already retained by `dev`; close the
  old release-source PR without implying Live promotion or physical acceptance.
- #1535: AVATTO TRV addition belongs against `develop-0.4.1`, not old `SDK3` or
  the Store-matching branches. Retargeting is routing only, not code approval;
  reconcile generated app.json through Compose and review the implementation
  independently before any merge.
- Canonical hardware issues remain open until their own acceptance criteria are
  met. This migration does not close device bugs or assert physical tests.

## Branch cleanup audit

No branch is deleted by this migration. The following 16 old heads are ancestors
of the retained branches shown, verified with `git merge-base --is-ancestor`.
Close/retarget the release PRs above first. Change the default to main before
removing SDK3. The old release commits and 0.3.1 compatibility fixtures remain
reachable through the retained histories even after these branch names go away.

| Branch removable after those steps | Audited old head | History retained by |
| --- | --- | --- |
| `SDK3` | `328d24ed315131528f2358b66bb0b8259615a49e` | `main`, `dev`, `develop-0.4`, `develop-0.4.1` |
| `modernize-2026` | `44ed7a650b62f47e7e3e08dea037a02d351b62c7` | `main`, `dev`, `develop-0.4`, `develop-0.4.1` |
| `modernize-2026-issues` | `7583b4bb2fa91600c2301eb142335312a6a7cac4` | `main`, `dev`, `develop-0.4`, `develop-0.4.1` |
| `release-0.3.2` | `e0ef3f3c66298453549900719b9904f55157b0fa` | `main`, `dev` |
| `release-0.3.3` | `130854f4c6d1b5a3537e956d941eb2e3caec9a9a` | `main`, `dev` |
| `release-0.3.4` | `21b60ce07d91421aeba08357960c8fc910d87593` | `dev` |
| `chore/0.3.2-live-review-state` | `6cf4e54c216bf6aa68d7bfd170dff1ec37ea2507` | `develop-0.4`, `develop-0.4.1` |
| `chore/0.4-test-candidate-preflight` | `5c17783c5d8a71da8803695365a052995e673784` | `develop-0.4`, `develop-0.4.1` |
| `chore/channel-neutral-publishing` | `df1607a092bd6f05c7e384bee513de067608a6e8` | `develop-0.4`, `develop-0.4.1` |
| `chore/release-lanes-031-live-041` | `d62606e534ff577f5db6878fb050abdbd73e5467` | `develop-0.4`, `develop-0.4.1` |
| `feature/0.4-contact-illuminance-1298` | `47c7ee181158c74cdca8a35690e30472e13c8759` | `develop-0.4`, `develop-0.4.1` |
| `feature/0.4-ias-leak-unknown-cells-1041` | `0d997ab856d822e4d8d544521ce669fc3028174b` | `develop-0.4`, `develop-0.4.1` |
| `feature/0.4-mowe-ias-rain` | `565d80948c22688fc61786e1379bf430402bdedf` | `develop-0.4`, `develop-0.4.1` |
| `feature/0.4-standard-ias-contact-1013` | `9380d45e1165dbfd78e5d9296f6788363e628401` | `develop-0.4`, `develop-0.4.1` |
| `feature/0.4-standard-ias-motion-lux-1481` | `b1242d4c7acfebe3f5508087b9c8049e5a0109d8` | `develop-0.4`, `develop-0.4.1` |
| `feature/0.4-standard-zcl-temphumids-797` | `a87613f4b88a58a41b484fae93a2040d97702d9c` | `develop-0.4`, `develop-0.4.1` |

Keep these additional branches pending a separate history decision:

| Branch | Reason |
| --- | --- |
| `archive/dev-0.0.2-2026-10-25` | Preserves the former dev head `b05cbe1a702ca95604d2de39815fb22dff0f5b88`, with 8 commits outside all four active histories |
| `SDK3-test` | 20 commits outside all four active histories |
| `master` | 4 commits outside all four active histories |
| `sdk-3` | 8 commits outside all four active histories |
| `refactor/type-based-drivers` | 16 commits outside all four active histories; separate experimental architecture |

Counts describe commit ancestry, not a claim that every patch is unique or useful.
The two 0.4 heads had identical trees but divergent cherry-pick histories at
migration; retain both for their distinct frozen-candidate and development roles.
