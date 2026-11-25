# DESIGN.md — Bistro Express 1974

## 1. Concept & Setting
**Bistro Express 1974** is an original offline desktop browser cooking game set inside the cramped, polished galley of a 1974 European overnight express train dining car. As the solo line chef during the evening dinner rush, the player prepares four classic bistro dishes across a moving train kitchen while navigating periodic track bends.

## 2. Visual Direction & Palette
- **Pullman Bottle Green**: `#173B2D` (lacquered carriage walls, header framing, modal panels)
- **Polished Mahogany**: `#4A281A` (wood trim, window mullions, counter fascia)
- **Porcelain Cream**: `#F6EFE2` (order tickets, assembly board, high-contrast ledger cards)
- **Brushed Brass**: `#D4A039` (order rail, service pass, service bell, curve brace lever, key highlights)
- **Typography**: 100% offline system font stacks (`Georgia, "Times New Roman", serif` for 1974 menu headings and `"Segoe UI", system-ui, -apple-system, sans-serif` for crisp HUD labels and tabular numerals). Zero external font or CDN requests.
- **Scenery**: Animated 2D twilight countryside (rolling hills, cypress silhouettes, telegraph poles, distant village lights, warm cabin window reflections) scrolling past the mahogany-framed dining car windows.

## 3. Architecture & Offline Guarantee
- **Zero Network Requests**: All rendering uses HTML5 Canvas 2D procedural illustrations and semantic HTML/CSS overlays. All sound effects are synthesized in real time via the Web Audio API.
- **Responsive Viewport**: Built around a 1280x720 galley stage that scales cleanly up to 1440x900 and down to narrow viewports with zero horizontal overflow.
- **States**:
  1. **Title Screen**: Car crest, shift briefing, controls summary, and `Start Dinner Shift` CTA.
  2. **Empty / Idle Pass State**: Clear visual indicator on the Brass Service Pass (`Pass clear. Plate a dish to serve.`) when no finished dish is waiting.
  3. **Active Shift**: Full 4-zone galley gameplay with `02:30` countdown timer, live tips, streak, and curve rhythm events.
  4. **Pause Modal**: Freezes simulation, audio rhythm, and scenery motion; accessible via `Escape` or the Pause button.
  5. **Error Fallback**: Graceful inline notice if Canvas 2D or Web Audio API initialization fails.
  6. **End-of-Shift Ledger**: Service summary showing dishes served, tips earned, curve bonuses, missed/burnt count, and `Run Next Shift` CTA.

## 4. Gameplay Loop & Four-Zone Galley Layout
1. **Top — Brass Order Rail**: Holds up to 4 perforated paper order tickets showing dish name, 3 required ingredient layers, table number, and a color-coded patience bar, alongside the Shift Timer (`02:30`), Tips (`$`), and Controls bar (Pause, Mute, Reduced Motion).
2. **Left — Marble Pantry Counter**: Clearly labeled and illustrated ingredients (`1`-`9`, with `1`-`6` for core prep ingredients and `7`-`9` for finishing dairy/garnishes) plus a Clear Hand (`C`) action.
3. **Center — Cast-Iron Stoves & Porcelain Assembly Board**:
   - **Skillet (`Q`)** and **Saucepan (`W`)** with live heat gauges progressing from `Raw` to `Golden` (ready to plate) to `Burnt` (must discard).
   - **Porcelain Assembly Board (`A`)** displaying the current dish mid-assembly layer by layer, with a `Clear Board (X)` option if a mistake is made.
4. **Right — Brass Service Pass, Service Bell & Curve Brace Lever**:
   - **Brass Service Pass (`S`)** holds up to 2 finished plated dishes ready to serve.
   - **Brass Service Bell (`Space`)** serves the plated dish matching the oldest/most urgent matching order ticket (or serves the selected pass slot).
   - **Curve Brace Lever (`B`)**: Every 25 seconds, a track bend warning appears with a golden timing window. Pulling Brace (`B`) or serving a dish during the golden window awards a **Steady Service** tip bonus and boosts customer patience.

## 5. Menu & Layered Recipes
| Dish | Layer 1 | Layer 2 | Layer 3 |
| :--- | :--- | :--- | :--- |
| **Continental Croque** | Toasted Brioche (`1` -> `Q`) | Melted Cheese (`7` -> `Q` or `A`) | Seared Ham (`2` -> `Q`) |
| **Alpine Mushroom Omelette** | Beaten Egg (`3` -> `Q`) | Sauteed Mushroom (`4` -> `Q`) | Herb Butter (`9` -> `A`) |
| **Bistro Tomato Bisque** | Simmered Tomato (`5` -> `W`) | Cream Swirl (`8` -> `W` or `A`) | Brioche Crouton (`1` -> `A`) |
| **Express Steak Plate** | Seared Beef (`6` -> `Q`) | Sauteed Mushroom (`4` -> `Q`) | Herb Butter (`9` -> `A`) |

## 6. Procedural Web Audio
Synthesized offline via Web Audio API:
- Train rail clack-clack rhythm (subtle low-pass noise + tuned thump)
- Skillet sizzle & Saucepan bubble (filtered noise bursts)
- Prep / plating ceramic clink
- Perforated ticket clip snap
- Brass service bell (harmonic sine/triangle chime)
- Track curve steam whistle (dual-oscillator brass whistle)

## 7. Accessibility & Quality
- Full keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`) and gameplay hotkeys (`1`-`9`, `Q`, `W`, `A`, `S`, `B`, `Space`, `C`, `X`).
- Native `<button>` elements with `cursor: pointer`, visible focus outlines, and WCAG AA contrast (`>= 4.5:1` for normal text).
- Respects `prefers-reduced-motion: reduce` and provides an in-game Reduced Motion toggle.
- Clean copy with no em dashes, no fabricated stats, and no external network requests.
