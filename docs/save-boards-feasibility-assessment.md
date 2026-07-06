# Technical Feasibility Assessment: Save Boards

**Feature request:** Add a "Save boards" feature to Excalidraw — allowing users to persist, name, and manage multiple drawing boards (scenes).

**Assessment date:** July 6, 2026  
**Scope:** Excalidraw monorepo (`packages/excalidraw/`, `excalidraw-app/`)

---

## Executive Summary

**Verdict: Feasible, with scope-dependent complexity.**

Excalidraw already has strong scene serialization, local persistence, and cloud export primitives. What is missing is a **board catalog** (index of named boards), **per-board storage namespaces**, and (for cloud sync) **user-scoped authentication**. The closest reusable patterns are the **Library persistence adapter** and **TTD chat IndexedDB storage**.

| Approach | Feasibility | Complexity | Notes |
|----------|-------------|------------|-------|
| Local-only boards (browser) | High | Medium | No backend; fits OSS app today |
| Cloud boards (authenticated) | Medium–High | High | Requires new auth + backend or Plus API |
| Hybrid (local + optional cloud sync) | High | High | Best long-term UX; phased delivery possible |

---

## Feature Definition

"Save boards" implies users can:

1. **Create** a new named board without losing the current one
2. **Save** the active canvas to a board (auto-save or explicit)
3. **List** saved boards (name, last modified, optional thumbnail)
4. **Open / switch** between boards
5. **Delete / duplicate / rename** boards (baseline CRUD)

Optional extensions: search, folders/tags, sharing a board, collaboration per board.

---

## Current Architecture (Relevant Pieces)

### What exists today

| Capability | Implementation | Limitation |
|------------|----------------|------------|
| Single-scene auto-save | `excalidraw-app/data/LocalData.ts` → localStorage + IndexedDB | One global scene slot; overwrites on edit |
| File export/import | `packages/excalidraw/data/json.ts` | Manual; not a board library |
| Share links | `excalidraw-app/data/index.ts` → backend V2 | Anonymous; not owned or listable |
| Collaboration rooms | `excalidraw-app/collab/` + Firebase | Room-based; pauses local save |
| Reusable shape library | `packages/excalidraw/data/library.ts` | Shapes only, not full scenes |
| Named cloud export | Excalidraw+ migration path | Export-only from OSS; no board manager |
| Scene title | `appState.name` | Local UI label; not tied to a catalog |

### Data model

A board is effectively an `ImportedDataState`:

```typescript
{
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files?: BinaryFiles;
}
```

Serialization is handled by `serializeAsJSON` / `loadFromJSON` in `packages/excalidraw/data/json.ts`. Binary images are managed separately via `FileManager` and IndexedDB (`files-db`).

### Authentication

The OSS app has **no user accounts**. Excalidraw+ integration checks a cookie (`excplus-auth`) but does not expose board APIs in this repo. Cloud boards per user require new auth or deep Plus integration.

---

## Recommended Approaches

### Option A: Local-Only Boards (Recommended MVP)

**How it works:** Store a board index and per-board scene data in IndexedDB, mirroring the TTD chat storage pattern (`excalidraw-app/data/TTDStorage.ts`) and the library adapter interface (`LibraryPersistenceAdapter` in `packages/excalidraw/data/library.ts`).

**Board index record:**

```typescript
interface BoardMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // optional data URL or blob ref
}
```

**Per-board storage:** elements, filtered appState, and file references (or embedded files).

**Key changes:**

| Area | Work |
|------|------|
| Storage layer | New `BoardPersistenceAdapter` + IndexedDB stores |
| App integration | Extend `LocalData` or replace with board-aware save on `onChange` |
| File namespace | Per-board file IDs or scoped IndexedDB keys to avoid cross-board leakage |
| UI | Board picker (sidebar or modal): list, new, rename, delete, switch |
| Tab sync | Board-aware version stamps (extend `tabSync.ts`) |
| Collab | Define policy: disable board switch while in room, or fork room → new board |

**Pros:** No backend, ships in OSS, reuses existing serialization.  
**Cons:** Data tied to browser/device; no cross-device sync.

**Feasibility: High.** Most infrastructure exists; main work is storage schema + UX.

---

### Option B: Cloud Boards (Authenticated)

**How it works:** Authenticated users store boards in a backend (new service or Excalidraw+ API). Reuse encryption patterns from `exportToBackend` and file upload from Firebase Storage.

