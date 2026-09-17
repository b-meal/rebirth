---
name: frontend-code-quality
description: Code-quality guideline for React/Next code in this repo — readability, predictability, cohesion, coupling, data flow, web standards (Toss Frontend Fundamentals, adapted to this project). Use when writing a new component/hook/module, reviewing or refactoring existing code, when a file "feels hard to read", when a component grows conditional branches or nested ternaries, when deciding whether to extract a shared abstraction, when naming a wrapper/util, when choosing form validation shape, when state is mutated in place or a server response is rendered raw, when two screens manage the same data through different state mechanisms, when a clickable div/keyboard-unreachable control or an unlabelled input appears, when semantic markup or responsive device-layer placement is in question, or when applying SOLID to function components. Not a performance skill (see vercel-react-best-practices) and not a composition-API skill (see vercel-composition-patterns).
allowed-tools: Read, Edit, Write, Grep, Glob
---

# Frontend Code Quality

Six axes. Judge code by how cheap it is to **change**, not by how clever it looks. Substance over technique: remove the magic, keep the flow obvious.

| Axis | Question | Rules |
|---|---|---|
| Readability | Can a stranger follow this top-to-bottom without jumping files? | R1–R8 |
| Predictability | Does it do exactly what its name and signature promise? | P1–P5 |
| Cohesion | Do things that change together live together? | C1–C4 |
| Coupling | Does changing this force changes elsewhere? | K1–K4 |
| Data flow | Is there one owner per fact, and does it move in one direction? | D1–D4 |
| Web standards | Does the markup work for every user, input device, and browser? | W1–W4 |

**These axes conflict.** Splitting a component helps readability and hurts cohesion; sharing a hook helps cohesion and adds coupling. There is no globally correct answer — pick the axis that matters for *this* code and state the tradeoff. When two rules collide, prefer the one that keeps a future change local.

Two axes are **not tradeable**, and they are the ones to check first:

- **Data flow** — D1 and D3. A mutated source object or a second owner of the same fact is a defect at any readability gain.
- **Web standards** — W1 and W2. A control that a keyboard cannot reach, or an input with no accessible name, is broken for real users. Never trade it for brevity.

This skill defers to two neighbours instead of restating them:
- Component API shape (compound components, boolean-prop proliferation, lifting state, render props, React 19 `ref`) → **`vercel-composition-patterns`**
- Anything about render cost, bundle size, caching, `memo`, Server Components → **`vercel-react-best-practices`**

---

## Before writing the implementation

Write the call site first. Draw the interface you *want* while you still don't know how it works, then fill the body to match.

```tsx
// 1. The usage you wish existed.
<UserList users={users} isLoading={isLoading} onRetry={refetch} />

// 2. Only then the body.
function UserList({ users, isLoading, onRetry }: {
  users: User[];
  isLoading: boolean;
  onRetry: () => void;
}) { /* … */ }
```

Anchor that interface on the HTML element it stands for. A component that wraps an input takes `value`/`onChange`/`disabled`; one that wraps a button takes `onClick`/`type`. Predictable beats inventive — do not be creative with an API everyone already knows.

Abstract by **responsibility**, and reuse follows. The four responsibilities stay unmixed:

| Responsibility | Owns | Lives in |
|---|---|---|
| Data | fetching, caching, sync | `services/**` query and mutation hooks |
| State | UI state, business state | zustand store, orchestrator hook |
| Presentation | markup, style, animation | view, parts |
| Control | event handling, flow | handlers in the orchestrator hook |

A module that answers to two of these rows is the thing to split. A module extracted for line count alone is extraction wearing the costume of abstraction.

Prefer composition to inheritance throughout. Build small pieces and assemble them; a base component that subclasses specialise is the wrong shape for function components.

SOLID applies to function components, and every letter already has a home in this skill. Read the rule, not the acronym.

| Letter | In function-component terms | Rule |
|---|---|---|
| Single responsibility | One component or hook answers one row of the table above | C4, R3 |
| Open-closed | Extend by wrapping a new part around the old one, never by threading a new flag through it | K4 |
| Liskov substitution | Siblings are interchangeable — same return shape, same prop names, no exceptional one | P1 |
| Interface segregation | A consumer never receives props or state it does not read | K2, K3 |
| Dependency inversion | Screens depend on the query seam, not on a concrete HTTP client | P3, K3 |

