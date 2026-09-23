'use client'

import React from 'react';
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";

interface SplineSceneBasicProps {
  title?: string;
  description?: string;
  badge?: string;
  scene?: string;
  className?: string;
  ctaText?: string;
  ctaLink?: string;
}

export function SplineSceneBasic({
  title = "Interactive 3D",
  description = "Bring your UI to life with beautiful 3D scenes. Create immersive experiences that capture attention and enhance your design.",
  badge,
  scene = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode",
  className = "",
  ctaText,
  ctaLink,
}: SplineSceneBasicProps = {}) {
  return (
    <Card className={`w-full min-h-[460px] md:h-[500px] bg-black/[0.96] border-neutral-800 text-white relative overflow-hidden ${className}`}>
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex flex-col md:flex-row h-full">
        {/* Left content */}
        <div className="flex-1 p-6 md:p-10 relative z-10 flex flex-col justify-center">
          {badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono uppercase tracking-wider text-orange-400 mb-4 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
              {badge}
            </div>
          )}
          <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 leading-tight">
            {title}
          </h1>
          <p className="mt-4 text-neutral-300 max-w-lg text-sm md:text-base leading-relaxed">
            {description}
          </p>
          {ctaText && (
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={ctaLink || '#'}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition-colors shadow-lg shadow-orange-600/20"
              >
                {ctaText}
              </a>
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 relative min-h-[280px] md:min-h-0">
          <SplineScene 
            scene={scene}
            className="w-full h-full"
          />
        </div>
      </div>
    </Card>
  );
}
