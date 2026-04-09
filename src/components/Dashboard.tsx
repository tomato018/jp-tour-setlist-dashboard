'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface DashboardProps {
  concerts: string[]
  setlists: Record<string, string[]>
}

type SortOrder = null | 'desc' | 'asc'

export default function Dashboard({ concerts, setlists }: DashboardProps) {
  // Precompute song sets per concert (stable)
  const SETS = useMemo(() => {
    const s: Record<string, Set<string>> = {}
    concerts.forEach(c => { s[c] = new Set(setlists[c]) })
    return s
  }, [concerts, setlists])

  // Songs in first-appearance order (stable)
  const SONGS_ORDERED = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    concerts.forEach(c => {
      setlists[c].forEach(s => {
        if (!seen.has(s)) { result.push(s); seen.add(s) }
      })
    })
    return result
  }, [concerts, setlists])

  // State
  const [allMode, setAllMode] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(concerts))
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'stats' | 'setlist' | 'favorites'>('stats')
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try { return new Set(JSON.parse(localStorage.getItem('oor-favorites') ?? '[]')) } catch { return new Set() }
  })
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const colWidths = useRef<Record<number, number>>({})
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toast, setToast] = useState({ msg: '', show: false })
  const tableRef = useRef<HTMLTableElement>(null)
  const [ytModal, setYtModal] = useState<{ title: string; videoId: string | null; loading: boolean; minimized: boolean } | null>(null)

  // Derived
  const sel = allMode ? concerts : concerts.filter(c => selected.has(c))

  let filteredSongs = SONGS_ORDERED.filter(s => sel.some(c => SETS[c].has(s)))
  if (sortOrder) {
    filteredSongs = [...filteredSongs].sort((a, b) => {
      const ca = sel.reduce((n, c) => n + (SETS[c].has(a) ? 1 : 0), 0)
      const cb = sel.reduce((n, c) => n + (SETS[c].has(b) ? 1 : 0), 0)
      return sortOrder === 'desc' ? cb - ca : ca - cb
    })
  }

  const totalPages = Math.max(1, Math.ceil(filteredSongs.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageSlice = filteredSongs.slice((safePage - 1) * pageSize, safePage * pageSize)
  const maxTotal = filteredSongs.reduce((mx, song) => {
    const t = sel.reduce((n, c) => n + (SETS[c].has(song) ? 1 : 0), 0)
    return Math.max(mx, t)
  }, 1)

  // Column resize — runs after every render (matches HTML behavior)
  useEffect(() => {
    if (activeTab !== 'stats' || !sel.length) return
    const table = tableRef.current
    if (!table) return

    const ths = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th'))

    // Re-apply stored widths
    ths.forEach((th, i) => {
      if (colWidths.current[i] !== undefined) {
        th.style.width = colWidths.current[i] + 'px'
        th.style.minWidth = colWidths.current[i] + 'px'
      }
    })

    const cleanups: (() => void)[] = []

    ths.forEach((th, i) => {
      if (i === ths.length - 1) return // skip last column

      const handle = document.createElement('div')
      handle.className = 'col-resize-handle'
      th.appendChild(handle)

      let startX: number, startW: number

      const onDown = (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        startX = e.clientX
        startW = th.offsetWidth
        handle.classList.add('dragging')
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'

        const onMove = (e: MouseEvent) => {
          const newW = Math.max(50, startW + e.clientX - startX)
          th.style.width = newW + 'px'
          th.style.minWidth = newW + 'px'
          colWidths.current[i] = newW
        }
        const onUp = () => {
          handle.classList.remove('dragging')
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      }

      handle.addEventListener('mousedown', onDown)
      cleanups.push(() => {
        handle.removeEventListener('mousedown', onDown)
        if (th.contains(handle)) th.removeChild(handle)
      })
    })

    return () => cleanups.forEach(fn => fn())
  }) // no deps — runs after every render

  // Favorites
  function toggleFavorite(song: string) {
    const next = new Set(favorites)
    if (next.has(song)) { next.delete(song); showToastMsg('已取消收藏') }
    else { next.add(song); showToastMsg('❤️ 已收藏') }
    localStorage.setItem('oor-favorites', JSON.stringify([...next]))
    setFavorites(next)
  }

  // Toast
  function showToastMsg(msg: string) {
    setToast({ msg, show: true })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2000)
  }

  // Handlers
  function handleSelectAll(e: React.MouseEvent) {
    e.preventDefault()
    setAllMode(true)
    setSelected(new Set(concerts))
    setCurrentPage(1)
  }

  function handleToggleConcert(e: React.MouseEvent, c: string) {
    e.preventDefault()
    if (allMode) {
      setAllMode(false)
      setSelected(new Set([c]))
    } else {
      const next = new Set(selected)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      setSelected(next)
    }
    setCurrentPage(1)
  }

  function handleToggleAll() {
    setAllMode(false)
    setSelected(new Set())
    setCurrentPage(1)
  }

  function handleSortToggle() {
    setSortOrder(s => s === null ? 'desc' : s === 'desc' ? 'asc' : null)
    setCurrentPage(1)
  }

  function handlePageChange(p: number) {
    if (!sel.length) return
    setCurrentPage(Math.max(1, Math.min(p, totalPages)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Copy setlist text
  function copySetlist(concert: string) {
    const songs = setlists[concert] || []
    const text = `ONE OK ROCK — ${concert}\n${'─'.repeat(30)}\n` +
      songs.map((s, i) => `${String(i + 1).padStart(2, ' ')}. ${s}`).join('\n')
    navigator.clipboard.writeText(text)
      .then(() => showToastMsg('✓ 已复制到剪贴板'))
      .catch(() => {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
        showToastMsg('✓ 已复制到剪贴板')
      })
  }

  // Play song on YouTube
  async function playSong(concert: string, song: string) {
    setYtModal({ title: `${concert} — ${song}`, videoId: null, loading: true, minimized: false })
    try {
      const q = `ONE OK ROCK ${song} ${concert} live`
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(q)}`)
      const { videoId } = await res.json()
      setYtModal({ title: `${concert} — ${song}`, videoId, loading: false, minimized: false })
    } catch {
      setYtModal({ title: `${concert} — ${song}`, videoId: null, loading: false, minimized: false })
    }
  }

  // Save JPG via Canvas
  function saveJPG(concert: string) {
    const songs = setlists[concert] || []
    const DPR = 2, W = 480, HDRH = 54, PAD = 16, ROW = 26
    const H = HDRH + PAD + songs.length * ROW + PAD

    const canvas = document.createElement('canvas')
    canvas.width = W * DPR
    canvas.height = H * DPR
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#1F4E79'
    ctx.fillRect(0, 0, W, HDRH)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '11px "Segoe UI", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ONE OK ROCK', W / 2, 17)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif'
    ctx.fillText(concert, W / 2, 37)

    ctx.textAlign = 'left'
    songs.forEach((song, i) => {
      const y = HDRH + PAD + i * ROW
      ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#fff'
      ctx.fillRect(0, y, W, ROW)
      ctx.fillStyle = '#bbb'
      ctx.font = '11px "Segoe UI", Arial, sans-serif'
      ctx.fillText(String(i + 1) + '.', 14, y + ROW * 0.65)
      ctx.fillStyle = '#222'
      ctx.font = '13px "Segoe UI", Arial, sans-serif'
      let name = song
      while (ctx.measureText(name).width > W - 58 && name.length > 0) name = name.slice(0, -1)
      if (name !== song) name += '…'
      ctx.fillText(name, 42, y + ROW * 0.65)
    })

    ctx.fillStyle = '#1F4E79'
    ctx.fillRect(0, H - 4, W, 4)

    const link = document.createElement('a')
    link.download = concert.replace(/[/\\:*?"<>|]/g, '_') + '_setlist.jpg'
    link.href = canvas.toDataURL('image/jpeg', 0.92)
    link.click()
    showToastMsg('✓ JPG 已保存')
  }

  // Pagination page numbers
  function getPageNums(cur: number, total: number): (number | '…')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const p: (number | '…')[] = [1]
    if (cur > 3) p.push('…')
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) p.push(i)
    if (cur < total - 2) p.push('…')
    p.push(total)
    return p
  }

  const sortIcon = sortOrder === 'desc' ? ' ▼' : sortOrder === 'asc' ? ' ▲' : ' ⇅'

  return (
    <div className="dashboard">
      {/* Title */}
      <div className="title">
        ONE OK ROCK — Concert Setlist Dashboard
        <span>2010 – 2025 &nbsp;|&nbsp; 15 Tours &nbsp;|&nbsp; 113 Songs</span>
      </div>

      {/* Filter */}
      <div className="filter-panel">
        <div className="filter-header">
          <span className="filter-label">选择巡演</span>
          <button className="btn-sm" onClick={handleToggleAll}>取消全选</button>
        </div>
        <div className="checkboxes">
          <label className={`chip${allMode ? ' active' : ''}`} onClick={handleSelectAll}>
            <input type="checkbox" readOnly checked={allMode} />全部
          </label>
          {concerts.map(c => (
            <label
              key={c}
              className={`chip${!allMode && selected.has(c) ? ' active' : ''}`}
              onClick={e => handleToggleConcert(e, c)}
            >
              <input type="checkbox" readOnly checked={!allMode && selected.has(c)} />{c}
            </label>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn${activeTab === 'stats' ? ' active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >📊 统计</button>
        <button
          className={`tab-btn${activeTab === 'setlist' ? ' active' : ''}`}
          onClick={() => setActiveTab('setlist')}
        >🎵 歌单</button>
        <button
          className={`tab-btn${activeTab === 'favorites' ? ' active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >❤️ 收藏{favorites.size > 0 && ` (${favorites.size})`}</button>
      </div>

      {/* Stats Panel */}
      {activeTab === 'stats' && (
        <div>
          <div className="controls-bar">
            <div className="left-controls">
              <div className="page-size-wrap">
                <label>每页显示：</label>
                <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value)); setCurrentPage(1) }}>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
              {sel.length > 0 && (
                <span className="result-info">共 {filteredSongs.length} 首</span>
              )}
            </div>
            {sel.length > 0 && totalPages > 1 && (
              <div className="pagination-wrap">
                <button className="page-btn" onClick={() => handlePageChange(safePage - 1)} disabled={safePage === 1}>&#8249;</button>
                {getPageNums(safePage, totalPages).map((p, i) =>
                  p === '…'
                    ? <span key={`dots-${i}`} className="page-dots">…</span>
                    : <button
                        key={p}
                        className={`page-btn${p === safePage ? ' active' : ''}`}
                        onClick={() => handlePageChange(p as number)}
                      >{p}</button>
                )}
                <button className="page-btn" onClick={() => handlePageChange(safePage + 1)} disabled={safePage === totalPages}>&#8250;</button>
                <span className="page-summary">{safePage} / {totalPages} 页</span>
              </div>
            )}
          </div>

          {sel.length === 0 ? (
            <div className="empty-state">请选择至少一个巡演</div>
          ) : (
            <div className="table-wrapper">
              <table ref={tableRef}>
                <thead>
                  <tr>
                    <th className="song-col">Song</th>
                    {sel.map(c => <th key={c}>{c}</th>)}
                    <th className="total-col" onClick={handleSortToggle}>
                      Total Count{sortIcon}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map(song => {
                    const counts = sel.map(c => SETS[c].has(song) ? 1 : 0) as number[]
                    const tot = counts.reduce((a, b) => a + b, 0)
                    const pct = Math.round((tot / maxTotal) * 100)
                    return (
                      <tr key={song}>
                        <td className="song-col">{song}</td>
                        {counts.map((v, i) => (
                          <td key={i} className={`val-${v}`}>{v}</td>
                        ))}
                        <td
                          className="total-bar"
                          style={{ background: `linear-gradient(to right, #F4B183 ${pct}%, #fff ${pct}%)` }}
                        >{tot}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Setlist Panel */}
      {activeTab === 'setlist' && (
        <div>
        <div className="setlist-notice">🎵 点击歌曲名可搜索 YouTube 现场版。由于各场次录像上传情况不同，搜索结果可能来自其他巡演或版本，仅供试听参考。</div>
        <div className="setlist-grid">
          {sel.length === 0 ? (
            <div className="table-wrapper" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state">请选择至少一个巡演</div>
            </div>
          ) : sel.map(c => {
            const songs = setlists[c] || []
            return (
              <div key={c} className="setlist-card">
                <div className="card-header">{c}</div>
                <div className="card-body">
                  {songs.map((s, i) => (
                    <div key={i} className="card-item">
                      <span className="card-num">{i + 1}.</span>
                      <span className="card-song">{s}</span>
                      <button className={`btn-fav${favorites.has(s) ? ' active' : ''}`} onClick={() => toggleFavorite(s)} title={favorites.has(s) ? '取消收藏' : '收藏'}>♥</button>
                      <button className="btn-play" onClick={() => playSong(c, s)} title="在 YouTube 播放">▶</button>
                    </div>
                  ))}
                </div>
                <div className="card-footer">
                  <button className="btn-action btn-copy" onClick={() => copySetlist(c)}>📋 复制文本</button>
                  <button className="btn-action btn-jpg" onClick={() => saveJPG(c)}>💾 保存 JPG</button>
                </div>
              </div>
            )
          })}
        </div>
        </div>
      )}

      {/* Favorites Panel */}
      {activeTab === 'favorites' && (
        <div>
          {favorites.size === 0 ? (
            <div className="empty-state">还没有收藏任何歌曲，去歌单里点 ♥ 吧～</div>
          ) : (
            <div className="fav-list">
              {[...favorites].map(song => {
                const tours = concerts.filter(c => SETS[c].has(song))
                return (
                  <div key={song} className="fav-item">
                    <div className="fav-item-left">
                      <span className="fav-song">{song}</span>
                      <span className="fav-tours">{tours.join(' · ')}</span>
                    </div>
                    <button className="btn-fav active" onClick={() => toggleFavorite(song)} title="取消收藏">♥</button>
                    <button className="btn-play" onClick={() => playSong(tours[0], song)} title="在 YouTube 播放">▶</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <div id="toast" className={toast.show ? 'show' : ''}>{toast.msg}</div>

      {/* YouTube Modal */}
      {ytModal && !ytModal.minimized && (
        <div className="yt-overlay" onClick={() => setYtModal(null)}>
          <div className="yt-modal" onClick={e => e.stopPropagation()}>
            <div className="yt-modal-header">
              <span className="yt-modal-title">{ytModal.title}</span>
              <button className="yt-modal-close" title="最小化" onClick={() => setYtModal(m => m && ({ ...m, minimized: true }))}>─</button>
              <button className="yt-modal-close" onClick={() => setYtModal(null)}>✕</button>
            </div>
            <div className="yt-modal-body">
              {ytModal.loading && (
                <div className="yt-modal-loading">搜索中…</div>
              )}
              {!ytModal.loading && ytModal.videoId && (
                <iframe
                  src={`https://www.youtube.com/embed/${ytModal.videoId}?autoplay=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
              {!ytModal.loading && !ytModal.videoId && (
                <div className="yt-modal-loading">未找到相关视频</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini Player */}
      {ytModal && ytModal.minimized && (
        <div className="yt-mini">
          <div className="yt-mini-header">
            <span className="yt-mini-title">{ytModal.title}</span>
            <button className="yt-modal-close" title="展开" onClick={() => setYtModal(m => m && ({ ...m, minimized: false }))}>□</button>
            <button className="yt-modal-close" onClick={() => setYtModal(null)}>✕</button>
          </div>
          {ytModal.videoId && (
            <div className="yt-mini-body">
              <iframe
                src={`https://www.youtube.com/embed/${ytModal.videoId}?autoplay=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
