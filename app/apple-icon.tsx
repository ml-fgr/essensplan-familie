import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const g = '#4d7c4a';
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, background: 'linear-gradient(145deg, #5c9859, #3a6037)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Weißer Teller */}
        <div style={{ width: 128, height: 128, borderRadius: 64, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Gabel */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 22 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 5, height: 22, borderRadius: 3, background: g, marginRight: 3 }} />
              <div style={{ width: 5, height: 22, borderRadius: 3, background: g, marginRight: 3 }} />
              <div style={{ width: 5, height: 22, borderRadius: 3, background: g }} />
            </div>
            <div style={{ width: 21, height: 5, background: g }} />
            <div style={{ width: 5, height: 28, borderRadius: '0 0 3px 3px', background: g }} />
          </div>
          {/* Messer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 11, height: 26, borderRadius: '5px 5px 1px 1px', background: g }} />
            <div style={{ width: 5, height: 28, borderRadius: '0 0 3px 3px', background: g, marginTop: 2 }} />
          </div>
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
