import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  const g = '#4d7c4a';
  return new ImageResponse(
    (
      <div style={{ width: 32, height: 32, background: g, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Gabel (vereinfacht) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 4 }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 2, height: 8, borderRadius: 1, background: g, marginRight: 2 }} />
              <div style={{ width: 2, height: 8, borderRadius: 1, background: g }} />
            </div>
            <div style={{ width: 8, height: 2, background: g }} />
            <div style={{ width: 2, height: 6, borderRadius: 1, background: g }} />
          </div>
          {/* Messer (vereinfacht) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 4, height: 10, borderRadius: '2px 2px 1px 1px', background: g }} />
            <div style={{ width: 2, height: 6, borderRadius: 1, background: g, marginTop: 1 }} />
          </div>
        </div>
      </div>
    ),
    { width: 32, height: 32 }
  );
}
