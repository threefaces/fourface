import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '밥메이트 — 오늘, 같이 먹을래요?', description: '서울대에서 만나는 가장 편안한 밥 약속. 혼자 먹기 싫은 날, 밥메이트.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="ko"><body>{children}</body></html>; }
