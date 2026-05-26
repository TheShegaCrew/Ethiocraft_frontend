"use client";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  HandHelping,
  ImagePlus,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import ChatSupport from "@/components/ChatSupport";

type FeatureRow = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  image: string;
};

type JourneyStep = {
  title: string;
  description: string;
};

type Story = {
  name: string;
  location: string;
  summary: string;
  image: string;
};

const featureRows: FeatureRow[] = [
  {
    icon: Store,
    title: "Reach More Customers",
    description:
      "Your products are no longer limited to your town. They become visible nationwide.",
    image:
      "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80",
  },
  {
    icon: CircleDollarSign,
    title: "Earn Fairly",
    description: "No middlemen. You control your pricing and income.",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  },
  {
    icon: ShieldCheck,
    title: "Build Trust",
    description:
      "Every product goes through verification so customers trust your work.",
    image:
      "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1200&q=80",
  },
  {
    icon: HandHelping,
    title: "Get Help Anytime",
    description:
      "A simple assistant guides you step-by-step whenever you need support.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    icon: ImagePlus,
    title: "Show Your Craft Beautifully",
    description: "High-quality images and 3D views help your work stand out.",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    icon: Sparkles,
    title: "Preserve Your Story",
    description: "Your craft becomes part of Ethiopia’s digital heritage.",
    image:
      "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
  },
];

const journeySteps: JourneyStep[] = [
  { title: "Create Account", description: "Use your phone or email." },
  { title: "Upload Your Product", description: "Photos and simple details." },
  { title: "Review Process", description: "We check your submission." },
  { title: "Verification", description: "An agent may confirm your craft." },
  { title: "Go Live", description: "Your product appears in the marketplace." },
  {
    title: "Start Earning",
    description: "Receive orders and payments securely.",
  },
];

const stories: Story[] = [
  {
    name: "Alem - Basket Weaver",
    location: "Sidama",
    summary:
      "Before: sold only locally. Now: reaches customers nationwide and earns more consistently.",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Bekele - Wood Carver",
    location: "Bahir Dar",
    summary:
      "Before: limited exposure. Now: verified products are trusted by buyers.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Selam - Potter",
    location: "Addis Ababa",
    summary:
      "Before: unstable sales. Now: steady income with trusted listings.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
  },
];

const requiredItems = [
  "Your name and location",
  "Phone number or email",
  "One product sample",
  "Clear photos",
  "Short description",
];

const optionalItems = ["ID verification", "More products"];

function useRevealIds() {
  const [shown, setShown] = useState<string[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute("data-reveal-id");
          if (!id) return;
          setShown((prev) => (prev.includes(id) ? prev : [...prev, id]));
        });
      },
      { threshold: 0.22 },
    );

    document
      .querySelectorAll("[data-reveal-id]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return shown;
}