**Key changes:**

| Area | Work |
|------|------|
| Auth | OAuth/session (new) or Plus SSO integration |
| API | CRUD endpoints: `GET /boards`, `POST /boards`, `GET /boards/:id`, etc. |
| Storage | Per-user board collection (Firestore, Postgres, S3, etc.) |
| Files | User-scoped storage paths (unlike anonymous share links) |
| Client | Sync layer: local cache + cloud source of truth |
| Security | E2E encryption optional (collab/share-link pattern) vs server-side storage |

**Pros:** Cross-device, backup, team features possible.  
**Cons:** Backend ops, auth, conflict resolution, cost, privacy/compliance.

**Feasibility: Medium–High** if leveraging Excalidraw+ backend; **Medium** for a new self-hosted backend.

**Note:** Current Firebase rules (`firebase-project/firestore.rules`) allow direct doc access but **disable listing** — not suitable for "my boards" without schema and rule changes.

---

### Option C: Hybrid (Phased)

1. **Phase 1:** Local boards (Option A) — immediate user value in OSS app  
2. **Phase 2:** Optional cloud sync for signed-in Plus users — reuse Plus export pipeline (`ExportToExcalidrawPlus.tsx`) as upload path  
3. **Phase 3:** Sharing, collaboration per board, team workspaces

**Feasibility: High** as a product strategy; allows incremental delivery.

---

## Technical Risks & Constraints

| Risk | Impact | Mitigation |
|------|--------|------------|
| localStorage quota | Medium | Store board payloads in IndexedDB, not localStorage |
| Large scenes / Firebase doc limits | High (cloud) | Chunking, file externalization, size warnings |
| Collab pauses local save | Medium | Clear UX when switching boards during collaboration |
| Cross-tab sync | Medium | Board-scoped version keys |
| Global file store | Medium | Namespace files per board or garbage-collect on delete |
| Library package embeddability | Low | Keep board logic in `excalidraw-app`; expose optional hooks in package if needed |
| Migration from single-scene | Low | On first load, promote current localStorage scene to "Untitled board" |

---

## UI / UX Considerations

- **Entry point:** Main menu or sidebar "Boards" panel (similar to library sidebar)
- **Auto-save:** Debounced save (existing 300ms pattern in `LocalData.ts`) per active board
- **Unsaved changes:** Prompt before switching boards if dirty
- **Empty state:** "Create your first board" when index is empty
- **Thumbnail:** Render mini canvas preview on save (optional; can defer)

---

## Dependencies & External Services

| Dependency | Required for |
|------------|--------------|
| IndexedDB (`idb-keyval`) | Local boards |
| Existing serialization (`json.ts`) | All options |
| Firebase / backend V2 | Cloud only |
| Excalidraw+ auth & API | Cloud sync via Plus |
| New backend service | Self-hosted cloud boards |

---

## Suggested Implementation Plan (Local MVP)

1. **Storage adapter** — `BoardPersistenceAdapter` interface + IndexedDB implementation  
2. **Board manager** — CRUD + active board ID in app state  
3. **Save/load integration** — Hook into `App.tsx` `onChange` and `initializeScene`  
4. **File scoping** — Per-board file lifecycle in `FileManager`  
5. **UI** — Board list component + switch/create/delete flows  
6. **Migration** — Import existing localStorage scene as default board  
7. **Tests** — Unit tests for adapter; E2E for switch/save round-trip  

---

## Open Questions for Product

1. **Local-only vs cloud-first?** Determines MVP scope and timeline.
2. **Plus integration?** Should OSS "Save boards" sync to Excalidraw+ accounts?
3. **Sharing model?** Is a saved board shareable via existing link/collab flows?
4. **Free tier limits?** Max boards, max storage per user?
5. **Self-hosted support?** Should board storage work without Firebase?

---

## Conclusion

Adding "Save boards" is **technically feasible** and aligns with existing Excalidraw patterns. A **local-first MVP** can be built entirely within `excalidraw-app` using IndexedDB and the library adapter pattern, with moderate invasiveness to the current single-scene save path. **Cloud-backed boards** are feasible but require authentication, backend work, and sync design — best pursued as a second phase or via Excalidraw+ integration.

**Recommended next step:** Confirm product scope (local vs cloud), then spike a `BoardPersistenceAdapter` prototype with 2–3 boards switching in the OSS app.
