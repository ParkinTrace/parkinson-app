# ParkinTrace Design System — Geist adaptation

An adaptation of Vercel's Geist system to a Flutter health-monitoring app.
The source system is an exercise in subtraction: near-black ink on a near-white
sheet, hairlines instead of shadows, one gradient flourish, and typography doing
the heavy lifting. This document records what was adopted, what was adapted, and
why.

## 1. Token architecture

Tokens live in `lib/core/theme/` and are the single source of truth. Nothing in
`lib/features/` should contain a raw hex value.

| File | Owns |
|---|---|
| `app_colors.dart` | the ink/canvas/hairline trio, grey ladder, accents, semantics |
| `app_text_styles.dart` | the type ramp |
| `app_spacing.dart` | the 4px scale and inset presets |
| `app_radii.dart` | the bimodal radius scale |
| `app_shadows.dart` | the three elevation levels |
| `app_motion.dart` | durations, curves, reduced-motion gate |
| `app_theme.dart` | the `ThemeData` built from all of the above |
| `app_page_transitions.dart` | route transitions |

### Colour

The system is a black-and-white duet. Colour is confined to the hero mesh
gradient and small illustration accents — never chrome fills.

| Token | Value | Role |
|---|---|---|
| `ink` | `#171717` | headings, CTA fill, borders, logo |
| `canvas` | `#FAFAFA` | the page sheet |
| `canvasElevated` | `#FFFFFF` | cards, inputs, code blocks |
| `hairline` | `#EBEBEB` | the 1px border on every card, input, divider |
| `hairlineSoft` | `#F2F2F2` | inset wells, alternating panels |
| `body` | `#4D4D4D` | paragraphs, nav links |
| `mute` | `#8F8F8F` | captions, metadata |
| `faint` | `#A1A1A1` | placeholders, disabled |
| `muteAccessible` | `#6E6E6E` | caption tier that carries meaning (4.7:1 on canvas) |

The stepped ladder `ink → body → mute → faint` is deliberate. Body copy never
sits at pure `#000000`.

Accents (`link`, `violet`, `cyan`, `pink`, `magenta`, `amber`) exist for
illustration and as mesh stops. Health status keeps its own semantics
(`statusNormal` / `statusWatch` / `statusAttention`) so a clinical signal is
never confused with brand decoration.

### Typography

Geist Sans and Geist Mono are not available through the `google_fonts` package
(verified: no `Geist` entry in `google_fonts` 6.3.3). The source system's own
sanctioned substitutes are used instead:

- **Geist Sans → Inter** (fallback chain `Arial, Roboto, Helvetica Neue`)
- **Geist Mono → JetBrains Mono** (fallback chain `Courier New, Roboto Mono`)

Weight stays binary and the negative display tracking is preserved, which is
what actually creates the Geist reading.

| Token | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| `displayXl` | 48 | 600 | 1.0 | **-2.4** |
| `headingLg` | 32 | 600 | 1.25 | **-1.28** |
| `headingMd` | 20 | 600 | 1.4 | -0.4 |
| `headingSm` | 16 | 600 | 1.4 | -0.32 |
| `bodyLg` | 16 | 400 | 1.5 | 0 |
| `bodyMd` | 14 | 400 | 1.43 | 0 |
| `bodySm` | 12 | 400 | 1.33 | 0 |
| `monoEyebrow` | 12 | 500 | 1.33 | 0 |
| `buttonLg` | 16 | 500 | 1.25 | 0 |
| `buttonMd` | 14 | 500 | 1.43 | 0 |
| `code` | 14 | 400 | 1.43 | 0 |

Rules: the larger the heading, the tighter the tracking. There is no light or
black weight and no italic. Mono is reserved for two roles only — code, and the
uppercase eyebrow labels that introduce sections like spec-sheet headers.

### Radius

Bimodal by design, and the shape is a signal of which surface you are on:

| Token | Value | Use |
|---|---|---|
| `sm` | 6 | nav / app buttons, inputs |
| `md` | 12 | feature cards, code blocks |
| `lg` | 16 | larger panels, dialogs |
| `pillCategory` | 64 | category-tab pills |
| `pill` | 100 | **marketing CTA pills** |
| `full` | 9999 | circular icon buttons, avatars |

### Elevation

Flat is the default. Depth is a 1px hairline first, and at most a finely-layered
low-alpha shadow stack — never a single heavy drop.

| Level | Treatment | Use |
|---|---|---|
| 0 | hairline, no shadow | default cards, inputs, the canvas |
| 1 | `0 1 1 rgba(0,0,0,0.04)` | lightly-raised cards |
| 2 | `0 2 2` + `0 8 16 -4` low-alpha | menus, modals, tooltips |

Dark mode mirrors the levels with light-alpha shadows, since dark-on-dark
shadows read as nothing.

## 2. Motion

Motion is functional: it confirms state, directs attention, and expresses
hierarchy. It never delays a task.

| Token | Value | Use |
|---|---|---|
| `instant` | 90ms | hover, focus, press |
| `fast` | 160ms | badges, chips, nav selection |
| `base` | 240ms | buttons, cards |
| `slow` | 420ms | dialogs, sheets, progress |
| `reveal` | 620ms | one-shot content reveal |
| `ambient` | 24s | hero mesh drift |

Curves: `standard` (`easeOutCubic`) for entering and moving, `emphasized`
(`Cubic(0.2, 0, 0, 1)`) for larger surfaces, `exit` for leaving.

### Reduced motion is honoured everywhere

`AppMotion.reduced(context)` reads `MediaQuery.disableAnimations`. Every
animation degrades rather than merely slowing down:

