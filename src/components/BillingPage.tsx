import { useState } from 'react';
import {
  CreditCard, Check, Zap, Crown, Building2, Download,
  ChevronRight, AlertCircle, Video, HardDrive, Users,
} from 'lucide-react';

type Plan = 'free' | 'pro' | 'business';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: 'Paid' | 'Pending';
}

const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-001', date: 'Mar 1, 2026', amount: '$12.00', plan: 'Pro', status: 'Paid' },
  { id: 'INV-002', date: 'Feb 1, 2026', amount: '$12.00', plan: 'Pro', status: 'Paid' },
  { id: 'INV-003', date: 'Jan 1, 2026', amount: '$12.00', plan: 'Pro', status: 'Paid' },
];

const PLANS = [
  {
    id: 'free' as Plan,
    name: 'Free',
    price: '$0',
    period: '/month',
    icon: Video,
    color: 'gray',
    features: ['25 videos', '5 min per video', '720p quality', 'Basic sharing', '5 GB storage'],
    limits: { videos: 25, videoMax: 25, storage: 5, storageMax: 5, members: 1, membersMax: 1 },
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    price: '$12',
    period: '/month',
    icon: Zap,
    color: 'red',
    features: ['Unlimited videos', 'Unlimited length', '4K quality', 'Advanced sharing', '50 GB storage', 'Custom branding'],
    limits: { videos: 12, videoMax: null, storage: 18, storageMax: 50, members: 1, membersMax: 1 },
  },
  {
    id: 'business' as Plan,
    name: 'Business',
    price: '$20',
    period: '/user/month',
    icon: Building2,
    color: 'purple',
    features: ['Everything in Pro', 'Team management', 'SSO & SAML', 'Priority support', '200 GB storage', 'Admin controls', 'Analytics'],
    limits: { videos: 12, videoMax: null, storage: 18, storageMax: 200, members: 3, membersMax: 20 },
  },
];

export function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<Plan>('free');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [showCardModal, setShowCardModal] = useState(false);
  const [upgrading, setUpgrading] = useState<Plan | null>(null);

  const handleUpgrade = (plan: Plan) => {
    setUpgrading(plan);
    setTimeout(() => {
      setCurrentPlan(plan);
      setUpgrading(null);
    }, 1200);
  };

  const activePlan = PLANS.find(p => p.id === currentPlan)!;
  const annualDiscount = 0.2;

  const formatPrice = (price: string) => {
    if (price === '$0') return price;
    const num = parseFloat(price.replace('$', ''));
    if (billing === 'annual') return `$${(num * (1 - annualDiscount)).toFixed(0)}`;
    return price;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Admin Tools</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Billing & Plans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your subscription and payment details</p>
        </div>

        {/* Current plan summary */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 right-20 w-24 h-24 bg-white/5 rounded-full -mb-10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Current plan</div>
                <div className="text-2xl font-black">{activePlan.name}</div>
                <div className="text-gray-400 text-sm mt-1">
                  {currentPlan === 'free' ? 'Free forever — upgrade anytime' : `Renews Apr 1, 2026 · ${activePlan.price}/mo`}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {currentPlan !== 'free' && (
                  <button
                    onClick={() => setShowCardModal(true)}
                    className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    •••• 4242
                  </button>
                )}
                {currentPlan !== 'free' && (
                  <button
                    onClick={() => handleUpgrade('free')}
                    className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Cancel plan
                  </button>
                )}
              </div>
            </div>

            {/* Usage bars */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {[
                { label: 'Videos', icon: Video, used: activePlan.limits.videos, max: activePlan.limits.videoMax },
                { label: 'Storage', icon: HardDrive, used: activePlan.limits.storage, max: activePlan.limits.storageMax, unit: 'GB' },
                { label: 'Members', icon: Users, used: activePlan.limits.members, max: activePlan.limits.membersMax },
              ].map(({ label, icon: Icon, used, max, unit = '' }) => {
                const pct = max ? (used / max) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1 text-gray-400">
                        <Icon className="w-3 h-3" />
                        {label}
                      </div>
                      <div className="text-white font-medium">
                        {used}{unit} {max ? `/ ${max}${unit}` : '/ ∞'}
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-400' : 'bg-white/60'}`}
                        style={{ width: max ? `${Math.min(pct, 100)}%` : '10%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            className={`relative w-11 h-6 rounded-full transition-colors ${billing === 'annual' ? 'bg-red-600' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${billing === 'annual' ? 'left-6' : 'left-1'}`} />
          </button>
          <span className={`text-sm font-medium ${billing === 'annual' ? 'text-gray-900' : 'text-gray-400'}`}>
            Annual <span className="text-green-600 font-semibold">Save 20%</span>
          </span>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;
            const isHighlighted = plan.id === 'pro';
            const isUpgrading = upgrading === plan.id;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 p-5 flex flex-col transition-all relative ${
                  isCurrent ? 'border-red-500 shadow-lg' :
                  isHighlighted ? 'border-gray-300 shadow-md' : 'border-gray-200'
                }`}
              >
                {isHighlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Most popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Current plan
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  plan.color === 'red' ? 'bg-red-100' :
                  plan.color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    plan.color === 'red' ? 'text-red-600' :
                    plan.color === 'purple' ? 'text-purple-600' : 'text-gray-600'
                  }`} />
                </div>

                <h3 className="font-black text-gray-900 text-lg">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-4">
                  <span className="text-3xl font-black text-gray-900">{formatPrice(plan.price)}</span>
                  <span className="text-sm text-gray-400">{plan.period}</span>
                  {billing === 'annual' && plan.price !== '$0' && (
                    <span className="text-xs text-green-600 font-semibold ml-1">-20%</span>
                  )}
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  disabled={isCurrent || isUpgrading}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isCurrent
                      ? 'bg-gray-50 text-gray-400 cursor-default border border-gray-200'
                      : plan.color === 'purple'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                      : plan.id === 'free' && currentPlan !== 'free'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
                  }`}
                >
                  {isUpgrading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Upgrading…
                    </span>
                  ) : isCurrent ? 'Current plan' : plan.id === 'free' ? 'Downgrade' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Invoice history */}
        {currentPlan !== 'free' && (
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Invoice history</h2>
              <button className="text-xs text-red-600 hover:text-red-700 font-semibold">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {MOCK_INVOICES.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{inv.plan} plan — {inv.date}</div>
                      <div className="text-xs text-gray-400">{inv.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900">{inv.amount}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inv.status}
                    </span>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                      <Download className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Free plan invoice notice */}
        {currentPlan === 'free' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-blue-900">No billing history</div>
              <div className="text-sm text-blue-700 mt-0.5">You're on the free plan. Upgrade to unlock invoices and advanced features.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
