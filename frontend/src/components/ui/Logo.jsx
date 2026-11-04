export function LogoMark({ size = 28, draw = false, thinking = false, plain = false }) {
  const className = "logo-mark" + (draw ? " draw" : "") + (thinking ? " thinking" : "")
  const ink = plain ? "var(--text)" : "var(--bg)"
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      {!plain && <rect x="16" y="16" width="480" height="480" rx="116" fill="var(--text)" />}
      <g fill="none" stroke={ink} strokeWidth="26" strokeLinecap="round">
        <path className="b b1" d="M150 256 C 230 256, 250 150, 352 150" opacity="0.55" pathLength="1" />
        <path className="b b2" d="M150 256 L 352 256" pathLength="1" />
        <path className="b b3" d="M150 256 C 230 256, 250 362, 352 362" opacity="0.55" pathLength="1" />
      </g>
      <circle cx="150" cy="256" r="38" fill={ink} />
      <circle className="n n1" cx="362" cy="150" r="30" fill={ink} opacity="0.75" />
      <circle className="n n3" cx="362" cy="362" r="30" fill={ink} opacity="0.75" />
      <g className="n n2">
        <circle cx="362" cy="256" r="44" fill="#4ade80" stroke={plain ? "none" : ink} strokeWidth="14" />
        <path d="M342 257 l14 14 l26 -28" fill="none" stroke="#0b0e1f" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function Wordmark({ size = 26 }) {
  return (
    <span className="wordmark">
      <LogoMark size={size} />
      <span className="wordmark-text">Forkwise</span>
    </span>
  )
}
