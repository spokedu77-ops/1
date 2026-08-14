# Repository Agent Rules

## Git publishing

- Do not stage, commit, push, create a branch, or open a pull request unless the user explicitly requests that exact action.
- Authorization for one Git action does not authorize any other Git action. For example, permission to commit does not include permission to push.
- After making code changes, stop with the changes uncommitted and report verification results unless the user explicitly instructs otherwise.
- Before any authorized commit, show and verify the exact file scope. Never include unrelated user changes.
- Before any authorized push, verify the target remote and branch and report local CI results.
