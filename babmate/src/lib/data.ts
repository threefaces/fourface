export type Profile = { id: string; name: string; major: string; year: string; interests: string[]; verified: boolean };
export type Meal = { id: string; title: string; location: string; meetingPoint: string; startsAt: string; capacity: number; price: string; tag: string; image: string; description: string; hostId: string; participants: Profile[]; cancelled: boolean; confirmed: string[]; checkedIn: string[] };
export type Message = { id: string; mealId: string; userId: string; name: string; body: string; createdAt: string };
export const demoProfile: Profile = { id: 'demo-you', name: '지우', major: '경영학과', year: '24학번', interests: ['맛집 탐방', '음악', '산책'], verified: false };
const people: Profile[] = [
 { id: 'min', name: '민서', major: '시각디자인', year: '23학번', interests: ['사진'], verified: true },
 { id: 'jun', name: '준호', major: '컴퓨터공학부', year: '24학번', interests: ['영화'], verified: true },
 { id: 'seo', name: '서연', major: '경제학부', year: '22학번', interests: ['산책'], verified: true },
 { id: 'hyun', name: '현우', major: '사회학과', year: '24학번', interests: ['음악'], verified: true },
];
export const locations = ['전체 장소', '학생회관 · 63동', '두레미담', '감골식당', '샤로수길'];
export const foodImages = [
 '/images/lunch.jpg',
 '/images/salad.jpg',
 '/images/noodles.jpg',
 '/images/dinner.jpg',
];
export function seedMeals(): Meal[] {
 const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false }).format(new Date()));
 const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + (hour >= 12 ? 86400000 : 0)));
 return [
 { id: 'lunch-63', title: '천 원의 행복, 같이 먹어요 🍚', location: locations[1], meetingPoint: '63동 식당 입구, 메뉴판 앞', startsAt: `${day}T12:00:00+09:00`, capacity: 4, price: '₩1,000', tag: '가볍게 한 끼', image: foodImages[0], description: '혼자 먹기엔 조금 심심한 점심! 수업 끝나고 편하게 같이 먹어요. 말이 많아도, 조용히 먹어도 괜찮아요.', hostId: 'min', participants: people.slice(0,2), cancelled: false, confirmed: [], checkedIn: [] },
 { id: 'dure', title: '든든한 점심과 소소한 수다', location: locations[2], meetingPoint: '두레미담 1층 입구', startsAt: `${day}T12:30:00+09:00`, capacity: 4, price: '₩6,000–8,000', tag: '새로운 밥친구', image: foodImages[1], description: '오후 수업 전에 든든하게 먹고 가요. 전공도 학번도 상관없이 환영해요!', hostId: 'seo', participants: [people[2]], cancelled: false, confirmed: [], checkedIn: [] },
 { id: 'noodle', title: '면 러버들, 여기 모여요 🍜', location: locations[3], meetingPoint: '감골식당 정문', startsAt: `${day}T13:00:00+09:00`, capacity: 3, price: '₩5,000–7,000', tag: '취향이 통하는', image: foodImages[2], description: '오늘은 따뜻한 면 한 그릇 어때요? 좋아하는 영화 얘기도 나눠요.', hostId: 'hyun', participants: [people[3], people[1]], cancelled: false, confirmed: [], checkedIn: [] },
 { id: 'dinner', title: '오늘 하루 어땠어요?', location: locations[4], meetingPoint: '서울대입구역 2번 출구', startsAt: `${day}T18:00:00+09:00`, capacity: 4, price: '₩10,000–15,000', tag: '느긋한 저녁', image: foodImages[3], description: '하루를 마무리하며 함께 저녁 먹어요. 메뉴는 채팅에서 같이 골라봐요.', hostId: 'jun', participants: [people[1]], cancelled: false, confirmed: [], checkedIn: [] },
 ];
}
export function isSnuEmail(email: string) { return /^[^\s@]+@snu\.ac\.kr$/i.test(email.trim()); }
export function mealTime(value: string) { return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)); }
export function canConfirm(startsAt: string, now = Date.now()) { const diff = new Date(startsAt).getTime() - now; return diff <= 30*60*1000 && diff >= -15*60*1000; }
export function canCheckIn(startsAt: string, now = Date.now()) { const diff = new Date(startsAt).getTime() - now; return diff <= 15*60*1000 && diff >= -60*60*1000; }
