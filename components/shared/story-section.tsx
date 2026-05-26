'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

gsap.registerPlugin(ScrollTrigger)

export function StorySection() {
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelsRef = useRef<(HTMLDivElement | null)[]>([])
  const setPanelRef = (index: number) => (el: HTMLDivElement | null): void => {
    panelsRef.current[index] = el
  }

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return
      }

      const section = sectionRef.current
      const container = containerRef.current
      const panels = panelsRef.current
      const panel1 = panels[0]
      const panel2 = panels[1]
      const panel3 = panels[2]
      const panel5 = panels[4]

      if (!section || !container || !panel1 || !panel2 || !panel3 || !panel5) {
        return
      }
      const q = gsap.utils.selector(section)

      // Main horizontal scroll animation
      const scrollTween = gsap.to(container, {
        x: () => {
          return -(container.scrollWidth - window.innerWidth)
        },
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          end: () => {
            return `+=${container.scrollWidth - window.innerWidth}`
          },
        },
      })

      // Panel 1: Parallax background
      gsap.to(q('.panel-1-bg'), {
        scale: 1.1,
        scrollTrigger: {
          trigger: panel1,
          containerAnimation: scrollTween,
          start: 'left left',
          end: 'right left',
          scrub: true,
        },
      })

      // Panel 2: Image reveal and text stagger
      gsap.from(q('.panel-2-img'), {
        clipPath: 'inset(0% 100% 0% 0%)',
        duration: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: panel2,
          containerAnimation: scrollTween,
          start: 'left center',
        },
      })

      gsap.from(q('.panel-2-text > *'), {
        y: 50,
        opacity: 0,
        stagger: 0.2,
        scrollTrigger: {
          trigger: panel2,
          containerAnimation: scrollTween,
          start: 'left center',
        },
      })

      // Panel 3: Meet the Makers animation sequence
      const tl3 = gsap.timeline({
        scrollTrigger: {
          trigger: panel3,
          containerAnimation: scrollTween,
          start: 'left center',
        },
      })

      tl3.from(q('.panel-3-title'), {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      })
      .from(q('.panel-3-main-img'), {
        scale: 0.9,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
      }, '-=0.4')
      .from(q('.panel-3-main-text > *'), {
        y: 30,
        opacity: 0,
        stagger: 0.2,
        duration: 0.8,
        ease: 'power2.out',
      }, '-=0.6')
      .from(q('.secondary-artisan'), {
        y: 20,
        opacity: 0,
        stagger: 0.2,
        duration: 0.8,
        ease: 'power2.out',
      }, '-=0.6')

      // Panel 5: Split reveal
      gsap.from(q('.split-left'), {
        xPercent: -50,
        opacity: 0,
        scrollTrigger: { trigger: panel5, containerAnimation: scrollTween, start: 'left center' },
      })
      gsap.from(q('.split-right'), {
        xPercent: 50,
        opacity: 0,
        scrollTrigger: { trigger: panel5, containerAnimation: scrollTween, start: 'left center' },
      })

    }, sectionRef)

    return () => {
      const section = sectionRef.current
      ScrollTrigger.getAll().forEach((trigger) => {
        const triggerElement = trigger.vars.trigger
        if (
          section &&
          triggerElement instanceof Element &&
          (triggerElement === section || section.contains(triggerElement))
        ) {
          trigger.kill(true)
        }
      })
      ctx.revert()
    }
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#FAFAF9]">
      <div 
        ref={containerRef} 
        className="flex h-screen will-change-transform"
        style={{ width: '600vw' }}
      >
        {/* Panel 1 — Opening (Heritage) */}
        <div 
          ref={setPanelRef(0)}
          className="relative w-screen h-full flex items-center justify-center overflow-hidden"
        >
          <div 
            className="panel-1-bg absolute inset-0 bg-[url('/Images/culturally_crafted.jpg?height=1080&width=1920')] bg-cover"
            style={{ backgroundPosition: 'center bottom' }}
          >
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
          <div className="relative z-10 text-center text-white px-4">
            <h2 className="text-5xl md:text-8xl font-druk-medium uppercase mb-6 leading-tight">Crafted by Tradition</h2>
            <p className="text-lg md:text-xl font-aeonik tracking-widest opacity-80">Rooted in Ethiopian heritage and timeless skill.</p>
          </div>
        </div>

        {/* Panel 2 — Craft Process */}
        <div 
          ref={setPanelRef(1)}
          className="w-screen h-full flex items-center px-8 md:px-24 bg-white"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center w-full">
            <div className="panel-2-img relative aspect-[4/3] bg-muted overflow-hidden rounded-sm">
              <Image 
                src="/Images/jug-rotating.jpg" 
                alt="Crafting process"
                fill
                className="object-cover" 
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="panel-2-text space-y-6">
              <h2 className="text-4xl md:text-6xl font-druk-medium uppercase text-[#1C1C1C]">Made by Hand</h2>
              <p className="text-lg text-muted-foreground font-inter max-w-md leading-relaxed">
                Every piece is shaped, woven, and finished by skilled hands using techniques passed through generations.
              </p>
            </div>
          </div>
        </div>

        {/* Panel 3 — Artisan Story */}
       <div 
         ref={setPanelRef(2)}
         className="w-screen h-full flex flex-col justify-center px-12 bg-[#FAFAF9]"
       >

  <h2 className="panel-3-title text-5xl mt-20 md:text-5xl font-druk-medium uppercase mb-5 text-[#3E2723]">
    Know Your Culture
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">

    {/* Main artisan */}
    <div className="md:col-span-2 space-y-6">
      <div className="panel-3-main-img relative w-full h-[400px] bg-muted overflow-hidden">
        <Image 
          src="/Images/colorful_handcraft.jpg" 
          alt="Traditional weaver"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 60vw"
        />
      </div>

      <div className="panel-3-main-text space-y-4">
        <h3 className="font-druk-medium text-4xl text-[#C6A75E] uppercase">
          Weaver
        </h3>

        <p className="font-inter text-lg text-[#1C1C1C]/80 max-w-md">
          Each basket is handcrafted using traditional techniques that reflect the richness of our culture.
        </p>
      </div>
    </div>

    {/* Secondary artisans */}
    <div className="flex flex-col gap-10">

      {["Potter", "Embroiderer"].map((role) => (
        <div key={role} className="secondary-artisan flex items-center gap-6">

          <div className="w-20 h-20 bg-muted overflow-hidden">
            <Image
              src={`/placeholder.svg?text=${role}`}
              alt={`${role} portrait`}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h4 className="font-druk-medium text-xl text-[#3E2723] uppercase">
              {role}
            </h4>

            <p className="text-sm font-inter text-[#1C1C1C]/70">
              Preserving culture through craft.
            </p>
          </div>

        </div>
      ))}

    </div>
  </div>
