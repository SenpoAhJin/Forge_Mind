# MARKETPLACE REGISTRATION — BASELINE DOCUMENTATION

**Date:** Friday, September 18, 2026  
**Purpose:** Document current verification system before adding Marketplace Registration form

---

## STEP 1: CURRENT VERIFICATION SYSTEM BASELINE

### 1.1 Where `verification_status` Gets Set for New Cosplayer Accounts

**Location:** `src/services/AuthService.ts`, lines 100-101

**Code:**
```typescript
const newAccount: StoredAccount = {
  email,
  password_hash: password, // Plaintext for now - real hashing in BE-1
  display_name: displayName,
  is_cosplayer: isCosplayer,
  is_organizer: isOrganizer,
  base_body_selection: baseBody,
  body_size_slider: bodySize,
  is_holder_verified: false,
  verification_status: 'pending', // Note: Only Head Organizers can verify users for marketplace
  organizer_role: null, // FE-5.5: Always starts as null, must request access
};
```

**Current Reality:**  
✅ **`verification_status` is ALWAYS set to `'pending'` at registration time** (line 101)  
✅ **This happens for ALL new Cosplayer accounts immediately upon registration**  
✅ **No action required from user — they are "pending" by default just by existing**

**Problem:** This violates the goal stated in the task — verification should be triggered by an actual Marketplace Registration submission, not by account creation.

---

### 1.2 What VerifyCosplayersScreen Currently Displays

**Location:** `src/screens/organizer/VerifyCosplayersScreen.tsx`, lines 143-169

**Code (renderCosplayerCard function):**
```typescript
const renderCosplayerCard = (cosplayer: StoredAccount) => {
  const isPending = cosplayer.verification_status === 'pending';
  const isVerified = cosplayer.verification_status === 'verified';
  const isRejected = cosplayer.verification_status === 'rejected';

  return (
    <View key={cosplayer.email} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {cosplayer.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{cosplayer.display_name}</Text>
          <Text style={styles.cardEmail}>{cosplayer.email}</Text>
        </View>
        <View style={[
          styles.badge,
          isVerified && styles.badgeSuccess,
          isPending && styles.badgeWarning,
          isRejected && styles.badgeError,
        ]}>
          <Text style={[
            styles.badgeText,
            isVerified && styles.badgeTextSuccess,
            isPending && styles.badgeTextWarning,
            isRejected && styles.badgeTextError,
          ]}>
            {cosplayer.verification_status.charAt(0).toUpperCase() + 
             cosplayer.verification_status.slice(1)}
          </Text>
        </View>
      </View>
```

**Fields Currently Displayed:**
1. **Avatar** (initial letter from `cosplayer.display_name`)
2. **Display Name** (`cosplayer.display_name`)
3. **Email** (`cosplayer.email`)
4. **Verification Status Badge** (`cosplayer.verification_status` — "Pending", "Verified", "Rejected", "Revoked")

**That's it.** No other fields are shown. No marketplace-specific registration data because none exists yet.

---

### 1.3 What MarketplaceScreen Currently Shows

**Location:** `src/screens/cosplayer/MarketplaceScreen.tsx`, lines 1-68 (entire file)

**Code:**
```typescript
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

export const MarketplaceScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Ionicons name="cart-outline" size={48} color={colors.tertiary} />
        <Text style={styles.heroTitle}>Marketplace</Text>
        <Text style={styles.heroSub}>
          Buy, sell and trade cosplay items with verified holders.
        </Text>
      </View>

      <View style={styles.featureList}>
        <View style={styles.featureRow}>
          <Ionicons name="search-outline" size={20} color={colors.tertiary} />
          <Text style={styles.featureText}>Browse items by category, price and condition</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.tertiary} />
          <Text style={styles.featureText}>Propose trades with fairness assessment</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="ribbon-outline" size={20} color={colors.tertiary} />
          <Text style={styles.featureText}>Request commissions from skilled crafters</Text>
        </View>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Marketplace browsing, listing creation and chat will be built in FE-6.
        </Text>
      </View>
    </ScrollView>
  );
};
```

**Current Reality:**
✅ **MarketplaceScreen is a PURE PLACEHOLDER** — shows hero card + feature list + "coming in FE-6" banner  
✅ **DOES NOT CHECK `verification_status` AT ALL**  
✅ **DOES NOT GATE ACCESS** — any logged-in Cosplayer sees this screen regardless of verification  
✅ **No registration form, no blocked state, no call-to-action**

---

