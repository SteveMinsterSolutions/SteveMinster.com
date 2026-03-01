# Radio Upgrade — Implementation Guide for Claude Code

> **Purpose:** Implementation guide for `/off-the-clock/cobra/radio` — the third and final build log entry for the 2008 Shelby GT500 (Zeus). This covers the head unit replacement from the stock Shaker 500 system to a modern Bluetooth/CarPlay unit.

---

## Page Setup

### Route
`/off-the-clock/cobra/radio`

### Astro File
`src/pages/off-the-clock/cobra/radio.astro`

### Breadcrumb
```
Off the Clock  /  2008 Shelby GT500  /  Radio
```

### Page Title (browser tab)
`Radio Upgrade — 2008 Shelby GT500 — Steve Minster`

---

## Design

Follow the exact same layout and design patterns established on the exhaust page (`/off-the-clock/cobra/exhaust`) and front end page (`/off-the-clock/cobra/frontend`):

- Same breadcrumb style
- Same section label + headline pattern
- Same details sidebar card (adapted for this project)
- Same section headings (The Problem, The Choice, The Install, etc.)
- Same video layout
- Same photo section
- Same "DIY or Pro?" section
- Same "What's Next" closing with back link

### Typography Update (apply to ALL Off the Clock subproject pages)

The headline and the intro paragraph text that follows immediately after the headline need updated colors for better readability:

