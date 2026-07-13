## Add per-node model tier selector for image generation

Lets every user (free, pro, admin) pick the Gemini image model used per node.

### Tiers

| Tier | Model | Quality | Speed | Cost |
|---|---|---|---|---|
| **Draft** | `google/gemini-2.5-flash-image` | Good | Fast | $ |
| **Standard** (default) | `google/gemini-3.1-flash-image-preview` | High | Fast | $$ |
| **Ultra** | `google/gemini-3-pro-image-preview` | Highest | Slow | $$$ |

Default for every node is **Standard** (best quality/speed balance, current behavior is Ultra so this is also a small cost win out of the box).

### Changes

**1. New shared constant** — `src/lib/imageModelTiers.ts`
   - Exports `IMAGE_MODEL_TIERS` array `[{id, label, model, description}]`
   - Exports `DEFAULT_TIER_ID = 'standard'`

**2. New shared UI component** — `src/components/ModelTierSelector.tsx`
   - Compact `Select` dropdown labeled "Quality" with the 3 tiers
   - Shows tier label + small cost indicator ($/$$/$$$)
   - Tooltip with the description
   - Props: `value`, `onChange`, optional `compact`

**3. Node updates** — add the selector + persist `modelTier` in node data, pass it in the `supabase.functions.invoke('generate-image', { body: { ..., modelTier } })` call:
   - `PromptNode.tsx`
   - `EditNode.tsx`
   - `SocialMediaPostNode.tsx`
   - `BatchProcessingNode.tsx`
   - `VariationNode.tsx`
   - `HtmlFrameNode.tsx` (if it calls generate-image)

**4. Type update** — `src/types/nodeEditor.ts`: add optional `modelTier?: string` to `NodeData`.

**5. Edge function** — `supabase/functions/generate-image/index.ts`:
   - Accept `modelTier` from request body
   - Validate against allow-list (`draft`/`standard`/`ultra`); fall back to `standard`
   - Map tier → model id (replaces current hardcoded `gemini-3-pro-image-preview`)
   - Apply for both Lovable Gateway and BYOK OpenRouter paths
   - Log tier used

### Out of scope

- No tier-based pricing changes or credit multipliers (everyone pays 1 credit per generation regardless of tier — call out if you want differential credits)
- No global default in account settings (per-node only, per your choice)
- No backend lock to subscription tier (everyone has access)

### Open question

Do you want **Ultra** to cost more credits (e.g. Draft=1, Standard=1, Ultra=2 or 3)? If yes I'll add a `CREDIT_COST_BY_TIER` map in the edge function. Default plan keeps it flat at 1.