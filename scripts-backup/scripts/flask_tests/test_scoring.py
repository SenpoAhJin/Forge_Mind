#!/usr/bin/env python3
"""Flask Matcher Scoring Verification"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'src'))
from attire_matcher import AttireMatcher

def run_test(matcher, name, items):
    result = matcher.match_outfit("gojo-satoru_season-2-uniform", items)
    if 'error' in result:
        print(f"ERROR: {result['error']}\n")
        return
    
    print(f"=== {name} ===")
    print(f"Character: {result.get('character_name', 'N/A')} / {result.get('variant_name', 'N/A')}")
    print(f"Overall: {result['match_quality']['quality_label']} (score={result['match_quality']['overall_score']:.3f})\n")
    
    for slot, item in result['suggested_outfit'].items():
        b = item['breakdown']
        print(f"{slot:10s} {item['name'][:30]:30s}")
        print(f"           color={b['color']:.3f} keywords={b['keywords']:.3f} category={b['category']:.3f}")
        print(f"           total={item['score']:.3f} confidence={item['confidence']}")
    
    if result['missing_items']:
        print(f"\nMissing ({len(result['missing_items'])}): " + 
              ", ".join(m['category'] for m in result['missing_items']))
    print()

matcher = AttireMatcher(datasets_path="chracters_datasets")

# (a) Clearly matching
run_test(matcher, "(a) Clearly matching items", [
    {"id": "1", "name": "White Spiky Wig", "category": "wig", "subcategory": "wig", 
     "color": "#FFFFFF", "tags": ["white", "spiky", "short", "anime"]},
    {"id": "2", "name": "Black Dress Pants", "category": "bottom", "subcategory": "pants", 
     "color": "#000000", "tags": ["black", "pants", "formal", "dress"]},
    {"id": "3", "name": "Black High-Collar Jacket", "category": "top", "subcategory": "jacket", 
     "color": "#000000", "tags": ["black", "jacket", "formal", "high-collar"]}
])

# (b) Clearly wrong
run_test(matcher, "(b) Clearly wrong items", [
    {"id": "4", "name": "Red Dress", "category": "top", "subcategory": "dress", 
     "color": "#FF0000", "tags": ["red", "dress", "formal"]},
    {"id": "5", "name": "Green Hat", "category": "wig", "subcategory": "hat", 
     "color": "#00FF00", "tags": ["green", "hat", "casual"]},
    {"id": "6", "name": "Purple Scarf", "category": "accessory", "subcategory": "scarf", 
     "color": "#800080", "tags": ["purple", "scarf", "accessory"]}
])

# (c) Matching minus one
run_test(matcher, "(c) Matching set minus one item", [
    {"id": "1", "name": "White Spiky Wig", "category": "wig", "subcategory": "wig", 
     "color": "#FFFFFF", "tags": ["white", "spiky", "short", "anime"]},
    {"id": "2", "name": "Black Dress Pants", "category": "bottom", "subcategory": "pants", 
     "color": "#000000", "tags": ["black", "pants", "formal", "dress"]}
])

# (d) Empty
run_test(matcher, "(d) Empty list", [])

print("\n=== FORMULA (attire_matcher.py) ===")
print("Item score (line 137-145):")
print("  total = color*0.7 + keywords*0.2 + category*0.1")
print("\nConfidence labels (line 196-205):")
print("  excellent: >=0.9, good: >=0.75, fair: >=0.6, poor: >=0.4, no-match: <0.4")
print("\nOverall quality (line 329-341):")
print("  avg_score = mean(item scores)")
print("  completeness = matched_count / required_count")
print("  overall = avg_score*0.7 + completeness*0.3")
print("  excellent: >=0.85, good: >=0.7, acceptable: >=0.5, incomplete: <0.5")
