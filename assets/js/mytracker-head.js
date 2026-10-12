/* MyTracker / Top.Mail.Ru counter 3800742.
   Load this synchronous script in <head>, before page content.
   Respect the user's previously saved analytics consent. */
(function (d, w) {
  'use strict';
  var consent = false;
  try { consent = w.localStorage.getItem('3dpl.analyticsConsent.v1') === 'accepted'; }
  catch (_) { consent = false; }
  if (!consent) return;
  var _tmr = w._tmr || (w._tmr = []);
  _tmr.push({ id: '3800742', type: 'pageView', start: (new Date()).getTime() });
  if (d.getElementById('tmr-code')) return;
  var ts = d.createElement('script');
  ts.type = 'text/javascript';
  ts.async = true;
  ts.id = 'tmr-code';
  ts.src = 'https://mytopf.com/js/code.js';
  var first = d.getElementsByTagName('script')[0];
  first.parentNode.insertBefore(ts, first);
})(document, window);
