'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import { fetchProducts, ApiProductSummary, getProductImage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'
import { Badge } from '@/components/ui/badge'
import { StorySection } from '@/components/shared/story-section'
import { useHeader } from '@/lib/header-context'
import { useCart } from '@/lib/cart-context'
import ChatSupport from '@/components/ChatSupport'
import { toast } from 'react-toastify'

export default function Home() {
  const { isHovered } = useHeader()
  const { addItem } = useCart()
  const [featuredProducts, setFeaturedProducts] = useState<ApiProductSummary[]>([])
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true)

  useEffect(() => {
    fetchProducts({ sortBy: 'rating_desc', limit: 4 })
      .then((res) => {
        setFeaturedProducts(res.items)
      })
      .catch((err) => {
        console.error("Failed to fetch featured products", err)
      })
      .finally(() => {
        setIsLoadingFeatured(false)
      })
  }, [])

  const categories = [
    {
      name: 'Textiles',
      image: '/images/textiles.webp?height=600&width=400',
      description: 'Authentic hand-loomed fabrics and traditional attire crafted with heritage techniques.',
      
    },
    {
      name: 'Jewelry',
      image: '/images/jewelry.webp?height=600&width=400',
      description: 'Exquisite gold and silver filigree masterpieces from master Ethiopian jewelers.',
      
    },
    {
      name: 'Crafts',
      image: '/images/crafts.jpg\\?height=600&width=400',
      description: 'Hand-woven baskets and traditional home decor reflecting local cultural motifs.',
      
    },
    {
      name: 'Accessories',
      image: '/images/accessery.webp?height=600&width=400',
      description: 'Premium Ethiopian leather goods and hand-tooled bags for the modern lifestyle.',
      
    },
  ]

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>, product: ApiProductSummary) => {
    event.preventDefault()
    event.stopPropagation()
    addItem({
      id: product.id,
      name: product.title,
      price: product.price,
      image: getProductImage(product),
      quantity: 1,
      category: product.category,
    })
    toast.success(`${product.title} added to cart`)
  }

  return (

    <>
      <Header />

      {/* Hero Section */}
      <section
        id="hero"
        className="relative w-full h-screen bg-cover bg-center bg-no-repeat flex flex-col justify-center"
        style={{
          backgroundImage: 'url(/hero_page.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'left bottom',

        }}
      >
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/100 via-black/40 to-black/10"></div>

        {/* Content - Positioned at left mid */}
        <div className="relative z-10 container mx-auto px-4 text-left text-white">
          <h1 className="text-4xl tracking-wide uppercase md:text-7xl font-bold mb-8 text-balance max-w-4xl drop-shadow-2xl font-druk-medium text-shadow-lg">
            Authentic Ethiopian Handcrafts
          </h1>
          <div className="flex gap-4 flex-wrap justify-start mt-10">
            <Link href="/products">
              <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 text-sm md:text-lg px-8 md:px-10 py-3 md:py-4">
                Shop Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/artisan/landing">
              <Button variant="outline" className="border-white text-white  hover:bg-white bg-transparent text-sm md:text-lg px-8 md:px-10 py-3 md:py-4">
                Become an Artisan
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          {/* Header Aligned Horizontally on the Left */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-black/10 pb-6">
            <h2 className="text-2xl font-druk-medium tracking-wide md:text-4xl font-bold uppercase whitespace-nowrap">Shop</h2>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {categories.map((cat) => (
                <Link
                  key={cat.name}
                  href={`/products?category=${cat.name.toLowerCase()}`}
                  className="text-xs md:text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-secondary transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((cat) => (
              <Link key={cat.name} href={`/products?category=${cat.name.toLowerCase()}`}>
                <Card className="group overflow-hidden hover:shadow-md transition-all duration-500 h-full flex flex-col border-none bg-background">
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-druk-medium tracking-wide uppercase text-xl mb-3 group-hover:text-secondary transition-colors">{cat.name}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-6 flex-1">
                      {cat.description}
                    </p>
                    
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-6 h-6 text-secondary" />
            <h2 className="text-2xl uppercase font-druk-medium tracking-wide md:text-3xl font-bold">Featured Products</h2>
          </div>

          {isLoadingFeatured ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="h-full overflow-hidden hover:shadow-lg transition hover:-translate-y-1">
                    {/* Product Image */}
                    <div className="relative bg-muted aspect-square overflow-hidden">
                      <img
                        src={getProductImage(product)}
                        alt={product.title}
                        className="w-full h-full object-cover hover:scale-110 transition duration-300"
                      />
                      {product.publishedAt && (
                        <Badge className="absolute top-4 right-4 bg-accent text-accent-foreground">
                          Handmade
                        </Badge>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                      <h3 className="font-semibold font-druk-medium text-lg mb-2 line-clamp-2 uppercase tracking-tight">{product.title}</h3>

                      {/* Rating (Always 5 stars visually as fetched by rating_desc) */}
                      <div className="flex items-center gap-1 mb-3">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-secondary">
                              ★
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">({product._count?.reviews || 0})</span>
                      </div>

                      {/* Price and Button */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-secondary">ETB {Number(product.price).toLocaleString()}</span>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={(event) => handleAddToCart(event, product)}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Storytelling Section */}
      <StorySection />

      {/* Become a Seller Section */}
      <section className="py-12 md:py-24 border-t border-black/5 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl font-druk-medium tracking-wider md:text-4xl font-bold uppercase mb-6">
                Become a Seller
              </h2>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                Your hands keep the heartbeat of Ethiopian culture alive, from the vibrant patterns of a Mesob basket to the intricate Tibeb of a Habesha Kemis. We invite you to join a modern marketplace designed respectfully for you. We don&apos;t just display your work; we celebrate your skill as an active creator. Let us bridge your traditional craftsmanship with the digital future, empowering you to share the authentic spirit of Ethiopia with a global audience while maintaining complete pride in your heritage.
              </p>
              <Link href="/auth/register/artisan/register" className="inline-flex items-center gap-2 border border-[#C6A75E] bg-[#C6A75E] px-6 py-3 text-sm text-[#1C1C1C] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d2b472] uppercase font-aeonik">
                <Button className="bg-secondary text-secondary-foreground font-aeonik hover:bg-secondary/90 px-10 py-6 text-lg">
                  Sell Here
                </Button>
              </Link>
            </div>

            {/* Image Content */}
            <div className="order-1 lg:order-2">
              <div className="relative aspect-video lg:aspect-square overflow-hidden rounded-2xl shadow-xl">
                <img
                  src="Images/weaving_man.jpg?height=800&width=800"
                  alt="Ethiopian artisan at work"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <ChatSupport />
      <Footer />
    </>
  )
}
