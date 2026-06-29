import React from 'react'

export default function StructuredDescription({ text }) {
  if (!text) return null;

  // Smart Parsing Logic
  const lines = text.split('\n');
  const sections = [];
  let currentSection = { title: 'Overview', items: [], type: 'paragraph' };

  const sectionKeywords = {
    'Requirements': ['requirement', 'qualification', 'skills', 'stack', 'experience', 'criteria'],
    'Responsibilities': ['responsibility', 'what you will do', 'role', 'tasks', 'duties'],
    'Benefits': ['benefit', 'offer', 'perks', 'compensation', 'what we offer'],
    'Contact': ['contact', 'apply', 'email', 'reach out', 'how to'],
    'Budget': ['budget', 'price', 'compensation', 'pay', 'rate']
  };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if line is a header
    let foundHeader = false;
    for (const [title, keywords] of Object.entries(sectionKeywords)) {
      if (keywords.some(k => trimmed.toLowerCase().startsWith(k)) && trimmed.length < 50 && trimmed.includes(':')) {
        if (currentSection.items.length > 0) sections.push(currentSection);
        currentSection = { title, items: [], type: 'list' };
        foundHeader = true;
        break;
      }
    }

    if (!foundHeader) {
      // Check if it looks like a list item
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
        currentSection.type = 'list';
        currentSection.items.push(trimmed.replace(/^[•\-*\d.]+\s*/, ''));
      } else {
        currentSection.items.push(trimmed);
      }
    }
  });
  sections.push(currentSection);

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={idx} className="group">
          {section.title !== 'Overview' && (
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {section.title}
            </h4>
          )}
          <div className={`p-3 rounded-lg border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md ${section.title === 'Overview' ? 'bg-gradient-to-br from-blue-50/30 to-transparent border-blue-100/50' : ''}`}>
            {section.type === 'list' ? (
              <ul className="grid gap-2">
                {section.items.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-blue-400 mt-1.5">
                      <svg className="w-1.5 h-1.5" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3"/></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {section.items.join('\n')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
