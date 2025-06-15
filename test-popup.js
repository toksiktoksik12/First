// popup للاختبار الأساسي
console.log('🔥 TEST: Popup loaded!');

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔥 TEST: Popup DOM ready');
  
  const testBtn = document.getElementById('testBtn');
  const result = document.getElementById('result');
  
  testBtn.addEventListener('click', async function() {
    console.log('🔥 TEST: Test button clicked');
    
    result.innerHTML = 'جاري الاختبار...';
    
    try {
      // الحصول على التاب النشط
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('🔥 TEST: Active tab:', tab.url);
      
      result.innerHTML += '<br>التاب النشط: ' + tab.url;
      
      // إرسال رسالة اختبار
      console.log('🔥 TEST: Sending test message...');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'test' });
      console.log('🔥 TEST: Response:', response);
      
      if (response && response.success) {
        result.innerHTML = `
          <div style="color: green;">✅ Content script يعمل!</div>
          <div>URL: ${response.url}</div>
          <div>Title: ${response.title}</div>
          <div>عدد الروابط: ${response.linksCount}</div>
        `;
      } else {
        result.innerHTML = '<div style="color: red;">❌ لا يوجد رد من content script</div>';
      }
      
    } catch (error) {
      console.error('🔥 TEST: Error:', error);
      result.innerHTML = `<div style="color: red;">❌ خطأ: ${error.message}</div>`;
    }
  });
});