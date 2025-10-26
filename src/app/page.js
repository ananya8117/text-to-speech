"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Page() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);

  useEffect(() => {
    setIsLoaded(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 7);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: "🗣️",
      title: "Text-to-Speech",
      description: "Convert any text into natural-sounding speech instantly. Multiple voices and languages available.",
      href: "/tts",
      gradient: "from-blue-500 to-purple-600",
      hoverGradient: "from-blue-600 to-purple-700",
      bgGradient: "from-blue-50/50 to-purple-50/50"
    },
    {
      icon: "🎤",
      title: "Voice Cloning",
      description: "Clone your voice from a short audio sample and generate custom speech with high accuracy.",
      href: "/clone",
      gradient: "from-purple-500 to-pink-600",
      hoverGradient: "from-purple-600 to-pink-700",
      bgGradient: "from-purple-50/50 to-pink-50/50"
    },
    {
      icon: "🎬",
      title: "Video Dubbing",
      description: "Generate lip-synced video dubbing with Wav2Lip technology. Perfect synchronization guaranteed.",
      href: "/dubbing",
      gradient: "from-indigo-500 to-blue-600",
      hoverGradient: "from-indigo-600 to-blue-700",
      bgGradient: "from-indigo-50/50 to-blue-50/50"
    },
    {
      icon: "🔐",
      title: "Privacy Mode",
      description: "Anonymize your voice with advanced conversion techniques. Multiple privacy levels available.",
      href: "/privacy",
      gradient: "from-green-500 to-teal-600",
      hoverGradient: "from-green-600 to-teal-700",
      bgGradient: "from-green-50/50 to-teal-50/50"
    },
    {
      icon: "📝",
      title: "Transcription",
      description: "Convert audio to text with high accuracy. Support for multiple languages and formats.",
      href: "/transcribe",
      gradient: "from-orange-500 to-red-600",
      hoverGradient: "from-orange-600 to-red-700",
      bgGradient: "from-orange-50/50 to-red-50/50"
    },
    {
      icon: "🎵",
      title: "Voice Effects",
      description: "Apply professional audio effects to your voice. Real-time processing with studio quality.",
      href: "/voice-effects",
      gradient: "from-cyan-500 to-blue-600",
      hoverGradient: "from-cyan-600 to-blue-700",
      bgGradient: "from-cyan-50/50 to-blue-50/50"
    },
    {
      icon: "👥",
      title: "Voice Library",
      description: "Browse and select from our extensive collection of AI-generated voices and accents.",
      href: "/voices",
      gradient: "from-violet-500 to-purple-600",
      hoverGradient: "from-violet-600 to-purple-700",
      bgGradient: "from-violet-50/50 to-purple-50/50"
    }
  ];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-purple-600/5 to-pink-600/10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center">
            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight">
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 bg-clip-text text-transparent animate-gradient-x">
                Neural Voice
              </span>
              <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 bg-clip-text text-transparent animate-gradient-x delay-300">
                Synthesizer
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl lg:text-3xl text-gray-700 mb-4 font-light max-w-4xl mx-auto leading-relaxed">
              Transform text into lifelike speech with cutting-edge AI technology
            </p>
            
            {/* Enhanced Description */}
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Experience the future of voice synthesis with real-time processing, voice cloning, 
              video dubbing, and advanced privacy features—all powered by neural networks.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                href="/tts"
                className="group relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              
              <Link
                href="#features"
                className="group bg-white/80 backdrop-blur-sm hover:bg-white text-gray-800 font-bold py-4 px-8 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-gray-200/50"
              >
                Explore Features
                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300 inline-block">→</span>
              </Link>
            </div>

            {/* Stats/Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">99.9%</div>
                <div className="text-gray-600">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">50+</div>
                <div className="text-gray-600">Voice Models</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">Real-time</div>
                <div className="text-gray-600">Processing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover our comprehensive suite of AI-powered voice technologies designed for creators, developers, and businesses.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-white/60 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/20 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
                  currentFeature === index ? 'ring-2 ring-purple-400/50 shadow-purple-500/25' : ''
                }`}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-700 text-sm leading-relaxed mb-6 group-hover:text-gray-600 transition-colors">
                    {feature.description}
                  </p>
                  
                  {/* CTA Button */}
                  <Link
                    href={feature.href}
                    className={`inline-flex items-center justify-center w-full bg-gradient-to-r ${feature.gradient} hover:${feature.hoverGradient} text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 shadow-md hover:shadow-lg`}
                  >
                    Try Now
                    <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
                  </Link>
                </div>
                
                {/* Hover Effect Border */}
                <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-indigo-400/50 group-hover:to-purple-400/50 transition-all duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Ready to Transform Your Voice Experience?
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Join thousands of creators and developers already using our AI voice technology.
          </p>
          <Link
            href="/tts"
            className="inline-flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
          >
            Start Creating Now
            <span className="ml-2">🚀</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
