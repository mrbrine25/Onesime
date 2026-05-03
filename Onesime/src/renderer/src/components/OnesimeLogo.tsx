export default function OnesimeLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="10" fill="#111d35" />
      <rect x="4" y="4" width="14" height="14" rx="3.5" fill="#8b5cf6" />
      <rect x="22" y="4" width="14" height="14" rx="3.5" fill="#f97316" />
      <rect x="4" y="22" width="14" height="14" rx="3.5" fill="#f97316" />
      <rect x="22" y="22" width="14" height="14" rx="3.5" fill="#8b5cf6" />
      <line x1="14" y1="14" x2="26" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26" y1="14" x2="14" y2="26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
