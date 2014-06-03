chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('main.html', {
    'bounds': {
      'width': 585,
      'height': 300,
      'left': 100,
      'top': 100
    },
    minWidth: 585,
    minHeight: 300
  });
});
