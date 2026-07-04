# Align HRMS — Frontend Design Document

**Prototype file:** `hrms.html`
**Tagline:** Every workday, perfectly aligned.
**Status:** Interactive front-end mockup (static/mock data, no backend wired)

---

## 1. Design brief & direction

The PRD asked for a fairly standard HR system — auth, dashboards, profile, attendance, leave, payroll. The risk with a brief like this is a generic admin-panel look (sidebar + cards + tables, indistinguishable from any SaaS template). The direction taken here builds everything around one idea taken literally from the tagline: **a month is a grid of days, and alignment means every one of those days has a clear, correct status.**

That idea becomes both the literal attendance visualization *and* the decorative motif elsewhere in the product, so the metaphor isn't just a nice headline — it's structural.

---

## 2. Design tokens

### 2.1 Color

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#12213A` | Sidebar, login panel, primary text, headlines |
| `--ink-soft` | `#2B3B58` | Hover states on dark surfaces, field labels |
| `--paper` | `#F4F5F1` | App background |
| `--panel` | `#FFFFFF` | Cards, tables, form surfaces |
| `--line` | `#E2E4DD` | Borders, dividers |
| `--accent` (sage-teal) | `#3E6B5A` | Present status, primary interactive accents, approvals |
| `--amber` | `#C1793B` | Pending / half-day / needs-attention states |
| `--rose` | `#B04A4A` | Absent / rejected states |
| `--muted` | `#6B7280` | Secondary text, labels |
| leave-blue | `#4F55A8` | Leave status only (kept distinct from the four tokens above so it doesn't compete with amber/rose in the grid) |

Deliberately avoided: warm cream + terracotta serif (the current default "AI-generated" look) and near-black + neon accent. Sage-teal was chosen instead because it reads as calm/reliable rather than energetic — appropriate for a system whose whole pitch is steadiness.

### 2.2 Typography

| Role | Typeface | Where used |
|---|---|---|
| Display | **Fraunces** (variable, optical size 9–144) | Headlines, section titles, big stat numbers — gives warmth without tipping into "template serif" territory since it's used narrowly (headlines only, never body copy) |
| Body / UI | **Inter** | All form fields, buttons, table text, nav labels |
| Data / mono | **IBM Plex Mono** | Timestamps, currency figures, grid-cell labels, the login page eyebrow ("01 — 30 — 31") |

Three-role pairing (display / body / data-mono) was chosen specifically because this product's content is disproportionately numeric (times, dates, amounts) — a monospace utility face lets numbers align visually in tables in a way a proportional face can't.

### 2.3 Layout

- **App shell:** fixed 232px dark sidebar + main column (topbar + scrollable content), collapses to an off-canvas drawer under 900px.
- **Content grids:** 2-, 3-, and 4-column CSS grid utilities (`.grid-2/3/4`) collapse to a single column on mobile.
- **Radius system:** two radii — `12px` for cards/panels (soft, calm) and `3px` for grid cells (sharp, so the attendance grid reads as a grid, not a set of soft blobs). This distinction is intentional: the signature element needs to look structural, not decorative.

### 2.4 Signature element — the Alignment Grid

A `10 × N` grid of small squares, each cell colored by day-status (present / absent / half-day / leave / upcoming). It appears in three places doing three different jobs:

1. **Login screen background** — ambient texture behind the hero copy, mostly at low opacity, establishing the motif before any real data is shown.
2. **Dashboard "this month at a glance"** — a compact 30-cell summary.
3. **Attendance & Leave views** — the actual functional heatmap/calendar, full-size and legend-annotated.

Because the same component (`buildGrid()` + `.heat-grid`/`.cell` CSS) powers all three, the decorative and functional versions are literally the same code — the metaphor isn't just visual, it's architectural.

---

## 3. Information architecture

```
Login Screen (unauthenticated)
├── Sign in
└── Sign up (Employee ID, Email, Password, Role picker)

App Shell (authenticated)
├── Sidebar
│   ├── Workspace: Dashboard · Profile · Attendance · Leave · Payroll
│   ├── Admin (role-gated): Employees · Approvals
│   └── Role switcher + Log out
├── Topbar (page title, date/status summary, avatar)
└── Content (one view visible at a time)
    ├── Dashboard      — role-specific (Employee vs Admin)
    ├── Profile        — View / Edit / Documents tabs
    ├── Attendance     — Monthly / Weekly tabs + check-in-out
    ├── Leave          — Apply form + calendar + request table(s)
    ├── Payroll        — role-specific (read-only vs editable table)
    ├── Employees      — Admin only
    └── Approvals      — Admin only
```

Role is global state (`setRole()`), not per-view — switching roles changes dashboard content, payroll view, leave tables, and sidebar nav simultaneously, matching the PRD's "role-based access" requirement (3.1, 3.2).

---

## 4. Screen-by-screen notes

### 4.1 Login / Sign up
- Split layout: dark visual panel (brand, thesis copy, alignment grid) + light form panel.
- Tab switch toggles Sign in / Sign up without route change.
- Sign up includes Employee ID, Email, Password, and a two-option Role picker (Employee / HR-Admin) per PRD 3.1.1.
- Inline error state (`.error-msg`) reserved for bad credentials — not shown by default, matches PRD 3.1.2's "display an error for incorrect credentials."
- Demo behavior: any credentials sign you in as Employee; a real build would gate on actual verification status.

### 4.2 Dashboard
- **Employee:** three quick-access cards (Profile / Attendance / Leave — PRD 3.2.1), a recent-activity table, and the mini alignment grid.
- **Admin:** four stat cards (headcount, present today, pending leaves, payroll due), an employee-status table with an inline "switch to employee record" selector (PRD 3.2.2's "switch between employees"), and a pending-approvals preview linking to the full Approvals view.

### 4.3 Profile
- Three tabs: **View** (personal + job details, read-only), **Edit** (phone/address/photo — the fields PRD 3.3.2 scopes to employees), **Documents** (offer letter, ID docs, etc.).
- A note under the Edit tab states that job details/salary are Admin-only edits, reflecting the PRD's permission split without hiding the concept from the employee.

### 4.4 Attendance
- Monthly/Weekly tab switch (PRD 3.4.1).
- Full alignment grid with a 5-state legend (present/absent/half/leave/upcoming).
- Check-in/out card with a live-style clock display and two actions, each producing a toast confirmation.
- Weekly table shows per-day check-in/out times and status badges.
- `attScope` label ("You" vs "All employees") reflects PRD 3.4.2's view-scoping by role.

### 4.5 Leave
- **Apply form** (Employee-only): leave type select (Paid/Sick/Unpaid), from/to date inputs, remarks — submitting prepends a new "Pending" row to "My leave requests" (PRD 3.5.1).
- **Calendar card**: reuses the alignment grid to show Present/Absent at a glance alongside the form.
- **Employee table**: own requests only.
- **Admin table** (`allLeaveTableCard`): all employees' requests with **Approve/Reject** row actions; clicking either updates the badge in place and shows a toast ("Request approved — employee notified"), simulating PRD 3.5.2's "changes reflected immediately."

### 4.6 Payroll
- **Employee view:** a single read-only salary-breakdown card (Basic, HRA, allowance, deductions, net) — PRD 3.6.1.
- **Admin view:** a table of all employees with an **Edit** action per row (currently a `prompt()` for net payable, standing in for a real inline editor) — PRD 3.6.2.

### 4.7 Employees & Approvals (Admin only)
- **Employees:** full roster with department, role, live status, and a "Manage" action stub.
- **Approvals:** the same approve/reject pattern as the Leave view, presented as a dedicated queue.

---

## 5. Component inventory

| Component | Notes |
|---|---|
| `.card` | Base surface for all panels/tables |
| `.badge` (present/pending/absent/approved/rejected/half/leave) | Status vocabulary used everywhere — one visual language across attendance, leave, and employee-status |
| `.heat-grid` / `.cell` | The alignment grid, parameterized by `genPattern()` mock data |
| `.tabs-row` | Used for Profile (View/Edit/Documents) and Attendance (Monthly/Weekly) |
| `.row-actions` (approve/reject/edit) | Table-row action buttons |
| `.toast` | Bottom-right confirmation for check-in/out, leave submit/decide, profile save, salary edit |
| `.role-toggle` | Sidebar role switcher driving all role-conditional rendering |

---

## 6. Interaction & state model

Everything is client-side JS against in-memory/mock data — no persistence, no real API:

- `currentView` — drives which `.view` block is visible and the topbar title.
- `role` (`employee` / `admin`) — drives visibility of admin-only nav items, dashboard variant, payroll variant, and leave-table variant.
- Leave decisions and salary edits mutate the DOM directly (row badge/text swap) rather than a data model — sufficient for a prototype, but a real build should route these through state + API calls so multiple views (e.g. dashboard's "pending leaves" count) stay in sync.

---

## 7. Responsive & accessibility notes

- Below 900px: sidebar becomes an off-canvas drawer, grids collapse to one column, login visual panel hides (form-only on mobile).
- Visible focus ring (`outline`) on inputs, selects, textareas, and keyboard-focusable buttons.
- Color is never the only status signal — every badge carries a text label alongside its color.

---

## 8. Known gaps / next steps

1. **Auth** — no real validation, password rules, or email verification; demo accepts any input.
2. **Data layer** — all content is hardcoded/mock; needs wiring to real endpoints for employees, attendance, leave, and payroll.
3. **Date-range picker** — leave form uses plain date inputs rather than the calendar-driven range picker described in PRD 3.5.1.
4. **Salary editing** — currently a browser `prompt()`; should become a proper inline/modal editor with validation.
5. **Notifications/alerts** — PRD 3.2.1 mentions dashboard alerts; only recent-activity is shown currently.