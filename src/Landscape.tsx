import { useId } from 'react';

export function Landscape({
  terrain = 'mountain',
  className = '',
  night = false,
}: {
  terrain?: 'forest' | 'mountain' | 'temple' | 'lake';
  className?: string;
  night?: boolean;
}) {
  const id = useId().replaceAll(':', '');
  const palette = night
    ? ['#202f41', '#414d63', '#788498', '#a1a9b0', '#d2bc8f']
    : ['#e6e9df', '#b5c3b5', '#879e92', '#4d7165', '#c4a16a'];
  return (
    <svg
      viewBox="0 0 800 380"
      preserveAspectRatio="xMidYMid slice"
      className={`landscape ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}sky`} x2="0" y2="1">
          <stop stopColor={palette[0]} />
          <stop offset="1" stopColor={night ? '#75848d' : '#f2eee4'} />
        </linearGradient>
        <linearGradient id={`${id}mist`} x2="0" y2="1">
          <stop stopColor="#eeeee3" stopOpacity="0" />
          <stop offset="1" stopColor={night ? '#9fa8b3' : '#f0eee4'} stopOpacity=".8" />
        </linearGradient>
        <linearGradient id={`${id}mountain`} x2=".2" y2="1">
          <stop stopColor={palette[2]} />
          <stop offset="1" stopColor={palette[3]} />
        </linearGradient>
        <filter id={`${id}grain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".07" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
        </filter>
      </defs>
      <g filter={`url(#${id}grain)`}>
        <path fill={`url(#${id}sky)`} d="M0 0H800V380H0Z" />
        <circle cx="624" cy="89" r={night ? 27 : 38} fill={palette[4]} opacity=".8" />
        <path
          d="M0 245 94 188 129 195 189 117 208 148 249 91 310 203 351 170 423 220 472 145 508 158 578 52 603 93 630 85 709 201 745 157 800 201V380H0Z"
          fill={palette[1]}
          opacity=".62"
        />
        <path
          d="M129 286 260 131 286 169 336 81 377 134 394 123 494 284 551 211 584 240 646 179 706 259 752 235 800 289V380H129Z"
          fill={palette[2]}
          opacity=".5"
        />
        <path d="m302 152 34-71 41 53-18-9-11 12-16-33-7 35Z" fill="#ebeee5" opacity=".5" />
        <path
          d="M359 380 445 247 465 261 503 168 520 196 548 132 568 160 582 149 650 265 677 244 717 302 744 291 800 322V380Z"
          fill={`url(#${id}mountain)`}
          opacity=".86"
        />
        <path d="m508 209 40-77 20 28-15-7-13 36-7-21Z" fill="#e5e9dd" opacity=".5" />
        <path d="M0 267Q136 239 258 286T482 280 800 275V380H0Z" fill={`url(#${id}mist)`} />
        {terrain === 'lake' && (
          <>
            <path d="M0 308Q250 282 480 310T800 313V380H0Z" fill={palette[2]} opacity=".4" />
            <path
              d="M105 327h122m50 18h151m108-22h90m-279 41h254"
              fill="none"
              stroke="#ecebdf"
              strokeWidth="2"
              opacity=".55"
            />
          </>
        )}
        <path
          d="M0 380V338Q73 305 178 335T366 357 489 335 612 360 800 341V380Z"
          fill={palette[3]}
          opacity=".48"
        />
        <path
          d="M494 380Q476 341 489 314L482 288 490 290 498 322 509 317 514 292 520 290 515 328 527 335 523 344 509 338 504 380Z"
          fill={night ? '#243a3e' : '#345648'}
        />
        <g fill={night ? '#304548' : '#3a5d4e'}>
          <ellipse cx="483" cy="287" rx="35" ry="10" />
          <ellipse cx="516" cy="285" rx="29" ry="9" />
          <ellipse cx="511" cy="312" rx="29" ry="8" />
          <ellipse cx="490" cy="300" rx="25" ry="7" />
        </g>
        {(terrain === 'temple' || terrain === 'mountain') && (
          <g transform="translate(646 252)" fill={night ? '#2b4042' : '#4b6254'}>
            <path d="M-44 24Q-17 17 0-4 17 17 44 24L30 27H-30Z" />
            <path d="M-27 26V52H-23V29H23V52H27V26Z" />
            <path d="M-36 54Q-15 47 0 38 15 47 36 54Z" />
            <path d="M-19 54V72H-14V56H14V72H19V54Z" />
            <path d="M-29 75H29V78H-29Z" />
          </g>
        )}
        {terrain === 'forest' &&
          Array.from({ length: 11 }, (_, i) => (
            <g
              key={i}
              transform={`translate(${34 + i * 64} ${280 + (i % 3) * 22})`}
              opacity={0.4 + (i % 3) * 0.15}
              stroke={palette[3]}
              fill={palette[3]}
            >
              <path d="M0 100V-35" strokeWidth="3" />
              <path d="m0-28-17-12m17 28 21-12M0 5l-24-7M0 25l19-10" strokeWidth="1.5" />
              <path
                d="m-16-41-13-2 11 6m37-29 12-1-12 4M-23-2l-13 2 13 2m41 14 10-2-10 5"
                strokeWidth="3"
              />
            </g>
          ))}
        <g stroke={night ? '#bcc4bb' : '#627b68'} strokeWidth="1.5" fill="none" opacity=".65">
          <path d="m686 104 6-3 7 3m18-18 5-2 5 2m-189 3 5-2 5 2" />
        </g>
        <path
          d="M0 358Q74 342 124 362T310 372"
          fill="none"
          stroke={palette[3]}
          strokeWidth="2"
          opacity=".3"
        />
      </g>
    </svg>
  );
}
