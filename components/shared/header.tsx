'use client'

import Link from 'next/link'
import { ShoppingCart, Menu, X, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef, Suspense } from 'react'
import { gsap } from 'gsap'
import { useHeader } from '@/lib/header-context'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { dashboardForRole } from '@/lib/permissions'
import MegaMenu from '../MegaMenu'
import HeaderSearchPanel from '@/components/shared/HeaderSearchPanel'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isOverHero, setIsOverHero] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const openTimerRef = useRef<number | null>(null)
  const focusTimerRef = useRef<number | null>(null)
  const closeTweenRef = useRef<gsap.core.Tween | null>(null)
  const isMountedRef = useRef(true)
  const { setIsHovered: setGlobalIsHovered } = useHeader()
  const { role } = useAuth()
  const { cartCount } = useCart()
  const isLoggedIn = Boolean(role)

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) {
      setIsOverHero(false)
      return
    }

    const handleScroll = () => {
      const heroText = hero.querySelector('h1')
      let overHero = true

      if (heroText) {
        const rect = heroText.getBoundingClientRect()
        const headerHeight = headerRef.current?.offsetHeight || 0
        overHero = rect.top > headerHeight
      } else {
        overHero = window.scrollY < hero.offsetHeight
      }

      setIsOverHero(overHero)

      // If we leave the hero section, force-clear hover state to keep background stable
      if (!overHero) {
        setIsHovered(false)
        setGlobalIsHovered(false)
      }
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    return () => {
      isMountedRef.current = false

      if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current)

      closeTweenRef.current?.kill()
      if (searchBarRef.current) gsap.killTweensOf(searchBarRef.current)
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      let bgColor = '#FAFAF9'
      let borderColor = 'rgba(0, 0, 0, 0.1)' // Subtle bottom border

      if (isOverHero) {
        bgColor = isHovered ? '#FAFAF9' : 'transparent'
        borderColor = 'transparent'
      }

      gsap.to(headerRef.current, {
        backgroundColor: bgColor,
        borderBottom: `0px solid ${borderColor}`,
        duration: 0.3,
        ease: 'power2.inOut'
      })
    }, headerRef)

    return () => ctx.revert() // Important: Clean up GSAP context on unmount/re-render
  }, [isOverHero, isHovered])

  const handleSearchClick = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current)
    closeTweenRef.current?.kill()
    if (searchBarRef.current) gsap.killTweensOf(searchBarRef.current)

    setIsSearchOpen(true)

    // Wait for render and animate only if still mounted.
    openTimerRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return
      if (searchBarRef.current) {
        gsap.set(searchBarRef.current, { y: '-100%' })
        gsap.to(searchBarRef.current, { y: '0%', duration: 0.5, ease: 'power2.out' })
        focusTimerRef.current = window.setTimeout(() => {
          if (!isMountedRef.current) return
          searchInputRef.current?.focus()
        }, 300)
      }
    }, 0)
  }

  const handleCloseSearch = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current)
    closeTweenRef.current?.kill()
    if (isMountedRef.current) setIsSearchOpen(false)

    const target = searchBarRef.current
    if (!target) return

    gsap.killTweensOf(target)
    closeTweenRef.current = gsap.to(target, {
      y: '-100%',
      duration: 0.5,
      ease: 'power2.out',
    })
  }

  useEffect(() => {
    if (isSearchOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
          handleCloseSearch()
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchOpen])

  const textColor = isOverHero && !isHovered ? 'text-white' : 'text-[#1C1C1C]'

  return (
    <div className="header-wrapper">
      <header 
        ref={headerRef}
        className="fixed top-0 w-full z-50"
        onMouseEnter={() => {
          // Hover background effect only active when on Hero section
          if (isOverHero) {
            setIsHovered(true)
            setGlobalIsHovered(true)
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false)
          setGlobalIsHovered(false)
        }}
      >
        <div className="container mx-auto px-4 py-4 relative z-10">
          <div className="flex items-center justify-between relative">
            {/* Logo */}
            <Link href="/" className={`flex items-center gap-2 font-bold text-xl transition-colors font-logo ${textColor}`}>
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center weight-light">
                <span className="text-primary font-bold">E</span>
              </div>
              <span className="hidden  text-sm uppercase tracking-wider sm:inline">EthioCraft</span>
            </Link>

            {/* Center Navigation */}
            
            <nav className="hidden md:flex items-center gap-8 relative">
              <MegaMenu textColor={textColor}/>
              <button
                onClick={handleSearchClick}
                className={`font-aeonik text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:text-secondary ${textColor}`}
              >
                Search
              </button>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Menu Toggle - Mobile */}
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                <Link 
                  href="/about" 
                  className={`font-aeonik px-3 text-xs font-bold uppercase tracking-widest transition-colors hover:text-secondary ${textColor}`}
                >
                  About
                </Link>
                <Link 
                  href="/contact" 
                  className={`font-aeonik px-3 text-xs font-bold uppercase tracking-widest transition-colors hover:text-secondary ${textColor}`}
                >
                  Contact
                </Link>
                {isLoggedIn ? (
                  <Link
                    href={dashboardForRole(role)}
                    aria-label="My account"
                    className={`transition-colors ${textColor} hover:text-secondary`}
                  >
                    <UserCircle className="w-6 h-6" />
                  </Link>
                ) : (
                  <Link href="/auth/login">
                    <Button variant="outline" className={`font-aeonik transition-colors border-current ${textColor} uppercase tracking-widest bg-transparent hover:bg-[#FAFAF9]/20`}>
                      sign in
                    </Button>
                  </Link>
                )}
                <Link href="/cart">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`relative transition-colors ${textColor} hover:bg-[#FAFAF9]/20`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && (
                      <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-5 text-center font-bold">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className={`md:hidden transition-colors ${textColor}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu Wrapper - Provides a stable DOM node for React */}
          <div className="md:hidden">
            {isMenuOpen && (
              <div className="mt-4 pb-4 transition-colors">
                <div className="flex flex-col gap-4 mt-4 px-2">
                  <Link 
                    href="/products" 
                    className={`text-xs font-bold uppercase tracking-widest ${textColor}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Category
                  </Link>
                  <Link 
                    href="#" 
                    className={`text-xs font-bold uppercase tracking-widest ${textColor}`}
                    onClick={() => { setIsMenuOpen(false); handleSearchClick(); }}
                  >
                    Search
                  </Link>
                  <Link 
                    href="/about" 
                    className={`text-xs font-bold uppercase tracking-widest ${textColor}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link 
                    href="/contact" 
                    className={`text-xs font-bold uppercase tracking-widest ${textColor}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  <Separator className="bg-current opacity-10" />
                  {isLoggedIn ? (
                    <Link
                      href={dashboardForRole(role)}
                      className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${textColor}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserCircle className="w-5 h-5" />
                      My Account
                    </Link>
                  ) : (
                    <Link href="/auth/login" className="w-full">
                      <Button
                        variant="outline"
                        className={`w-full transition-colors border-current ${textColor} bg-transparent hover:bg-[#FAFAF9]/20`}
                      >
                        sign in
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Overlay Wrapper - Prevents removeChild failure on navigation */}
      <div className="search-overlay-container">
        {isSearchOpen && (
          <div className="search-overlay-root">
            <div 
              className="fixed inset-0 bg-black/50 z-50"
              onClick={handleCloseSearch}
            />
            <div 
              ref={searchBarRef}
              className="fixed top-0 left-0 w-full bg-[#FAFAF9] z-[60] shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="container mx-auto px-4 py-4">
                <Suspense
                  fallback={
                    <div
                      className="mx-auto h-11 w-full max-w-2xl animate-pulse rounded-none border border-gray-300 bg-white"
                      aria-hidden
                    />
                  }
                >
                  <HeaderSearchPanel
                    onClose={handleCloseSearch}
                    inputRef={searchInputRef}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
