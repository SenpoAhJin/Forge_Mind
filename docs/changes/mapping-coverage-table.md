# Matcher Variant Mapping Coverage (D4 Step 3)

**Date:** 2026-10-15  
**Status:** 1 of 12 mobile variants mapped to Flask

## Mobile Variants vs Flask Files

| Mobile Variant ID | Character | Flask File | Status |
|-------------------|-----------|------------|--------|
| var-gojo-s2-uniform | Gojo Satoru | gojo-satoru_season-2-uniform.json | ✓ **Mapped** |
| var-gojo-casual-streetwear | Gojo Satoru | — | No Flask file |
| var-gojo-unsealed-past | Gojo Satoru | — | No Flask file |
| var-gojo-vol0-outfit | Gojo Satoru | — | No Flask file |
| var-makima-casual-business | Makima | — | No Flask file |
| var-makima-halloween | Makima | — | No Flask file |
| var-makima-suit | Makima | — | No Flask file |
| var-veira-emerald-armor | Veira | — | No Flask file |
| var-veira-scholar-robes | Veira | — | No Flask file |
| var-zelda-royal-gown | Zelda | — | No Flask file |
| var-zelda-totk-gown | Zelda | — | No Flask file |
| var-zelda-traveling-dress | Zelda | — | No Flask file |

## Flask Files vs Mobile Variants

| Flask File | Character | Mobile Variant | Status |
|------------|-----------|----------------|--------|
| gojo-satoru_season-2-uniform.json | Gojo Satoru | var-gojo-s2-uniform | ✓ **Mapped** |
| asta_black-bulls-uniform.json | Asta | — | Not in mobile catalog |
| luck-voltia_black-bulls.json | Luck Voltia | — | Not in mobile catalog |
| oc_cyberpunk-street.json | Original Character | — | Not in mobile catalog |
| raiden_default-outfit.json | Raiden Shogun | — | Not in mobile catalog |
| spiderman_classic-suit.json | Spider-Man | — | Not in mobile catalog |

## Summary

- **Total mobile variants:** 12
- **Total Flask files:** 6
- **Confirmed mappings:** 1 (8.3% of mobile variants)
- **Unmapped mobile variants:** 11 (91.7%)
- **Unmapped Flask files:** 5 (83.3%)

## Coverage Gap

**11 mobile variants** have no Flask attire data:
- Gojo: 3 additional variants (casual-streetwear, unsealed-past, vol0-outfit)
- Makima: 3 variants (no Flask files at all)
- Veira: 2 variants (no Flask files at all)
- Zelda: 3 variants (no Flask files at all)

**5 Flask files** have no mobile character catalog entries:
- Asta (Black Clover)
- Luck Voltia (Black Clover)
- Original Character (OC)
- Raiden Shogun (Genshin Impact)
- Spider-Man (Marvel)

## Implications

1. **Mobile users can only get matcher results for 1 of 12 variants** (Gojo Season 2 Uniform)
2. **Calling matcher with unmapped variants returns 404** "character variant not found"
3. **5 Flask files are unreachable** from mobile UI (no catalog entry to select)
4. **Future work:** Create Flask attire reference files for Makima/Veira/Zelda variants OR add Asta/Luck/Raiden/Spider-Man to mobile catalog
