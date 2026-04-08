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
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
        <div className="flex justify-center mb-1">
          <CalendarDays size={18} className="text-blue-500" />
        </div>
        <p className="text-xl font-bold text-gray-900">{totalEvents}</p>
        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
          Acara<br />Bulan Ini
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
        <div className="flex justify-center mb-1">
          <TrendingUp size={18} className="text-green-500" />
        </div>
        <p className="text-sm font-bold text-gray-900 leading-tight">
          {formatRM(totalRevenue)}
        </p>
        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
          Hasil<br />Bulan Ini
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
        <div className="flex justify-center mb-1">
          <AlertCircle size={18} className={totalPending > 0 ? 'text-red-500' : 'text-gray-400'} />
        </div>
        <p className={`text-sm font-bold leading-tight ${totalPending > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          {formatRM(totalPending)}
        </p>
        <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
          Baki<br />Belum Bayar
        </p>
      </div>
    </div>
  )
}
