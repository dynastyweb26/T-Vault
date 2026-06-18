import Image from "next/image";
import styles from "./splash-truck-animation.module.css";

function SplashTruckSvg() {
  return (
    <svg
      className={styles.truckSvg}
      viewBox="0 0 300 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="0" y="52" width="300" height="38" fill="transparent" />

      <rect
        x="8"
        y="28"
        width="78"
        height="34"
        rx="6"
        fill="#B8960C"
      />
      <path
        d="M8 34C8 30.6863 10.6863 28 14 28H72C75.3137 28 78 30.6863 78 34V62H8V34Z"
        fill="#B8960C"
      />
      <rect x="14" y="34" width="30" height="18" rx="2" fill="#0a0a0a" />
      <rect x="52" y="44" width="10" height="8" rx="1" fill="#f5d547" />
      <rect x="40" y="18" width="6" height="12" rx="1" fill="#8a7209" />

      <rect
        x="86"
        y="30"
        width="196"
        height="30"
        rx="2"
        fill="#1C1C1C"
        stroke="#B8960C"
        strokeWidth="1.5"
      />

      <g className={styles.wheelSpin}>
        <circle cx="34" cy="68" r="11" fill="#111111" stroke="#444444" strokeWidth="2" />
        <circle cx="34" cy="68" r="4.5" fill="#B8960C" />
      </g>
      <g className={styles.wheelSpin}>
        <circle cx="58" cy="68" r="11" fill="#111111" stroke="#444444" strokeWidth="2" />
        <circle cx="58" cy="68" r="4.5" fill="#B8960C" />
      </g>
      <g className={styles.wheelSpin}>
        <circle cx="196" cy="68" r="11" fill="#111111" stroke="#444444" strokeWidth="2" />
        <circle cx="196" cy="68" r="4.5" fill="#B8960C" />
      </g>
      <g className={styles.wheelSpin}>
        <circle cx="252" cy="68" r="11" fill="#111111" stroke="#444444" strokeWidth="2" />
        <circle cx="252" cy="68" r="4.5" fill="#B8960C" />
      </g>
    </svg>
  );
}

export function SplashTruckAnimation() {
  return (
    <div className={styles.scene} aria-hidden>
      <div className={styles.logoBlock}>
        <Image
          src="/icon.png"
          alt=""
          width={88}
          height={88}
          className={styles.logoIcon}
          priority
        />
        <p className={styles.wordmark}>T-Vault</p>
        <p className={styles.subtitle}>Owner-Operator Network</p>
      </div>

      <div className={styles.road}>
        <div className={styles.roadDashTrack}>
          <div className={styles.roadDash} />
        </div>
        <div className={styles.curb} />
      </div>

      <div className={styles.truckLane}>
        <div className={styles.truckWrap}>
          <div className={styles.exhaust}>
            <span className={styles.puff} />
            <span className={styles.puff} />
            <span className={styles.puff} />
          </div>
          <SplashTruckSvg />
        </div>
      </div>

      <div className={styles.wipeOverlay} />
    </div>
  );
}
