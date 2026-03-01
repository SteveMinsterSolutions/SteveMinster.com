# Front End Bumper Replacement — Implementation Guide for Claude Code

> **Purpose:** Implementation guide for `/off-the-clock/cobra/frontend` — the second build log entry for the 2008 Shelby GT500 (Zeus). This covers the front bumper replacement project.

---

## Page Setup

### Route
`/off-the-clock/cobra/frontend`

### Astro File
`src/pages/off-the-clock/cobra/frontend.astro`

### Breadcrumb
```
Off the Clock  /  2008 Shelby GT500  /  Front End
```

### Page Title (browser tab)
`Front End — 2008 Shelby GT500 — Steve Minster`

---

## Design

Follow the exact same layout and design patterns established on the exhaust page (`/off-the-clock/cobra/exhaust`):

- Same breadcrumb style
- Same section label + headline pattern
- Same Part Details sidebar card (adapted for this project)
- Same section headings (The Problem, The Choice, The Install, etc.)
- Same Before & After video comparison layout (side-by-side desktop, stacked mobile)
- Same photo gallery grid
- Same "DIY or Pro?" section
- Same "What's Next" closing with back link

---

## Content

### Hero Section

**Section label:** `THE BUILD LOG`

**Headline:** `A Little Pre-Loved.`

**Subtitle:**
> Clean CarFax. Cosmetic scars. Time to give Zeus his face back.

---

### The Problem

> When I found Zeus, the CarFax was spotless — one owner, 15,763 miles over thirteen years, no accidents, no damage reported. On paper, this was a garage queen from Pennsylvania who'd barely seen rain.
>
> But CarFax doesn't catch everything. The front bumper told a different story. Scrapes, scuffs, and the kind of wear that says "I've kissed a parking block or two." For a car this rare — one of 235 with this paint and trim combination — a beat-up front end wasn't going to cut it. Zeus deserved better.

---

### The Choice

> This was a two-part decision: what to replace, and who does the painting.
>
> The bumper itself was a straightforward OEM replacement. But matching Black Clearcoat on a Shelby GT500 — with the factory color code, the right metallic flake, and a finish that blends invisibly with a 15-year-old paint job — that's not a rattle-can-in-the-garage situation.
>
> I connected with **Classic Auto Painting** in Bethpage, Tennessee. Chris and his team have 20+ years of experience with custom and classic car paint work — including a 2024 GM Nationals class-winning Trans Am. They ordered the new bumper and painted it to match. I handled the removal and install myself.
>
> This is the "know when to call in the pros" philosophy in action. I can wrench. I can't color-match factory paint on a rare Shelby. Knowing the difference is the whole point.

---

### The Install

> Removing the old bumper was garage-friendly work — disconnect the fog light wiring, pull the fasteners, and slide it off the crash bar. Installing the new painted bumper was the reverse. The most nerve-wracking part wasn't the mechanical work — it was handling a freshly painted bumper without scratching it on the way in.
>
> Total time in the garage: about 2 hours for removal, and another 2 hours for the install once the painted bumper came back from Classic Auto Painting.

---

### Part/Project Details Card

| Detail | Value |
|--------|-------|
| **Project** | Front Bumper Replacement |
| **Type** | OEM Replacement + Custom Paint Match |
| **Paint Shop** | Classic Auto Painting, Bethpage, TN |
| **Paint Match** | Black Clearcoat (UA) — Ford #M6373 |
| **Removal** | DIY — my garage |
| **Install** | DIY — my garage |
| **Install Time** | ~2 hrs removal, ~2 hrs install |
| **Paint Work** | Professional (Classic Auto Painting) |
| **Difficulty** | Removal/install: Intermediate · Paint: Leave it to the pros |

---

### Before & After — Video Comparisons

**Section label:** `BEFORE & AFTER`

**Intro text:**
> The front end transformation — from tired to clean. Same car, same garage, different face.

#### Comparison 1: Front End Overview
- **Before:** `front-end-before.mp4`
- **After:** `front-end-done.mp4`
- **Before Label:** `BEFORE — DAMAGED`
- **After Label:** `AFTER — RESTORED`
- **Caption:** The full front end before and after. Watch for the clean lines and seamless color match on the new bumper.

#### During the Work
- **Video:** `front-end-during.mp4`
- **Label:** `DURING — IN PROGRESS`
- **Caption:** Mid-swap in the garage. The old bumper is off and the crash bar is exposed.

#### The Old Bumper's Send-Off
- **Video:** `Bumper in recycling.mp4`
- **Label:** `THE OLD BUMPER`
- **Caption:** The original bumper heads to recycling. Thanks for your service.

---

### Photo Gallery

**Section label:** `GALLERY`

**Headline:** `The Details`

**Photos (in order):**

