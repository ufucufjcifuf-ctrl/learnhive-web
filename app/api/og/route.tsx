import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'Learn Hive Online Exam';
    const questions = searchParams.get('q') || '20';
    const time = searchParams.get('t') || '15';

    return new ImageResponse(
      (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0E', border: '16px solid #00F0FF', padding: '40px' }}>
          
          {/* Logo / Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '25px', background: 'linear-gradient(to top right, #00F0FF, #0080FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '45px', fontWeight: '900' }}>
              H
            </div>
            <span style={{ fontSize: '50px', color: '#FFFFFF', fontWeight: '900', letterSpacing: '2px' }}>LEARN HIVE</span>
          </div>

          {/* Exam Title */}
          <h1 style={{ fontSize: '70px', fontWeight: '900', color: '#FFFFFF', textAlign: 'center', lineHeight: '1.2', marginBottom: '50px', padding: '0 40px' }}>
            {title}
          </h1>

          {/* Stats Badges */}
          <div style={{ display: 'flex', gap: '30px' }}>
            <div style={{ display: 'flex', background: '#121218', padding: '20px 40px', borderRadius: '100px', border: '3px solid #333' }}>
              <span style={{ fontSize: '35px', color: '#00F0FF', fontWeight: 'bold' }}>📝 {questions} Questions</span>
            </div>
            <div style={{ display: 'flex', background: '#121218', padding: '20px 40px', borderRadius: '100px', border: '3px solid #333' }}>
              <span style={{ fontSize: '35px', color: '#FFD700', fontWeight: 'bold' }}>⏱️ {time} Minutes</span>
            </div>
          </div>

          {/* Call to Action */}
          <div style={{ position: 'absolute', bottom: '40px', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '28px', color: '#A0A0A0', fontWeight: 'bold' }}>Take this free model test on our App & Website! 🚀</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e: any) {
    return new Response('Failed to generate image', { status: 500 });
  }
}