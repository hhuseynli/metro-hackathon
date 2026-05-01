# Presentation Guide

## For Person 2

**Target time:** 5-7 minutes  
**Format:** Slides + live demo  
**Judging criteria:** Problem fit, Innovation, Prototype, Impact, Presentation

---

## Slide Structure (8 slides)

### Slide 1 — Hook (30 seconds)
**Title:** "You've been there."  
**Visual:** Split image — packed first car vs. empty last car  
**Script:** "You walk into the metro. The first car is packed — people shoulder to shoulder. You squeeze in. Two cars down, there are empty seats. You didn't know. Nobody told you. This happens every single day, to every single commuter in Baku."

---

### Slide 2 — The Data (45 seconds)
**Title:** "[KEY STAT]"  
**Visual:** Bar chart — car 1 vs car 5 average occupancy  
**Content:** Fill with Person 4's output:
> "We analyzed [X] train visits at [station]. Passengers clustering near the entrance results in cars 1-2 averaging [Y]% capacity, while cars 4-5 average [Z]%. That's a [W]x imbalance — every train, every day."

**Script:** Let the stat speak. Pause after revealing the number. "That's not a design problem. That's a solvable engineering problem."

---

### Slide 3 — Why Signs Don't Work (30 seconds)
**Title:** "People don't follow signs."  
**Visual:** Photo of ignored directional signs in a metro (find a generic one)  
**Content:** 
- Cognitive load during commute is high
- People follow the crowd, not instructions
- Explicit guidance creates resistance

**Script:** "The obvious solution is signs. But research shows people in transit environments ignore directional signage — especially during rush hour when cognitive load is highest. We needed a different approach."

---

### Slide 4 — The Science of Nudging (45 seconds)
**Title:** "They follow light. They follow sound."  
**Visual:** Simple diagram — warm light zone vs. cool light zone  
**Content:**
- Subtle environmental cues guide behavior without conscious awareness
- Retail environments have used this for decades
- Thaler & Sunstein (2008): choice architecture changes behavior without restricting freedom
- Warmer, slightly brighter lighting → people drift toward it naturally
- Pleasant ambient sound → people orient toward it subconsciously

**Script:** "Behavioral science tells us people are exquisitely sensitive to their environment — even when they don't know it. Retailers have used lighting and sound to control foot traffic for decades. We applied the same principle to the metro platform."

---

### Slide 5 — Our System (60 seconds)
**Title:** "How it works"  
**Visual:** System architecture diagram (from CLAUDE.md)  
**Content:**
1. Overhead cameras detect passenger positions on platform → YOLO person detection
2. Platform divided into zones matching car positions
3. Historical weight sensor data tells us which zones lead to which car loads
4. When imbalance detected → subtle lighting warmth + ambient sound shifts toward least crowded zone
5. Passengers naturally drift → cars load more evenly

**Script:** Walk through each step. Emphasize: "The passenger doesn't see a sign. They don't receive a notification. They just... end up in a better spot."

---

### Slide 6 — Live Demo (90 seconds)
**Title:** "Live system"  
**Visual:** Switch to actual dashboard  
**Script:** 
- "Here's our system running on real platform footage from Baku Metro."
- Point to zone heatmap: "These are live passenger densities across platform zones."
- Point to nudge indicator: "Zone 4 is currently underloaded. The system has activated a subtle lighting and sound nudge toward that zone."
- Point to historical panel: "This is backed by [X] train visits of validated data."

---

### Slide 7 — Impact (30 seconds)
**Title:** "What changes"  
**Content:**
- More even car loading → reduced dwell time → faster departures
- Reduced crowding pressure → improved safety at platform edge
- No infrastructure change required beyond lighting control integration
- No behavior change required from passengers — system adapts to them

---

### Slide 8 — Team (15 seconds)
**Title:** Team name + members  
**Keep brief.** End with: "Thank you."

---

## Demo Script (during Slide 6)

1. Open dashboard on laptop connected to display
2. Point to platform diagram: explain zones
3. Show live zone counts updating every 2 seconds
4. Show nudge recommendation panel
5. Show historical stats: "This is the data that trained our nudge calibration"
6. One sentence: "This is running on real Baku Metro camera footage, processed by our YOLO pipeline, backed by 15 months of passenger data."

---

## Behavioral Science Sources (Person 3 to find full citations)

1. **Thaler & Sunstein (2008)** — *Nudge: Improving Decisions About Health, Wealth, and Happiness* — foundational nudge theory
2. **Quartier et al. (2014)** — lighting effects on consumer behavior and movement in retail
3. **Bijsterveld (2008)** or similar — soundscape effects on pedestrian behavior in public spaces
4. **TfL (Transport for London)** — published nudge experiments on platform distribution (find specific report)

Even citing 2 of these with a one-line summary is enough for the innovation slide.

---

## Key Numbers to Slot In (from Person 4)

| Placeholder | What to get from Person 4 |
|---|---|
| [X] train visits | Number of rows/visits in weight dataset |
| [Y]% most crowded car avg | Mean max occupancy across visits |
| [Z]% least crowded car avg | Mean min occupancy across visits |
| [W]x ratio | Y / Z |
| [station] | Which station the camera footage is from |

**Get these by Hour 6 at the latest.**