export default function App() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [heroParallax, setHeroParallax] = useState(0);
  const [problemParallax, setProblemParallax] = useState(0);
  const shown = useRevealIds();

  const reveal = (id: string, delay = 0) => ({
    opacity: shown.includes(id) ? 1 : 0,
    transform: shown.includes(id) ? "translateY(0px)" : "translateY(22px)",
    transition: `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
  });

  const handleScroll = () => {
    const top = scrollerRef.current?.scrollTop ?? 0;
    setHeroParallax(Math.min(70, top * 0.1));
    setProblemParallax(Math.max(-30, -top * 0.04));
  };

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="min-h-screen bg-background text-foreground font-inter"
    >
      <Header />

      <section className="relative flex min-h-[90vh] items-center overflow-hidden px-6 py-16 md:px-12 lg:px-20">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=2000&q=80"
            alt="Ethiopian artisan crafting"
            className="h-full w-full object-cover"
            style={{
              transform: `scale(1.1) translateY(${heroParallax}px)`,
              transition: "transform 160ms linear",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-3xl text-[#FAFAF9]">
          <h1
            className="text-4xl leading-tight md:text-6xl"
            style={{
              fontFamily: '"Druk Wide", "Arial Black", sans-serif',
              ...reveal("hero-title", 0),
            }}
            data-reveal-id="hero-title"
          >
            Your Craft Has Value. Let the World See It.
          </h1>
          <p
            className="mt-6 max-w-2xl text-base leading-relaxed md:text-lg"
            style={reveal("hero-sub", 80)}
            data-reveal-id="hero-sub"
          >
            A trusted Ethiopian marketplace designed to protect your work,
            verify your products, and connect you to real customers.
          </p>
          <p
            className="mt-4 text-sm text-[#ece4d9] md:text-base"
            style={reveal("hero-support", 150)}
            data-reveal-id="hero-support"
          >
            Sell beyond your local market without losing your tradition.
          </p>
          <div
            className="mt-9 flex flex-wrap items-center gap-4"
            style={reveal("hero-cta", 210)}
            data-reveal-id="hero-cta"
          >
            <a
              href="/auth/register/artisan/register"
              className="inline-flex items-center gap-2 border border-[#C6A75E] bg-[#C6A75E] px-6 py-3 text-sm text-[#1C1C1C] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d2b472]"
              style={{ fontFamily: "Aeonik, Inter, sans-serif" }}
            >
              Start Your Journey
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div
            className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs tracking-[0.06em] text-[#f0e8dc]"
            style={reveal("hero-trust", 260)}
            data-reveal-id="hero-trust"
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#C6A75E]" /> No
              experience needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#C6A75E]" /> Guided
              step-by-step
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#C6A75E]" /> Built for
              Ethiopian artisans
            </span>
          </div>
        </div>
      </section>

      <section
        className="min-h-screen snap-start px-6 py-20 md:px-12 lg:px-20"
        data-reveal-id="problem"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2
              className="text-3xl md:text-5xl"
              style={{
                fontFamily: '"Druk Wide", "Arial Black", sans-serif',
                ...reveal("problem-title"),
              }}
            >
              Your Work Deserves More Than a Local Market
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Limited customers in your area",
                "Unfair pricing through middlemen",
                "No way to prove authenticity",
              ].map((item, index) => (
                <li
                  key={item}
                  className="text-[#4f4742]"
                  style={reveal(`pain-${index}`, 120 + index * 80)}
                  data-reveal-id={`pain-${index}`}
                >
                  - {item}
                </li>
              ))}
            </ul>
            <p
              className="mt-8 text-lg font-aeonik font-bold text-primary"
              style={reveal("problem-shift", 340)}
              data-reveal-id="problem-shift"
            >
              This platform changes that.
            </p>
            <ul
              className="mt-5 space-y-3 text-sm text-[#4f4742]"
              style={reveal("problem-sol", 420)}
              data-reveal-id="problem-sol"
            >
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Reach
                customers across Ethiopia
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Sell at fair
                value
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-secondary" /> Get verified
                and trusted
              </li>
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-3xl">
            <img
              src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1500&q=80"
              alt="Traditional market and digital commerce"
              className="h-[520px] w-full object-cover"
              style={{
                transform: `translateY(${problemParallax}px) scale(1.04)`,
                transition: "transform 170ms linear",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c80] via-[#1c1c1c22] to-transparent" />
          </div>
        </div>
      </section>

      <section
        className="px-6 py-24 md:px-12 lg:px-20 bg-muted/20"
        data-reveal-id="gain"
      >
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-3xl md:text-5xl font-druk-medium uppercase tracking-wider"
            style={reveal("gain-title")}
          >
            What You Gain
          </h2>
          <div className="mt-12 space-y-14">
            {featureRows.map((row, index) => {
              const Icon = row.icon;
              const reverse = index % 2 === 1;
              return (
                <article
                  key={row.title}
                  className="grid items-center gap-8 md:grid-cols-2"
                  style={reveal(`gain-row-${index}`, 70 + index * 60)}
                  data-reveal-id={`gain-row-${index}`}
                >
                  <div className={reverse ? "md:order-2" : ""}>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-2xl font-druk-medium uppercase tracking-tight">
                      {row.title}
                    </h3>
                    <p className="mt-3 max-w-lg text-[#5f5550]">
                      {row.description}
                    </p>
                  </div>
                  <div
                    className={`overflow-hidden rounded-3xl ${reverse ? "md:order-1" : ""}`}
                  >
                    <img
                      src={row.image}
                      alt={row.title}
                      className="h-72 w-full object-cover transition duration-500 hover:scale-[1.03]"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="px-6 py-24 md:px-12 lg:px-20 bg-background"
        data-reveal-id="steps"
      >
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-3xl md:text-5xl font-druk-medium uppercase tracking-wider"
            style={reveal("steps-title")}
          >
            Simple Steps to Start Selling
          </h2>
          <div className="mt-10 hidden h-[1px] w-full bg-border md:block">
            <div
              className="h-full w-full origin-left bg-secondary transition duration-700"
              style={{
                transform: shown.includes("steps-title")
                  ? "scaleX(1)"
                  : "scaleX(0)",
              }}
            />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {journeySteps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                style={reveal(`journey-${index}`, 80 + index * 60)}
                data-reveal-id={`journey-${index}`}
              >
                <p className="text-xs uppercase tracking-[0.14em] text-secondary font-aeonik font-bold">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-druk-medium uppercase">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[#5f5550]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="px-6 py-24 md:px-12 lg:px-20 bg-muted/10"
        data-reveal-id="checklist"
      >
        <div className="mx-auto max-w-4xl">
          <h2
            className="text-3xl md:text-5xl font-druk-medium uppercase tracking-wider"
            style={reveal("checklist-title")}
          >
            Getting Started is Easy
          </h2>
          <p
            className="mt-4 text-[#615854]"
            style={reveal("checklist-sub", 90)}
            data-reveal-id="checklist-sub"
          >
            Joining is simple. Here is what you need.
          </p>
          <div
            className="mt-10 rounded-3xl border border-border bg-card p-7 md:p-12 shadow-lg"
            style={reveal("checklist-card", 170)}
            data-reveal-id="checklist-card"
          >
            <ul className="space-y-4 text-[#4f4742]">
              {requiredItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-secondary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="my-8 h-px bg-border" />
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-aeonik font-bold">
              Optional
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {optionalItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#dfd1b9] px-3 py-1 text-sm text-[#675d57]"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-7 text-sm text-[#615854]">
              You do not need everything at once. We guide you step-by-step.
            </p>
          </div>
        </div>
      </section>

      <section
        className="px-6 py-24 md:px-12 lg:px-20 bg-background"
        data-reveal-id="stories"
      >
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-3xl md:text-5xl font-druk-medium uppercase tracking-wider"
            style={reveal("stories-title")}
          >
            Artisans Growing with the Platform
          </h2>
          <div className="mt-10 flex gap-6 overflow-x-auto pb-8 scrollbar-hide">
            {stories.map((story, index) => (
              <article
                key={story.name}
                className="group min-w-[300px] overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:shadow-md md:min-w-[360px]"
                style={reveal(`story-card-${index}`, 80 + index * 80)}
                data-reveal-id={`story-card-${index}`}
              >
                <img
                  src={story.image}
                  alt={story.name}
                  className="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.14em] text-secondary font-aeonik font-bold">
                    {story.location}
                  </p>
                  <h3 className="mt-2 text-xl font-druk-medium uppercase">
                    {story.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5f5550]">
                    {story.summary}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative flex min-h-[70vh] items-center overflow-hidden px-6 py-24 md:px-12 lg:px-20"
        data-reveal-id="final"
      >
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1543087903-1ac2ec7aa8fe?auto=format&fit=crop&w=2000&q=80"
            alt="Ethiopian textile pattern backdrop"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-primary/80" />
        </div>

        <div
          className="relative z-10 mx-auto max-w-4xl text-center text-white"
          style={reveal("final")}
        >
          <h2 className="text-4xl leading-tight md:text-7xl font-druk-medium uppercase tracking-wider">
            Your Craft Deserves Recognition
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#efe8dd] md:text-lg">
            Join a platform built to support your work, your culture, and your
            future.
          </p>
          <div className="mt-10">
            <a href="/auth/register/artisan">
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-aeonik px-12 py-8 text-xl gap-3"
              >
                Start Registration
                <ArrowRight className="h-6 w-6" />
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-[#e9ddcc]">
            Takes only a few minutes to begin
          </p>
        </div>
      </section>
      <ChatSupport />
      <Footer />

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
