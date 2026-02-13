import { Link, useLocation } from 'react-router-dom';
import { FileText, GitCompare, MessageSquare, HelpCircle, Upload } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Upload', icon: Upload },
  { path: '/extraction', label: 'Results', icon: FileText },
  { path: '/comparison', label: 'Compare', icon: GitCompare },
  { path: '/qa', label: 'Q&A', icon: MessageSquare },
  { path: '/faq', label: 'FAQ', icon: HelpCircle },
];

export default function Header() {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <img
              src="/NSOffice Logo - Dark-Vps2lMvs.png"
              alt="NSOffice.AI"
              className="h-8"
            />
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium no-underline transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
