import React, { useState, useCallback } from 'react'
import { Document, Page, Text, View, Image, StyleSheet, PDFDownloadLink, BlobProvider } from '@react-pdf/renderer'
import ToolCard from '../ToolCard'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 56, height: 56, objectFit: 'contain' },
  titleBlock: {},
  title: { fontSize: 28, fontWeight: 'bold', color: '#f97316' },
  invoiceNum: { fontSize: 10, color: '#666', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#999', marginBottom: 8 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 6 },
  rowHeader: { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#000', paddingVertical: 6 },
  cell: { fontSize: 9, color: '#333' },
  cellBold: { fontSize: 9, fontWeight: 'bold', color: '#000' },
  cellRight: { fontSize: 9, color: '#333', textAlign: 'right' },
  cellHeader: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', color: '#666' },
  total: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: '#000' },
  totalLabel: { fontSize: 10, fontWeight: 'bold', marginRight: 20 },
  totalValue: { fontSize: 14, fontWeight: 'bold', color: '#f97316' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999' },
})

function InvoiceDocument({ data }) {
  const subtotal = data.items.reduce((sum, item) => sum + (item.qty * item.price), 0)
  const taxAmount = subtotal * (data.tax / 100)
  const total = subtotal + taxAmount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data.logo && (
              <Image src={data.logo} style={styles.logo} />
            )}
            <View style={styles.titleBlock}>
              <Text style={styles.title}>INVOICE</Text>
              <Text style={styles.invoiceNum}>#{data.invoiceNumber}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 9, color: '#333' }}>Date: {data.date}</Text>
            {data.dueDate && <Text style={{ fontSize: 9, color: '#333' }}>Due: {data.dueDate}</Text>}
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
          <View style={{ width: '45%' }}>
            <Text style={styles.sectionTitle}>From</Text>
            <Text style={styles.cellBold}>{data.fromName || 'Your Name'}</Text>
            <Text style={styles.cell}>{data.fromEmail}</Text>
            <Text style={styles.cell}>{data.fromAddress}</Text>
          </View>
          <View style={{ width: '45%' }}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.cellBold}>{data.toName || 'Client Name'}</Text>
            <Text style={styles.cell}>{data.toEmail}</Text>
            <Text style={styles.cell}>{data.toAddress}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.rowHeader}>
            <Text style={[styles.cellHeader, { width: '40%' }]}>Description</Text>
            <Text style={[styles.cellHeader, { width: '15%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.cellHeader, { width: '20%', textAlign: 'right' }]}>Price</Text>
            <Text style={[styles.cellHeader, { width: '25%', textAlign: 'right' }]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.cell, { width: '40%' }]}>{item.description || 'Item'}</Text>
              <Text style={[styles.cell, { width: '15%', textAlign: 'center' }]}>{item.qty}</Text>
              <Text style={[styles.cellRight, { width: '20%' }]}>{data.currency}{item.price.toFixed(2)}</Text>
              <Text style={[styles.cellBold, { width: '25%', textAlign: 'right' }]}>{data.currency}{(item.qty * item.price).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ width: 200 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.cell}>Subtotal</Text>
              <Text style={styles.cell}>{data.currency}{subtotal.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.cell}>Tax ({data.tax}%)</Text>
              <Text style={styles.cell}>{data.currency}{taxAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.total}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>{data.currency}{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {data.notes && (
          <View style={{ marginTop: 30, padding: 15, backgroundColor: '#f9f9f9', borderLeftWidth: 3, borderLeftColor: '#f97316' }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.cell}>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>Generated with LEADFinder Tools</Text>
      </Page>
    </Document>
  )
}

export default function InvoiceGenerator() {
  const [data, setData] = useState({
    invoiceNumber: 'INV-001',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    fromName: '',
    fromEmail: '',
    fromAddress: '',
    toName: '',
    toEmail: '',
    toAddress: '',
    items: [{ description: '', qty: 1, price: 0 }],
    tax: 0,
    currency: '$',
    notes: '',
    logo: null,
  })
  const [logoName, setLogoName] = useState('')

  const updateField = (field, value) => setData({ ...data, [field]: value })

  const handleLogoUpload = useCallback((file) => {
    if (!file) return
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) return
    if (file.size > 2 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setData(prev => ({ ...prev, logo: e.target.result }))
      setLogoName(file.name)
    }
    reader.readAsDataURL(file)
  }, [])

  const removeLogo = () => {
    setData(prev => ({ ...prev, logo: null }))
    setLogoName('')
  }

  const updateItem = (index, field, value) => {
    const items = [...data.items]
    items[index] = { ...items[index], [field]: field === 'description' ? value : Number(value) || 0 }
    setData({ ...data, items })
  }

  const addItem = () => {
    setData({ ...data, items: [...data.items, { description: '', qty: 1, price: 0 }] })
  }

  const removeItem = (index) => {
    if (data.items.length <= 1) return
    setData({ ...data, items: data.items.filter((_, i) => i !== index) })
  }

  const subtotal = data.items.reduce((sum, item) => sum + (item.qty * item.price), 0)
  const taxAmount = subtotal * (data.tax / 100)
  const total = subtotal + taxAmount

  return (
    <ToolCard title="Invoice Generator" description="Create and download professional invoices as PDF" icon="fa-file-invoice">
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Form */}
          <div className="space-y-4">
            {/* Invoice details */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Invoice #</div>
                <input
                  type="text"
                  value={data.invoiceNumber}
                  onChange={e => updateField('invoiceNumber', e.target.value)}
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                />
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Date</div>
                <input
                  type="date"
                  value={data.date}
                  onChange={e => updateField('date', e.target.value)}
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                />
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Due Date</div>
                <input
                  type="date"
                  value={data.dueDate}
                  onChange={e => updateField('dueDate', e.target.value)}
                  className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none"
                />
              </div>
            </div>

            {/* Logo upload */}
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Company Logo (optional)</div>
              {data.logo ? (
                <div className="flex items-center gap-3 bg-[#f5f0eb] border-[3px] border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <img src={data.logo} alt="Logo" className="w-12 h-12 object-contain border-[2px] border-black bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{logoName}</div>
                    <div className="text-[10px] font-bold text-gray-500">Ready to embed in PDF</div>
                  </div>
                  <button
                    onClick={removeLogo}
                    className="w-8 h-8 bg-red-500 border-[3px] border-black flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-all shrink-0"
                  >
                    <i className="fa-solid fa-xmark text-xs"></i>
                  </button>
                </div>
              ) : (
                <label
                  className="flex items-center justify-center gap-3 bg-[#f5f0eb] border-[3px] border-dashed border-gray-400 p-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
                >
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={e => handleLogoUpload(e.target.files[0])}
                  />
                  <div className="w-10 h-10 bg-white border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <i className="fa-solid fa-cloud-arrow-up text-orange-500"></i>
                  </div>
                  <div>
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Upload Logo</span>
                    <span className="block text-[10px] font-bold text-gray-500">JPG, PNG or WebP — max 2MB</span>
                  </div>
                </label>
              )}
            </div>

            {/* From / To */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">From</div>
                <input type="text" value={data.fromName} onChange={e => updateField('fromName', e.target.value)} placeholder="Your name" className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
                <input type="email" value={data.fromEmail} onChange={e => updateField('fromEmail', e.target.value)} placeholder="Email" className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
                <input type="text" value={data.fromAddress} onChange={e => updateField('fromAddress', e.target.value)} placeholder="Address" className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Bill To</div>
                <input type="text" value={data.toName} onChange={e => updateField('toName', e.target.value)} placeholder="Client name" className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
                <input type="email" value={data.toEmail} onChange={e => updateField('toEmail', e.target.value)} placeholder="Email" className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
                <input type="text" value={data.toAddress} onChange={e => updateField('toAddress', e.target.value)} placeholder="Address" className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Items</div>
              <div className="space-y-2">
                {data.items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Description" className="flex-1 bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
                    <input type="number" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} min="1" className="w-16 bg-[#f5f0eb] border-[3px] border-black px-2 py-2 text-sm font-medium text-center focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
                    <input type="number" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} min="0" step="0.01" className="w-24 bg-[#f5f0eb] border-[3px] border-black px-2 py-2 text-sm font-medium text-right focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
                    <button onClick={() => removeItem(i)} className="w-9 h-9 bg-red-500 border-[3px] border-black flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-all shrink-0">
                      <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="mt-2 w-full bg-white border-[3px] border-black border-dashed px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-orange-50 hover:text-orange-500 transition-all">
                <i className="fa-solid fa-plus mr-1"></i> Add Item
              </button>
            </div>

            {/* Tax & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Tax %</div>
                <input type="number" value={data.tax} onChange={e => updateField('tax', Number(e.target.value))} min="0" max="100" className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none" />
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Currency</div>
                <select value={data.currency} onChange={e => updateField('currency', e.target.value)} className="w-full bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none cursor-pointer">
                  <optgroup label="Major">
                    <option value="$">$ USD — US Dollar</option>
                    <option value="€">€ EUR — Euro</option>
                    <option value="£">£ GBP — British Pound</option>
                    <option value="¥">¥ JPY — Japanese Yen</option>
                    <option value="¥">¥ CNY — Chinese Yuan</option>
                    <option value="₩">₩ KRW — South Korean Won</option>
                    <option value="₹">₹ INR — Indian Rupee</option>
                    <option value="R$">R$ BRL — Brazilian Real</option>
                    <option value="C$">C$ CAD — Canadian Dollar</option>
                    <option value="A$">A$ AUD — Australian Dollar</option>
                    <option value="CHF">CHF — Swiss Franc</option>
                    <option value="₽">₽ RUB — Russian Ruble</option>
                    <option value="₺">₺ TRY — Turkish Lira</option>
                  </optgroup>
                  <optgroup label="Arab World">
                    <option value="MAD">MAD — Moroccan Dirham</option>
                    <option value="EGP">EGP — Egyptian Pound</option>
                    <option value="SAR">SAR — Saudi Riyal</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="QAR">QAR — Qatari Riyal</option>
                    <option value="KWD">KWD — Kuwaiti Dinar</option>
                    <option value="BHD">BHD — Bahraini Dinar</option>
                    <option value="OMR">OMR — Omani Rial</option>
                    <option value="JOD">JOD — Jordanian Dinar</option>
                    <option value="LBP">LBP — Lebanese Pound</option>
                    <option value="IQD">IQD — Iraqi Dinar</option>
                    <option value="SYP">SYP — Syrian Pound</option>
                    <option value="YER">YER — Yemeni Rial</option>
                    <option value="SDG">SDG — Sudanese Pound</option>
                    <option value="LYD">LYD — Libyan Dinar</option>
                    <option value="TND">TND — Tunisian Dinar</option>
                    <option value="DZD">DZD — Algerian Dinar</option>
                    <option value="MRU">MRU — Mauritanian Ouguiya</option>
                    <option value="SOS">SOS — Somali Shilling</option>
                    <option value="DJF">DJF — Djiboutian Franc</option>
                    <option value="KMF">KMF — Comorian Franc</option>
                  </optgroup>
                  <optgroup label="Africa">
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="ZAR">ZAR — South African Rand</option>
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="GHS">GHS — Ghanaian Cedi</option>
                    <option value="ETB">ETB — Ethiopian Birr</option>
                    <option value="TZS">TZS — Tanzanian Shilling</option>
                    <option value="UGX">UGX — Ugandan Shilling</option>
                    <option value="XOF">XOF — CFA Franc (West)</option>
                    <option value="XAF">XAF — CFA Franc (Central)</option>
                    <option value="MGA">MGA — Malagasy Ariary</option>
                    <option value="MWK">MWK — Malawian Kwacha</option>
                    <option value="ZMW">ZMW — Zambian Kwacha</option>
                    <option value="BWP">BWP — Botswana Pula</option>
                    <option value="SCR">SCR — Seychellois Rupee</option>
                    <option value="MUR">MUR — Mauritian Rupee</option>
                    <option value="RWF">RWF — Rwandan Franc</option>
                    <option value="CDF">CDF — Congolese Franc</option>
                    <option value="AOA">AOA — Angolan Kwanza</option>
                    <option value="MZN">MZN — Mozambican Metical</option>
                    <option value="SZL">SZL — Swazi Lilangeni</option>
                    <option value="NAD">NAD — Namibian Dollar</option>
                    <option value="LSL">LSL — Lesotho Loti</option>
                    <option value="GMD">GMD — Gambian Dalasi</option>
                    <option value="GNF">GNF — Guinean Franc</option>
                    <option value="SLL">SLL — Sierra Leonean Leone</option>
                    <option value="LRD">LRD — Liberian Dollar</option>
                    <option value="CVE">CVE — Cape Verdean Escudo</option>
                    <option value="STN">STN — São Tomé Dobra</option>
                    <option value="ERN">ERN — Eritrean Nakfa</option>
                    <option value="BIF">BIF — Burundian Franc</option>
                    <option value="SSP">SSP — South Sudanese Pound</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Notes</div>
              <textarea value={data.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Payment terms, thank you note..." className="w-full h-20 bg-[#f5f0eb] border-[3px] border-black px-3 py-2 text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all outline-none resize-none" />
            </div>
          </div>

          {/* Preview */}
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Preview</div>
            <div className="border-[4px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
              <BlobProvider document={<InvoiceDocument data={data} />}>
                {({ url, loading }) => (
                  loading ? (
                    <div className="flex items-center justify-center h-[500px]">
                      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent animate-spin"></div>
                    </div>
                  ) : url ? (
                    <iframe src={url} className="w-full h-[500px]" title="Invoice Preview" />
                  ) : null
                )}
              </BlobProvider>
            </div>

            {/* Summary */}
            <div className="mt-4 bg-[#f5f0eb] border-[3px] border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-gray-600">Subtotal</span>
                <span className="text-xs font-black">{data.currency}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-gray-600">Tax ({data.tax}%)</span>
                <span className="text-xs font-black">{data.currency}{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t-[3px] border-black">
                <span className="text-sm font-black uppercase tracking-wider">Total</span>
                <span className="text-lg font-black text-orange-500">{data.currency}{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Download */}
            <PDFDownloadLink
              document={<InvoiceDocument data={data} />}
              fileName={`invoice-${data.invoiceNumber || 'draft'}.pdf`}
              className="mt-4 block w-full bg-orange-500 border-[3px] border-black px-4 py-3 text-sm font-black uppercase tracking-wider text-white text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {({ loading }) => loading ? 'Generating...' : 'Download PDF Invoice'}
            </PDFDownloadLink>
          </div>
        </div>
      </div>
    </ToolCard>
  )
}
