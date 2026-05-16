"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Menu,
  X,
  UserCircle,
  Activity,
  Bell,
  User,
  LogOut,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef, Suspense } from "react";
import { gsap } from "gsap";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import MegaMenu from "../MegaMenu";
import HeaderSearchPanel from "@/components/shared/HeaderSearchPanel";
import { Separator } from "@/components/ui/separator";

type DashboardHeaderProps = {
  statusText: string;
  notifications?: Array<{
    id: string | number;
    message: string;
    time: string;
    unread?: boolean;
  }>;
  unreadNotifications?: number;
  markAsRead?: (id: string | number) => void | Promise<void>;
  markAllAsRead?: () => void | Promise<void>;
  refresh?: () => void | Promise<void>;
};

export function DashboardHeader({
  notifications = [],
  unreadNotifications = 0,
  statusText = "",
  markAsRead,
  markAllAsRead,
  refresh,
}: DashboardHeaderProps) {
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const isMountedRef = useRef(true);

  const { role, logout } = useAuth();
  const { cartCount } = useCart();
  const isLoggedIn = Boolean(role);
  const rolePath = role ? role.toLowerCase() : "customer";
  const profileHref = isLoggedIn ? `/${rolePath}/profile` : "/auth/login";
  const isCustomer = role?.toUpperCase() === 'CUSTOMER';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;

      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);

      closeTweenRef.current?.kill();
      if (searchBarRef.current) gsap.killTweensOf(searchBarRef.current);
    };
  }, []);

  const handleSearchClick = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
    closeTweenRef.current?.kill();
    if (searchBarRef.current) gsap.killTweensOf(searchBarRef.current);

    setIsSearchOpen(true);

    // Wait for render and animate only if still mounted.
    openTimerRef.current = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      if (searchBarRef.current) {
        gsap.set(searchBarRef.current, { y: "-100%" });
        gsap.to(searchBarRef.current, {
          y: "0%",
          duration: 0.5,
          ease: "power2.out",
        });
        focusTimerRef.current = window.setTimeout(() => {
          if (!isMountedRef.current) return;
          searchInputRef.current?.focus();
        }, 300);
      }
    }, 0);
  };

  const handleCloseSearch = () => {
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
    closeTweenRef.current?.kill();

    const target = searchBarRef.current;
    if (!target) {
      if (isMountedRef.current) setIsSearchOpen(false);
      return;
    }

    gsap.killTweensOf(target);
    closeTweenRef.current = gsap.to(target, {
      y: "-100%",
      duration: 0.5,
      ease: "power2.out",
      onComplete: () => {
        if (isMountedRef.current) setIsSearchOpen(false);
      }
    });
  };

  useEffect(() => {
    if (isSearchOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          searchBarRef.current &&
          !searchBarRef.current.contains(e.target as Node)
        ) {
          handleCloseSearch();
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSearchOpen]);

  return (
    <div className="header-wrapper">
      <header className="fixed top-0 w-full z-50 bg-[#FAFAF9] border-b border-[rgba(0,0,0,0.1)]">
        <div className="container mx-auto px-4 py-4 relative z-10">
          <div className="flex items-center justify-between relative">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-xl transition-colors font-logo text-[#1C1C1C] hover:opacity-80"
            >
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center font-light">
                <span className="text-primary font-bold">E</span>
              </div>
              <span className="hidden text-sm uppercase tracking-wider sm:inline">
                EthioCraft
              </span>
            </Link>

            {/* Center Navigation */}
            {isCustomer && (
              <nav className="hidden md:flex items-center gap-8 relative">
                <MegaMenu textColor="text-[#1C1C1C]" />
                <button
                  onClick={handleSearchClick}
                  className="font-aeonik text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:text-secondary text-[#1C1C1C]"
                >
                  Search
                </button>
              </nav>
            )}

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="relative"
                      aria-label="Notifications"
                      onClick={() => {
                        // Dev-time debug: log notifications when the bell is clicked
                        try {
                          // eslint-disable-next-line no-console
                          console.info('DashboardHeader: notifications', notifications, 'unread', unreadNotifications);
                        } catch (e) {}
                      }}
                    >
                      <Bell className="w-5 h-5" />
                      {unreadNotifications > 0 && (
                        <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground leading-4 text-center">
                          {unreadNotifications > 9 ? "9+" : unreadNotifications}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[340px] p-0">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <p className="font-semibold text-sm">Notifications</p>
                      <div className="flex items-center gap-2">
                        {unreadNotifications > 0 && markAllAsRead && (
                          <button
                            onClick={() => markAllAsRead()}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                        {refresh && (
                          <button
                            onClick={async () => {
                              if (refreshLoading) return;
                              try {
                                setRefreshLoading(true);
                                await refresh();
                              } catch (e) {
                                // ignore errors for dev helper
                              } finally {
                                setRefreshLoading(false);
                              }
                            }}
                            aria-label="Refresh notifications"
                            className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                          >
                            {refreshLoading ? (
                              <Loader2 className="w-4 h-4" style={{ animation: 'spin 1.2s linear 5' }} />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-muted-foreground">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.map((note) => (
                          <button
                            key={note.id}
                            onClick={() => {
                              if (markAsRead) markAsRead(note.id);
                            }}
                            className={`w-full text-left px-4 py-3 border-b border-border/60 last:border-0 ${note.unread ? "bg-muted/30" : ""}`}
                          >
                            <p
                              className={`text-sm ${note.unread ? "font-semibold" : "text-muted-foreground"}`}
                            >
                              {note.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {note.time}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Shopping Cart */}
                {isCustomer && (
                  <Link href="/cart">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative transition-colors text-[#1C1C1C] hover:bg-[#FAFAF9]/20"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {cartCount > 0 && (
                        <span className="absolute -right-1 -top-1 min-w- h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-5 text-center font-bold">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Open profile menu"
                      className="hover:bg-transparent"
                    >
                      <UserCircle className="w-6 h-6" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <Link href={profileHref}>
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    {isLoggedIn ? (
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={logout}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    ) : (
                      <Link href="/auth/login">
                        <DropdownMenuItem className="cursor-pointer">
                          <UserCircle className="w-4 h-4 mr-2" />
                          Sign In
                        </DropdownMenuItem>
                      </Link>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden transition-colors text-[#1C1C1C]"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            {isMenuOpen && (
              <div className="mt-4 pb-4 transition-colors">
                <div className="flex flex-col gap-4 mt-4 px-2">
                  {isCustomer && (
                    <>
                      <Link
                        href="/products"
                        className="text-xs font-bold uppercase tracking-widest text-[#1C1C1C]"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Category
                      </Link>
                      <Link
                        href="#"
                        className="text-xs font-bold uppercase tracking-widest text-[#1C1C1C]"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleSearchClick();
                        }}
                      >
                        Search
                      </Link>
                    </>
                  )}

                  <Separator className="bg-current opacity-10" />

                  {/* Notifications - Mobile */}
                  <div className="text-xs font-bold uppercase tracking-widest text-[#1C1C1C]">
                    Notifications ({unreadNotifications})
                  </div>

                  {isLoggedIn ? (
                    <>
                      <Link
                        href={profileHref}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1C1C1C]"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <UserCircle className="w-5 h-5" />
                        Profile
                      </Link>
                      <Button
                        variant="ghost"
                        className="justify-start text-xs font-bold uppercase tracking-widest text-destructive hover:text-destructive"
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-5 h-5 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Link href="/auth/login" className="w-full">
                      <Button
                        variant="outline"
                        className="w-full transition-colors border-current text-[#1C1C1C] bg-transparent hover:bg-[#FAFAF9]/20"
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

      {/* Search Overlay */}
      {isCustomer && (
        <div className="search-overlay-container">
          {isSearchOpen && (
            <div className="search-overlay-root">
              <div
                className="fixed inset-0 bg-black/50 z-50"
                onClick={handleCloseSearch}
              />
              <div
                ref={searchBarRef}
                className="fixed top-0 left-0 w-full bg-transparent z-[60]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="container mx-auto px-4 py-6">
                  <Suspense
                    fallback={
                      <div
                        className="mx-auto h-12 w-full max-w-2xl animate-pulse rounded-full border border-gray-200 bg-white shadow-sm"
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
      )}
    </div>
  );
}
