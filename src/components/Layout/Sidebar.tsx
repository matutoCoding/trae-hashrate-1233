import { NavLink } from 'react-router-dom';
import { ShieldAlert, ClipboardList, FileBarChart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/', label: '风险清单', icon: ShieldAlert },
  { path: '/todos', label: '待办中心', icon: ClipboardList },
  { path: '/reports', label: '审计报告', icon: FileBarChart },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base">云盘权限审计</h1>
            <p className="text-xs text-slate-400">企业内控平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">本月整改完成率</p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-green-400">68%</span>
            <span className="text-xs text-slate-500 mb-0.5">+12% 环比</span>
          </div>
          <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{ width: '68%' }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
