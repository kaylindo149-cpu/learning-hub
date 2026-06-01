export function KaylinLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-16 w-16"
      fill="none"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter id="chalky-logo-texture">
        <feTurbulence
          baseFrequency="0.9"
          numOctaves="2"
          result="texture"
          seed="7"
          type="fractalNoise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="texture"
          scale="0.9"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      <g filter="url(#chalky-logo-texture)">
        <path
          d="M21 13.5C20.4 23.2 20.1 34.5 20.7 50"
          stroke="#48a85d"
          strokeLinecap="round"
          strokeWidth="8.5"
        />
        <path
          d="M42.5 15.5C36.7 23.2 30.1 30 22.9 35.7"
          stroke="#48a85d"
          strokeLinecap="round"
          strokeWidth="8.5"
        />
        <path
          d="M28.5 34.2C34.5 38.1 39.6 43.4 44.3 50"
          stroke="#48a85d"
          strokeLinecap="round"
          strokeWidth="8.5"
        />
      </g>

      <path
        d="M30.6 39.6C34.9 37.4 40.1 37.7 45 40.3L43.5 48.7C38.7 46.3 33.7 46.1 29.2 48.5L30.6 39.6Z"
        fill="#FFF585"
        stroke="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M29.2 39.6C24.8 37.4 19.6 37.7 14.7 40.3L16.2 48.7C21 46.3 26 46.1 30.5 48.5L29.2 39.6Z"
        fill="#FFF585"
        stroke="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M29.8 40.2L29.8 49.1"
        stroke="none"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle cx="26.2" cy="25.5" fill="#2a1f29" r="1.9" />
      <circle cx="34.8" cy="25.5" fill="#2a1f29" r="1.9" />
      <path
        d="M27.8 31.4C29.8 33.1 32.4 33.1 34.4 31.4"
        stroke="#2a1f29"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M15.5 17.4C18.7 11.6 25.3 8.8 31.4 10.2"
        stroke="#48a85d"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}