---

## Readability

### R1 · Name magic numbers

An unexplained literal is a comment that was never written.

```ts
const ANIMATION_DELAY_MS = 300;

async function onLikeClick() {
  await postLike(url);
  await delay(ANIMATION_DELAY_MS); // waiting for the like animation
  await refetchPostLike();
}
```

In this repo there is no Tailwind and no motion-token module — styling is SCSS (`styles-rule.md`), so durations live in SCSS variables and a TS-side literal is a local `const`. Name it and keep it beside its logic (`quality-rule.md` §C, `data-rule.md` for query constants).

### R2 · Abstract implementation details

When a component carries logic that isn't its subject, move that logic behind a component whose name *is* the logic.

```tsx
// The page only knows about login UI. The guard owns the redirect rule.
function LoginPage() {
  return (
    <AuthGuard>
      <LoginForm />
    </AuthGuard>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const status = useLoginStatus();
  useEffect(() => {
    if (status === "LOGGED_IN") router.replace("/dashboard");
  }, [status]);
  return status === "LOGGED_IN" ? null : children;
}
```

Same move for an interaction: a caller that needs "confirm, then send" should render `<InviteButton name={…} />`, not open a dialog and branch on its result inline.

### R3 · Separate code paths that barely overlap

Two roles sharing one body with `disabled={isViewer}` scattered through it reads worse than two small components.

```tsx
function SubmitButton() {
  const isViewer = useRole() === "viewer";
  return isViewer ? <ViewerSubmitButton /> : <AdminSubmitButton />;
}
```

Only split when the branches differ **structurally** (different effects, different elements). Two branches differing by one prop belong in one component — that's R5.

### R4 · No nested ternaries

Nested `? :` costs a reread every time. An IIFE with early returns costs none.

```ts
const status = (() => {
  if (isA && isB) return "BOTH";
  if (isA) return "A";
  if (isB) return "B";
  return "NONE";
})();
```

One level of ternary in JSX is fine. Two is a defect.

### R5 · Reduce eye movement

Logic used **once**, in **one** place, stays in that place. Don't pay an import + file jump for three lines.

```tsx
function Page() {
  const user = useUser();
  const policy = {
    admin: { canInvite: true, canView: true },
    viewer: { canInvite: false, canView: true },
  }[user.role];

  if (!policy) return null;

  return (
    <div>
      <Button disabled={!policy.canInvite}>초대</Button>
      <Button disabled={!policy.canView}>보기</Button>
    </div>
  );
}
```

This rule is the counterweight to R2/R3 — extract for *reuse or noise removal*, not on reflex.

### R6 · Name complex conditions

```ts
const matched = products.filter((product) => {
  const isSameCategory = product.categories.some((c) => c.id === targetCategory.id);
  const isPriceInRange = product.prices.some((p) => p >= minPrice && p <= maxPrice);
  return isSameCategory && isPriceInRange;
});
```

Name it when it's compound, reused, or worth a test. `if (items.length === 0)` needs no name.

### R7 · One reading order per file

A file reads **data → derivation → control → markup**, always in that order. A `useEffect` wedged between two JSX branches makes the reader scan the file twice.

```tsx
function OrderList() {
  const { data: orders = [], isLoading } = useOrderListQuery(); // data
  const visible = useMemo(() => orders.filter((o) => !o.hidden), [orders]); // derivation
  const handleRowClick = useCallback((id: string) => navigate(`/order/${id}`), [navigate]); // control

  if (isLoading) return <FbSpinner />;
  return <FbTable rows={visible} onRowClick={handleRowClick} />; // markup
}
```

Derived values are computed, never stored. A second `useState` mirroring something already derivable from `orders` is a second source of truth (D3).

### R8 · Split JSX by component, not by `map`

Once a `map` callback grows branches, it is a component with no name. Extracting the row gives it props, a type, and a place for its own conditionals.

```tsx
{visible.map((order) => (
  <OrderRow key={order.id} order={order} onClick={handleRowClick} />
))}
```

Heuristic: a callback over ~15 lines, or with two or more conditionals, becomes a component. Below that, inline is cheaper (R5).

Styling stays in `className` — zero inline `style` objects, since an inline object is a new reference on every render and escapes stylelint. The exception is a genuinely dynamic value that cannot be a class, and it passes as a CSS custom property.

