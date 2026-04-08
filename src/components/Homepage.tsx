import { useState, useEffect } from 'react';
import { Play, Video, Users, Share2, Shield, Zap, ChevronRight, Check, Sparkles, Star } from 'lucide-react';
import { ParticleBackground } from './ParticleBackground';

interface HomepageProps {
  onGetStarted: () => void;
}

export function Homepage({ onGetStarted }: HomepageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: Video,
      title: 'Screen + Camera',
      description: 'Record your screen with an optional camera bubble for a personal touch'
    },
    {
      icon: Zap,
      title: 'Instant Recording',
      description: 'Start recording in seconds with our intuitive one-click interface'
    },
    {
      icon: Share2,
      title: 'Easy Sharing',
      description: 'Share your videos instantly with a simple link'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Organize videos in workspaces and collaborate with your team'
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your videos are private by default with advanced security options'
    },
    {
      icon: Play,
      title: 'HD Quality',
      description: 'Record in stunning quality up to 4K resolution at 60fps'
    }
  ];

  const steps = [
    { number: '01', title: 'Choose your recording', desc: 'Screen only or screen + camera' },
    { number: '02', title: 'Start recording', desc: 'One click to begin capturing' },
    { number: '03', title: 'Share instantly', desc: 'Get a shareable link immediately' }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-8 py-20 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-red-100 rounded-full blur-3xl opacity-20 animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-red-50 rounded-full blur-3xl opacity-20 animate-float-delayed" />
        </div>

        <div className={`max-w-6xl mx-auto text-center relative z-10 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-full mb-8 animate-fade-in">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm text-red-600" style={{ fontWeight: 600 }}>NOW IN BETA</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-7xl md:text-8xl mb-6 tracking-tight text-gray-900 animate-slide-up" style={{ fontWeight: 700, lineHeight: 1.1 }}>
            RECORD.<br />
            SHARE.<br />
            <span className="text-red-600">COLLABORATE.</span>
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto animate-slide-up-delayed">
            The simplest way to record your screen and share your message. 
            Perfect for teams, creators, and anyone who wants to communicate better.
          </p>

          {/* CTA Button - Single with subtle animation */}
          <div className="flex items-center justify-center mb-16 animate-slide-up-more-delayed">
            <button 
              onClick={onGetStarted}
              className="group relative px-8 py-4 bg-red-600 hover:bg-red-700 rounded-xl transition-all duration-300 flex items-center gap-3 text-white shadow-lg hover:shadow-2xl hover:scale-105 transform overflow-hidden"
            >
              {/* Subtle shine animation */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              {/* Pulsing dot */}
              <div className="relative">
                <div className="absolute inset-0 w-4 h-4 bg-white rounded-full animate-ping opacity-75" />
                <div className="relative w-4 h-4 bg-white rounded-full" />
              </div>
              
              <span className="relative text-lg" style={{ fontWeight: 600 }}>Start Recording Free</span>
              <ChevronRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-8 border-t border-gray-200 animate-fade-in-delayed">
            {[
              { value: '10M+', label: 'Videos Created' },
              { value: '500K+', label: 'Active Users' },
              { value: '99.9%', label: 'Uptime' }
            ].map((stat, idx) => (
              <div key={idx} className="hover:scale-105 transition-transform duration-300">
                <div className="text-3xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-8 bg-gray-50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-gray-400 mb-3 tracking-widest" style={{ fontWeight: 600 }}>FEATURES</div>
            <h2 className="text-5xl tracking-tight text-gray-900 mb-4" style={{ fontWeight: 700 }}>
              EVERYTHING YOU NEED
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to make video recording and sharing effortless
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-red-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-100 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg mb-2 text-gray-900" style={{ fontWeight: 700 }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-gray-400 mb-3 tracking-widest" style={{ fontWeight: 600 }}>HOW IT WORKS</div>
            <h2 className="text-5xl tracking-tight text-gray-900 mb-4" style={{ fontWeight: 700 }}>
              THREE SIMPLE STEPS
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get started in seconds. No downloads, no complicated setup.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative group hover:scale-105 transition-all duration-300"
              >
                {/* Connector Line */}
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-red-300 to-gray-200" />
                )}
                
                <div className="relative z-10 text-center">
                  <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-4xl group-hover:shadow-2xl transition-shadow duration-300" style={{ fontWeight: 700 }}>
                    {step.number}
                  </div>
                  <h3 className="text-xl mb-2 text-gray-900" style={{ fontWeight: 700 }}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-gray-400 mb-3 tracking-widest" style={{ fontWeight: 600 }}>TESTIMONIALS</div>
            <h2 className="text-5xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>
              LOVED BY TEAMS
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "This tool has transformed how we communicate internally. Recording demos has never been easier!",
                author: "Sarah Chen",
                role: "Product Manager",
                company: "TechCorp"
              },
              {
                quote: "The simplicity is unmatched. We use it for everything from bug reports to customer onboarding.",
                author: "Michael Roberts",
                role: "Engineering Lead",
                company: "StartupXYZ"
              },
              {
                quote: "Finally, a screen recorder that just works. Clean interface, reliable recording, instant sharing.",
                author: "Emily Johnson",
                role: "Design Director",
                company: "CreativeCo"
              }
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="p-8 bg-white rounded-2xl border border-gray-200 hover:border-red-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-4xl text-red-600 mb-4">"</div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white" style={{ fontWeight: 700 }}>
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{testimonial.author}</div>
                    <div className="text-xs text-gray-500">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs text-gray-400 mb-3 tracking-widest" style={{ fontWeight: 600 }}>PRICING</div>
            <h2 className="text-5xl tracking-tight text-gray-900 mb-4" style={{ fontWeight: 700 }}>
              SIMPLE PRICING
            </h2>
            <p className="text-lg text-gray-600">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: '$0',
                description: 'Perfect for individuals',
                features: [
                  'Up to 25 videos',
                  '5 minutes per video',
                  '1080p quality',
                  'Basic sharing'
                ]
              },
              {
                name: 'Pro',
                price: '$12',
                description: 'For professionals',
                features: [
                  'Unlimited videos',
                  'Unlimited length',
                  '4K quality',
                  'Advanced sharing',
                  'Custom branding',
                  'Analytics'
                ],
                popular: true
              },
              {
                name: 'Team',
                price: '$30',
                description: 'For teams',
                features: [
                  'Everything in Pro',
                  'Team workspace',
                  'User management',
                  'Priority support',
                  'SSO integration',
                  'Advanced analytics'
                ]
              }
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`relative p-8 rounded-2xl border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                  plan.popular
                    ? 'border-red-600 bg-gradient-to-b from-red-50 to-white shadow-xl scale-105'
                    : 'border-gray-200 bg-white hover:border-red-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-white text-xs rounded-full" style={{ fontWeight: 600 }}>
                    MOST POPULAR
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl mb-2 text-gray-900" style={{ fontWeight: 700 }}>{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-5xl text-gray-900" style={{ fontWeight: 700 }}>{plan.price}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-3 text-sm text-gray-700">
                      <Check className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                    plan.popular
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" 
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl mb-6 tracking-tight" style={{ fontWeight: 700 }}>
            READY TO GET STARTED?
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Join thousands of teams already using our platform
          </p>
          
          <button
            onClick={onGetStarted}
            className="group px-10 py-5 bg-white hover:bg-gray-100 rounded-lg transition-all duration-300 flex items-center gap-3 mx-auto text-gray-900 shadow-2xl hover:scale-105 transform"
          >
            <div className="w-4 h-4 bg-red-600 rounded-full group-hover:scale-110 transition-transform" />
            <span className="text-xl" style={{ fontWeight: 700 }}>Start Recording Now</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
              <span className="text-xl tracking-tight text-gray-900" style={{ fontWeight: 700 }}>LOOM</span>
            </div>
            
            <div className="flex gap-8 text-sm text-gray-600">
              <a href="#" className="hover:text-red-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-red-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-red-600 transition-colors">Support</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            © 2025 Loom. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}