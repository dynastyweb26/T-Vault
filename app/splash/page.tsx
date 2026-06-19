import { SplashTruckAnimation } from "@/components/splash/splash-truck-animation";
import { SplashAnimationMarker } from "@/components/splash/splash-animation-marker";
import { SplashBootLazy } from "@/components/splash/splash-boot-lazy";

export default function SplashPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#0a0a0a]">
      <SplashTruckAnimation />
      <SplashAnimationMarker />
      <SplashBootLazy />
    </div>
  );
}
