import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: '#950606',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: 38,
        }}
      >
        TD3
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  )
}
