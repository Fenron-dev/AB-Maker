# Design System Document: The Sonic Architect

## 1. Overview & Creative North Star
**Creative North Star: "The Obsidian Studio"**

This design system is engineered to move the audio conversion tool away from "utility software" and toward "professional instrument." The aesthetic rejects the cluttered, gray-scale complexity typical of Linux/Windows utilities in favor of an editorial, high-fidelity experience. 

By leveraging **Organic Glassmorphism** and **Tonal Depth**, we create a UI that feels carved from a single block of dark obsidian. We break the traditional "grid-box" layout by using intentional asymmetry—where control panels might bleed into the edge while the central waveform visualization sits on a "raised" glass pane. The goal is a tool that feels as premium as the high-bitrate audio it processes.

---

### 2. Colors: Tonal Atmosphere
We do not use borders to define space. We use light and depth.

**The "No-Line" Rule:** 
Prohibit 1px solid borders for sectioning. Structural separation must be achieved through background shifts. For example, a sidebar using `surface_container_low` against a main content area of `surface`.

**Surface Hierarchy & Nesting:**
*   **Base Layer:** `surface` (#11131c) - The foundation.
*   **Secondary Containers:** `surface_container` (#1d1f29) - Used for primary interaction zones.
*   **Elevated Elements:** `surface_container_highest` (#32343e) - Used for floating toolbars or active selection states.

**The "Glass & Gradient" Rule:**
Floating panels must use `surface_container_high` at 80% opacity with a `20px` backdrop-blur. 
*   **Signature Texture:** Main conversion CTAs should utilize a linear gradient: `primary` (#c8bfff) to `primary_container` (#5a3ed8) at a 135-degree angle. This provides a "vibrant violet" energy that feels alive.

---

### 3. Typography: Editorial Authority
The type scale balances the technical precision of **Inter** with the sophisticated, wide-stance character of **Manrope**.

*   **Display (Manrope):** Used for bitrates, file sizes, and high-level status. It conveys technical authority.
    *   *Display-LG:* 3.5rem — For "Conversion Complete" hero moments.
*   **Headlines (Manrope):** Used for section headers (e.g., "Output Settings," "Metadata").
    *   *Headline-SM:* 1.5rem — Provides a rhythmic anchor to complex forms.
*   **Body & Labels (Inter):** Used for all functional data.
    *   *Body-MD:* 0.875rem — The workhorse for setting descriptions.
    *   *Label-SM:* 0.6875rem — All-caps with 0.05rem letter-spacing for technical metadata (e.g., "FLAC / 44.1kHz").

---

### 4. Elevation & Depth: The Layering Principle
Hierarchy is communicated through "stacking" rather than "boxing."

*   **Tonal Layering:** Place a `surface_container_lowest` (#0c0e17) card inside a `surface_container_low` (#191b24) section. This creates a "sunken" effect for input fields, making them feel like physical slots.
*   **Ambient Shadows:** For floating windows (e.g., "Format Settings"), use a shadow: `0 20px 40px rgba(12, 14, 23, 0.4)`. The shadow color must be a tinted version of `surface_container_lowest` to maintain the deep-sea blue atmosphere.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline_variant` at **15% opacity**. Never use a 100% opaque stroke.

---

### 5. Components: The Instrument Cluster

**Buttons**
*   **Primary:** Gradient-fill (Primary to Primary-Container). Roundedness: `full`. No shadow.
*   **Secondary:** Glass-style. `surface_container_high` with 40% opacity. 
*   **Tertiary:** Text-only using `primary` (#c8bfff).

**Input Fields (The "Sunken" Style)**
*   Background: `surface_container_lowest`.
*   Corners: `md` (0.75rem).
*   Active State: No glow; instead, transition background to `surface_container_low` and change label to `primary`.

**Cards & Lists**
*   **No Dividers:** Separate list items using the `spacing-2` (0.4rem) gap. 
*   **Active State:** Use a subtle background shift to `surface_container_highest` rather than a border.

**Audio Visualization Pane (Custom Component)**
*   A backdrop of `surface_container_low`.
*   Waveform rendered in `tertiary` (#d4bbff) with a `surface_tint` glow.

---

### 6. Do's and Don'ts

**Do:**
*   Use `spacing-10` (2.25rem) for major section breathing room.
*   Ensure "Action" icons use `primary` to guide the eye through the "vibrant violet" accent.
*   Use `surface_bright` sparingly for hover states to create a "shimmer" effect on glass surfaces.

**Don't:**
*   **Don't** use pure white (#FFFFFF). All "white" text must be `on_surface` (#e1e1ef) to reduce eye strain in dark environments.
*   **Don't** use sharp 90-degree corners. The minimum radius is `sm` (0.25rem) for technical indicators, but `lg` (1rem) is preferred for containers.
*   **Don't** use standard scrollbars. Use thin, `md` rounded tracks in `surface_container_highest` with no background to maintain the glass aesthetic.

**Accessibility Note:** 
While we embrace low-contrast aesthetics for backgrounds, all text must maintain a 4.5:1 ratio against its specific `surface_container` tier. Use `on_surface_variant` for secondary info only if it meets this threshold.