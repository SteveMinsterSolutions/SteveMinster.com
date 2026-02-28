# Off the Clock — Implementation Guide for Claude Code

> **Purpose:** This document provides everything needed to implement the "Off the Clock" section of SteveMinster.com. It covers site structure, page content, media assets, design specifications, and the SVG clock icon. Hand this to Claude Code and it should be able to build the entire section.

---

## Table of Contents

1. [Site Architecture Changes](#1-site-architecture-changes)
2. [Design System Reference](#2-design-system-reference)
3. [The Clock "O" Icon](#3-the-clock-o-icon)
4. [Page 1: /off-the-clock (Landing Page)](#4-page-1-off-the-clock-landing-page)
5. [Page 2: /off-the-clock/cobra (Project Page)](#5-page-2-off-the-clockcobra-project-page)
6. [Page 3: /off-the-clock/cobra/exhaust (Subproject Page)](#6-page-3-off-the-clockcobraexhaust-subproject-page)
7. [Media Asset Inventory](#7-media-asset-inventory)
8. [Privacy Requirements](#8-privacy-requirements)
9. [Future Subprojects (Placeholder)](#9-future-subprojects)

---

## 1. Site Architecture Changes

### Navigation Update

Add "OFF THE CLOCK" to the site navigation — both desktop header and mobile menu. It sits as a peer to PORTFOLIO, SANDBOX, ABOUT, and CONTACT.

**Current nav order:** PORTFOLIO · SANDBOX · ABOUT · CONTACT

**New nav order:** PORTFOLIO · SANDBOX · OFF THE CLOCK · ABOUT · CONTACT

Update these files:
- The shared header/nav component (likely `src/components/Header.astro` or similar)
- The footer navigation section
- The mobile hamburger menu

### Route Structure

```
/off-the-clock/                  → Landing page (index)
/off-the-clock/cobra/            → 2008 Shelby GT500 project page
/off-the-clock/cobra/exhaust/    → Corsa exhaust mod subproject
/off-the-clock/cobra/bumper/     → (future) Front bumper replacement
/off-the-clock/cobra/radio/      → (future) Radio upgrade
```

### Astro File Structure

```
src/pages/
  off-the-clock/
    index.astro                  → Landing page
    cobra/
      index.astro                → Cobra project page
      exhaust.astro              → Exhaust subproject
      bumper.astro               → (future)
      radio.astro                → (future)
```

### Static Assets

```
public/
  images/
    off-the-clock/
      cobra/
        exhaust/
          before-rear-stock-tips.jpg      → Image 1 (rear view, stock tips, selective color)
          after-rear-corsa-tips.jpg       → Image 2 (rear view, plate covered, Corsa tips)
          after-tip-closeup-left.jpg      → Image 3
          after-tip-closeup-right.jpg     → Image 4
          after-tip-closeup-angle.jpg     → Image 5
          corsa-muffler-detail.jpg        → Image 6 (muffler assembly close-up)
          corsa-brand-tip.jpg             → Image 7 (Corsa branding on tip)
          before-rear-wide.jpg            → Image 8 (wider rear shot, stock)
        videos/
          old-start-up.mp4
          old-quick-rev.mp4
          old-slow-rev.mp4
          new-start-up.mp4
          new-quick-rev.mp4
          new-slow-rev.mp4
          unboxing.mp4
        marti-report.pdf
```

---

## 2. Design System Reference

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Navy | `#1B2A4A` | Headings, primary text, backgrounds |
| Electric Blue | `#2D7DD2` | Links, active nav, accent |
| Lime Green | `#97D700` | Section labels, status badges, dividers |
| White | `#FFFFFF` | Page background, reverse text |
| Light Gray | `#F8F9FA` | Card backgrounds, subtle sections |
| Muted Text | `#6B7280` | Subtitles, secondary text, dates |

### Typography
| Element | Font | Weight | Size (approx) |
|---------|------|--------|---------------|
| Page headings (h1) | Space Grotesk | 400 (light) | ~3.5rem / 56px |
| Section headings (h2) | Space Grotesk | 700 (bold) | ~1.75rem / 28px |
| Card titles (h3) | Space Grotesk | 700 (bold) | ~1.5rem / 24px |
| Body text | Inter | 400 | ~1.125rem / 18px |
| Section label | Inter | 600 | ~0.875rem / 14px, uppercase, tracking-wide |
| Tags/badges | Inter | 500 | ~0.75rem / 12px |

### Design Patterns from Existing Site

**Section Label + Headline Pattern** (used on Sandbox, Portfolio, About):
```
GREEN UPPERCASE LABEL (lime green, small, tracked)

Big headline in navy.          ← Space Grotesk, light weight, large
Subtitle or supporting text.   ← Inter, muted gray, normal size
```

**Project Card Pattern** (used on Sandbox):
```
[colored divider line — lime, red, or blue — full width]

Date          STATUS BADGE (green outline for LIVE, etc.)
Project Title (bold, navy, Space Grotesk)
Description paragraph (Inter, muted)
Tag1  Tag2  Tag3 (small, muted, spaced)
View Project →
```

**Divider Colors:** Rotate through lime green (`#97D700`), red (`#E53E3E`), and electric blue (`#2D7DD2`) between project cards.

**Reveal Animations:** The site uses IntersectionObserver with a `.reveal` class that adds `.visible` on scroll. Apply this to cards and sections.

---

## 3. The Clock "O" Icon

### Concept

On the Sandbox page, the "p" in "The workshop." is replaced with an inline SVG wrench. On the homepage, the "I" in "Ignite" is replaced with a matchstick/rocket.

For "Off the Clock," the **"O" in "Off"** should be replaced with an analog clock face SVG showing the time at **5:00** (quitting time — "off the clock"). The clock should be rendered in the same navy color as the heading text and sized to match the surrounding characters.

### SVG Design Specifications

The clock SVG for the "O" replacement should:

- **Shape:** Circular clock face matching the proportions of the letter "O" in Space Grotesk at the heading size
- **Color:** Navy (`#1B2A4A`) stroke, matching the heading text color — or use `currentColor` so it inherits
- **Clock face:** Simple circle with a thin border stroke
- **Hour markers:** 12 small tick marks around the perimeter (or just at 12, 3, 6, 9 positions for minimal approach)
- **Hands:** Hour hand pointing at 5, minute hand pointing at 12 (5:00)
- **Center dot:** Small filled circle at the center
- **No fill on the face:** Transparent/no background so the page background shows through
- **Alignment:** Vertically centered with the text baseline, sized to match the cap height of the "O"

### Implementation Approach

Follow the same pattern used for the wrench on /sandbox. The SVG should be an inline element within the heading, replacing the "O" character. Example structure:

```html
<h1 class="text-navy font-light text-5xl md:text-6xl leading-tight">
  <svg class="inline-block" ...><!-- clock SVG --></svg>ff the Cl<svg ...><!-- optional: second clock for the "o" in "Clock" --></svg>ck.
</h1>
```

**Recommendation:** Only replace the first "O" in "Off" with the clock. Replacing both "O"s (Off and Clock) may be too busy. Test both approaches and pick the one that reads better.

---

## 4. Page 1: /off-the-clock (Landing Page)

### Layout

Follow the same pattern as `/sandbox`:

1. Section label (green, uppercase)
2. Big headline with icon replacement
3. Subtitle paragraph
4. Project cards listing all "Off the Clock" projects

### Content

**Section label:** `OFF THE CLOCK`

**Headline:** `⏰ff the Clock.` (where ⏰ = clock SVG replacing the "O")

**Subtitle:**
> Projects, passions, and things I build when no one's asking me to. Cars, houses, and the occasional questionable decision.

**Project Cards:**

#### Card 1: 2008 Shelby GT500

- **Date:** 2008 – Present
- **Status badge:** `ONGOING` (use lime green outline)
- **Title:** 2008 Shelby GT500
- **Description:** Meet Zeus. A black-on-red convertible with 500 horsepower and forty-three days of manufacturing attitude. The car I named before I owned — and tattooed on my shoulder blade even earlier. Supercharged 5.4L V8, 6-speed manual, and an evolving list of mods.
- **Tags:** `Shelby GT500` · `Supercharged V8` · `DIY` · `Garage Build`
- **Link:** View Project → `/off-the-clock/cobra`
- **Divider color:** Red (`#E53E3E`) — because Shelby

#### Card 2: Home Remodel (placeholder)

- **Date:** TBD
- **Status badge:** `COMING SOON` (use muted gray outline)
- **Title:** Home Remodel
- **Description:** Tearing things apart and putting them back together. Documenting the wins, the surprises behind the walls, and the moments when YouTube University meets real life.
- **Tags:** `Renovation` · `DIY` · `Learning`
- **Link:** Coming Soon (no link, muted text)
- **Divider color:** Electric blue (`#2D7DD2`)

---

## 5. Page 2: /off-the-clock/cobra (Project Page)

### Breadcrumb

```
Off the Clock  /  2008 Shelby GT500
```

Style: small, muted gray text above the heading. "Off the Clock" links back to `/off-the-clock`.

### Hero Section

**Section label:** `THE COBRA`

**Headline:** `Born late. Built loud.`

**Subtitle / Intro Paragraphs:**

> Some people fall in love with a car at a dealership. As a proud "band nerd", it was the sweet serenade of horsepower that first drew me to this car. I fell in love with the growl of the 1993 Cobra in middle school — hard enough to get the logo tattooed on my shoulder blade as an ever present reminder of that "lost love".
>
> I named the car Zeus, but didn't actually have one. Then, I found one.
>
> Now Zeus is a 2008 Shelby GT500 Convertible. Black Clearcoat paint over Charcoal Black and Crimson Red leather. A supercharged 5.4-liter V8 pushing 500 horsepower (at least when we started!) through a 6-speed manual with a 3.31 limited-slip rear end. Ford built it at Flat Rock on January 25, 2008 — forty-three days behind schedule. Sometimes it takes a while for the thunderbolt to reach your ears.
>
> According to the Marti Report, only 235 GT500 Convertibles were built with this paint and trim combination, and only 241 got the Red Stripe Appearance Package. This car started life at a dealer in Roselle Park, New Jersey. When not on Mt. Olympus, Zeus now lives in a garage in Mt. Juliet, Tennessee.

### Quick Specs Card

Display as a styled card or sidebar element:

| Spec | Value |
|------|-------|
| **Year** | 2008 |
| **Model** | Shelby GT500 Convertible |
| **Engine** | 5.4L Supercharged DOHC V8 |
| **Power** | 500 HP / 480 lb-ft |
| **Transmission** | Tremec TR-6060 6-Speed Manual |
| **Rear Axle** | 3.31 Limited Slip |
| **Exterior** | Black Clearcoat (UA) |
| **Interior** | Charcoal Black / Crimson Red |
| **Build Date** | January 25, 2008 |
| **Schedule** | 43 days behind schedule |
| **Production** | 1 of 235 with this paint/trim |
| **Package** | Red Stripe Appearance Package |

### Marti Report Section

Include a callout or expandable section referencing the Marti Report. Consider linking to or embedding the Marti Report PDF, or displaying it as a styled card with key stats pulled out.

**Headline:** `The Birth Certificate`

**Text:**
> Every Ford built between 1967 and 2012 has a story in the Ford database. A Marti Report decodes the door data plate and tells you exactly what your car is, when it was built, and how rare the configuration is. Here's hers.

Display the key Marti stats visually:
- **682** with this paint code
- **235** with this paint/trim combo
- **241** with the Red Stripe Appearance Package
- **112** ordered from the New York region
- **2,070** with this engine/transmission combo

Consider making these big, highlighted numbers similar to the portfolio page's metric callouts (e.g., "10 lean startup pilots launched", "42% increase in new customers").

### Build Log Section

**Headline:** `The Build Log`

**Subtitle:**
> Every mod tells a story. Some I did myself. Some I was smart enough to hire out.

Then list subproject cards using the same card pattern as the Sandbox page:

#### Card 1: Corsa Sport Exhaust

- **Date:** July 2022
- **Status badge:** `COMPLETE` (lime green)
- **Title:** Corsa Sport Axle-Back Exhaust
- **Description:** The supercharger was running the show. The Eaton blower's whine was dominating the V8 growl at every RPM. This was about rebalancing the voice, not just turning up the volume.
- **Tags:** `Exhaust` · `Corsa Performance` · `DIY Install` · `Sound`
- **Link:** View Mod → `/off-the-clock/cobra/exhaust`
- **Divider color:** Lime green

#### Card 2: Front Bumper Replacement

- **Date:** TBD
- **Status badge:** `COMING SOON` (muted)
- **Title:** Front Bumper Replacement
- **Description:** Details coming soon.
- **Tags:** `Body` · `Exterior`
- **Link:** Coming Soon
- **Divider color:** Red

#### Card 3: Radio Upgrade

- **Date:** TBD
- **Status badge:** `COMING SOON` (muted)
- **Title:** Radio Upgrade
- **Description:** Details coming soon.
- **Tags:** `Interior` · `Audio`
- **Link:** Coming Soon
- **Divider color:** Electric blue

---

## 6. Page 3: /off-the-clock/cobra/exhaust (Subproject Page)

### Breadcrumb

```
Off the Clock  /  2008 Shelby GT500  /  Exhaust
```

### Hero Section

**Section label:** `THE BUILD LOG`

**Headline:** `Finding the Growl`

**Subtitle:**
> The supercharger was winning. Time to let the V8 fight back.

### The Story

Write this section as flowing prose — conversational, not technical documentation. This is a build thread with personality.

**Section: The Problem**

> The 2008 GT500's Eaton supercharger is not a subtle piece of machinery. At idle, you hear it. Under throttle, it screams. And somewhere underneath all that forced-induction whine is a 5.4-liter V8 that's supposed to sound like a muscle car.
>
> With the stock exhaust, the blower was dominating the conversation. The V8 rumble was buried — you could hear it, but it wasn't asserting itself. Zeus sounded fast. I wanted him to sound *angry*.

**Section: The Choice**

> I went with the **Corsa Sport Axle-Back Exhaust** (Part #14311) from American Muscle. Corsa's "Sport" sound level — not the "Xtreme" — because I wasn't trying to set off car alarms. The goal was to rebalance the sound profile: bring the V8 growl forward without losing the supercharger character entirely.
>
> The system uses Corsa's patented RSC (Reflective Sound Cancellation) technology, which is a fancy way of saying they engineered the drone out of it. Aggressive under acceleration, quiet at cruise. That mattered — Zeus is still a convertible I drive on the highway.
>
> **The specs:**
> - 2.5" axle-back, dual rear exit
> - 4.0" polished Pro-Series stainless steel tips
> - 304 stainless steel construction
> - Bolt-on install — no cutting, no welding
> - Made in Berea, Ohio
> - ~7 lbs lighter than stock

### Part Detail Card

| Detail | Value |
|--------|-------|
| **Part** | Corsa Sport Axle-Back Exhaust |
| **Part Number** | 14311 |
| **Source** | American Muscle |
| **Ordered** | June 25, 2022 |
| **Part Cost** | $981.99 |
| **Total (with tax)** | $1,044.81 |
| **Install** | DIY — my garage |
| **Install Time** | ~2 hours |
| **Difficulty** | Beginner-friendly (bolt-on) |

### The Install

> This is about as DIY-friendly as a mod gets. Jack up the car, unbolt the stock axle-back, bolt on the Corsa. No cutting, no welding, no trips to the shop. I did it on a Saturday afternoon in my garage and was done before the afternoon got hot.
>
> If you can operate a socket wrench and a jack stand, you can do this install. The Corsa system comes with all the hardware and a full-color instruction guide. The hardest part was wrestling the stock mufflers out from under the car — they're heavier than you'd expect.

### The Result — Before & After

This is the hero content section. Present the before/after video pairs as a comparison experience.

**Section headline:** `Hear the Difference`

**Intro text:**
> Three clips, three approaches — startup, quick rev, and slow rev. Same phone, same position in the garage. Listen for the V8 growl pushing through after the swap.

**Layout:** For each comparison, display the before and after videos side-by-side (desktop) or stacked (mobile) with labels.

#### Comparison 1: Start Up
- **Label:** Cold Start
- **Before:** `old-start-up.mp4` (20s)
- **After:** `new-start-up.mp4` (11s)
- **Caption:** The initial bark and idle. Listen to how the V8 note fills in after the Corsa install.

#### Comparison 2: Quick Rev
- **Label:** Quick Rev
- **Before:** `old-quick-rev.mp4` (5s)
- **After:** `new-quick-rev.mp4` (4s)
- **Caption:** A punch of the throttle. This is where the supercharger whine dominated the stock exhaust — and where the Corsa lets the V8 answer back.

#### Comparison 3: Slow Rev
- **Label:** Slow Build
- **Before:** `old-slow-rev.mp4` (14s)
- **After:** `new-slow-rev.mp4` (14s)
- **Caption:** Gradual RPM climb. For the car people who want to really hear how the balance shifts across the rev range.

**Video player notes:**
- All videos are 1440x1440 (square format) — display them in a square aspect ratio container
- Include visible play controls
- Muted by default (let user tap to unmute) — or consider autoplay-muted with unmute prompt since audio IS the point here
- Consider a simple toggle or tab interface: "Before / After" labels that switch between the two clips for each comparison

#### Unboxing
- **Headline:** The Unboxing
- **Video:** `unboxing.mp4` (21s)
- **Caption:** What shows up when you order a Corsa axle-back from American Muscle.

### Photo Gallery

Display the installed exhaust photos. Suggested layout: a grid or masonry layout.

**Photos to include (in this order):**

1. **Before — Rear View** (`before-rear-stock-tips.jpg`): The car with stock exhaust tips. Note the selective color edit highlighting the red stripe.
2. **Before — Rear Wide** (`before-rear-wide.jpg`): Wider rear shot showing the car in the garage with stock tips.
3. **After — Rear View** (`after-rear-corsa-tips.jpg`): The car with Corsa tips installed. Clean comparison angle.
4. **After — Tip Close-up Left** (`after-tip-closeup-left.jpg`): Close-up of the installed Corsa tip, driver side.
5. **After — Tip Close-up Right** (`after-tip-closeup-right.jpg`): Close-up of the installed Corsa tip, passenger side.
6. **After — Tip Angle** (`after-tip-closeup-angle.jpg`): Different angle showing the Corsa tip and bumper cutout.
7. **Muffler Detail** (`corsa-muffler-detail.jpg`): Close-up of the Corsa muffler assembly showing weld quality and construction.
8. **Brand Detail** (`corsa-brand-tip.jpg`): The Corsa Performance branding etched into the polished tip.

### DIY or Pro?

> **Verdict: DIY.** This was a wrench-in-hand Saturday afternoon project. The Corsa axle-back is a true bolt-on — no fabrication, no welding, no special tools beyond what's in most garage toolboxes. If you're on the fence about doing exhaust work yourself, an axle-back swap is the right place to start.
>
> I'll be honest about when a mod is over my head. This one wasn't. Save the shop bill for the stuff that actually needs a lift and a pro.

### What's Next

> The exhaust gave Zeus his voice. But there's more on the list — a front bumper replacement to clean up some road rash, and a radio upgrade to bring the cabin into the current decade. Those stories are coming.
>
> [← Back to the Cobra](/off-the-clock/cobra)

---

## 7. Media Asset Inventory

### Source Files (provided by Steve)

All source files are in the uploads directory. They need to be copied to the appropriate public directory, renamed for clarity, and (for images with license plates) edited for privacy.

| Source Filename | Renamed To | Type | Dimensions | Size | Notes |
|----------------|-----------|------|-----------|------|-------|
| `20220705_122016.jpg` | `before-rear-stock-tips.jpg` | Photo | — | — | BEFORE: Rear view, selective color, stock tips. **HAS LICENSE PLATE — BLUR IT** |
| `Both_Pipes_Plate_Covered.jpg` | `after-rear-corsa-tips.jpg` | Photo | — | — | AFTER: Rear view, plate already covered. Hero after shot. |
| `20220629_103400.jpg` | `after-tip-closeup-left.jpg` | Photo | — | — | AFTER: Corsa tip close-up, left side |
| `20220629_103410.jpg` | `after-tip-closeup-right.jpg` | Photo | — | — | AFTER: Corsa tip close-up, right side |
| `20220629_103422.jpg` | `after-tip-closeup-angle.jpg` | Photo | — | — | AFTER: Corsa tip different angle |
| `20220705_121929.jpg` | `corsa-muffler-detail.jpg` | Photo | — | — | Muffler assembly close-up |
| `20220705_121949.jpg` | `corsa-brand-tip.jpg` | Photo | — | — | Corsa branding on tip |
| `20220705_122006.jpg` | `before-rear-wide.jpg` | Photo | — | — | BEFORE: Wider rear shot. **HAS LICENSE PLATE — BLUR IT** |
| `Old_Start_Up_Sound.mp4` | `old-start-up.mp4` | Video | 1440×1440 | 24MB | Before: Cold start and idle (20s) |
| `Old_Quick_Rev_with_Supercharger_Whine.mp4` | `old-quick-rev.mp4` | Video | 1440×1440 | 1.7MB | Before: Quick throttle punch (5s) |
| `Old_Slow_Rev.mp4` | `old-slow-rev.mp4` | Video | 1440×1440 | 15MB | Before: Gradual rev build (14s) |
| `New_Start_Up.mp4` | `new-start-up.mp4` | Video | 1440×1440 | 11MB | After: Cold start and idle (11s) |
| `New_Quick_Rev_with_Supercharger.mp4` | `new-quick-rev.mp4` | Video | 1440×1440 | 1.3MB | After: Quick throttle punch (4s) |
| `New_Slow_Rev.mp4` | `new-slow-rev.mp4` | Video | 1440×1440 | 4.2MB | After: Gradual rev build (14s) |
| `Unboxing_Video.mp4` | `unboxing.mp4` | Video | 1440×1440 | 24MB | Unboxing the Corsa system (21s) |
| `Cobra_Marti_Report.pdf` | `marti-report.pdf` | PDF | — | — | Deluxe Marti Report for the vehicle |

### Video Optimization Note

The raw video files total ~81MB. For web delivery, consider:
- Compressing with ffmpeg (e.g., `ffmpeg -i input.mp4 -vcodec libx264 -crf 28 -preset slow -movflags +faststart output.mp4`)
- Creating poster images (thumbnail frames) for each video
- Using lazy loading for video elements below the fold
- Consider hosting videos on a CDN or using `<video>` with `preload="metadata"` to avoid loading all at once

---

## 8. Privacy Requirements

### License Plate Blurring

The following images show Steve's license plate and **must be blurred/obscured before publishing**:

1. `20220705_122016.jpg` → `before-rear-stock-tips.jpg` — plate clearly visible
2. `20220705_122006.jpg` → `before-rear-wide.jpg` — plate clearly visible

The image `Both_Pipes_Plate_Covered.jpg` already has the plate obscured — no action needed.

**Method:** Use ImageMagick, ffmpeg, or a simple CSS blur overlay on the plate area. Alternatively, apply a black/dark rectangle over the plate region in the processed image. Do NOT publish the raw images with visible plates.

### VIN Number

The Marti Report contains the vehicle's full VIN. This is semi-public information (visible on the dashboard through the windshield), but consider whether to redact it from any displayed version of the report. For a personal site, leaving it is probably fine — it's Steve's choice.

---

## 9. Future Subprojects

These are placeholders. Steve has photos for both but content hasn't been drafted yet.

### Front Bumper Replacement
- **Route:** `/off-the-clock/cobra/bumper`
- **Status:** Photos available, content TBD
- **Context:** Replacement of the front bumper — likely cosmetic repair/upgrade

### Radio Upgrade
- **Route:** `/off-the-clock/cobra/radio`
- **Status:** Photos available, content TBD
- **Context:** Upgrading the factory head unit / infotainment

### Additional Future Projects
- **Home Remodel** — Would live at `/off-the-clock/remodel/` as a separate project, not under `/cobra`
- Other projects TBD

---

## Appendix: Key Data from the Marti Report

For reference when building the Cobra project page:

```
VIN: 1ZVHT89S885168414
Model: Shelby GT500 2-Door Convertible
Engine: 5.4L 4V DOHC Supercharged EFI V-8
Transmission: 6-Speed Manual Overdrive
Rear Axle: 3.31 Limited Slip
Exterior: Black Clearcoat (UA), Ford #M6373
Interior: Charcoal Black / Crimson Red Sport Bucket Seats (GR)
Build Date: January 25, 2008
Build Location: Flat Rock Assembly
Order Received: August 30, 2007
Sold: March 11, 2008
Original Dealer: Ford World of Roselle Park, NJ

Key Features:
- Red Stripe Appearance Package
- Shelby Rear Spoiler
- HID Headlamps
- Shaker 1000 Audio System
- 18" Bright Machined Aluminum Wheels
- Black Cloth Convertible Top
- Power 6-Way Driver Seat
- Shelby Premium Trim Package

Rarity Stats (for 2008 Shelby GT500 2-Door Convertible):
- 682 with Black Clearcoat paint
- 235 with this paint/trim combination
- 241 with Red Stripe Appearance Package
- 112 ordered from New York region
- 2,070 with this engine/transmission
```

---

## Appendix: Product Reference

**Exhaust System:**
- **Product:** Corsa Sport Axle-Back Exhaust with Polished Tips
- **Part Number:** 14311
- **Manufacturer:** Corsa Performance (Berea, Ohio)
- **Retailer:** American Muscle (americanmuscle.com)
- **Product URL:** https://www.americanmuscle.com/corsa-sport-axleback-0510gt.html
- **Fitment:** 2005-2010 Ford Mustang GT / 2007-2010 Shelby GT500
- **Type:** Axle-back (replaces from the rear axle back)
- **Pipe Diameter:** 2.5"
- **Tips:** Single 4.0" polished Pro-Series (dual rear exit)
- **Material:** 304 stainless steel
- **Sound Level:** Sport (mid-level — between stock and Xtreme)
- **Technology:** RSC (Reflective Sound Cancellation) — no drone at cruise
- **Claimed Gains:** +14 HP, +16 lb-ft torque, 40% flow increase
- **Weight Savings:** 7 lbs lighter than stock
- **Install:** Bolt-on, no welding required
- **Emissions:** 50-state legal
- **Warranty:** Limited lifetime (with proof of purchase)
