"use client";
import { Button } from "@/app/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/card";
import { Badge } from "@/app/components/badge";
import {
  Sparkles,
  Video,
  Globe,
  Clock,
  Palette,
  Users,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import Header from "./components/HomeHeader";
import Footer from "./components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-secondary/20 text-secondary-foreground border-secondary/30">
              🇪🇹 Made for Ethiopian Businesses
            </Badge>

            <h1 className="text-4xl md:text-6xl font-black font-montserrat mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              SocialSpark
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              AI-Powered Content Creation Toolkit for Instagram & TikTok
            </p>

            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Create engaging social media content in seconds with bilingual
              support (English/Amharic). Perfect for Ethiopian SMEs and
              creators.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="h-14 px-8 text-lg font-semibold"
                asChild
              >
                <a href="/auth/signup">
                  Start Creating Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-8 text-lg bg-transparent"
                asChild
              >
                <a href="/auth/login">Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-4">
              Everything You Need to Spark Your Social Media
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From idea to published post in minutes, not hours
            </p>
          </div>

          {/* Mobile: horizontal scroll | Desktop: grid */}
          <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 md:overflow-visible">
            {[
              {
                icon: <Sparkles className="w-6 h-6 text-primary" />,
                title: "AI Content Generation",
                desc: "Generate captions, hashtags, and visuals from simple ideas using advanced AI",
                color: "primary",
              },
              {
                icon: <Globe className="w-6 h-6 text-secondary" />,
                title: "Bilingual Support",
                desc: "Create content in both English and Amharic with cultural context understanding",
                color: "secondary",
              },
              {
                icon: <Clock className="w-6 h-6 text-accent" />,
                title: "Smart Scheduling",
                desc: "Schedule posts for optimal engagement times with Ethiopian audience insights",
                color: "accent",
              },
              {
                icon: <Palette className="w-6 h-6 text-primary" />,
                title: "Brand Presets",
                desc: "Save your brand colors, fonts, and style preferences for consistent content",
                color: "primary",
              },
              {
                icon: <Video className="w-6 h-6 text-secondary" />,
                title: "Multi-Platform",
                desc: "Optimized content for Instagram posts, stories, and TikTok videos",
                color: "secondary",
              },
              {
                icon: <Users className="w-6 h-6 text-accent" />,
                title: "Ethiopian Focus",
                desc: "Built specifically for Ethiopian businesses with local market understanding",
                color: "accent",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className={`border-2 border-${feature.color}/10 hover:border-${feature.color}/30 transition-colors min-w-[280px] snap-center`}
              >
                <CardHeader>
                  <div
                    className={`w-12 h-12 bg-${feature.color}/10 rounded-lg flex items-center justify-center mb-4`}
                  >
                    {feature.icon}
                  </div>
                  <CardTitle className="font-montserrat">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-montserrat mb-6 text-primary-foreground">
            Ready to Spark Your Social Media Success?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of Ethiopian businesses already creating amazing
            content with SocialSpark
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="h-14 px-8 text-lg font-semibold"
            asChild
          >
            <a href="/auth/signup">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
