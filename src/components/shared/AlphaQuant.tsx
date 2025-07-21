import { ArrowUpRight } from "@phosphor-icons/react";
import { AuthActionButton } from "./AuthActionButton";
import { Link } from "react-router-dom";

export const AlphaQuant = () => {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-background">
      {/* Background image with corner radius and margins */}
      <div className="absolute inset-4 md:inset-6 lg:inset-8 z-0 rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/alphaquant-bg.png)'
          }}
        >
          {/* Heading and Arrow Container */}
          <div className="absolute top-12 left-12 right-12 z-30">
            <div className="relative">
              <h1 className="text-5xl md:text-8xl font-bold text-white leading-tight max-w-3xl">
                The AI-Brain Behind Every Trade.
              </h1>
              {/* Large Circle with arrow and hover effect - Absolute position on desktop */}
              <div className="w-40 h-40 md:w-50 md:h-50 lg:w-60 lg:h-60 rounded-full bg-white/10 border-2 border-white/30 mt-8 md:mt-0 md:absolute md:right-0 md:top-0 flex items-center justify-center
                       transition-all duration-300 ease-in-out
                       hover:bg-white/20 hover:border-white/50 hover:scale-105
                       group cursor-pointer">
                <Link to="/alphaquant" className="block w-full h-full">
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:border-primary/50
                           group cursor-pointer">
                    <ArrowUpRight 
                      size={300} 
                      weight="thin" 
                      className="text-white transition-transform duration-300 ease-in-out group-hover:scale-110"
                    />
                  </div>
                </Link>
              </div>
            </div>
          </div>
          
          {/* AlphaQuant Logo and Auth Button - Bottom Right */}
          <div className="absolute bottom-8 right-8 z-30 flex flex-col items-end space-y-4">
            <img 
              src="/alphaquant.svg" 
              alt="AlphaQuant Logo" 
              className="h-24 md:h-32 lg:h-40 w-auto"
            />
            <AuthActionButton className="px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-opacity-90 transition-all duration-200" />
          </div>
        </div>
        {/* Overlay for better text readability - behind text */}
        <div className="absolute inset-0 bg-black/20 z-0" />
      </div>
      
      {/* Cinematic background gradients and light rays */}
      <div className="pointer-events-none absolute inset-4 md:inset-6 lg:inset-8 z-10 rounded-2xl overflow-hidden">
        <div className="absolute w-[900px] h-[900px] -top-[350px] -left-[300px] bg-gradient-to-br from-primary/30 via-primary/0 to-transparent blur-[120px] opacity-70 animate-pulse-slow" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[120vw] h-40 bg-gradient-to-b from-white/60 via-white/0 to-transparent blur-2xl opacity-40" />
      </div>
    </div>
  );
};
