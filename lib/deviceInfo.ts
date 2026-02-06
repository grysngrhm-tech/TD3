import type { DeviceType } from '@/types/custom'

export interface ParsedUserAgent {
  deviceType: DeviceType
  browser: string
  os: string
}

/**
 * Parse user agent string into device info
 * Simple parsing - covers most common browsers and platforms
 */
export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua) {
    return { deviceType: 'unknown', browser: 'Unknown', os: 'Unknown' }
  }

  // Detect device type
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua)
  const isMobile = /Mobile|iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)

  let deviceType: DeviceType = 'desktop'
  if (isTablet) deviceType = 'tablet'
  else if (isMobile) deviceType = 'mobile'

  // Detect browser
  let browser = 'Unknown'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera'
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer'

  // Detect OS
  let os = 'Unknown'
  if (ua.includes('Windows NT 10')) os = 'Windows 10'
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1'
  else if (ua.includes('Windows NT 6.2')) os = 'Windows 8'
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) os = 'iOS'
  else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('CrOS')) os = 'Chrome OS'

  return { deviceType, browser, os }
}

/**
 * Get device icon name based on device type
 */
export function getDeviceIcon(deviceType: DeviceType | null): string {
  switch (deviceType) {
    case 'mobile':
      return 'smartphone'
    case 'tablet':
      return 'tablet'
    case 'desktop':
      return 'monitor'
    default:
      return 'monitor'
  }
}

/**
 * Format device info for display
 */
export function formatDeviceInfo(parsed: ParsedUserAgent): string {
  return `${parsed.browser} on ${parsed.os}`
}
