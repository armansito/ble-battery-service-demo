chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('main.html', {
    'innerBounds': {
      'width': 620,
      'height': 274,
      'minWidth': 620,
      'minHeight': 274,
      'maxWidth': 620,
      'maxHeight': 274,
      'left': 100,
      'top': 100
    },
    minWidth: 450,
    minHeight: 150
  });
});