## STEP 2: FOUNDATION SPEC CHECK — MARKETPLACE TABLES

### 2.1 Relevant Tables from `ForgeMind_Phase0_Foundation.md`

**Listing Table** (Section E, lines 315-347):
```
| Field Name | Data Type | Required | Source | Notes |
|------------|-----------|----------|--------|-------|
| listing_id | UUID | Yes | System-generated | Primary key |
| seller_user_id | UUID | Yes | References User | Must be Holder-verified |
| item_title | String(200) | Yes | User input | Listing title |
| item_description | Text | Yes | User input | Full description |
| category_id | UUID | Yes | References PermittedCategory | Foreign key |
| price | Decimal(10,2) | Yes | User input | Asking price |
| condition_rating | Integer | Yes | User input | 1–5 scale |
| photo_urls | JSON Array | Yes | User input | Array of item photo URLs |
| screening_result | Enum | Yes | AI-derived | pass / blocked |
| screening_reason | Text | No | AI-derived | If blocked, explanation |
| listing_status | Enum | Yes | System-set | draft / active / sold / removed |
| created_at | Timestamp | Yes | System-logged | Listing creation |
| published_at | Timestamp | No | System-logged | When screening passed and published |
| updated_at | Timestamp | Yes | System-logged | Last modification |

**Business Rule:** Screening auto-blocks if category check fails.
**Relationships:** Many listings → one seller (User); seller_user_id "Must be Holder-verified"
```

**Key Finding:**  
✅ **Foundation spec CONFIRMS `seller_user_id` must be "Holder-verified"**  
✅ **Foundation spec has NO `MarketplaceRegistration` table or seller onboarding entity**  
✅ **Foundation spec assumes verification happens at User level** (User.is_holder_verified field exists)

**Conclusion:** The requested `MarketplaceRegistration` fields (seller_display_name, contact_email, payout_method, etc.) are **NOT in the Foundation spec**. They are an **ASSUMPTION** for this phase, flagged explicitly in implementation.

---

## DECISION: DATA MODEL APPROACH

Since there is NO `MarketplaceRegistration` table in Foundation spec, we will:

1. **Add marketplace registration fields DIRECTLY to `StoredAccount` interface** (src/services/AuthService.ts)
2. **Flag all new fields as ASSUMPTIONS** pending backend schema alignment
3. **Reuse existing `verification_status` field** (already exists in User schema as Enum)
4. **Only set `verification_status` to 'pending' WHEN marketplace registration is submitted**, not at account creation

### Fields to Add (All ASSUMPTIONS):

```typescript
marketplace_registration?: {  // Optional — only exists after submission
  seller_display_name: string;           // ASSUMPTION: not in Foundation
  contact_email: string;                 // ASSUMPTION: not in Foundation
  contact_phone?: string;                // ASSUMPTION: not in Foundation
  payout_method_label: string;           // ASSUMPTION: MOCK FIELD, not encrypted
  payout_method_number: string;          // ASSUMPTION: MOCK FIELD, not encrypted
  agreed_to_marketplace_terms: boolean;  // ASSUMPTION: not in Foundation
  submitted_at: string;                  // ISO timestamp, ASSUMPTION format
};
```

**Storage:** Nested within `StoredAccount` object (same AsyncStorage pattern used for OwnedAttire inventory)

**Verification Status Usage:**
- **BEFORE marketplace registration:** Leave as undefined/null OR explicitly set to undefined
- **AFTER marketplace registration submission:** Set to `'pending'`
- **Head Organizer approves:** Set to `'verified'`
- **Head Organizer rejects:** Set to `'rejected'`
- **Head Organizer revokes:** Set to `'revoked'`

---

## SUMMARY

**Current State:**
- ✅ `verification_status` defaults to `'pending'` at account creation (AuthService.ts line 101)
- ✅ VerifyCosplayersScreen shows: avatar initial, display name, email, status badge only
- ✅ MarketplaceScreen is pure placeholder, no gating, no verification checks

**Goal State (after implementation):**
- ✅ `verification_status` starts as `undefined` or explicit null-equivalent
- ✅ Only becomes `'pending'` when user submits MarketplaceRegistrationScreen form
- ✅ VerifyCosplayersScreen shows submitted marketplace fields (name, email, phone, payout label, timestamp)
- ✅ MarketplaceScreen gates based on registration status (call-to-action → pending → verified)

**Next Steps:** Proceed to STEP 2 implementation (add data model fields)

---

**Baseline Complete:** Friday, September 18, 2026, 23:45
