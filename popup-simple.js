// popup script مبسط
console.log('🚀 تم تحميل popup المبسط');

let extractedListings = [];

document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 تم تحميل popup DOM');
  
  const extractBtn = document.getElementById('extractBtn');
  const repostBtn = document.getElementById('repostBtn');
  const status = document.getElementById('status');
  const listingsDiv = document.getElementById('listings');
  
  // زر الاستخراج
  extractBtn.addEventListener('click', async function() {
    console.log('🔍 بدء الاستخراج...');
    
    extractBtn.disabled = true;
    extractBtn.textContent = 'جاري الاستخراج...';
    status.textContent = 'جاري استخراج الإعلانات...';
    status.className = 'status loading';
    
    try {
      // الحصول على التاب النشط
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('📋 التاب النشط:', tab.url);
      
      if (!tab.url.includes('facebook.com')) {
        throw new Error('يجب أن تكون في صفحة Facebook');
      }
      
      // إرسال رسالة للـ content script
      console.log('📤 إرسال رسالة استخراج...');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractListings' });
      console.log('📨 استقبال الرد:', response);
      
      if (response && response.success) {
        extractedListings = response.listings || [];
        displayListings(extractedListings);
        
        status.textContent = `تم استخراج ${extractedListings.length} إعلان بنجاح ✅`;
        status.className = 'status success';
        
        repostBtn.disabled = extractedListings.length === 0;
      } else {
        throw new Error(response?.error || response?.message || 'فشل في الاستخراج');
      }
      
    } catch (error) {
      console.error('❌ خطأ في الاستخراج:', error);
      status.textContent = `خطأ: ${error.message}`;
      status.className = 'status error';
    }
    
    extractBtn.disabled = false;
    extractBtn.textContent = 'استخراج الإعلانات';
  });
  
  // زر إعادة النشر
  repostBtn.addEventListener('click', function() {
    status.textContent = 'إعادة النشر غير متاحة في الإصدار المبسط';
    status.className = 'status warning';
  });
});

// عرض الإعلانات
function displayListings(listings) {
  const listingsDiv = document.getElementById('listings');
  listingsDiv.innerHTML = '';
  
  if (listings.length === 0) {
    listingsDiv.innerHTML = '<p>لم يتم العثور على إعلانات</p>';
    return;
  }
  
  listings.forEach((listing, index) => {
    const listingDiv = document.createElement('div');
    listingDiv.className = 'listing-item';
    listingDiv.innerHTML = `
      <div class="listing-header">
        <input type="checkbox" id="listing-${index}" checked>
        <label for="listing-${index}">
          <strong>${listing.title || 'بدون عنوان'}</strong>
        </label>
      </div>
      <div class="listing-details">
        <p><strong>السعر:</strong> ${listing.price || 'غير محدد'}</p>
        <p><strong>الصور:</strong> ${listing.images.length} صورة</p>
        <p><strong>الرابط:</strong> <a href="${listing.url}" target="_blank">عرض الإعلان</a></p>
      </div>
    `;
    listingsDiv.appendChild(listingDiv);
  });
}

console.log('✅ popup المبسط جاهز');