</div>

        {/* Panel 4 — Culture */}
        <div 
          ref={setPanelRef(3)}
          className="relative w-screen h-full flex items-center justify-center overflow-hidden"
        >
          <div 
            className="absolute inset-0 bg-[url('/Images/bowl.jpg?height=1080&width=1920')] bg-cover grayscale opacity-20"
            style={{ backgroundPosition: 'center 70%' }}
          ></div>
          <div className="relative z-10 text-center max-w-3xl px-6 space-y-8">
            <h2 className="text-5xl md:text-8xl font-druk-medium uppercase text-[#1C1C1C]">More Than Objects</h2>
            <p className="text-xl md:text-2xl font-aeonik text-[#3E2723] leading-relaxed">
              Each item carries meaning — from patterns that tell stories to rituals that bring people together.
            </p>
          </div>
        </div>

        {/* Panel 5 — Modern Bridge */}
        <div 
          ref={setPanelRef(4)}
          className="w-screen h-full flex items-center bg-white overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full">
            <div className="split-left relative bg-muted h-full min-h-[300px] md:min-h-0">
              <Image 
                src="/Images/potter.jpg" 
                alt="Traditional craft"
                fill
                className="object-cover grayscale" 
                style={{ objectPosition: '70% 100%' }}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-[#3E2723]/20"></div>
            </div>
            <div className="split-right flex flex-col justify-center p-12 md:p-24 space-y-8 bg-[#FAFAF9]">
              <h2 className="text-4xl md:text-6xl font-druk-medium uppercase text-[#1C1C1C]">From Hands to Homes</h2>
              <p className="text-lg text-muted-foreground font-inter max-w-md">
                Connecting Ethiopian artisans to the world through a modern digital marketplace.
              </p>
              <div className="relative w-full h-[450px] aspect-video bg-white border border-black/10 rounded-lg shadow-inner overflow-hidden">
                <Image  
                  src="/Images/house.jpg" 
                  alt="Marketplace mockup"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 6 — CTA (Final) */}
        <div 
          ref={setPanelRef(5)}
          className="w-screen h-full flex flex-col items-center justify-center bg-[#1C1C1C] text-white space-y-12"
         >
          <div className="space-y-4 text-center">
            <h2 className="text-6xl md:text-9xl font-druk-medium uppercase tracking-tighter">Own a Story</h2>
            <p className="text-xl font-aeonik uppercase tracking-[0.4em] text-[#C6A75E]">Curated Authenticity</p>
          </div>
          <Link href="/products">
            <Button className="bg-[#C6A75E] text-white hover:bg-[#C6A75E]/90 px-12 py-8 text-xl font-aeonik uppercase tracking-widest rounded-none group">
              Explore Collection
              <ArrowRight className="ml-4 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      <style jsx>{`
        .font-druk-medium {
          font-family: var(--font-druk-medium), sans-serif;
        }
        .font-aeonik {
          font-family: var(--font-aeonik), sans-serif;
        }
        .font-inter {
          font-family: var(--font-inter), sans-serif;
        }
      `}</style>
    </section>
  )
}