1. **front-end-during.jpg** — Mid-install photo showing the work in progress
2. **new-bumper-ready.jpg** — The freshly painted replacement bumper, ready to install
3. **old-bumper-recycle.jpg** — The old damaged bumper after removal

---

### DIY or Pro?

> **Verdict: Both.** The removal and install? DIY all day — if you can swap an exhaust, you can swap a bumper. But the paint match? That's where you call in someone who does this for a living. Classic Auto Painting in Bethpage nailed the color match on a car that's been in the sun for fifteen years. No orange peel, no shade difference, no evidence it's not the original bumper.
>
> The lesson here is the same one I apply at work: know what you're good at, know what requires a specialist, and don't let ego make the decision for you.

---

### What's Next

> Zeus has his voice (the exhaust) and his face (the bumper). Next up: bringing the cabin into the current decade with a radio upgrade.
>
> [← Back to the Cobra](/off-the-clock/cobra)

---

## Media Asset Inventory

All files are already in place at:
`public/images/off-the-clock/cobra/front-end/`

| Filename | Type | Size | Description |
|----------|------|------|-------------|
| `front-end-before.mp4` | Video | 32,688 KB | BEFORE: Front end showing damage |
| `front-end-done.mp4` | Video | 32,021 KB | AFTER: Completed front end restoration |
| `front-end-during.mp4` | Video | 36,497 KB | DURING: Mid-swap work in progress |
| `front-end-during.jpg` | Photo | 3,855 KB | DURING: Photo of work in progress |
| `Bumper in recycling.mp4` | Video | 7,113 KB | Old bumper heading to recycling |
| `new-bumper-ready.jpg` | Photo | 1,068 KB | New painted bumper ready to install |
| `old-bumper-recycle.jpg` | Photo | 1,963 KB | Old damaged bumper after removal |

### Important Notes on File Paths

The image/video folder is `public/images/off-the-clock/cobra/front-end/` (hyphenated). The Astro page route is `/off-the-clock/cobra/frontend`.

### Video Format Notes

The videos appear to be the same square format (1440x1440) as the exhaust videos. Use the same video player layout and aspect ratio containers. The before/after comparison should use the same side-by-side layout with `BEFORE` and `AFTER` labels.

Three of the videos are 32-36MB each — consider compressing with ffmpeg before deployment, same as recommended for the exhaust videos.

---

## Update the Cobra Project Page

After building this page, update `/off-the-clock/cobra/index.astro`:

### Change the Front Bumper card from "COMING SOON" to "COMPLETE"

**Before:**
- Date: TBD
- Status badge: `COMING SOON` (muted)
- Title: Front Bumper Replacement
- Description: Details coming soon.
- Link: Coming Soon (muted, no link)

**After:**
- Date: June 2022
- Status badge: `COMPLETE` (lime green)
- Title: Front Bumper Replacement
- Description: Zeus arrived a little pre-loved. Clean CarFax, but the front bumper had stories to tell. Classic Auto Painting matched the factory Black Clearcoat. I handled the wrench work.
- Tags: `Body` · `Exterior` · `Paint` · `DIY + Pro`
- Link: View Mod → `/off-the-clock/cobra/frontend`
- Divider color: Red (keep as-is)

---

## Also Update the Implementation Guide

On the Cobra page, also update the "Marti Report" section text. Currently it says:
> "Here's hers."

Change to:
> "Here's his."

(Zeus is a "he" per the established narrative.)

---

## CarFax Data (for reference — do NOT publish the full report)

The CarFax confirms Zeus's provenance but should NOT be embedded or linked on the site (it contains the full VIN and is copyrighted material). Key facts to reference narratively:

- **1-owner vehicle** for 13 years, 9 months
- **15,763 miles** at time of CarFax (1/29/2022) — only 1,155 mi/year average
- **States:** Pennsylvania → Florida
- **Title history:** Clean — no salvage, junk, rebuilt, fire, flood, hail, or lemon
- **Accidents:** None reported
- **Structural damage:** None reported
- **Airbag recall:** Left and right airbag assemblies replaced 01/15/2020 at Murphy Ford, Chester, PA (recall service, not accident)
- **Sold at auction:** 12/13/2021
- **Offered for sale:** Merit Auto Group, Jacksonville, FL — 01/16/2022
- **Steve pulled CarFax:** 01/29/2022

The narrative takeaway: Zeus was babied for 13 years by one owner who barely drove him — but the front bumper picked up some cosmetic damage along the way that wouldn't show up on any report.

---

## Shop Credit

Give proper credit to Classic Auto Painting:
- **Name:** Classic Auto Painting
- **Location:** Bethpage, Tennessee (formerly Gallatin area)
- **Owner:** Chris
- **Website:** https://classicautopaintingtn.com/
- **Notable:** 20+ year history, 2024 GM Nationals class-winning 1981 Trans Am

Consider linking to their website in the content — it's good form and Steve clearly values the relationship.