---

## Predictability

### P1 · Standardize return types

Sibling functions must return the same shape. Callers should not have to remember which one is the exception.

```ts
// API hooks always return the query object — never a bare `data`.
function useUser(): UseQueryResult<User, Error> {
  return useQuery({ queryKey: ["user"], queryFn: fetchUser });
}

// Validators always return the same discriminated union.
type ValidationResult = { ok: true } | { ok: false; reason: string };

function checkIsNameValid(name: string): ValidationResult {
  if (name.length === 0) return { ok: false, reason: "이름을 입력해 주세요." };
  if (name.length >= 20) return { ok: false, reason: "이름은 20자 이하여야 합니다." };
  return { ok: true };
}
```

A discriminated union beats `boolean | string` because `reason` is only reachable on the failure branch. For form validation, prefer a zod schema (C1) over hand-rolled validators.

### P2 · No hidden side effects

A function does what its signature says and nothing else. `fetchBalance()` fetches; it does not log, and it does not sync.

```ts
async function fetchBalance(): Promise<number> {
  return http.get<number>("/balance");
}

async function handleUpdateClick() {
  const balance = await fetchBalance();
  logging.log("balance_fetched"); // the caller decides to log
  await syncBalance(balance);
}
```

A `use*` hook that mutates the URL, writes storage, or fires analytics as a bonus is the same defect — say so in the name (`useSyncCardIdToQueryParam`).

### P3 · Unique, descriptive names for wrappers

A local wrapper that shadows a library name lies about what it does. If the wrapper adds auth, the name says auth.

```ts
export const httpService = {
  async getWithAuth(url: string) {
    const token = await fetchToken();
    return httpLibrary.get(url, { headers: { Authorization: `Bearer ${token}` } });
  },
};
```

In this repo the HTTP seam is the `FBService` subclass per resource (`src/services/<domain>/<resource>.service.ts`), consumed only through the colocated `*.queries.ts` — screens never import a `.service` file directly (`data-rule.md` §1, `quality-rule.md` §D). Extend that chain rather than adding a second client.

### P4 · Type the boundary, infer the inside

Data, props, and API responses get explicit types at the edge. Everything downstream is inferred — a hand-written type on a value TypeScript already knows is a second declaration to keep in sync.

```ts
export interface OrderResponse { orderNo: string; ordDt: string; payAmt: number; }

const visible = orders.filter((o) => !o.hidden); // inferred Order[], do not annotate
```

`any` and a non-null `!` are both unproven claims. Where the shape comes from outside the type system — query params, storage, a webhook — validate with zod rather than asserting.

### P5 · Map the response, never render it raw

An API shape is the backend's vocabulary and it changes on the backend's schedule. Map it once at the data layer into the shape the UI wants, and let the rest of the screen depend only on that.

```ts
function toOrder(res: OrderResponse): Order {
  return { id: res.orderNo, orderedAt: new Date(res.ordDt), amount: res.payAmt };
}

export const orderListQuery = () =>
  queryOptions({
    queryKey: orderKeys.list(),
    queryFn: fetchOrderList,
    select: (res) => res.map(toOrder), // one place absorbs a field rename
  });
```

Without a mapping seam, a renamed field means edits in every component that read it. With one, the diff is a single function.

When the response is missing or fails, the UI still owes an answer: retry with backoff, a fallback value, and a visible message. Failing silently is the one outcome that is never acceptable — log it so the failure is detectable without a user report.

---

## Cohesion

### C1 · Choose form cohesion deliberately

**Field-level** — independent fields, async/per-field checks, reusable inputs:

```tsx
<input {...register("name", {
  validate: (v) => (v.trim() === "" ? "이름을 입력해 주세요." : true),
})} />
```

**Form-level** — interdependent fields, wizards, one submit contract:

```tsx
import { z } from "zod"; // zod 4 — this repo has no re-export wrapper
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요."),
  email: z.email("이메일 형식이 올바르지 않습니다."),
});

const { register, formState: { errors }, handleSubmit } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: "", email: "" },
});
```

Mixing both in one form is the failure mode: a rule lives in two places and one of them goes stale. Form-level is the default here.

### C2 · Organize by domain, not by file type

Shared things live by type; domain things live by domain. This repo's shape:

The two apps have different shapes — `project-context.md` (Page Structure) is the source of truth. Roughly:

