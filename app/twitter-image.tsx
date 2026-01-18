import { ImageResponse } from 'next/og'

// Image metadata
export const alt = 'TD3 - Construction Draw Management'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// Reuse the same design as OpenGraph image for Twitter
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* TD3 Logo Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#950606',
            padding: '24px 48px',
            borderRadius: 16,
            marginBottom: 40,
            boxShadow: '0 4px 20px rgba(149, 6, 6, 0.3)',
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            TD3
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: '#111827',
            marginBottom: 16,
          }}
        >
          Construction Draw Management
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: '#6B7280',
            maxWidth: 800,
            textAlign: 'center',
          }}
        >
          Streamline construction lending with intelligent budget tracking and draw automation
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            color: '#9CA3AF',
          }}
        >
          Tennant Development
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
