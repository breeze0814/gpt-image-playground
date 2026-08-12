# Design - Image Playground

A locked design system for the full web application. Product logic, routes, auth,
task processing, credits, and administration remain outside this document.

## Genre

Modern-minimal, tuned for a repeated-use creative workspace rather than an AI
marketing showcase.

## Macrostructure Family

- Marketing and auth: Narrative Workflow with one product-led CSS canvas.
- Creation pages: Workbench with a stable controls/result split.
- History, credits, and admin: Index-First with compact lists and data tables.

## Theme

Coral. Warm-tinted neutral paper, charcoal ink, and one restrained oxide-coral
signal. Semantic success, warning, and error colours are reserved for state.
Dark mode keeps the same hue anchors and raises elevated surfaces by lightness.

## Typography

- Display: Space Grotesk, weight 700, normal style.
- Body: DM Sans, weight 400/500.
- Chinese fallback: PingFang SC, then Microsoft YaHei.
- Letter spacing: 0 for display and body text.
- Type scale: 1.25 ratio, with `--text-display` capped at 5.25rem.

## Spacing

The named 4-point scale is defined in `tokens.css`. Components use Tailwind
utilities that map to the same 4-point rhythm; no arbitrary spacing values.

## Motion

- Motion-cut by default. No page or scroll reveals.
- State feedback uses colour, surface, and opacity changes only.
- Easings: `--ease-out`, `--ease-in`, and `--ease-in-out`.
- Reduced motion freezes non-essential animation; loading text remains explicit.

## Microinteractions Stance

- Silent success when the updated state is visible.
- Inline errors stay next to the action that failed.
- Focus rings are immediate and never animated.
- Hover is always paired with keyboard focus and touch activation.

## CTA Voice

- Primary: solid coral, 6px radius, explicit verb label.
- Secondary: neutral outline or ghost treatment.
- Icon-only actions use Lucide icons, accessible labels, and tooltips when needed.

## Per-page Allowances

- Homepage may use one Tier-A CSS artwork inside a real product composition.
- App and admin pages use no decorative enrichment; function carries the page.
- History imagery is always real task output supplied by the product.

## What Pages Must Share

- Wordmark, accent placement, fonts, 6-8px radii, focus treatment, and CTA voice.
- Client pages use a Vercel-style 64px sticky top bar with centred route tabs,
  right-side utilities, and a compact top menu on mobile.
- Admin pages retain the persistent desktop rail and compact mobile management menu.
- Unframed page headings and one containment layer per tool or data surface.

## Application Chrome

- Client navigation: N1b, always-solid surface, three centred route links, no
  dropdowns on desktop, and no persistent bottom navigation.
- Client utilities: check-in, credits, and account actions remain right-aligned.
- Admin navigation: persistent rail on desktop; management menu on mobile.

## Mobile-first Rules

- Base layouts target 320px, 375px, and 414px mobile web viewports; larger
  breakpoints add density without changing the primary workflow.
- Client navigation stays at the top. Mobile uses a compact identity row followed
  by four equal-width route tabs for Generate, Edit, History, and Credits.
- Authentication and password recovery place the actionable form first on mobile;
  the narrative context is a desktop enhancement.
- Creation pages show an active task result before controls on mobile after
  submission, while desktop retains the controls/result split.
- Tables become readable card lists below their desktop breakpoint. Touch targets
  remain at least 44px, content uses safe-area padding, and no bottom navigation
  is introduced.

## What Pages May Differ On

- Marketing rhythm, workbench column balance, and index/table density.
- Status layout based on the data shown.

## Exports

### tokens.css

The complete colour, type, spacing, radius, motion, and z-index tokens live in
`tokens.css` at the project root.

### Tailwind v3

`apps/web/tailwind.config.ts` maps semantic utilities to OKLCH channel tokens:
`background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`,
`destructive`, `success`, `warning`, `border`, `control`, `input`, and `ring`.

### DTCG tokens.json

```json
{
  "color": {
    "paper": { "$value": "oklch(0.975 0.008 55)", "$type": "color" },
    "ink": { "$value": "oklch(0.185 0.018 38)", "$type": "color" },
    "accent": { "$value": "oklch(0.535 0.185 29)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk", "$type": "fontFamily" },
    "body": { "$value": "DM Sans", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS Variables

```css
:root {
  --background: 0.975 0.008 55;
  --foreground: 0.185 0.018 38;
  --primary: 0.535 0.185 29;
  --primary-foreground: 0.985 0.005 55;
  --muted: 0.948 0.011 55;
  --muted-foreground: 0.445 0.018 38;
  --border: 0.865 0.014 55;
  --input: 0.64 0.018 48;
  --ring: 0.285 0.07 250;
  --radius: 0.375rem;
}
```
