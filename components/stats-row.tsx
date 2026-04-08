import { CalendarDays, TrendingUp, AlertCircle } from 'lucide-react'

function formatRM(amount: number): string {
  return `RM ${amount.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`
}

interface StatsRowProps {
  totalEvents: number
  totalRevenue: number
  totalPending: number
}

export function StatsRow({ totalEvents, totalRevenue, totalPending }: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-3 lg:gap-5">
      {/* Acara bulan ini */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5 text-center">
        <div className="flex justify-center mb-1 lg:mb-2">
          <CalendarDays size={18} className="text-blue-500 lg:hidden" />
          <CalendarDays size={24} className="text-blue-500 hidden lg:block" />
        </div>
        <p className="text-xl lg:text-3xl font-bold text-gray-900">{totalEvents}</p>
        <p className="text-[11px] lg:text-sm text-gray-500 leading-tight mt-0.5 lg:mt-1">
          Acara Bulan Ini
        </p>
      </div>

      {/* Hasil bulan ini */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5 text-center">
        <div className="flex justify-center mb-1 lg:mb-2">
          <TrendingUp size={18} className="text-green-500 lg:hidden" />
          <TrendingUp size={24} className="text-green-500 hidden lg:block" />
        </div>
        <p className="text-sm lg:text-xl font-bold text-gray-900 leading-tight">
          {formatRM(totalRevenue)}
        </p>
        <p className="text-[11px] lg:text-sm text-gray-500 leading-tight mt-0.5 lg:mt-1">
          Hasil Bulan Ini
        </p>
      </div>

      {/* Baki belum bayar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5 text-center">
        <div className="flex justify-center mb-1 lg:mb-2">
          <AlertCircle
            size={18}
            className={`lg:hidden ${totalPending > 0 ? 'text-red-500' : 'text-gray-400'}`}
          />
          <AlertCircle
            size={24}
            className={`hidden lg:block ${totalPending > 0 ? 'text-red-500' : 'text-gray-400'}`}
          />
        </div>
        <p className={`text-sm lg:text-xl font-bold leading-tight ${totalPending > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          {formatRM(totalPending)}
        </p>
        <p className="text-[11px] lg:text-sm text-gray-500 leading-tight mt-0.5 lg:mt-1">
          Baki Belum Bayar
        </p>
      </div>
    </div>
  )
}
