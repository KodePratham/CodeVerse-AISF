'use client'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-semibold text-gray-900">Pangat AI</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="text-gray-700 hover:text-gray-900 font-medium">
                Sign In
              </button>
              <button className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-full transition-colors">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8 min-h-[80vh] flex items-center">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-light text-gray-900 mb-8 leading-tight">
            Intelligence.
            <br />
            <span className="font-normal">Simplified.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 font-light max-w-2xl mx-auto leading-relaxed">
            The most advanced AI platform designed for everyone. 
            Powerful capabilities made beautifully simple.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-8 py-4 rounded-full text-lg transition-all transform hover:scale-105">
              Get Started
            </button>
            <button className="text-primary-500 hover:text-primary-600 font-medium px-8 py-4 text-lg transition-colors">
              Learn more →
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-gray-600 mb-10 font-light">
            Join thousands who are already experiencing the future of AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="bg-primary-500 hover:bg-primary-600 text-white font-medium px-10 py-4 rounded-full text-lg transition-all transform hover:scale-105">
              Sign Up Free
            </button>
            <button className="border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-10 py-4 rounded-full text-lg transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 mb-6">Pangat AI</div>
            
            <div className="flex flex-wrap justify-center gap-8 mb-8 text-sm">
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">Support</a>
            </div>
            
            <p className="text-gray-500 text-sm">
              © 2024 Pangat AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
