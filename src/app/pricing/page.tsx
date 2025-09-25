'use client'

import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function PricingPage() {
  const { isSignedIn } = useUser()

  const features = {
    free: [
      'Up to 3 rooms',
      'Up to 5 members per room',
      '10 AI analysis prompts per month',
      'Basic Excel/CSV upload',
      'Standard consolidation',
      'Email support',
      '100MB storage limit'
    ],
    pro: [
      'Unlimited rooms',
      'Unlimited members per room', 
      'Unlimited AI analysis prompts',
      'Advanced Excel/CSV processing',
      'Premium consolidation features',
      'Priority support & live chat',
      '10GB storage limit',
      'Custom export formats',
      'Advanced analytics dashboard',
      'Team collaboration tools'
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-semibold text-gray-900">
              Colony
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-700 hover:text-gray-900 font-medium">
                Home
              </Link>
              {isSignedIn ? (
                <Link href="/dashboard" className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-full transition-colors">
                  Dashboard
                </Link>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="text-gray-700 hover:text-gray-900 font-medium">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-full transition-colors">
                      Sign Up
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 leading-tight">
            Simple, Transparent
            <br />
            <span className="font-normal">Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 font-light max-w-2xl mx-auto">
            Choose the plan that fits your team's needs. Start free, upgrade when you're ready to scale.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Free Tier */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 relative">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Free</h3>
                <div className="mb-6">
                  <span className="text-5xl font-light text-gray-900">$0</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <p className="text-gray-600">Perfect for small teams getting started with automated reporting</p>
              </div>

              <ul className="space-y-4 mb-8">
                {features.free.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center">
                {isSignedIn ? (
                  <Link href="/dashboard" className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-8 py-4 rounded-lg text-lg transition-colors inline-block">
                    Go to Dashboard
                  </Link>
                ) : (
                  <SignUpButton mode="modal">
                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-8 py-4 rounded-lg text-lg transition-colors">
                      Get Started Free
                    </button>
                  </SignUpButton>
                )}
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-primary-500 p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-500 text-white px-6 py-2 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">Pro</h3>
                <div className="mb-6">
                  <span className="text-5xl font-light text-gray-900">$19</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                <p className="text-gray-600">For growing teams that need advanced features and unlimited access</p>
              </div>

              <ul className="space-y-4 mb-8">
                {features.pro.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="text-center">
                {isSignedIn ? (
                  <button className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium px-8 py-4 rounded-lg text-lg transition-colors">
                    Upgrade to Pro
                  </button>
                ) : (
                  <SignUpButton mode="modal">
                    <button className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium px-8 py-4 rounded-lg text-lg transition-colors">
                      Start Pro Trial
                    </button>
                  </SignUpButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-light text-gray-900 mb-12 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can I upgrade or downgrade my plan at any time?
              </h3>
              <p className="text-gray-600">
                Yes, you can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your current billing cycle.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What happens if I exceed my plan limits?
              </h3>
              <p className="text-gray-600">
                For Free tier users, you'll be prompted to upgrade when you reach limits. Pro users have unlimited access to all features.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Is there a free trial for Pro?
              </h3>
              <p className="text-gray-600">
                New users get a 14-day free trial of Pro features when they sign up. No credit card required.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Do you offer discounts for annual billing?
              </h3>
              <p className="text-gray-600">
                Yes! Save 20% when you choose annual billing. Contact us for team and enterprise pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-6">
            Ready to automate your reporting?
          </h2>
          <p className="text-xl text-gray-600 mb-10 font-light">
            Join thousands of teams who've eliminated manual sheet consolidation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isSignedIn ? (
              <Link href="/dashboard" className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-10 py-4 rounded-full text-lg transition-all transform hover:scale-105">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-10 py-4 rounded-full text-lg transition-all transform hover:scale-105">
                    Start Free
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-10 py-4 rounded-full text-lg transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 mb-6">Colony</div>
            
            <div className="flex flex-wrap justify-center gap-8 mb-8 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">Home</Link>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Support</a>
            </div>
            
            <p className="text-gray-500 text-sm">
              © 2025 Colony. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
