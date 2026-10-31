import { test } from 'node:test';
import assert from 'node:assert/strict';
import { targetLook } from '../../../src/utils/targetLook.ts';
import { newReview, newComponent } from '../../../src/utils/referenceReviews.ts';
test('unconfirmed reviews never supply display pieces; confirmed descriptors leave the saved review intact',()=>{
 const review=newReview('brief','image',null);review.components=['wig','top','bottom','gloves','shoes','accessory'].map(type=>newComponent(type));
 assert.deepEqual(targetLook(review),[]);review.confirmed=true;
 const snapshot=JSON.stringify(review), pieces=targetLook(review);
 assert.equal(pieces.length,5);assert.equal(JSON.stringify(review),snapshot);
 assert.ok(pieces.every(piece=>!('itemId' in piece)&&!('on' in piece)));
});
test('supported sleeve and skirt styles map to existing builders; unsupported wig shapes are disclosed',()=>{
 const review=newReview('brief','image',null);review.confirmed=true;
 review.components=['top','bottom','wig'].map(type=>newComponent(type));
 review.components[0].value.style='short-sleeve';review.components[1].value.style='skirt';review.components[2].value.style='curly';
 const pieces=targetLook(review);
 assert.equal(pieces.find(p=>p.id==='top').style.sleeve,'short');assert.equal(pieces.find(p=>p.id==='bottom').style.shape,'skirt');
 assert.match(pieces.find(p=>p.id==='wig').note,/default 3D shape/);
});
