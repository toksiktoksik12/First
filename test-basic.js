// اختبار أساسي جداً
console.log('🔥 TEST: Content script loaded!');
console.log('🔥 TEST: URL:', window.location.href);
console.log('🔥 TEST: Title:', document.title);

// اختبار كل ثانية
setInterval(() => {
  console.log('🔥 TEST: Still alive at', new Date().toLocaleTimeString());
}, 1000);

// اختبار الرسائل
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔥 TEST: Message received:', request);
  
  if (request.action === 'test') {
    console.log('🔥 TEST: Responding to test message');
    sendResponse({ 
      success: true, 
      message: 'Content script is working!',
      url: window.location.href,
      title: document.title,
      linksCount: document.querySelectorAll('a').length
    });
  }
  
  return true;
});

// اختبار بعد 3 ثواني
setTimeout(() => {
  console.log('🔥 TEST: 3 seconds passed');
  console.log('🔥 TEST: Total links:', document.querySelectorAll('a').length);
  console.log('🔥 TEST: Marketplace links:', document.querySelectorAll('a[href*="marketplace"]').length);
}, 3000);