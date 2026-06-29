import React from 'react'
import { useSettings } from '../../hooks/useSettings'

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize",
  "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo",
  "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
  "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
  "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal",
  "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain",
  "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
]

export default function CountrySelector() {
  const { getValue, setValue } = useSettings()
  const [search, setSearch] = React.useState('')

  const current = getValue('country', 'United States')

  const sorted = React.useMemo(() => {
    const filtered = search
      ? COUNTRIES.filter(c => c.toLowerCase().includes(search.toLowerCase()))
      : [...COUNTRIES]
    const idx = filtered.indexOf(current)
    if (idx > 0) {
      const item = filtered.splice(idx, 1)[0]
      filtered.unshift(item)
    }
    return filtered
  }, [search, current])

  return (
    <div>
      <p className="text-sm font-bold text-gray-600 mb-4">
        Used as the location in LinkedIn and other job board searches.
      </p>
      <div className="relative">
        <input
          type="text"
          className="w-full bg-[#f5f0eb] border-[3px] border-black px-4 py-3 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[1px] focus:translate-y-[1px] transition-all outline-none"
          placeholder="Search countries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 font-black text-lg leading-none"
            onClick={() => setSearch('')}
          >
            &times;
          </button>
        )}
      </div>
      <div className="mt-3 max-h-48 overflow-y-auto border-[3px] border-black bg-white">
        {sorted.map(country => (
          <button
            key={country}
            type="button"
            onClick={() => { setValue('country', country); setSearch('') }}
            className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-all border-b-[1px] border-black last:border-b-0 ${
              current === country
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-[#f5f0eb] hover:translate-x-[1px]'
            }`}
          >
            {current === country && (
              <i className="fa-solid fa-check mr-2"></i>
            )}
            {country}
          </button>
        ))}
        {sorted.length === 0 && (
          <p className="px-4 py-4 text-sm font-bold text-gray-400 text-center">No countries match "{search}"</p>
        )}
      </div>
    </div>
  )
}
