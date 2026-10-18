# Binary apply supplement

`MAIN_BASE_INTEGRATION_DIFF.patch` contains **text-only** hunks (16 paths). Git `apply` on Windows does not reliably consume `GIT binary patch` hunks from `git diff --binary`.

After applying the text patch on commit `c1a7ec52691f0f710e51a15aeb359e8eb7b55e76`:

```text
mkdir -p public/images/spokedu/home/field-editorial
cp included-assets/public/images/spokedu/home/field-editorial/home-hero-ai-20261018.png public/images/spokedu/home/field-editorial/
cp included-assets/public/images/spokedu/home/field-editorial/home-hero-coaching.jpg public/images/spokedu/home/field-editorial/
```

| File | Target blob (f02d542) |
|------|------------------------|
| `public/images/spokedu/home/field-editorial/home-hero-ai-20261018.png` | `dd535fa2a86aa3dcf4ab8734961a0ac1b9dcd584` |
| `public/images/spokedu/home/field-editorial/home-hero-coaching.jpg` | `76900a20a86ec3a0b872180303270b690d34b303` |

Verified on isolated worktrees `1-release-candidate-isolated` and `1-release-candidate-patch-verify`.