```
# store (apps/store) — Next App Router
src/app/<route>/                 # page.tsx + View trio (.tsx/.desktop/.mobile) + parts/
src/hooks/<domain>/<route>/      # orchestrator hook per route
src/services/<domain>/           # <resource>.service.ts + .types.ts + .queries.ts
src/components/fb/{elements,modules,parts,contents}/   # shared fb-* components

# admin (apps/admin) — Next shell + RRv7 memory router
src/views/desktop/<domain>/<route>/{index.tsx,parts/}
src/hooks/<domain>/<route>/index.ts
```

Test: to delete a feature, is there one folder to delete? If the feature is smeared across four type-folders, it wasn't cohesive. A component earns `components/fb/` only when it is domain-free — and then it owes both device variants and a story (`views-rule.md`, `RULEBOOK`).

Colocation decides the folder; the duplication question decides whether there is one file or two:

- Likely to change together in several places → share it. Cohesion wins.
- Small blast radius, and reading it matters more than deduplicating it → duplicate it. Readability wins.

Ship the tree a reviewer can scan: no orphan files, no dead branch left behind, no scratch file riding along in the diff.

### C3 · Keep constants beside the logic they serve

A constant defined far from its use gets updated on one side only. Define it in the same file as the logic, or give it a name that makes the link unmissable (`ANIMATION_DELAY_MS`, not `DELAY`). Genuinely shared values go to a tokens/constants module — not to a random util barrel.

### C4 · Split a large form by field group

Admin forms are wide and field-heavy, and a single form component absorbing every field and every rule is the shape that rots first. Split by field group, one part per group, each owning its own inputs and its own errors.

```tsx
// index.tsx composes; each part owns one group of fields.
<FbFormLayout onSubmit={handleSubmit(onSubmit)}>
  <BasicInfoSection />
  <DeliverySection />
  <PriceSection />
</FbFormLayout>
```

The schema stays whole at the form level (C1) while the markup splits — one submit contract, several editors. Parts read the shared `useFormContext()` instead of receiving a threaded `register` prop (K3).

Errors render declaratively from form state. An imperative `if (invalid) showError()` inside a handler puts the error in a second place, where it drifts from the rule that produced it.

---

## Coupling

### K1 · Do not abstract prematurely

Duplication is cheap; the wrong abstraction is not. Before merging two similar blocks, ask whether they are identical **and likely to stay identical**. If two callers already want slightly different behaviour, the shared version will grow flags — and a flag-driven hook couples every caller to every other caller's requirements.

Prefer: duplicate now, extract on the third occurrence with evidence. This is deliberately in tension with R2 — R2 hides *noise*, K1 refuses to hide *divergence*.

Verify that the **volatility** is shared, not merely that the code looks alike. Two blocks with identical text and different reasons to change are two blocks. Present clarity outranks imagined future extension.

Strong abstraction costs readability, so the bar rises with how easy the code already is to read. A thin presentational block earns duplication; a component carrying genuinely complex UI *and* business logic earns the abstraction. Decide by which one a reader can follow without leaving the file.

### K2 · Scope state narrowly

One broad `useFilters()` returning eight params couples every consumer to all eight, and re-renders them all on any change. Split by concern:

```ts
// Read through `useRouteQuery`, write through `useNavigate` — never `next/navigation`
// directly from domain code (data-rule.md §4). The read adapter is read-only by design.
export function useCardIdQueryParam() {
  const { query } = useRouteQuery();
  const navigate = useNavigate();
  const cardId = query.cardId ? Number(query.cardId) : undefined;
  const setCardId = useCallback((next?: number) => navigate(buildUrl({ cardId: next })), [navigate]);
  return [cardId, setCardId] as const;
}
```

Same for context: one context per concern beats one god-context. In this repo cross-cutting client state is zustand and the bar for "genuinely cross-cutting" is the `create-store` skill's (`stores-rule.md`). Render-cost details → `vercel-react-best-practices`.

### K3 · Composition over props drilling

Passing a prop through a component that doesn't use it couples that middleman to a change it has no stake in. Render children where the data already is instead of threading props down.

Where the data is already cached, an id is a smaller contract than the entity. The parent hands down `orderId`; the child reads the entity from the query cache and renders it — so a new field on `Order` touches the child alone.

```tsx
<OrderSummary orderId={orderId} />
```

