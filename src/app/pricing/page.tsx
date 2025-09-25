import { PricingTable } from '@clerk/nextjs'
import Link from 'next/link'

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-16 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 text-center">
          Pricing & Plans
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 text-center font-light max-w-2xl">
          Choose the plan that fits your team's needs.<br className="hidden md:block" />
          Upgrade or downgrade anytime.
        </p>
        <div className="w-full">
          <PricingTable />
        </div>
        <Link
          href="/"
          className="mt-8 inline-block border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-8 py-3 rounded-full text-base transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </main>
  )
}
