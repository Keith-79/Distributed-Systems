import React from 'react';

export default function Footer(){
  return (
    <footer className="mt-12 border-t border-gray-200 bg-gray-50">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm text-gray-600">
        <div>
          <div className="font-semibold text-gray-900 mb-2">Support</div>
          <ul className="flex flex-col gap-2">
            <li><a href="#" className="hover:underline">Help Center</a></li>
            <li><a href="#" className="hover:underline">Get help with a safety issue</a></li>
            <li><a href="#" className="hover:underline">AirCover</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-2">Hosting</div>
          <ul className="flex flex-col gap-2">
            <li><a href="#" className="hover:underline">Airbnb your home</a></li>
            <li><a href="#" className="hover:underline">AirCover for Hosts</a></li>
            <li><a href="#" className="hover:underline">Community forum</a></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-900 mb-2">Airbnb</div>
          <ul className="flex flex-col gap-2">
            <li><a href="#" className="hover:underline">Newsroom</a></li>
            <li><a href="#" className="hover:underline">Careers</a></li>
            <li><a href="#" className="hover:underline">Investors</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between text-sm text-gray-600">
          <div>© 2025 Airbnb, Inc. · <a href="#" className="hover:underline">Terms</a> · <a href="#" className="hover:underline">Privacy</a> · <a href="#" className="hover:underline">Sitemap</a></div>
          <div className="flex items-center gap-4">
            <button className="hover:text-gray-900">🌐 English (US)</button>
            <button className="hover:text-gray-900">$ USD</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
