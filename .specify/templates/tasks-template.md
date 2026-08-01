# Tasks — {NNN}-{name}

## Phase: Setup
- [ ] T-001 [FR-001] ... | DoD: ... | Depends: none

## Phase: Core
- [ ] T-002 [P] [FR-002] ... | DoD: ... | Depends: T-001

## Phase: Integration
- [ ] T-003 [FR-003] ... | DoD: ... | Depends: T-002

## Phase: Testing
- [ ] T-004 [AC-001] ... | DoD: ... | Depends: T-003

### Dependency Graph
```
T-001 → T-002 → T-003 → T-004
```

### Traceability Matrix
| Task | FR | NFR | AC |
|------|----|-----|----|
| T-001 | FR-001 | | |
