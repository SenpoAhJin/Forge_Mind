# From wardrobe to wearing (10-step deck) — governing spec for the wearing feature

Flow: 1 Pick variant -> 2 Open wardrobe -> 3 Tap to wear -> 4 Say a command (PROPOSED) -> 5 Change color

      -> 6 See missing (PROPOSED) -> 7 Compare looks (PROPOSED) -> 8 Check angles -> 9 Save look (PROPOSED) -> 10 (see note)

Tagline: ONE MODEL · MANY LOOKS · YOU CHOOSE EVERY CHANGE

Every wearing screen shows the footer: "3D pieces are simple colored shapes, not exact replicas of your items."

Bottom tab bar on every screen: Home, Characters, My Items, Marketplace, Profile.

Slots in 3D: Wig, Top, Bottom, Gloves, Shoes. Not shown in 3D yet: Blindfold, Ear cuff, Prop accessory, Belt.

## 1 Pick the look to wear (PROPOSED)

Description: "Swapping variants changes the target colors of every slot, your own items stay in your wardrobe."

Screen title: "Gojo Satoru – Season 2 Uniform"

Variant chips: "Season 2 Uniform" | "Casual Streetwear" | "Unsealed Past" | "Vol 0 Outfit" (selected one highlighted)

Below the chips: the 3D model wearing the look.

## 2 Your wardrobe, slot by slot

Description: "Every owned item lands in the slot it belongs to."

Header: "Your wardrobe", then "Your Items" as outlined cards, each "<name> (<slot>)" + "Owned":

  Black jacket (top) / Black dress pants (bottom) / Black combat boots (shoes) / Red cosplay wig (wig) / Silver wig (wig)

Line: "Not shown in 3D yet: Blindfold, Ear cuff, Prop accessory"

Slot chips: Wig | Top | Bottom | Gloves | Shoes

## 3 Tap to wear

Description: "Tap an owned item and the model wears it instantly; tap again to take it off."

Header: "Tap an item to wear it"

Selected item card: "Silver wig · Selected"

Confirmation line: "Silver wig is now on your Wig slot"

## 4 Say what to wear (PROPOSED)

Description: "Type or speak a command; the assistant only changes the outfit after you confirm."

Header: "Assistant outfit command"

Command box example: "Put on my red wig instead of the silver one"

Result card: "I understood: swap Wig → Red cosplay wig"

Buttons: "Confirm" | "Cancel"

Note: "Nothing changes until you tap Confirm."

(Implementation decision: typed only, rule-based parser, no voice, no AI.)

## 5 Change the color

Description: "Pick any color; the character's target colors are suggested first."

Header: "Customize outfit"; label "Top color" (label follows the selected slot)

8 swatches: white, light gray, gray, black, red, blue, purple, pink

Row "Character colors" with the character's target colors

Banner when matched: "✓ Matches character color"

## 6 See what's missing (PROPOSED)

Description: "Slots you don't have yet appear as ghost pieces so you can judge the whole look before buying."

Header: "Missing pieces preview"

Ghost (translucent) pieces on/near the model for unowned slots (example: spiky wig, gloves)

Rows: "Wig – White · Spiky – Not owned" + action "Find in Marketplace"

      "Gloves – Black · Fitted – Not owned" + action "Mark as make it"

## 7 Compare two looks (PROPOSED)

Description: "Compare what you have today with what you could have after one purchase."

Header: "Compare looks"; two models side by side

"Look A – Owned items only" / "3 of 5 slots · 60%"

"Look B – With white wig" / "4 of 5 slots · 80%"

Buttons: "Use Look B" (primary) | "Keep Look A"

## 8 Check every angle

Description: "Switch body type and angle; your outfit stays on the model."

Header: "View outfit"; toggle "Male | Female"; segmented "Front | Side | Back"

Hint: "Drag to rotate · Pinch to zoom"

## 9 Save and undo looks (PROPOSED)

Description: "Keep several outfits per project and step back after a swap you didn't like."

Header: "Saved looks"; chips: "Con day look" | "Photoshop look" | "Budget look"

Buttons: "Save current look" | "Undo" | "Remove all"

Note: "Saved per project."

## 10 What you see, and what you don't

Description: "The preview is for planning the silhouette and colors, not for judging fabric or exact fit."

Header: "About the 3D preview"

"Shown in 3D: Wig, Top, Bottom, Gloves, Shoes"

"Not shown yet: Blindfold, Ear cuff, Prop accessory, Belt"

"Pieces are simple colored shapes, not exact replicas."

Callout: "The checklist and budget still count every item, even the ones not shown in 3D."

NOTE: the flow diagram labels step 10 "Share plan", but the slide itself is the explainer above. Build the explainer.

"Share plan" already exists in the planning deck's Plan Summary screen; do not rebuild it here.
