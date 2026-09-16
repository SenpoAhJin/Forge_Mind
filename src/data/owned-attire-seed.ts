/**
 * ForgeMind - OwnedAttire Mock Seed (FE-5)
 * Demo inventory for the owned-item dashboard while local mode is active.
 * Every field is snake_case to mirror the ForgeMind schema v0.2.1.
 */

import { OwnedAttire } from '../types/owned-attire';

export const ownedAttireSeed: OwnedAttire[] = [
  {
    attire_id: 'attr-gojo-white-wig',
    user_id: 'demo-user-1',
    entry_method: 'photo',
    entry_language: 'english',
    original_input_text: '',
    photo_urls: [],
    auto_categorized_type: 'wig',
    auto_categorized_color: 'white',
    auto_categorized_style: 'spiky short anime wig',
    flexibility_tag: 'restyle-willing',
    condition_rating: 4,
    condition_photo_history: [
      { timestamp: '2026-08-10T09:00:00.000Z', photo_url: null, condition_rating: 4 },
    ],
    availability_status: 'free',
    committed_to_project_id: null,
    acquired_date: '2026-07-15',
    acquisition_cost: 850,
    notes: 'Bought for Gojo S2 uniform run. Flat iron styling only.',
    created_at: '2026-07-15T10:00:00.000Z',
    updated_at: '2026-08-10T09:00:00.000Z',
  },
  {
    attire_id: 'attr-black-fabric',
    user_id: 'demo-user-1',
    entry_method: 'text',
    entry_language: 'taglish',
    original_input_text:
      'black stretch fabric, mid-weight, pwedeng pang Makima suit lining',
    photo_urls: [],
    auto_categorized_type: 'fabric',
    auto_categorized_color: 'black',
    auto_categorized_style: 'mid-weight stretch',
    flexibility_tag: 'dye-willing',
    condition_rating: 5,
    condition_photo_history: [
      { timestamp: '2026-08-11T14:00:00.000Z', photo_url: null, condition_rating: 5 },
    ],
    availability_status: 'free',
    committed_to_project_id: null,
    acquired_date: '2026-08-11',
    acquisition_cost: 320,
    notes: 'Leftover roll, about 2 meters.',
    created_at: '2026-08-11T14:30:00.000Z',
    updated_at: '2026-08-11T14:30:00.000Z',
  },
  {
    attire_id: 'attr-boots-brown',
    user_id: 'demo-user-1',
    entry_method: 'voice',
    entry_language: 'english',
    original_input_text: 'brown combat boots size nine, used once',
    photo_urls: [],
    auto_categorized_type: 'footwear',
    auto_categorized_color: 'brown',
    auto_categorized_style: 'combat boots',
    flexibility_tag: 'as-is-only',
    condition_rating: 3,
    condition_photo_history: [
      { timestamp: '2026-08-12T08:00:00.000Z', photo_url: null, condition_rating: 3 },
    ],
    availability_status: 'free',
    committed_to_project_id: null,
    acquired_date: '2026-06-20',
    acquisition_cost: 1290,
    notes: '',
    created_at: '2026-08-12T08:15:00.000Z',
    updated_at: '2026-08-12T08:15:00.000Z',
  },
];