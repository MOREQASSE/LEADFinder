import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useOnboarding } from '../../hooks/useOnboarding'
import NotificationBell from './NotificationBell'

const QUOTES = [
  { text: "You have power over your mind — not outside events.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "It is not death that a man should fear, but he should fear never beginning to live.", author: "Marcus Aurelius" },
  { text: "The best revenge is not to be like your enemy.", author: "Marcus Aurelius" },
  { text: "When you arise in the morning, think of what a privilege it is to be alive.", author: "Marcus Aurelius" },
  { text: "The soul becomes dyed with the colour of its thoughts.", author: "Marcus Aurelius" },
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius" },
  { text: "What we do now echoes in eternity.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself.", author: "Marcus Aurelius" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "It is not that we have a short time to live, but that we waste a good deal of it.", author: "Seneca" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "It is a rough road that leads to the heights of greatness.", author: "Seneca" },
  { text: "He suffers more than necessary, who suffers before it is necessary.", author: "Seneca" },
  { text: "Life is long if you know how to use it.", author: "Seneca" },
  { text: "While we are postponing, life speeds by.", author: "Seneca" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
  { text: "He who is brave is free.", author: "Seneca" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "Man is not worried by real problems so much as by his imagined anxieties.", author: "Epictetus" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "Don't explain your philosophy. Embody it.", author: "Epictetus" },
  { text: "Circumstances don't make the man, they only reveal him to himself.", author: "Epictetus" },
  { text: "How long are you going to wait before you demand the best for yourself?", author: "Epictetus" },
  { text: "Freedom is the only worthy goal in life.", author: "Epictetus" },
  { text: "Attach yourself to what is spiritually superior, regardless of what other people think or do.", author: "Epictetus" },
  { text: "He who has a why to live can bear almost any how.", author: "Nietzsche" },
  { text: "I don't take advice from people who have less than me.", author: "Kanye West" },
  { text: "Believe in your flyness, conquer your shyness.", author: "Kanye West" },
  { text: "I am not a businessman. I am a business, man.", author: "Kanye West" },
  { text: "The best thing we as human beings have going for us is our ability to dream.", author: "Kanye West" },
  { text: "I still think I'm the greatest, and I don't plan on being the second greatest.", author: "Kanye West" },
  { text: "If you have the opportunity to play this game of life, you need to appreciate every moment.", author: "Kanye West" },
  { text: "You can't look at a modern-day Picasso if you're too worried about the price of wheat.", author: "Kanye West" },
  { text: "I feel like I'm too busy writing history to read it.", author: "Kanye West" },
  { text: "In order to be the best, you gotta beat the best.", author: "Kanye West" },
  { text: "My greatest skill in this life is being able to ignore what everyone else thinks.", author: "Kanye West" },
  { text: "The more time you spend at something, the closer you are to getting good at it.", author: "Kanye West" },
  { text: "People always say you can't please everyone. Well, I'm not trying to.", author: "Kanye West" },
  { text: "I'm a proud non-reader of books.", author: "Kanye West" },
  { text: "I decided to be a designer because I felt like I could create something that people could believe in.", author: "Kanye West" },
  { text: "Style is something each of us already has. All we need to do is find it.", author: "Kanye West" },
  { text: "Turn tragedy into triumph.", author: "Kanye West" },
  { text: "Be your own competition. Always strive to be better than yesterday.", author: "Kanye West" },
  { text: "I am a creator. I am a innovator. I am a visionary.", author: "Kanye West" },
  { text: "They'll name you as the one who didn't give up.", author: "Kanye West" },
  { text: "Sometimes you have to get lost to find yourself.", author: "Kanye West" },
]

let lastAuthor = ''

function pickNextQuote() {
  let idx
  let attempts = 0
  do {
    idx = Math.floor(Math.random() * QUOTES.length)
    attempts++
  } while (QUOTES[idx].author === lastAuthor && attempts < 20)
  lastAuthor = QUOTES[idx].author
  return idx
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { showWelcome } = useOnboarding()
  const navigate = useNavigate()
  const [quoteIdx, setQuoteIdx] = useState(() => pickNextQuote())
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setQuoteIdx(pickNextQuote())
        setFading(false)
      }, 600)
    }, 12000)
    return () => clearInterval(interval)
  }, [])

  const quote = QUOTES[quoteIdx]

  return (
    <header className="bg-white border-b-[4px] border-black px-5 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={onMenuClick}
          className="w-9 h-9 bg-white border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-700 hover:text-orange-500"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-black tracking-tight hidden sm:block" style={{ fontFamily: "'Bebas Neue', cursive" }}>
          <span className="text-orange-500">LEAD</span>Finder
        </h1>
      </div>

      {/* Quote */}
      <div className="flex-1 min-w-0 text-center px-4">
        <p
          className={`text-xs font-bold text-gray-500 italic truncate transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
        >
          "{quote.text}"
          <span className="not-italic text-gray-400 ml-1.5">— {quote.author}</span>
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={showWelcome}
          title="Replay guided tour"
          aria-label="Replay guided tour"
          className="w-9 h-9 bg-white border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-gray-700 hover:text-orange-500"
        >
          <i className="fa-solid fa-circle-question text-sm"></i>
        </button>
        <NotificationBell />
        <button onClick={() => navigate('/profile')} className="hidden sm:flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-orange-500 border-[2px] border-black flex items-center justify-center">
            <span className="text-white font-black text-xs" style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-700">{user?.name || user?.email}</span>
        </button>
        <button
          onClick={logout}
          className="bg-white border-[3px] border-black text-gray-700 font-black text-xs uppercase tracking-wider px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:text-orange-500 transition-all"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
