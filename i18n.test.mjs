import test from 'node:test';
import assert from 'node:assert/strict';
import { translate } from './i18n.mjs';

test('Korean uses translated labels and reorders date and amount placeholders', () => {
  assert.equal(translate('ko', 'Recurring bills'), '정기 지출');
  assert.equal(translate('ko', 'Payment recorded for {date}.', { date: '11월 9일' }), '11월 9일 결제를 기록했습니다.');
  assert.equal(translate('ko', '{amount} scheduled income', { amount: '$1,250.00' }), '예정 수입 $1,250.00');
});
test('English and unknown language preferences fall back to the source message', () => {
  assert.equal(translate('en', 'Recurring bills'), 'Recurring bills');
  assert.equal(translate('fr', 'Edit {name}', { name: 'Monthly rent' }), 'Edit Monthly rent');
});
