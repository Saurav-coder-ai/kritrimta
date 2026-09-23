'use client'

import React from 'react';
import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";

interface SplineHeroProps {
  className?: string;
  scene?: string;
}

export function SplineHero({
  className = "",
  scene = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode",
}: SplineHeroProps = {}) {
  return (
    <Card className={`w-full min-h-[580px] lg:h-[620px] bg-black/[0.96] border border-neutral-800 text-white relative overflow-hidden rounded-2xl shadow-2xl ${className}`}>
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex flex-col lg:flex-row h-full">
        {/* Left Editorial Hero Content */}
        <div className="w-full lg:w-[58%] p-6 sm:p-10 lg:p-12 relative z-10 flex flex-col justify-center">
          {/* Masthead Tag / Meta */}
          <div className="flex items-center gap-2 flex-wrap font-mono text-[0.72rem] tracking-wider text-neutral-400 mb-5">
            <span className="text-[#e0532b] font-semibold">KRITRIMTA JOURNAL // EST. 2026</span>
            <span className="opacity-40">•</span>
            <span>EDITED BY SAURAV KARKI</span>
            <span className="opacity-40">•</span>
            <span className="text-neutral-300">AUTONOMOUS COMPUTING &amp; SILICON</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.85rem] xl:text-[3.25rem] font-bold text-white tracking-tight leading-[1.14]">
            Analysis, Benchmarks &amp;{' '}
            <span className="bg-gradient-to-r from-[#e0532b] via-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">
              First Principles
            </span>{' '}
            in Artificial Intelligence.
          </h1>

          {/* Mission Description */}
          <p className="mt-5 text-neutral-300 font-sans text-base sm:text-lg leading-relaxed max-w-xl">
            An independent publication examining the engineering realities, model economics, and silicon architectures behind modern computing systems. Uncompromised by corporate PR.
          </p>

          {/* Call to Actions */}
          <div className="mt-8 flex items-center gap-3 sm:gap-4 flex-wrap">
            <a
              href="#latest-coverage"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#e0532b] hover:bg-[#c94520] text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-[#e0532b]/25 hover:shadow-[#e0532b]/40 hover:-translate-y-0.5"
            >
              <span>Read Latest Dispatches</span>
              <span aria-hidden="true">&darr;</span>
            </a>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-neutral-700 hover:border-neutral-500 bg-neutral-900/70 hover:bg-neutral-800 text-neutral-200 hover:text-white text-sm font-medium transition-all duration-200"
            >
              <span>System Telemetry</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>

        {/* Right 3D Spline Interactive Scene */}
        <div className="w-full lg:w-[42%] relative min-h-[380px] lg:min-h-0 flex-1">
          <SplineScene 
            scene={scene}
            className="w-full h-full"
          />
        </div>
      </div>
    </Card>
  );
}

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
