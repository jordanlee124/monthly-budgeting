const paths = {
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0Zm-5-4-2.4 5.6L8 16l2.4-5.6L16 8Z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  entries: 'M4 7h16M4 12h16M4 17h16M8 4 4 7l4 3m8 4 4 3-4 3',
  categories: 'M3 5h8v5H3zM3 14h12v5H3zM16 5h5v5h-5zM19 14h2v5h-2z',
  bills: 'M6 3h12v18l-3-2-3 2-3-2-3 2zm3 5h6m-6 4h6',
  goals: 'M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9zM17 12a5 5 0 1 1-5-5 5 5 0 0 1 5 5zm-5 0 8-8',
  left: 'm15 18-6-6 6-6', right: 'm9 18 6-6-6-6', plus: 'M12 5v14M5 12h14',
  moon: 'M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v5m8-5v5',
  income: 'M5 17 17 5M8 5h9v9', expense: 'M5 5l12 12m0-9v9H8',
  wallet: 'M3 6h17v13H3zM20 10h-6v5h6m-3-2.5h.01M3 6l13-3',
  edit: 'm4 16-1 5 5-1L20 8l-4-4zm10-10 4 4',
  close: 'm6 6 12 12M18 6 6 18', check: 'm5 12 4 4L19 6',
  arrow: 'M4 12h15m-6-6 6 6-6 6'
};
export function icon(name) {
  return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="' + paths[name] + '"/></svg>';
}
