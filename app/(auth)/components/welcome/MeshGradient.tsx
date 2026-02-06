'use client'

/**
 * MeshGradient — Full-page ambient background for the welcome page.
 *
 * Renders 2-3 radial gradient blobs of maroon at varying opacities
 * with a subtle noise texture overlay. Pure CSS, no JS animation.
 */
export function MeshGradient() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden"
      style={{ background: 'var(--welcome-bg, #0a0a0a)' }}
      aria-hidden="true"
    >
      {/* Gradient blobs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          top: '-15%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(149, 6, 6, 0.25) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          bottom: '10%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(149, 6, 6, 0.15) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          top: '40%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(149, 6, 6, 0.1) 0%, transparent 65%)',
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
        }}
      />
    </div>
  )
}
