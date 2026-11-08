# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router), React 19, Tailwind 4, GSAP with @gsap/react for motion, lucide-react icons. The site is deployed as a static export (`output: "export"` to `caps-landing/out` on Vercel), so there is no server runtime: no server actions, cookies or proxy. The admin console runs on typed in-repo mock data behind a thin data layer (`src/lib/sparc/store.ts`), with a client-side mock session (`src/lib/mockSession.ts`). A real backend (cloud/IoT database fed by the ESP8266 gate) is not chosen yet. Charts are hand-built SVG animated with GSAP.

## Users

- **Administrators / facilities staff** at the University of San Agustin. They use the console at a desk and on a phone to see which slots are free, manage who may enter, set up floors, and review the gate log.
- **Drivers** (students, faculty, staff, visitors) who tap an NFC campus ID at the gate kiosk. They only need a read-only view of availability.

## Product Purpose

SPARC (Smart Parking Access and Real-Time Count) is an IoT parking system for the university's new five-level parking building. An NFC tap at the kiosk verifies the campus ID, the driver picks a slot on a cinema-style map, the barrier opens, and every entry and exit is logged. No guard is stationed at the gate. The admin console exists so administrators can run that system: live slot status, user registry, floor setup, entry/exit log, daily usage reports.

## Positioning

Access control, slot assignment and slot counting all hang off the same NFC tap, so the building needs no per-slot sensor. The live count is a by-product of the tap log.

## Operating Context

- One building, five floors, about 110 slots (default 20 / 20 / 24 / 23 / 23). Slot codes are floor letter plus number: A1, B7, C12.
- Floors 1–2 are for SUVs and vans; floors 3–5 for lighter vehicles. The administrator sets slots per floor and the vehicle type allowed on each floor.
- Slot states: free, reserved (chosen at the kiosk, driver on the way), occupied.
- Data stores: D1 Registered Users (NFC IDs plus admin accounts), D2 Parking Logs (time, slot, vehicle type, result), D3 Parking Slots.
- Live data refresh target: 10 seconds or less.
- An unregistered tap raises an invalid-ID alert for the administrator.

## Capabilities and Constraints

Admin Dashboard module: admin login; register, edit, remove users; slot and floor setup; live slot status view.
Reports module: daily usage report; entry and exit log viewer (including denied taps); report export.
Also in scope: a read-only driver availability page.
Not decided: the real backend and auth provider; whether drivers get accounts or their own history view. The current console is a prototype on simulated data and must be labelled as such wherever a visitor could mistake it for live gate data.

## Brand Commitments

Existing SPARC design system from the landing page: near-black canvas, Augustinian gold (primary action) and crimson, Figtree display with Inter body, GSAP-driven motion with a reveal-on-scroll pattern. The seal and the "SPAR" + gold "C" wordmark are fixed assets.

## Evidence on Hand

`SPARC_Final_Project_Proposal.docx` (F:\IT School proj compile\sspacrc): objectives, data flow diagrams, functional decomposition. No real gate data, no real users, no production database exist. Demo data must stay synthetic and labelled.

## Product Principles

1. The slot map is the product. Everything else supports reading or changing the state of the building.
2. State is never colour alone: icon, label and colour together.
3. Say plainly when data is simulated.
4. An unregistered tap should be one click from becoming a registered user.
5. Familiar controls and table patterns over invention; the SPARC theme carries the brand.

## Accessibility & Inclusion

Keyboard operable throughout; visible gold focus ring; 4.5:1 text contrast; tap targets of at least 44px on phones; reduced-motion respected.