This holds only when the child is the one that needs the data. Passing an id to a child that then has to hand the *entity* to its own parent-level sibling is drilling with extra steps — pass the object then.

**Decide by what the child does with it, not by prop count.**

| The child… | Pass |
|---|---|
| fetches for itself (`useQuery`/`fetchQuery` keyed by the id) | **the id** |
| renders the data it was handed | **the object** |
| returns the entity through a callback (`onSelect(item)`) | **the object** |
| spreads or forwards it whole (`data={item}`, `{...item}`) | **the object** |

Two preconditions gate the id form, and both are easy to assume without checking:

1. **A fetch path keyed by that id exists.** A list endpoint that returns everything at once is not one. Grep the `*.queries.ts` for a single-entity `queryOptions` before designing around an id — if `/orders/{id}` exists but `/orders/items/{itemId}` does not, an `orderItemId` prop leaves the child with nothing to call.
2. **The child is not inside a `map`.** Swapping an object for an id inside a list turns one response into N requests. The list already holds the data; re-fetching per row is a waterfall wearing a decoupling costume.

A modal is the usual place both hold: it opens with an id, fetches detail the list never carried, and its props stay stable while the list body changes.

```tsx
// The modal queries feedback itself — the goods object was never needed.
<ReviewModal goodsId={goods.goodsId} goodsOptionId={goods.goodsOptionId} onClose={close} />
```

The smell that finds these: a prop typed as an entity whose every read in the file is `x.someId`. That component is asking for a key and being handed a record.

Do not reach for the id form to cut re-renders. With React Compiler on, a cached entity is a stable reference and already memoises; splitting it into an id plus a child-side `useQuery` adds a hook per row and buys nothing (→ **`vercel-react-best-practices`**).

The enforced version of this rule, with the repo's own measured exceptions, is `quality-rule.md` §M.

Full pattern set (compound components, lifting state, context boundaries) → **`vercel-composition-patterns`**.

### K4 · Compose to extend, do not edit to extend

New behaviour arrives as a new part wrapped around the old one, never as a new flag threaded through it. Each `if (variant === …)` added to a working component puts every existing caller at risk for the sake of one new caller.

```tsx
// Add capability by wrapping.
<Permission required="ORDER_WRITE">
  <OrderActions orderId={orderId} />
</Permission>
```

Inheritance-shaped base components are the same defect in a different costume — compose small pieces instead. A component that keeps growing variants has more than one job (C4, R3), and splitting it is the fix that stops the growth.

---

## Data flow

### D1 · Never mutate what you did not create

A server response, a store value, and a prop are all read-only. Sorting a list in place reorders the query cache for every other consumer, and React's change detection compares references — mutating one leaves the screen stale.

```ts
// Wrong: reorders the cached array everyone else reads.
orders.sort((a, b) => a.amount - b.amount);

// Right: derive a new one.
const sorted = [...orders].sort((a, b) => a.amount - b.amount);
setSelected((prev) => ({ ...prev, [id]: true }));
```

`sort`, `reverse`, `splice`, `push`, and direct field assignment all mutate. For a deep update use `structuredClone()` rather than a hand-rolled spread ladder — Immer is **not installed** in either app, so do not reach for `produce`.

Building up a **local** array with `push` is not a violation: mutating a variable created during this render is an explicit exception to the purity rules. The receiver's origin is what decides — a fresh `const list = []` is fine, a props/response/store array is not. Full judgement table: `quality-rule.md` §O.

### D2 · One direction, one mutator

Data flows parent → child; events flow child → parent. A child receives values through props and reports intent through a handler, so the owner of the state is the only code that changes it.

```tsx
<QuantityInput value={quantity} onChange={setQuantity} />
```

At any moment, exactly one place writes a given piece of state. Two writers on one value is the bug that reproduces only sometimes. Minimise dependencies between separate pieces of state — state that must be recomputed from other state is derived, not stored (R7).

### D3 · One owner per fact

The same fact managed two ways in two screens is the most expensive kind of inconsistency: both are correct in isolation and neither is correct together.

```
Server data      → TanStack Query (the cache is the source of truth)
Cross-cutting UI → zustand store (see the create-store skill's bar for "genuinely cross-cutting")
Local UI         → useState in the component that owns it
Form values      → RHF, one form per submit contract
URL-worthy state → the query string
```