- `FadeSlideIn` renders at full opacity immediately
- `PressableScale` and `HoverLift` return the child unwrapped
- the mesh gradient freezes its drift but keeps the bloom
- page transitions fall back to an instant cut
- `AppMotion.effective()` collapses any duration to zero

### Animation inventory

| Where | What |
|---|---|
| Route changes | fade + 1.5% upward slide |
| Tab switches | shell opacity 0.86 to 1 |
| Hero / launch | staggered `FadeSlideIn`, 60ms steps |
| Nav selection | `AnimatedContainer` slide-in on a 6px square |
| Buttons | `PressableScale` to 0.98 on pointer-down |
| Cards | `HoverLift` 2px, only when actually tappable |
| Progress | `TweenAnimationBuilder` ease-in on first build |
| Status | expanding, fading halo behind the icon |
| Hero mesh | six blurred radial shaders drifting on a 24s loop |

The tab-switch fade deliberately animates opacity only. Re-instantiating the
navigation shell would break go_router's branch state and duplicate its internal
navigator keys.

## 3. Components

| Component | Shape | Notes |
|---|---|---|
| `PrimaryButton` | pill 100 | marketing CTA; stays ink-filled while busy rather than flashing the grey disabled tier |
| `SecondaryButton` | pill 100 | same pill, inverted |
| `AppSquareButton` | square 6 | nav / app chrome; overrides the pill theme on purpose |
| `HairlineCard` (`GlassCard` alias) | 12 | white, 1px hairline, whisper shadow; `tint` edges it, never fills it |
| `StatusBadge` | pill | coloured dot + uppercase mono label |
| `SectionHeader` | - | optional mono eyebrow, title, subtitle, trailing action, closed by a hairline |
| `ProgressCard` | 12 | hairline card with an eased progress bar |
| `MeshGradient` | - | the hero bloom, opt-in via `GradientBackground(mesh: true)` |
| `MonoEyebrow` | - | uppercase mono section label |
| `EmptyState` | 12 | square icon well + centred copy |
| `LoadingShimmer` | 12 | skeletons drawn from the system greys |

## 4. Migration notes

Every previous token name still resolves, so no call site needed rewriting:

- `AppColors.primary` is now `ink` (`#171717`), not teal
- `AppColors.borderLight` to `hairline`
- `AppColors.backgroundLight` / `surfaceLight` to `canvas` / `canvasElevated`
- `AppColors.textDark` to `ink`
- `AppRadii.sm` 8 to 6, `pill` 999 to 100
- `AppShadows.card` / `elevated` to the whisper / floating stacks
- `AppTextStyles.display` to `displayXl`; `headingLarge`, `headingMedium`,
  `headingSmall`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall` and
  `labelButton` all retained
- `GlassCard` is now `typedef GlassCard = HairlineCard`

Two behaviour changes worth knowing:

1. **`AppColors.primary` is now near-black.** Anywhere it was used as a
   *foreground* on a dark surface it would have gone invisible. All such call
   sites were moved to `Theme.of(context).colorScheme.primary`, which is
   theme-aware (`ink` in light, `#EDEDED` in dark).
2. **Raw `Card` widgets are now hairline cards.** The theme's `cardTheme` sets
   the white fill, 1px hairline side, 12px radius and zero elevation, so screens
   that still use `Card` inherit the system automatically.

## 5. Accessibility

- **Contrast:** body copy is `#4D4D4D` on `#FAFAFA` (8.6:1). `mute` is kept for
  genuinely low-emphasis metadata; where a caption carries meaning, use
  `muteAccessible` (`#6E6E6E`, 4.7:1) instead.
- **Touch targets:** pill CTAs and square controls are height-driven to a 44px
  minimum rather than padded vertically.
- **Reduced motion:** honoured by every animated component (section 2).
- **Colour is never the only signal:** status carries a dot plus an uppercase
  text label; nav states carry fill, border and weight as well as hue.

## 6. Deliberate deviations from the source system

| Deviation | Why |
|---|---|
| Inter / JetBrains Mono instead of Geist | Geist is absent from `google_fonts` 6.3.3; these are the source system's own sanctioned substitutes, keeping weight 600 and the negative tracking |
| The brand teal survives | A health product needs its identity, so teal is demoted from chrome to a mesh stop and a single accent |
| Health status keeps emerald / amber / red | A clinical signal must never be confused with brand decoration |
| Dark mode retained | The app ships a theme toggle; dark inverts the same ladder instead of defining a second system |
| `muteAccessible` added | The source `mute` (`#8F8F8F`) is 2.9:1 on canvas, which fails WCAG AA for meaningful small text |
| Tab-switch fade is opacity-only | Re-instantiating the navigation shell would break go_router's branch state |

## 7. Testing

`test/design_system_test.dart` locks the token layer: the ink/canvas/hairline
trio, the grey ladder, legacy alias resolution, the bimodal radius scale, the
type ramp's weights and tracking, and the theme's flat-card / pill-CTA /
6px-input decisions.

`test/design_system_widgets_test.dart` covers behaviour: pill versus square
button shapes, the busy-state paint, hairline card chrome, tint-as-edge, hover
lift gating, the reduced-motion degradations, staggered reveal order, and the
mesh painter's guards.

Two things to know when extending the suite:

- Set `GoogleFonts.config.allowRuntimeFetching = false`. Tests are offline and
  `GoogleFonts` *throws* on a failed lookup rather than logging it.
- Do not use `pumpAndSettle` on screens hosting the mesh gradient: its ambient
  loop never settles. Pump fixed frames instead, as `test/widget_test.dart` does.

### A bug this suite caught

`Colors.transparent.withValues(alpha: 0.05)` is 5% **black**, not 5% of nothing.
Untinted cards were therefore rendering `#F2F2F2` instead of white. `HairlineCard`
now only blends when a tint is actually present.