export default function DiscoverLipa() {
  return (
    <section id="location" className="py-28 bg-[#FDFAF5]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          {/* Text */}
          <div className="reveal">
            <span className="flex items-center gap-2 text-[#3B5323] text-[11px] font-semibold tracking-[.18em] uppercase mb-4">
              <span className="block w-7 h-0.5 bg-[#C4A862] rounded" />
              The Destination
            </span>
            <h2
              className="font-serif font-semibold text-[#2C2C2C] leading-tight mb-1"
              style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
            >
              Discover
            </h2>
            <h2
              className="font-serif font-semibold text-[#2C2C2C] leading-tight italic mb-4"
              style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
            >
              Lipa City
            </h2>
            <div className="w-12 h-0.5 bg-[#C4A862] mb-6" />

            <p className="text-[#4A4A4A] text-[16.5px] leading-[1.75] mb-8">
              Nestled in the heart of Batangas, Lipa City is one of Luzon&apos;s most vibrant and
              livable cities — blessed with a cool climate, rich culture, and growing modern
              amenities that make it a perfect short-term destination.
            </p>

            <div className="flex flex-col gap-4 mb-10">
              {[
                {
                  icon: "fa-cloud-sun",
                  title: "Cool Highland Climate",
                  desc: "Elevated at over 700m above sea level, Lipa enjoys refreshingly cooler temperatures year-round.",
                },
                {
                  icon: "fa-mountain",
                  title: "Near Mt. Maculot & Taal",
                  desc: "Gateway to hiking trails, the Taal Volcano, and stunning panoramic views of Batangas landscape.",
                },
                {
                  icon: "fa-utensils",
                  title: "Thriving Food Scene",
                  desc: "From local Batangas beef tapa to third-wave coffee shops and fine dining — Lipa has it all.",
                },
                {
                  icon: "fa-city",
                  title: "Growing Modern City",
                  desc: "Business hubs, malls, hospitals, and universities make Lipa ideal for extended stays.",
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-[#EBF0E5] flex items-center justify-center text-[#3B5323] text-[15px]">
                    <i className={`fa-solid ${icon}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[14.5px] text-[#2C2C2C] mb-0.5">{title}</h4>
                    <p className="text-[#7A7A7A] text-[13.5px] leading-[1.6]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#cta"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-semibold text-[#2C2C2C] border-2 border-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-white transition-colors duration-300 active:scale-[.98]"
            >
              <i className="fa-solid fa-map-location-dot" /> Plan Your Visit
            </a>
          </div>

          {/* Satellite Map Card */}
          <div className="reveal reveal-d2">
            <div
              className="relative rounded-[20px] overflow-hidden"
              style={{ height: 520, boxShadow: "0 20px 60px rgba(44,44,44,.22)" }}
            >
              <svg
                viewBox="0 0 500 560"
                preserveAspectRatio="xMidYMid slice"
                className="absolute inset-0 w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="gTerrain" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#2d5a1b"/>
                    <stop offset="35%"  stopColor="#38691f"/>
                    <stop offset="65%"  stopColor="#2a5018"/>
                    <stop offset="100%" stopColor="#1e3d12"/>
                  </linearGradient>
                  <linearGradient id="gWater" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#1B4F9E"/>
                    <stop offset="100%" stopColor="#1a5fb4"/>
                  </linearGradient>
                  <radialGradient id="gTaalLake" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#2060b8"/>
                    <stop offset="100%" stopColor="#1B4F9E"/>
                  </radialGradient>
                  <filter id="fGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="fPin">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.45)"/>
                  </filter>
                  <filter id="fLabel">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.5)"/>
                  </filter>
                </defs>

                {/* Base terrain */}
                <rect width="500" height="560" fill="url(#gTerrain)"/>
                <ellipse cx="70"  cy="430" rx="140" ry="110" fill="#243e12" opacity="0.55"/>
                <ellipse cx="410" cy="250" rx="120" ry="140" fill="#3a6a1e" opacity="0.28"/>
                <ellipse cx="248" cy="295" rx="150" ry="65"  fill="#192e0e" opacity="0.48"/>
                <ellipse cx="340" cy="420" rx="80"  ry="55"  fill="#3a6a1e" opacity="0.22"/>
                <ellipse cx="155" cy="180" rx="90"  ry="70"  fill="#243e12" opacity="0.3"/>
                <rect x="228" y="18"  width="50" height="50" rx="4" fill="#3d5c28" opacity="0.4"/>
                <rect x="340" y="170" width="40" height="35" rx="3" fill="#3d5c28" opacity="0.3"/>
                <rect x="400" y="370" width="55" height="60" rx="4" fill="#3d5c28" opacity="0.35"/>

                {/* Water bodies */}
                <path d="M0,0 L0,175 Q25,162 52,148 Q78,135 105,118 Q128,102 148,80 Q162,58 168,28 Q160,5 140,0 Z" fill="url(#gWater)" opacity="0.88"/>
                <path d="M345,25 Q372,14 405,20 Q445,28 472,50 Q500,68 500,98 L500,220 Q492,238 464,246 Q434,255 403,246 Q372,238 352,222 Q328,202 332,172 Q322,142 338,108 Q342,72 345,25 Z" fill="url(#gWater)" opacity="0.88"/>
                <ellipse cx="225" cy="398" rx="96"  ry="72" fill="url(#gTaalLake)" opacity="0.92"/>
                <ellipse cx="222" cy="396" rx="68"  ry="50" fill="#1850a0" opacity="0.5"/>
                <ellipse cx="218" cy="392" rx="28"  ry="21" fill="#503a1a" opacity="0.95"/>
                <ellipse cx="216" cy="390" rx="18"  ry="13" fill="#3e2c12" opacity="0.9"/>
                <ellipse cx="215" cy="389" rx="9"   ry="7"  fill="#2B6CCF" opacity="0.8"/>
                <path d="M0,310 Q8,338 4,368 Q0,398 0,440 L0,508 Q22,518 44,508 Q36,474 40,442 Q50,410 54,378 Q46,348 26,322 Z" fill="url(#gWater)" opacity="0.78"/>
                <path d="M55,535 Q95,518 148,514 Q198,510 238,520 Q278,530 308,540 L308,560 L0,560 L0,542 Z" fill="url(#gWater)" opacity="0.72"/>

                {/* Roads */}
                <line x1="245" y1="38" x2="248" y2="115" stroke="rgba(255,255,255,.12)" strokeWidth="1.5"/>
                <line x1="248" y1="115" x2="360" y2="195" stroke="rgba(255,255,255,.10)" strokeWidth="1.5"/>

                {/* Route Manila → Lipa */}
                <path d="M245,38 C250,62 265,88 275,118 C286,150 318,174 358,194 C372,238 384,298 412,368 C418,386 424,404 435,422"
                      stroke="rgba(20,40,120,0.45)" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M245,38 C250,62 265,88 275,118 C286,150 318,174 358,194 C372,238 384,298 412,368 C418,386 424,404 435,422"
                      stroke="#4169E1" strokeWidth="5.5" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#fGlow)"/>
                <circle cx="275" cy="118" r="4.5" fill="white" opacity="0.85"/>
                <circle cx="358" cy="194" r="4.5" fill="white" opacity="0.85"/>
                <circle cx="412" cy="368" r="4.5" fill="white" opacity="0.85"/>

                {/* Origin pin: Manila */}
                <circle cx="245" cy="38" r="11"  fill="none" stroke="#4169E1" strokeWidth="3.5" opacity="0.95"/>
                <circle cx="245" cy="38" r="5.5" fill="#4169E1" opacity="0.95"/>

                {/* Destination pin: Lipa City */}
                <g filter="url(#fPin)">
                  <path d="M435,422 C435,422 422,404 422,394 A13,13 0 1,1 448,394 C448,404 435,422 435,422Z" fill="#E53E3E"/>
                  <circle cx="435" cy="394" r="5.5" fill="white"/>
                </g>

                {/* Labels */}
                <g filter="url(#fLabel)">
                  <rect x="254" y="27" width="52" height="17" rx="4" fill="rgba(15,20,40,0.78)"/>
                  <text x="280" y="39.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9.5" fontWeight="700" fill="white" letterSpacing=".3">Manila</text>
                </g>
                <g filter="url(#fLabel)">
                  <rect x="182" y="310" width="74" height="17" rx="4" fill="rgba(15,20,40,0.75)"/>
                  <text x="219" y="322.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="600" fill="white" letterSpacing=".2">Tagaytay City</text>
                </g>
                <g filter="url(#fLabel)">
                  <rect x="152" y="384" width="72" height="17" rx="4" fill="rgba(15,20,40,0.75)"/>
                  <text x="188" y="396.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="8.5" fontWeight="600" fill="#ffd480" letterSpacing=".2">🌋 Taal Volcano</text>
                </g>
                <g filter="url(#fLabel)">
                  <circle cx="60" cy="362" r="4.5" fill="rgba(255,255,255,0.7)" stroke="white" strokeWidth="1.2"/>
                  <rect x="68" y="355" width="80" height="17" rx="4" fill="rgba(15,20,40,0.75)"/>
                  <text x="108" y="367.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="8.5" fontWeight="600" fill="white" letterSpacing=".2">Nasugbu, Batangas</text>
                </g>
                <g filter="url(#fLabel)">
                  <circle cx="68" cy="490" r="4.5" fill="rgba(255,255,255,0.7)" stroke="white" strokeWidth="1.2"/>
                  <rect x="76" y="483" width="84" height="17" rx="4" fill="rgba(15,20,40,0.75)"/>
                  <text x="118" y="495.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="8.5" fontWeight="600" fill="white" letterSpacing=".2">Calatagan, Batangas</text>
                </g>
                <g filter="url(#fLabel)">
                  <rect x="340" y="416" width="72" height="17" rx="4" fill="rgba(229,62,62,0.88)"/>
                  <text x="376" y="428.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="9" fontWeight="700" fill="white" letterSpacing=".3">Lipa City</text>
                </g>

                {/* Compass rose */}
                <g transform="translate(466,30)" opacity="0.75">
                  <circle cx="0" cy="0" r="14" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                  <text x="0" y="-17" textAnchor="middle" fontFamily="Arial" fontSize="8" fontWeight="700" fill="white">N</text>
                  <polygon points="0,-10 2.5,0 0,-3 -2.5,0" fill="white"/>
                  <polygon points="0,10 2.5,0 0,3 -2.5,0" fill="rgba(255,255,255,0.4)"/>
                </g>

                {/* Scale bar */}
                <g transform="translate(18,534)">
                  <rect x="0" y="0" width="80" height="14" rx="3" fill="rgba(0,0,0,0.5)"/>
                  <line x1="6" y1="9" x2="74" y2="9" stroke="white" strokeWidth="2"/>
                  <line x1="6" y1="6" x2="6"  y2="12" stroke="white" strokeWidth="1.5"/>
                  <line x1="74" y1="6" x2="74" y2="12" stroke="white" strokeWidth="1.5"/>
                  <text x="40" y="9" textAnchor="middle" fontFamily="Arial" fontSize="7.5" fill="white" dominantBaseline="middle">50 km</text>
                </g>
              </svg>

              {/* Distance badge */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-[#2C2C2C] rounded-[10px] px-3 py-2 shadow-md text-center">
                <div className="text-[13px] font-bold text-[#2C2C2C] leading-tight">🚗 1 hr 35 min</div>
                <div className="text-[11px] text-[#4A4A4A] mt-0.5">84.3 km from Manila</div>
              </div>

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-6 py-5">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-serif font-semibold text-white text-[1.2rem] leading-tight">Lipa City</div>
                    <div className="text-white/65 text-[12px] mt-0.5">Batangas, Philippines</div>
                  </div>
                  <div className="text-right text-[11px] text-white/70 leading-[1.7]">
                    Via SLEX + STAR Tollway<br/>
                    <span className="text-[#C4A862] font-semibold">~84 km · 1h 35m</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