Picking a different mechanism per screen — a hook here, a context provider there, for the same domain data — is a finding, not a style preference. Route the fact to its category above and keep every screen on that route.

### D4 · Survive a reload, respond before the server

State the user can lose has to be worth losing. Anything they invested effort in — a cart, a filter set, a half-written form — belongs somewhere durable: the URL for anything shareable or back-button-worthy, storage for anything longer-lived.

For a mutation whose outcome is near-certain, update the cache immediately and reconcile after:

```ts
useMutation({
  mutationFn: updateQuantity,
  onMutate: async (next) => {
    await queryClient.cancelQueries({ queryKey: cartKeys.list() });
    const previous = queryClient.getQueryData(cartKeys.list());
    queryClient.setQueryData(cartKeys.list(), (old) => applyQuantity(old, next));
    return { previous }; // rollback handle
  },
  onError: (_e, _v, ctx) => queryClient.setQueryData(cartKeys.list(), ctx?.previous),
  onSettled: () => queryClient.invalidateQueries({ queryKey: cartKeys.list() }),
});
```

An optimistic update without a rollback path is not optimistic, it is wrong. Keep it for high-confidence, low-cost mutations; payments and irreversible actions wait for the server.

---

## Web standards

### W1 · Reach for the semantic element before a div

The element name is the contract the browser already implements — keyboard focus, activation on Enter and Space, the accessibility tree, and form participation all arrive free.

```tsx
// A div with onClick is unreachable by keyboard and invisible to assistive tech.
<button type="button" onClick={onApply}>적용</button>

<ul className="order__list">
  {orders.map((order) => <li key={order.id}>{order.name}</li>)}
</ul>
```

Tabular data belongs in `<table>` with `<th scope="col">` headers, not a grid of divs. Page structure uses the landmark elements (`header`, `nav`, `main`, `footer`), carries exactly one `<h1>`, and does not skip heading levels. Reserve `role` for the case where no element expresses the meaning — a `role` on top of the correct element is noise, and a `role` compensating for the wrong element is a bug report.

### W2 · Make it accessible by construction, not by audit

```tsx
function PriceField({ label }: { label: string }) {
  const id = useId(); // never crypto.randomUUID or Math.random — those break hydration
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" inputMode="numeric" />
    </>
  );
}
```

Five checks that catch most of it:

- Every input has a programmatically linked name through `htmlFor`, and an icon-only button carries one too.
- Informative images have a real `alt`; decorative ones take `alt=""` rather than a description of the artwork.
- The focus indicator is never removed, because keyboard users navigate by it.
- State never rides on colour alone — an error shows colour *and* text.
- A validation message is associated with the field it judges, so it is announced rather than merely displayed.

`useId` is for linking ids only; it is never a list key (`react.md`).

### W3 · Put responsiveness in the device layer

Responsiveness here is layer selection, not media-query sprawl inside one component. store splits a screen into `.desktop.tsx` and `.mobile.tsx` twins; admin is a PC-only surface with wide, field-heavy screens, so a mobile branch inside an admin view is a sign the work landed on the wrong surface.

Breakpoints live in SCSS, since this repo has no Tailwind. A component promoted to `components/fb/` owes both device variants and a story (C2).

Layout adapts with flexible units, grid, and `max-width: 100%` on media, so a wide table or chart scrolls inside its own container instead of making the page scroll sideways.

### W4 · Standard APIs, valid documents, feature detection

Prefer the platform API over a shim, and let the build add vendor prefixes rather than hand-writing them. Keep the markup valid — a block element inside `<p>`, or a `<tr>` outside a row group, produces a DOM the browser silently rewrites, and the rewritten tree is what your selectors and tests then miss.

Branch on capability, never on a parsed user-agent string, so a browser that gains the feature stops taking the fallback path.

---

## Applying this in review

Report findings as `path:line` + which axis broke + the cheapest fix. Do not "fix" something by trading one axis for another without saying so.

Defects first — these break behaviour, not taste:

1. An in-place mutation of a response, store value, or prop (D1)
2. Two writers on one piece of state, or the same fact owned two ways (D2, D3)
3. An optimistic update with no rollback path (D4)
4. A clickable `div`, or any control a keyboard cannot reach and activate (W1)
5. An input or icon-only button with no accessible name, or a removed focus indicator (W2)
6. `any`, a non-null `!`, or an unvalidated external value (P4)
7. A component reading a raw API shape with no mapping seam (P5)

