import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation for Apple touch icon
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: '#950606',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 700,
          fontFamily: 'Inter, system-ui, sans-serif',
          borderRadius: 36,
        }}
      >
        TD3
      </div>
    ),
    {
      ...size,
    }
  )
}