- **Headlines** (the big h1 like "Tuned In."): **Slate grey** — use `#475569` (Tailwind slate-600) or similar. NOT the current lighter tone.
- **Intro/subtitle text** (the sentence immediately following the headline): **Electric blue** — use `#2D7DD2` (the site's electric blue from the brand palette).

Apply this same headline/subtitle color treatment to the exhaust and front end pages as well for consistency.

---

## Content

### Hero Section

**Section label:** `THE BUILD LOG`

**Headline:** `Tuned In.`

**Subtitle:**
> The CD book lost. Bluetooth won. And Zeus finally learned some new songs.

---

### The Problem

> Zeus came with the factory Shaker 500 — Ford's "premium" audio system circa 2008. Six-disc CD changer, eight speakers, and an auxiliary jack if you had the right cable. For 2008, it was fine. For 2025, it was a time capsule.
>
> Here's the thing: I still have my massive book of CDs from high school and college. Hundreds of them. And there's a part of me that liked the ritual — flipping through the sleeves, loading the disc, hearing that mechanical whir before the music started. It felt right in a car built the same year.
>
> But the practical side won out. Every song I could ever want, every podcast, every turn-by-turn direction — all in my pocket. Bluetooth wasn't a luxury anymore; it was a safety issue. The less time I spend fumbling with a disc or squinting at a tiny screen, the more time my eyes are on the road. And after the bumper replacement, I *really* don't want to do any more body work.

---

### The Choice

> The stock Shaker 500 head unit had to go, but the rest of the system could stay. The factory door speakers and the powered 10-inch subwoofer in the trunk were more than enough — this isn't the competition system I used to run back in the day, and at this point in life, "enough" sounds pretty good.
>
> I went with a modern head unit that gave me Bluetooth audio, hands-free calling, and a cleaner interface. Plug-and-play wiring harness, standard DIN fitment, no cutting or splicing. The goal was simple: bring the cabin into the current decade without touching the rest of the audio chain.

---

### The Install

> This was a homecoming. I used to swap car stereos in high school and college — it was practically a rite of passage. Pop the trim, disconnect the old unit, connect the harness adapter, slide in the new one, snap the trim back on. I could probably still do it with my eyes closed.
>
> The 2008 GT500's dash is straightforward. No proprietary connectors that fight you, no CANBUS drama, no modules that throw codes when you pull the factory unit. Just a clean swap.
>
> Total time: about an hour, including the part where I sat in the driver's seat testing Bluetooth pairing for longer than I needed to.

---

### Project Details Card

| Detail | Value |
|--------|-------|
| **Project** | Radio / Head Unit Upgrade |
| **Stock System** | Ford Shaker 500 (6-disc CD, 8 speakers) |
| **Upgrade** | Bluetooth / CarPlay Head Unit |
| **Retained** | Factory speakers + 10" powered trunk sub |
| **Install** | DIY — my garage |
| **Install Time** | ~1 hour |
| **Difficulty** | Easy — old hat for a former car stereo swapper |

---

### The Test Track

**Section label:** `THE TEST TRACK`

**Headline:** `The First Song`

> Every stereo upgrade needs a test track. Mine was "Unforgettable" by Godsmack, from the album *When Legends Rise* (2018). It felt right — a song about being unforgettable, playing through a car that was built to be exactly that.
>
> Zeus has his growl from the Corsa exhaust. Now he has a soundtrack to match.

**Video:** `unforgettable.mp4`
**Label:** `TEST TRACK — "UNFORGETTABLE"`
**Caption:** First song through the new system. Godsmack — "Unforgettable" from *When Legends Rise*.

---

### The Old System

> The stock Shaker 500 — Ford's six-disc CD changer with the world's tiniest screen. It served its purpose for fifteen years. Time to retire.

**Video:** `old-shaker-system.mp4`
**Label:** `THE OLD SHAKER 500`
**Caption:** The factory Shaker 500 head unit before the swap. Six discs, one aux jack, zero Bluetooth.

---

### The Finished Install

**Photo:** `final-install.jpg`
**Caption:** The new head unit in place. Clean fitment, Bluetooth paired, ready to go.

---

### DIY or Pro?

> **Verdict: DIY.** If you've ever swapped a car stereo — or even if you haven't — this is one of the easiest upgrades you can do. The wiring harness adapter does all the heavy lifting. No soldering, no cutting, no permanent changes. And if you ever want to go back to stock, you can.
>
> For me, this was less of a project and more of a reunion. Fifteen-year-old me would be proud that the skill set still holds up.

---

### What's Next

> That's three for three. Zeus has his voice (the exhaust), his face (the bumper), and now his ears (the radio). The build log will keep growing — but for now, this is a good place to pause and enjoy the drive.
>
> [← Back to the Cobra](/off-the-clock/cobra)

---

## Media Asset Inventory

All files are already in place at:
`public/images/off-the-clock/cobra/radio/`

| Filename | Type | Description |
|----------|------|-------------|
| `final-install.jpg` | Photo | The new head unit installed in the dash |
| `old-shaker-system.mp4` | Video | The stock Shaker 500 before removal |
| `unforgettable.mp4` | Video | Test track — "Unforgettable" by Godsmack playing through the new system |

Note: This page has fewer media assets than the exhaust or front end pages. That's fine — the page should feel lighter and quicker to scroll through, matching the simpler nature of the project.

---

## Update the Cobra Project Page

After building this page, update `/off-the-clock/cobra/index.astro`:

### Change the Radio Upgrade card from "COMING SOON" to "COMPLETE"

**Before:**
- Date: TBD
- Status badge: `COMING SOON` (muted)
- Title: Radio Upgrade
- Description: Details coming soon.
- Link: Coming Soon (muted, no link)

**After:**
- Date: 2025
- Status badge: `COMPLETE` (lime green)
- Title: Radio Upgrade
- Description: The Shaker 500's six-disc CD changer served its purpose. Bluetooth and a cleaner interface bring the cabin into the current decade — without touching the factory speakers or the trunk sub.
- Tags: `Interior` · `Audio` · `DIY` · `Bluetooth`
- Link: View Mod → `/off-the-clock/cobra/radio`
- Divider color: Blue (keep as-is)

---

## Page Weight Note

This is the lightest of the three build log entries — one photo, two videos, shorter narrative. Don't try to pad it out. The page should feel quick and conversational, matching the simplicity of the install itself. Let the exhaust page be the showpiece; this one is the satisfying closer.