Then the cheap smell list, in the order it usually pays off:

8. A literal number/string with no name (R1, C3)
9. Nested ternary or a chain of `&&` in JSX (R4)
10. A `map` callback that has grown branches, or an inline `style` object (R8)
11. A boolean prop that switches structure, not style (→ `vercel-composition-patterns`)
12. A hook or function whose name hides half of what it does (P2, P3)
13. Sibling functions returning different shapes (P1)
14. A shared hook with a flag per caller (K1)
15. A new `variant` flag added to a working component (K4)
16. A prop passed through 2+ components that never read it (K3)
17. A self-fetching child taking an entity prop it only reads ids off (K3)
18. A feature whose files span four type-folders (C2)
19. A form component holding every field group and rule at once (C4)
20. Divs standing in for a table, list, or heading, or a second `<h1>` (W1)
21. State carried by colour alone, or a validation message not tied to its field (W2)
22. A media query inside an admin view, or a device branch inside a store twin (W3)
23. A user-agent check where feature detection would do (W4)

### Translating the rules into per-feature acceptance criteria

A review checklist is more useful when each row names the rule it exercises. This is the shape to produce for a data-heavy screen — the example is a sales dashboard, and the right column is the part to reuse.

| Item | Acceptance criterion | Rule it exercises |
|---|---|---|
| Single-page shell | One page, no router | Structural decision, not a rule |
| Three chart types | Line, stacked bar, pie all honour the active filter | D3 — one owner for the filter, every chart derives from it |
| Cross-filtering | Clicking a pie slice drives the other charts and the table | D2, D3 — selection is one fact with one writer |
| Table | Item info plus revenue, with sorting or pagination | D1 — sort a copy, never the cached array |
| Filters | Sensible default dates, publisher options derived from the data | R7, P5 — options are derived, never a second state |
| Data shaping | `sales` joined to `product` on `productId` | P5 — the join is the mapping seam, done once |
| Performance | Memoised derivations, debounced filter input | → `vercel-react-best-practices` |
| Code structure | Chart, filter, and table are separate components and hooks | C2, R8, the responsibility table |
| Deliverable | README plus a runnable dev command | Delivery requirement |

The join row is the one that decides the rest. Map `sales` and `product` into one view model at the data layer, and every chart and the table read that one shape; skip it, and each consumer re-derives the join and they drift.

---

## Where each principle lives

Use this to check coverage without duplicating a rule body.

| Principle | Rule | Note |
|---|---|---|
| Composition over inheritance | K4, responsibility table | Assemble small parts |
| Single responsibility, open-closed | C4, R3, K4 | One job per module, extend by wrapping |
| SOLID for function components | SOLID table above | Each letter maps to an existing rule |
| DRY without over-abstraction | K1 | Third occurrence, with evidence |
| Guard against false abstraction | K1 | Shared volatility, not shared text |
| Substance over technique | Axes intro, R1, R4 | Remove magic, keep flow obvious |
| Ease of change | Axes intro, K2, K3 | Loose coupling, strong cohesion |
| Colocation | C2 | One folder to delete a feature |
| Cohesion versus duplication | C2, K1 | Blast radius decides |
| Missing or failed server response | P5, D4 | Retry, fallback, message, log |
| Strict typing, runtime validation | P4, C1 | Type the boundary, zod the outside |
| Minimal eye movement | R5, R7 | Data, derivation, control, markup |
| Id-based props | K3 | Two preconditions gate it |
| Standards, responsive, accessibility, semantics | W1–W4 | Not tradeable |
| Immutable data | D1 | `structuredClone`; Immer is not installed |
| Unidirectional flow, single source of truth | D2, D3 | One writer per fact |
| State-change discipline | D2, R7 | Derived is computed, not stored |
| Define state, derive, render | R7 | Business logic in hooks |
| Split a wide form by field group | C4, C1 | Schema whole, markup split |
| Declarative validation | C4 | Render errors from form state |
| Interface first, body second | Before writing the implementation | Draw the call site first |
| Predictable over inventive | Before writing the implementation | Anchor on the HTML element |
| Abstract by responsibility | Responsibility table | Reuse follows |
| Map the response before use | P5 | One function absorbs a rename |
