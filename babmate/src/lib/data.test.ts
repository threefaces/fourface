import { describe, expect, it } from 'vitest';
import { canCheckIn, canConfirm, isSnuEmail, mealTime, seedMeals } from './data';
describe('student email validation', () => {
 it('accepts only the exact SNU email domain', () => {
  expect(isSnuEmail('student@snu.ac.kr')).toBe(true);
  expect(isSnuEmail(' STUDENT@SNU.AC.KR ')).toBe(true);
  for(const email of ['a@snu.ac.kr.evil.com','a@evil-snu.ac.kr','a@snu.ac.kr@evil.com','a b@snu.ac.kr','a@smu.ac.kr']) expect(isSnuEmail(email)).toBe(false);
 });
});
describe('attendance windows', () => {
 const start = '2026-11-06T12:00:00+09:00'; const at = (time: string) => new Date(`2026-11-06T${time}+09:00`).getTime();
 it('allows confirmation only from 30 minutes before to 15 minutes after', () => { expect(canConfirm(start,at('11:29:59'))).toBe(false); expect(canConfirm(start,at('11:30:00'))).toBe(true); expect(canConfirm(start,at('12:15:00'))).toBe(true); expect(canConfirm(start,at('12:15:01'))).toBe(false); });
 it('allows arrival check-in only near the meal', () => { expect(canCheckIn(start,at('11:44:59'))).toBe(false); expect(canCheckIn(start,at('11:45:00'))).toBe(true); expect(canCheckIn(start,at('13:00:00'))).toBe(true); expect(canCheckIn(start,at('13:00:01'))).toBe(false); });
 it('formats time in Seoul regardless of browser timezone', () => expect(mealTime('2026-11-06T03:00:00Z')).toBe('12:00'));
});
describe('demo data', () => { it('has valid timestamps, unique memberships, and available seats', () => { for(const meal of seedMeals()) { expect(Number.isFinite(new Date(meal.startsAt).getTime())).toBe(true); expect(new Set(meal.participants.map(p => p.id)).size).toBe(meal.participants.length); expect(meal.participants.length).toBeLessThanOrEqual(meal.capacity); expect(meal.participants.some(p => p.id === meal.hostId)).toBe(true); } }); });
