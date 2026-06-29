import React from 'react';
import { CRAIGSLIST_SITES } from '../../data/craigslist_sites';

export default function CraigslistSiteSelector({ value, onChange, maxRegions, onMaxRegionsChange }) {
  const [expandedCountries, setExpandedCountries] = React.useState({});
  
  const selectedSites = React.useMemo(() => {
    return value ? value.split(',').filter(Boolean) : [];
  }, [value]);

  const toggleCountry = (country) => {
    setExpandedCountries(prev => ({
      ...prev,
      [country]: !prev[country]
    }));
  };

  const handleSiteToggle = (site) => {
    let newSelected;
    if (selectedSites.includes(site)) {
      newSelected = selectedSites.filter(s => s !== site);
    } else {
      newSelected = [...selectedSites, site];
    }
    
    const newValue = newSelected.join(',');
    onChange(newValue);
    
    // Auto-adjust max regions
    if (newSelected.length > parseInt(maxRegions || 0)) {
      onMaxRegionsChange(newSelected.length.toString());
    }
  };

  const handleSelectAllCountry = (country, sites) => {
    const countrySitesSet = new Set(sites);
    const otherSelected = selectedSites.filter(s => !countrySitesSet.has(s));
    
    const allCountrySelected = sites.every(s => selectedSites.includes(s));
    
    let newSelected;
    if (allCountrySelected) {
      // Unselect all in this country
      newSelected = otherSelected;
    } else {
      // Select all in this country
      newSelected = [...otherSelected, ...sites];
    }
    
    const newValue = newSelected.join(',');
    onChange(newValue);
    
    // Auto-adjust max regions
    if (newSelected.length > parseInt(maxRegions || 0)) {
      onMaxRegionsChange(newSelected.length.toString());
    }
  };

  return (
    <div className="mt-4 border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Region Selector</span>
        <span className="text-xs text-gray-500 font-medium">
          {selectedSites.length} regions selected
        </span>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {Object.entries(CRAIGSLIST_SITES).map(([country, sites]) => {
          const isExpanded = expandedCountries[country];
          const countrySelectedCount = sites.filter(s => selectedSites.includes(s)).length;
          const isAllSelected = countrySelectedCount === sites.length;
          const isSomeSelected = countrySelectedCount > 0 && !isAllSelected;

          return (
            <div key={country} className="border border-gray-100 rounded-lg overflow-hidden">
              <div 
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  isSomeSelected || isAllSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleCountry(country)}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className={`text-sm font-semibold ${isAllSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                    {country}
                  </span>
                  {countrySelectedCount > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                      {countrySelectedCount}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAllCountry(country, sites);
                  }}
                  className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                    isAllSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {isAllSelected ? 'DESELECT ALL' : 'SELECT ALL'}
                </button>
              </div>

              {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 p-2 bg-white border-t border-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  {sites.map(site => (
                    <label 
                      key={site} 
                      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all hover:bg-gray-50 ${
                        selectedSites.includes(site) ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedSites.includes(site)}
                        onChange={() => handleSiteToggle(site)}
                      />
                      <span className={`text-xs ${selectedSites.includes(site) ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                        {site}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
