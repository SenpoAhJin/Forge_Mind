# Marketplace listing card layout fix

Date: 2026-10-02
Status: done. Layout only, no logic and no data change.

## Summary
Browse feed cards used a fixed 140 height with overflow hidden, so anything taller was clipped: descriptions sliced in half, and wrapped chips pushing the price off the bottom. The card now grows with its content.

## Problems
1. height: 140 plus overflow hidden cut the description at the card edge.
2. A long category chip wrapped to two lines, pushed the price down, and the price was clipped.
3. Title was numberOfLines 2, so it ended in "..." too early.
4. No-photo thumbnail was two bare initials on a pale box, reading as broken.
5. Category scroller height 56 with overflow hidden cut the last chip at the right edge.
6. The last card sat tight against the bottom tab bar.

## Fix
- Card: no fixed height, no overflow hidden, minHeight 88, content row alignItems flex-start, so the card grows with title, chips, price and description. Flat style kept: radius 12, 1px border, existing subtle shadow, marginBottom 12, theme tokens only.
- Thumbnail: 88x88, radius 10, alignSelf flex-start, existing tinted tertiary background. Photo renders as Image resizeMode cover; no photo renders a centered Ionicons icon mapped from the category, falling back to a generic tag. No bare initials, no new dependency.
- Content column: flex 1, minWidth 0, gap 6. minWidth 0 matters because a long unbroken title previously widened the column and squeezed the price away.
- Chips: wrap with columnGap 6, rowGap 6, one line with tail ellipsis. Wrapping now extends the card instead of pushing the price out of view.
- Price: 18, weight 700, one line, adjustsFontSizeToFit minimumFontScale 0.8, so it is always fully visible.
- Description: 13/18, gray, 2 lines, inside the card. No description renders no block rather than a gap.
- Category scroller: no fixed height, paddingHorizontal 16 with paddingRight 24, chips flexShrink 0 and one line, so the last chip scrolls fully clear.
- List: paddingBottom 24 plus the bottom safe-area inset from react-native-safe-area-context, already a dependency, so the last card clears the tab bar. Loading and empty states stay centered.

## Files changed
- src/screens/cosplayer/MarketplaceScreen.tsx - card renderer, card styles, category scroller styles, list padding, category icon map, imports.

## Sizes and rules used
Thumbnail 88x88 radius 10. Title 16/22, 3 lines. Description 13/18, 2 lines. Chips 12, padding 8/3, one line. Price 18, weight 700, fits to 80 percent. Card minHeight 88, no maximum, radius 12.

## Edge cases checked
Long unbroken title stays in the content column with the price visible (minWidth 0 plus the fitting price). Three wrapping chips extend the card instead of clipping the price. A seven digit price fits on one line at the 0.8 minimum scale. No image shows the category icon. No description omits the block. The card grows past 88 when the title or chips need more. Checked by reading the styles against 360, 390 and a 375 web preview and fontScale 1.3, where every text run has an explicit line count and the card has no maximum height.

## Other screens audit (not fixed)
OfferLogScreen.tsx (height 56 plus overflow hidden at 302, fixed 120 at 465, overflow hidden at 355 and 421) and ChatListScreen.tsx (56 plus overflow hidden at 279, fixed 110 at 320, fixed 120 at 415) share the clipping pattern but are the offers and messages lists. MakeOfferScreen.tsx has fixed 120 boxes at 590 and 697, which are offer form sections. CommissionProgressScreen.tsx fixed heights are a 12 progress bar and a 40 button, intentional. CreateListingScreen has no fixed-height rows or clipped text. ListingDetailScreen title and description have no numberOfLines, maxHeight or lineClamp, so both show in full and need no fix. None of these share the browse card, so all were left alone.

## How to test
No visual tool is available here, so check on device:
1. Marketplace as a verified user: scroll to the bottom, the last card is clear of the tab bar.
2. Long title with three chips: title up to 3 lines, chips wrap, price whole.
3. No photo: a category icon, not two letters. No description: no empty gap.
4. Swipe the category chips right: the last chip scrolls fully into view.
5. Largest system font: no text cut off inside any card.
6. Open a listing: the detail screen shows the full title and description.

## Follow-ups
- Apply the same treatment to the offers and messages lists.
- Listing photos are still seed mock URIs; a real upload pipeline would replace the icon placeholder with a real image.