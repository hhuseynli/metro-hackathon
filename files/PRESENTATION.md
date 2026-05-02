# Presentation Guide

## For Person 2

**Target:** 5-7 minutes | Slides + live demo | 50 points total across 5 criteria

---

## Slide Structure (8 slides)

### Slide 1 — Hook (30 sec)
**Title:** "You've been there."  
**Visual:** Split image — packed front car vs. empty rear car  
**Script:** "You walk into the metro. The first car is packed — people shoulder to shoulder. Two cars down, there are empty seats. You didn't know. Nobody told you. This happens every single day, to every commuter in Baku."

---

### Slide 2 — The Data (45 sec)
**Title:** [KEY STAT — fill from Person 4]  
**Visual:** Bar chart — most crowded car vs least crowded car average occupancy  
**Script:** Pause after the number. "That's not a design problem. That's a solvable engineering problem. And we have the data to solve it."

> Placeholder until Person 4 delivers:
> "Across [X] train visits, cars 1-2 average [Y]% capacity. Cars 4-5 average [Z]%. That's a [W]x difference — every train, every day."

---

### Slide 3 — Why Existing Solutions Fail (30 sec)
**Title:** "Signs don't work. Announcements are ignored."  
**Script:** "The obvious fix is directional signs. But during peak hours, passengers follow the crowd, not instructions. Cognitive load is high. People default to the nearest car. The problem persists."

---

### Slide 4 — Our Approach (45 sec)
**Title:** "What if the system knew before the train arrived?"  
**Visual:** Timeline: passenger enters → system detects → guidance shown → passenger positions → train arrives → even boarding  
**Script:** "Our system doesn't react to crowding. It predicts it. Using cameras at every station zone — entrance, escalators, platform, and trains — combined with weight sensor data and the train schedule, we know which cars will be overcrowded before the train even pulls in. And we guide passengers to the right spot in advance."

---

### Slide 5 — How It Works (60 sec)
**Title:** "Multi-modal sensing. One cohesive system."  
**Visual:** Architecture diagram (from CLAUDE.md)  
**Script:** Walk through each layer:
1. "Cameras at entrances count inflow — how many people are entering"
2. "Escalator cameras track flow toward the platform"
3. "Platform cameras detect where passengers are standing — zone by zone"
4. "Weight sensors give us ground truth: exactly how heavy each car is"
5. "Schedule data tells us when the next train arrives"
6. "We synthesize all of this into one number: predicted load per zone at train arrival"
7. "And we output guidance: direct incoming passengers to zones 3 and 4"

---

### Slide 6 — The Output (30 sec)
**Title:** "Existing infrastructure. No new hardware."  
**Visual:** Photo of metro directional display → mockup of same display with car load info added  
**Script:** "The guidance shows on the directional displays passengers already look at when they enter the platform. We're not adding hardware. We're adding intelligence to what's already there."

---

### Slide 7 — Live Demo (90 sec)
**Title:** "Live system — [station name]"  
**Switch to dashboard**  
**Script:**
- "Here's our operator dashboard running on real Baku Metro data."
- Screen 1: "Every station, color-coded by current load. Green is light, red is critical."
- Click a station → Screen 2: "Here's [station] in detail. Inflow rate, outflow, people currently inside."
- Point to zone map: "These are live platform zones — darker means more crowded."
- Point to prediction: "The system predicts this station will be at [X]% when the next train arrives in [Y] minutes."
- Point to guidance: "So right now it's telling us: direct incoming passengers to zones 3 and 4."
- "This is backed by [X] train visits of validated weight sensor data."

---

### Slide 8 — Impact & Team (30 sec)
**Title:** "More even trains. Safer platforms. Same infrastructure."  
**Bullets:**
- Reduced dwell time → faster departures
- Lower platform edge crowding → improved safety
- No passenger behavior change required — system adapts to them
- Scalable to all 27 stations

**End:** Team names. "Thank you."

---

## Numbers to Slot In (get from Person 4 by hour 6)

| Slot | Source |
|---|---|
| [X] train visits analyzed | Weight dataset row count / visits |
| [Y]% most crowded car avg | mean max occupancy across visits |
| [Z]% least crowded car avg | mean min occupancy across visits |
| [W]x ratio | Y / Z |
| Station name for demo | Whichever has the best camera footage |

---

## Judging Criteria — How We Score

| Criterion | Our answer |
|---|---|
| 1. Problem fit | Real Baku Metro data proves the imbalance exists |
| 2. Innovation | Pre-arrival prediction + multi-modal sensing + existing displays |
| 3. Prototype | Live YOLO pipeline → FastAPI → React dashboard |
| 4. User value | Every commuter benefits; no behavior change required |
| 5. Presentation | Clear narrative: problem → data → system → demo → impact |
