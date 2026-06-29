import { useState, useEffect } from 'react'
import { BlobProvider, PDFDownloadLink } from '@react-pdf/renderer'
import api from '../../services/api'
import ResumePDF from './ResumePDF'
import CoverLetterPDF from './CoverLetterPDF'

const CVSection = ({ lead }) => {
  const [resume, setResume] = useState(null)
  const [coverLetter, setCoverLetter] = useState(null)
  const [generating, setGenerating] = useState({ resume: false, coverLetter: false })
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [userLocation, setUserLocation] = useState('')
  const [userPortfolio, setUserPortfolio] = useState('')

  useEffect(() => {
    if (!lead?.id) return
    api.get(`/automation/${lead.id}/documents`).then((res) => {
      const docs = res.data || []
      const r = docs.find((d) => d.doc_type === 'resume')
      const cl = docs.find((d) => d.doc_type === 'cover_letter')
      if (r) setResume(r.content_json)
      if (cl) setCoverLetter(cl.content_json)
    }).catch(() => {})
    api.get('/ai/resume').then((res) => {
      const d = res.data
      if (d) {
        setUserName(d.name || '')
        setUserEmail(d.email || '')
        setUserPhone(d.phone || '')
        setUserLocation(d.location || '')
        setUserPortfolio(d.portfolio_url || '')
      }
    }).catch(() => {})
  }, [lead?.id])

  const handleGenerate = async (type) => {
    setGenerating((g) => ({ ...g, [type]: true }))
    try {
      const endpoint = type === 'resume'
        ? `/automation/${lead.id}/generate-resume`
        : `/automation/${lead.id}/generate-cover-letter`
      const res = await api.post(endpoint)
      if (type === 'resume') setResume(res.data)
      else setCoverLetter(res.data)
    } catch (err) {
      console.error(`Generate ${type} error:`, err)
    }
    setGenerating((g) => ({ ...g, [type]: false }))
  }

  const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)

  return (
    <div className="bg-white border-[4px] border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-4 pb-3 border-b-[3px] border-black">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rotate-45" />
          <div>
            <h4 className="text-base font-black uppercase tracking-wider text-gray-900" style={{ fontFamily: "'Bebas Neue', cursive" }}>
              CV & Cover Letter
            </h4>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              AI-generated tailored for this job
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Resume Panel */}
        <div className="flex-1 border-[3px] border-black flex flex-col">
          <div className="flex items-center justify-between bg-[#222222] text-white px-4 py-2 border-b-[3px] border-black">
            <span className="text-xs font-black uppercase tracking-wider">Resume</span>
            <button
              onClick={() => handleGenerate('resume')}
              disabled={generating.resume}
              className="text-[10px] font-black uppercase bg-orange-500 text-white px-3 py-1 border-[2px] border-black hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
              {generating.resume ? 'Generating...' : resume ? 'Regenerate' : 'Generate Resume'}
            </button>
          </div>
          <div className="h-[420px] bg-gray-50">
            {resume ? (
              <BlobProvider document={
                <ResumePDF
                  content={resume}
                  userName={userName}
                  userEmail={userEmail}
                  userPhone={userPhone}
                  userLocation={userLocation}
                  userPortfolio={userPortfolio}
                />
              }>
                {({ url, loading, error }) => {
                  if (error) return (
                    <div className="h-full flex items-center justify-center text-red-500 text-xs font-bold px-4 text-center">
                      Failed to render PDF. Try regenerating.
                    </div>
                  )
                  if (loading || !url) return (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                      Loading preview...
                    </div>
                  )
                  return (
                    <iframe src={url} title="Resume PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
                  )
                }}
              </BlobProvider>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold px-4 text-center">
                {generating.resume ? 'Generating tailored resume...' : 'Click "Generate Resume" to create an ATS-optimized CV for this job'}
              </div>
            )}
          </div>
          {resume && (
            <div className="bg-[#222222] px-4 py-2 border-t-[3px] border-black">
              <PDFDownloadLink
                document={
                  <ResumePDF
                    content={resume}
                    userName={userName}
                    userEmail={userEmail}
                    userPhone={userPhone}
                    userLocation={userLocation}
                    userPortfolio={userPortfolio}
                  />
                }
                fileName={`${sanitize(lead?.title)}_${sanitize(userName)}_Resume.pdf`}
                className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 transition-colors"
              >
                {({ loading }) => loading ? 'Preparing...' : '⬇ Download Resume PDF'}
              </PDFDownloadLink>
            </div>
          )}
        </div>

        {/* Cover Letter Panel */}
        <div className="flex-1 border-[3px] border-black flex flex-col">
          <div className="flex items-center justify-between bg-[#222222] text-white px-4 py-2 border-b-[3px] border-black">
            <span className="text-xs font-black uppercase tracking-wider">Cover Letter</span>
            <button
              onClick={() => handleGenerate('coverLetter')}
              disabled={generating.coverLetter}
              className="text-[10px] font-black uppercase bg-orange-500 text-white px-3 py-1 border-[2px] border-black hover:bg-orange-400 transition-colors disabled:opacity-50"
            >
              {generating.coverLetter ? 'Generating...' : coverLetter ? 'Regenerate' : 'Generate Cover Letter'}
            </button>
          </div>
          <div className="h-[420px] bg-gray-50">
            {coverLetter ? (
              <BlobProvider document={
                <CoverLetterPDF
                  content={coverLetter}
                  userName={userName}
                  userEmail={userEmail}
                  userPhone={userPhone}
                />
              }>
                {({ url, loading, error }) => {
                  if (error) return (
                    <div className="h-full flex items-center justify-center text-red-500 text-xs font-bold px-4 text-center">
                      Failed to render PDF. Try regenerating.
                    </div>
                  )
                  if (loading || !url) return (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                      Loading preview...
                    </div>
                  )
                  return (
                    <iframe src={url} title="Cover Letter PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
                  )
                }}
              </BlobProvider>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm font-bold px-4 text-center">
                {generating.coverLetter ? 'Generating tailored cover letter...' : 'Click "Generate Cover Letter" to create a tailored letter for this job'}
              </div>
            )}
          </div>
          {coverLetter && (
            <div className="bg-[#222222] px-4 py-2 border-t-[3px] border-black">
              <PDFDownloadLink
                document={
                  <CoverLetterPDF
                    content={coverLetter}
                    userName={userName}
                    userEmail={userEmail}
                    userPhone={userPhone}
                  />
                }
                fileName={`${sanitize(lead?.title)}_${sanitize(userName)}_Cover_Letter.pdf`}
                className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 transition-colors"
              >
                {({ loading }) => loading ? 'Preparing...' : '⬇ Download Cover Letter PDF'}
              </PDFDownloadLink>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CVSection
