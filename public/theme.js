// Runs before the page draws, so the app opens in the right theme with no flash of the wrong colours
;(function () {
  try {
    var choice = localStorage.getItem('reforge.theme') || 'system'
    var light =
      choice === 'light' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
    document.documentElement.dataset.theme = light ? 'light' : 'dark'
    if (light) document.querySelector('meta[name="theme-color"]').setAttribute('content', '#f4f1ea')
  } catch (e) {}
})()
